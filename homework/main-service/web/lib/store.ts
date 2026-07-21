/** 로컬 설정/기록 저장소 — 백엔드(태스크 #5) 연동 전까지 localStorage 사용 */

export interface Prefs {
  nickname: string;
  /** 판정 오프셋(ms). 캘리브레이션 자동 측정 + 설정에서 수동 조정 (FR-05, FR-18) */
  offsetMs: number;
  /** 0~100 */
  volume: number;
  resolution: 720 | 480;
  /** 캘리브레이션 완료 여부 — false면 플레이 전 보정 단계 진입 */
  calibrated: boolean;
  /** 함정(다른 단어) 버블 노출 여부 — 끄면 채보에서 decoy 노트를 제외 (2026-07-12 유저 요청) */
  decoyEnabled: boolean;
  /** 카메라 프레이밍 — fullbody면 채보 좌표를 리치에 맞게 리매핑 (2026-07-12 유저 요청) */
  framing: 'closeup' | 'fullbody';
  /** 플레이 준비 중 포즈 샘플로 프레이밍 자동 판별 — 설정에서 수동 선택하면 꺼진다 */
  framingAuto: boolean;
}

export interface BestRecord {
  score: number;
  rank: string;
  accuracy: number;
}

const PREFS_KEY = 'catchrhy.prefs.v1';
const BEST_KEY = 'catchrhy.best.v1';

const genNickname = (): string => `Player_${Math.random().toString(36).slice(2, 6)}`;

const defaults = (): Prefs => ({
  nickname: genNickname(),
  offsetMs: 0,
  volume: 70,
  resolution: 720,
  calibrated: false,
  decoyEnabled: true,
  framing: 'closeup',
  framingAuto: true,
});

export function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return defaults();
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      const p = defaults();
      localStorage.setItem(PREFS_KEY, JSON.stringify(p));
      return p;
    }
    return { ...defaults(), ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return defaults();
  }
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...loadPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* 프라이빗 모드 등 저장 불가 환경 — 세션 내 값으로만 동작 */
  }
  return next;
}

type BestMap = Record<string, BestRecord>;

function loadBestMap(): BestMap {
  if (typeof window === 'undefined') return {};
  try {
    return (JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as BestMap) ?? {};
  } catch {
    return {};
  }
}

export function loadBest(songId: string, difficulty: string): BestRecord | null {
  return loadBestMap()[`${songId}:${difficulty}`] ?? null;
}

/** 전체 로컬 베스트 (키: `songId:difficulty`) — 로그인 시 서버 이관용 (api.ts) */
export function loadAllBests(): Record<string, BestRecord> {
  return loadBestMap();
}

/** FR-17: 기존 기록 초과 시에만 갱신, NEW RECORD 여부 반환 */
export function saveBestIfBetter(
  songId: string,
  difficulty: string,
  rec: BestRecord,
): { isNew: boolean; best: BestRecord } {
  const map = loadBestMap();
  const key = `${songId}:${difficulty}`;
  const prev = map[key];
  if (prev && prev.score >= rec.score) return { isNew: false, best: prev };
  map[key] = rec;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(map));
  } catch {
    /* 저장 실패 무시 */
  }
  return { isNew: true, best: rec };
}
