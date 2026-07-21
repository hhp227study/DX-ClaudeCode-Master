/**
 * 채보 생성기 (prd-detail.md 16.1 포맷) — content/songs.json의 전 곡 easy/normal 생성.
 * 곡별 시드 고정 → 실행할 때마다 같은 채보.
 *
 * 페이스/위치 규칙 (유저 피드백 반영 이력은 prototype/README.md 참고):
 * - 노트 간격은 비트 단위(BPM 비례) — 구간별 easy 4/3/2비트, normal 3/2.5/2비트.
 *   빠른 곡은 실제로 빨리 나온다 (2026-07-08 유저 요청 — 기존 1.5초 고정 하한 폐지.
 *   2026-07-12 난이도 개편 — 구 normal이 easy로 승격, normal은 더 촘촘하게)
 * - 물리 하한 0.75초 — 손 이동 한계 + 판정 윈도우(±250ms) 겹침 방지. 미달 시 0.5비트씩 증가
 * - 모든 노트는 비트 그리드에 스냅 — 구간 시작을 비트에 정렬, 간격은 0.5비트 단위
 * - 출현 y 범위는 곡별 밴드 안에서 Y_LIMIT_TOP(0.08)~0.73 — 2026-07-22 유저 요청으로
 *   '얼굴 가림 금지(y≥0.45)' 상한을 폐지했다. 머리 위로 손을 올리는 춤(카라멜단센)이
 *   노트로 표현되지 못하고 포즈 노트로만 우회되던 원인이었다
 *
 * 안무(choreography) 규칙 — reference/ 셀카 댄스 영상들의 포즈 분석에서 도출.
 * y 높이·모티프 가중치는 유저가 지정한 표준 영상(reference/best.mp4) 기준
 * (근거 수치는 docs/reference-choreo-analysis.md):
 * - 좌/우 앵커존(x 0.28/0.72)을 교대로 오가는 그루브 — 양손이 번갈아 춤추는 동선
 * - 4노트 프레이즈 모티프(sway/arc/build/heart, 가중치 선택) — 무작위 개별 배치 금지
 * - 기본 y는 곡별 yBase 랜덤 워크(기본 0.50~0.66 = 어깨~가슴), 프레이즈 끝은 yAccent 액센트
 * - heart(중앙 액센트 마무리) 프레이즈를 easy에도 포함 — best.mp4의 ~4초 주기 하트
 * - 같은 쪽 연속 노트는 스텝 상한(순간이동 배치 금지)
 * - 함정은 직전에 잡은 자리 근처(주로 동선 아래 허리 높이)에 y를 비켜 배치
 *   — 흐름대로 움직이면 자연히 피해짐
 *
 * 곡별 오버라이드 — songs.json의 choreo(선택 필드):
 * - yBase: 기본 y 밴드 [min,max]. 카라멜단센(손을 올리고 추는 춤 — 손목 y 중앙값 0.33~0.38,
 *   어깨 위 체류 42~59%, 코 위 체류 37~46%)은 머리 높이 [0.30, 0.48]로 올린다
 *   (근거: docs/reference-choreo-analysis.md의 caramelldansen 영상 분석)
 * - yAccent: 프레이즈 끝 액센트 밴드. 카라멜단센은 정수리 위 [0.10, 0.24] — '만세' 동작
 * - xScale: 앵커를 중앙 기준으로 벌리는 배율. 팔을 크게 쓰는 곡용 (X_MIN/MAX에서 포화)
 * - motifs: 난이도별 모티프 가중치 (카라멜단센은 sway 비중 상향 — 좌우 교대가 시그니처)
 *
 * 구간 배치는 데모 트랙(62초) 기준 비율을 일반화:
 *   인트로 4초 → 구간1(~31%) → 포즈1 → 구간2(~63%) → 포즈2 → 구간3(~끝-4초)
 *
 * 실제 음원 곡(songs.json audio)은 위 비율 대신 songs.json의 sections/poses로
 * 곡의 실제 구조(인트로·후렴·브레이크)에 맞춰 명시 배치한다. 비트 그리드의 원점도
 * 0이 아니라 audio.firstBeatMs(첫 다운비트) — 실제 녹음은 파일 0ms에서 시작하지 않는다.
 *
 * 사용법: node scripts/gen-chart.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIN_GAP_MS = 750; // 물리 하한 — 손 이동 한계 + 판정 윈도우(±250ms) 겹침 방지
const POSE_DURATION = 1000; // 2500 → 1000 (2026-07-12 유저: 하트·손올리기 유지가 길다)
const APPROACH_WINDOW_MS = 2200; // 접근 2000ms + 판정 여유 — 이 안의 노트는 동시에 화면에 뜬다

// 구간별 간격(비트) — BPM에 비례해 빨라지고, 곡이 진행될수록 고조된다.
// 2026-07-12 난이도 개편(유저): 구 easy(6/5/4) 폐지, 구 normal(4/3/2)이 easy로,
// normal은 한 단계 더 촘촘하게(3/2.5/2). 물리 하한 0.75초는 그대로라
// 고BPM 곡(카라멜단센 165)은 후반 구간에서 easy와 간격이 수렴한다 — 의도된 동작.
// sparse는 2026-07-22 추가 — 전곡 수록 시 인트로·브레이크다운처럼 "쉬어가는" 구간용.
// 비율 배치(합성 곡)는 low/mid/high 세 단계만 쓴다 (기존 동작 그대로)
const SECTION_BEATS = {
  easy: { sparse: 6, low: 4, mid: 3, high: 2 },
  normal: { sparse: 5, low: 3, mid: 2.5, high: 2 },
};

// 앵커존/밴드 (reference 분석: 드웰 x 쌍봉. y는 best.mp4 표준 — 어깨선 높이,
// 드웰 y IQR 0.52~0.59 → 게임 프레이밍으로 환산해 밴드 상부에 집중)
// LW/RW = 와이드 액센트존 — carameldansen03의 Y자 팔벌리기(프레이즈 절정) 번역
const ANCHOR = { L: 0.28, R: 0.72, CL: 0.44, CR: 0.56, C: 0.5, LW: 0.16, RW: 0.84 };
const X_JITTER = 0.07; // 앵커 주변 흔들림 (best.mp4 같은 손 |dx| 90th 0.12와 일치)
const Y_BASE_MIN = 0.5;
const Y_BASE_MAX = 0.66;
const Y_STEP_MAX = 0.1; // 같은 쪽 y 랜덤 워크 스텝 상한
const Y_ACCENT_MIN = 0.45;
const Y_ACCENT_MAX = 0.53;
const Y_DECOY_MAX = 0.73; // 함정은 동선 아래(허리 높이)까지 허용 — 밴드 하한
const X_MIN = 0.1; // 버블 반지름(0.075×min변)이 화면 밖으로 안 나가게
const X_MAX = 0.9;

/**
 * 밴드 상한 — 2026-07-22까지 0.45("얼굴 가림 금지")였다. 카라멜단센처럼 머리 위로 손을
 * 올리는 춤이 노트로 표현되지 못하고 포즈 노트로만 우회되던 원인이라 유저 요청으로 걷어냈다.
 *
 * 저작 좌표계(9:16, 어깨선 y 0.55, 어깨너비 0.70)에서 세로 1 몸단위(bu) = 0.394.
 * 그래서 y를 몸 기준으로 읽으면: 0.55 어깨선 / 0.43 턱 / 0.31 눈 / 0.20 정수리 / 0.08 머리 위.
 * 0.08은 어깨선에서 약 1.2bu 위 = 만세한 손 높이다.
 */
const Y_LIMIT_TOP = 0.08;

// 4노트 프레이즈 모티프 — side: 앵커 키, accent: 프레이즈 끝 고조(y 상부)
// heart(중앙 액센트 마무리)는 best.mp4의 시그니처 — ~4초마다 중앙 하트
const MOTIFS = {
  sway: [{ side: 'L' }, { side: 'R' }, { side: 'L' }, { side: 'R' }],
  arc: [{ side: 'L' }, { side: 'CL' }, { side: 'CR' }, { side: 'R' }],
  build: [{ side: 'L' }, { side: 'R' }, { side: 'L' }, { side: 'R', accent: true }],
  heart: [{ side: 'L' }, { side: 'R' }, { side: 'CL' }, { side: 'C', accent: true }],
  // 양팔 Y자 벌리기 — 마지막 두 노트가 와이드+상단 액센트 (carameldansen03 프레이즈 절정)
  vspread: [{ side: 'L' }, { side: 'R' }, { side: 'LW', accent: true }, { side: 'RW', accent: true }],
};

const catalog = JSON.parse(
  readFileSync(fileURLToPath(new URL('../content/songs.json', import.meta.url)), 'utf8'),
);
const outDir = fileURLToPath(new URL('../public/charts/', import.meta.url));
mkdirSync(outDir, { recursive: true });

/** 곡 id 기반 결정적 시드 */
const seedOf = (id) => [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 20260707);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** 세로 9:16 화면의 픽셀 체감 거리 — y는 x보다 16/9배 김 */
const effDist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * (16 / 9));

/**
 * 동시에 화면에 떠 있는 노트들(actives)과 겹치지 않게 분리 (버블 지름 ≈ 0.15×min변).
 * 후보(x 3개 × y 스캔) 중 최소 거리 0.2를 만족하면서 원래 위치에 가장 가까운 것을 고른다
 * — 안무 위치를 최대한 보존. 만족 후보가 없으면 최소 거리가 최대인 후보.
 */
function separated(pos, actives, yLo, yHi) {
  const minD = (p) => actives.reduce((m, a) => Math.min(m, effDist(p, a)), Infinity);
  if (minD(pos) >= 0.2) return pos;
  const xs = [pos.x, clamp(pos.x + 0.1, X_MIN, X_MAX), clamp(pos.x - 0.1, X_MIN, X_MAX)];
  let ok = null;
  let fallback = pos;
  for (const x of xs) {
    for (let y = yLo; y <= yHi + 1e-9; y += 0.035) {
      const cand = { ...pos, x: +x.toFixed(3), y: +y.toFixed(3) };
      const d = minD(cand);
      if (d >= 0.2) {
        if (!ok || effDist(cand, pos) < effDist(ok, pos)) ok = cand;
      } else if (d > minD(fallback)) {
        fallback = cand;
      }
    }
  }
  return ok ?? fallback;
}

/** 안무가 — 모티프 프레이즈를 굴리며 노트 위치를 뽑는다. yBase = 곡별 기본 y 밴드 */
function makeChoreographer(
  rand,
  motifWeights,
  yBase = [Y_BASE_MIN, Y_BASE_MAX],
  yAccent = [Y_ACCENT_MIN, Y_ACCENT_MAX],
  xScale = 1,
) {
  const [yLo, yHi] = yBase;
  const [yAccLo, yAccHi] = yAccent;
  const entries = Object.entries(motifWeights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const pickMotif = () => {
    let r = rand() * total;
    for (const [name, w] of entries) {
      r -= w;
      if (r <= 0) return name;
    }
    return entries[entries.length - 1][0];
  };

  let phrase = [];
  let mirror = false; // 프레이즈마다 좌우 반전 → 미러 대칭 구조 (영상: 손은 대칭으로 움직임)
  const yMid = (yLo + yHi) / 2;
  const yWalk = { L: yMid, R: yMid, C: yMid }; // 사이드별 y 랜덤 워크 상태
  const flip = { L: 'R', R: 'L', CL: 'CR', CR: 'CL', C: 'C', LW: 'RW', RW: 'LW' };

  return function next() {
    if (phrase.length === 0) {
      phrase = [...MOTIFS[pickMotif()]];
      mirror = rand() < 0.5;
    }
    const slot = phrase.shift();
    const side = mirror ? flip[slot.side] : slot.side;
    const walkKey = side.startsWith('L') ? 'L' : side.startsWith('R') ? 'R' : 'C';

    // xScale은 앵커를 중앙 기준으로 벌린다 — 팔을 크게 쓰는 곡용 (X_MIN/MAX에서 포화)
    const anchorX = 0.5 + (ANCHOR[side] - 0.5) * xScale;
    const x = clamp(anchorX + (rand() - 0.5) * 2 * X_JITTER, X_MIN, X_MAX);
    let y;
    if (slot.accent) {
      y = yAccLo + rand() * (yAccHi - yAccLo);
    } else {
      y = yWalk[walkKey] + (rand() - 0.5) * 2 * Y_STEP_MAX;
      // 밴드 경계에서 반사 — clamp는 워크를 경계에 눌어붙게 만든다
      if (y > yHi) y = yHi * 2 - y;
      if (y < yLo) y = yLo * 2 - y;
      y = clamp(y, yLo, yHi);
      yWalk[walkKey] = y;
    }
    return { x: +x.toFixed(3), y: +y.toFixed(3), accent: !!slot.accent };
  };
}

for (const song of catalog.songs) {
  const beat = 60000 / song.bpm;
  const d = song.durationSec * 1000;
  // 비트 그리드 원점 — 음원 파일 곡은 첫 다운비트가 파일 0ms가 아니다 (합성 곡은 0)
  const beat0 = song.audio?.firstBeatMs ?? 0;

  // 구간 시작을 비트 그리드에 스냅 — 간격이 0.5비트 단위이므로 모든 노트가 (반)박 위에 떨어진다
  const snap = (t) => beat0 + Math.ceil((t - beat0) / beat) * beat;
  // 비트 간격이 물리 하한(0.75초) 미만이면 0.5비트씩 늘린다 (초고BPM 대비)
  const beatsFor = (base) => {
    let b = base;
    while (b * beat < MIN_GAP_MS) b += 0.5;
    return b;
  };

  const sec1End = Math.round(d * 0.31);
  const sec2Start = sec1End + 6000;
  const sec2End = Math.round(d * 0.63);
  const sec3Start = sec2End + 6000;
  // songs.json에 sections가 있으면 실제 곡 구조를 그대로 쓴다 (level = 난이도별 간격 배열 인덱스).
  // 없으면 기존 3구간 비율 배치 — 합성 곡은 구조가 균질해서 비율로 충분하다
  const sections = (beats) =>
    song.sections
      ? song.sections.map((s) => [snap(s.from * 1000), s.to * 1000, beatsFor(beats[s.level])])
      : [
          [snap(4000), sec1End, beatsFor(beats.low)],
          [snap(sec2Start), sec2End, beatsFor(beats.mid)],
          [snap(sec3Start), d - 4000, beatsFor(beats.high)],
        ];
  // 포즈 노트도 명시 배치 우선 — 구간 사이 빈 구간(전주/브레이크)에 놓고 비트에 스냅한다.
  // 폴백(합성 곡)은 기존대로 구간 끝 +2초, 스냅하지 않는다 — 캐치 노트가 없는 자리라
  // 비트 정렬이 필요 없고, 스냅하면 기존 10개 채보가 전부 바뀐다
  const poseNotes = () =>
    song.poses
      ? song.poses.map((p) => ({
          t: Math.round(snap(p.at * 1000)),
          type: 'pose',
          pose: p.pose,
          durationMs: POSE_DURATION,
        }))
      : [
          { t: sec1End + 2000, type: 'pose', pose: 'hands_up', durationMs: POSE_DURATION },
          { t: sec2End + 2000, type: 'pose', pose: 'heart', durationMs: POSE_DURATION },
        ];

  const choreo = song.choreo ?? {};
  // 프레이즈 액센트 밴드 — 곡별 오버라이드(머리 위로 손을 올리는 춤은 여기가 정수리 위로 간다).
  // 밴드 상한은 Y_LIMIT_TOP까지 열려 있다 (구 '얼굴 가림 금지 0.45' 폐지)
  const accentBand = choreo.yAccent ?? [Y_ACCENT_MIN, Y_ACCENT_MAX];
  if (Math.min(...accentBand) < Y_LIMIT_TOP) {
    throw new Error(`${song.id}: yAccent 상한(${Math.min(...accentBand)})이 밴드 한계 ${Y_LIMIT_TOP}를 넘음`);
  }
  const diffs = {
    // easy = 2026-07-12 개편 전의 normal 그대로 (간격·함정·모티프)
    easy: {
      sections: sections(SECTION_BEATS.easy),
      decoyRatio: 0.2,
      motifs: choreo.motifs?.easy ?? { sway: 30, arc: 20, build: 20, heart: 30 },
    },
    normal: {
      sections: sections(SECTION_BEATS.normal),
      decoyRatio: 0.25,
      motifs: choreo.motifs?.normal ?? { sway: 25, arc: 15, build: 30, heart: 30 },
    },
  };

  for (const [difficulty, cfg] of Object.entries(diffs)) {
    let seed = seedOf(song.id);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const nextPos = makeChoreographer(rand, cfg.motifs, choreo.yBase, accentBand, choreo.xScale ?? 1);

    // 1패스: 안무대로 캐치 노트 전부 배치 (연속 노트 겹침 분리 포함)
    const notes = [];
    const slots = []; // notes와 평행 — 함정 치환 가능 여부
    for (const [from, to, beats] of cfg.sections) {
      let firstInSection = true;
      for (let t = from; t < to; t += beat * beats) {
        // 구간 경계 가드 — 구간마다 시작을 따로 스냅하므로 앞 구간 마지막 노트와
        // 물리 하한(0.75초)보다 가까워질 수 있다. 그리드를 흔들지 않게 그 노트를 버린다
        // (구간 사이가 6초씩 벌어지는 비율 배치에서는 걸리지 않는다)
        const last = notes[notes.length - 1];
        if (last && t - last.t < MIN_GAP_MS) continue;
        let pos = nextPos();
        // 분리용 y 여유는 곡의 전체 밴드 — 기본 밴드가 좁아 y만으론 부족할 수 있다
        const [yLo, yHi] = pos.accent ? accentBand : [Math.min(...accentBand), Y_DECOY_MAX];
        // 같은 화면에 떠 있을 노트 전부와 분리 (간격이 짧아지면 동시 노출이 3개까지 늘어난다)
        const actives = notes.filter((n) => t - n.t < APPROACH_WINDOW_MS);
        pos = separated(pos, actives, yLo, yHi);
        notes.push({ t: Math.round(t), type: 'catch', x: pos.x, y: pos.y });
        slots.push({ swappable: !pos.accent && !firstInSection });
        firstInSection = false;
      }
    }

    // 2패스: 일부 캐치를 함정으로 치환 — 직전에 잡은 자리 근처에 y를 비켜 배치
    // (잡은 손이 물러나는 자리 — 흐름대로 반대쪽으로 넘어가면 자연히 피해진다)
    for (let i = 1; i < notes.length; i++) {
      if (!slots[i].swappable || notes[i - 1].type !== 'catch') continue;
      if (rand() >= cfg.decoyRatio) continue;
      const prev = notes[i - 1];
      const mag = 0.15 + rand() * 0.06;
      const x = +clamp(prev.x + (rand() - 0.5) * 0.1, X_MIN, X_MAX).toFixed(3);
      const first = rand() < 0.5 ? -1 : 1;
      // 같은 화면에 떠 있을 이웃 전부와 확인 — 앞 노트와는 0.2, 뒤에 올 캐치와는 0.24(억울한 함정 방지)
      const neighbors = notes.filter(
        (n, j) => j !== i && Math.abs(n.t - notes[i].t) < APPROACH_WINDOW_MS,
      );
      for (const dir of [first, -first]) {
        const decoy = {
          t: notes[i].t,
          type: 'decoy',
          x,
          y: +clamp(prev.y + dir * mag, Math.min(...accentBand), Y_DECOY_MAX).toFixed(3),
          label: '다른 단어',
        };
        if (neighbors.every((n) => effDist(decoy, n) >= (n.t > decoy.t ? 0.24 : 0.2))) {
          notes[i] = decoy;
          break;
        }
      }
    }
    notes.push(...poseNotes());
    notes.sort((a, b) => a.t - b.t);

    const chart = {
      version: 1,
      songId: song.id,
      difficulty,
      bpm: song.bpm,
      // 비트 그리드 원점 — 에디터의 마디선·스냅이 실제 음원의 다운비트에 맞는다
      offsetMs: beat0,
      targetWord: song.targetWord,
      mission: song.mission,
      notes,
    };

    const outFile = `${outDir}${song.id}-${difficulty}.json`;
    writeFileSync(outFile, JSON.stringify(chart, null, 2));
    const counts = notes.reduce((acc, n) => ((acc[n.type] = (acc[n.type] ?? 0) + 1), acc), {});
    console.log(`${song.id}-${difficulty}: 노트 ${notes.length}개`, counts);
  }
}
