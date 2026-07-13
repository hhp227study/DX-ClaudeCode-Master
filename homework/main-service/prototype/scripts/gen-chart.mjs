/**
 * 데모 채보 생성기 (prd-detail.md 16.1 포맷).
 * 시드 고정 → 실행할 때마다 같은 채보. 페이스 튜닝은 아래 섹션 간격만 조정.
 *
 * 사용법: node scripts/gen-chart.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BPM = 120;
const BEAT = 60000 / BPM; // 500ms

let seed = 20260707;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const LANES = [0.25, 0.5, 0.75];
let lastLane = -1;
const pickPos = () => {
  let lane;
  do {
    lane = Math.floor(rand() * LANES.length);
  } while (lane === lastLane);
  lastLane = lane;
  return {
    x: +(LANES[lane] + (rand() - 0.5) * 0.16).toFixed(3),
    // 유저 피드백(2026-07-07): 얼굴 높이 회피 — 가슴~허리 높이(0.45~0.73)에만 출현
    y: +(0.45 + rand() * 0.28).toFixed(3),
  };
};

const notes = [];
const pushCatchOrDecoy = (t) => {
  const type = rand() < 0.22 ? 'decoy' : 'catch';
  const note = { t: Math.round(t), type, ...pickPos() };
  if (type === 'decoy') note.label = '다른 단어';
  notes.push(note);
};

// 유저 피드백(2026-07-07): 노트 페이스 완화 — 최소 간격 3비트(1.5초) 유지
// 섹션 1 (워밍업): 4비트 = 2.0초 간격
for (let t = 4000; t < 19000; t += BEAT * 4) pushCatchOrDecoy(t);
// 포즈 1
notes.push({ t: 21000, type: 'pose', pose: 'hands_up', durationMs: 2500 });
// 섹션 2: 3.5비트 = 1.75초 간격
for (let t = 25000; t < 39000; t += BEAT * 3.5) pushCatchOrDecoy(t);
// 포즈 2
notes.push({ t: 41000, type: 'pose', pose: 'heart', durationMs: 2500 });
// 섹션 3 (클라이맥스): 3비트 = 1.5초 간격
for (let t = 45000; t < 58000; t += BEAT * 3) pushCatchOrDecoy(t);

const chart = {
  version: 1,
  songId: 'demo-track',
  difficulty: 'normal',
  bpm: BPM,
  offsetMs: 0,
  targetWord: 'Rhy',
  mission: '버블을 잡고, 퍼플은 피하고, 포즈 타임엔 포즈!',
  notes,
};

const outDir = fileURLToPath(new URL('../public/charts/', import.meta.url));
mkdirSync(outDir, { recursive: true });
const outFile = `${outDir}demo-normal.json`;
writeFileSync(outFile, JSON.stringify(chart, null, 2));

const counts = notes.reduce((acc, n) => ((acc[n.type] = (acc[n.type] ?? 0) + 1), acc), {});
console.log(`생성 완료: ${outFile}`);
console.log(`노트 ${notes.length}개 —`, counts);
