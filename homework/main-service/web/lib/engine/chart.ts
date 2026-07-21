/** prd-detail.md 16.1 채보(Chart) JSON 포맷 v1 */

export type PoseKind = 'hands_up' | 'heart';

export interface ChartNote {
  /** 곡 시작 기준 판정 시각(ms) */
  t: number;
  type: 'catch' | 'decoy' | 'pose';
  /** 화면 비율 좌표 (0~1). pose 노트는 생략 */
  x?: number;
  y?: number;
  /** decoy 표시 텍스트 */
  label?: string;
  pose?: PoseKind;
  durationMs?: number;
}

export interface Chart {
  version: number;
  songId: string;
  difficulty: string;
  bpm: number;
  offsetMs: number;
  targetWord: string;
  mission: string;
  notes: ChartNote[];
}

/** 카메라 프레이밍 — 채보 좌표계의 기준 (설정에서 선택, FR 없음: 2026-07-12 유저 요청) */
export type Framing = 'closeup' | 'fullbody';

/**
 * 풀바디/트라이포드 프레이밍용 좌표 리매핑.
 * 채보는 클로즈업(상반신 셀카) 기준으로 생성된다 — 얼굴 가림 금지 y≥0.45, 앵커 x 0.28/0.72.
 * 풀바디에선 몸이 작게 잡혀 같은 화면 좌표가 무릎/허리 높이가 되므로,
 * y [0.45, 0.73] → [0.30, 0.62] (레퍼런스 풀바디 영상들의 손목 체류 y 0.23~0.44와
 * 골반선 ~0.55에 맞춤), x는 중심으로 20% 압축 (팔 스팬이 화면의 ~0.6이라 0.2~0.8이 자연 리치.
 * 근거 실측: docs/reference-choreo-analysis.md 프레이밍 분류 절)
 */
export const remapY = (y: number): number => +(0.3 + (y - 0.45) * (0.32 / 0.28)).toFixed(3);
export const remapX = (x: number): number => +(0.5 + (x - 0.5) * 0.8).toFixed(3);

/**
 * 몸 기준 앵커 — 화면에서 실제로 어깨가 어디에 얼마나 크게 잡혔는지 (캔버스 픽셀).
 * 채보 좌표를 이 앵커에 맞춰 옮기면 화면 비율(세로 폰 / 가로 PC)·거리·프레이밍이 달라도
 * "몸 대비 같은 위치"에 버블이 뜬다.
 */
export interface BodyAnchor {
  /** 어깨 중심 (캔버스 픽셀) */
  cx: number;
  cy: number;
  /** 어깨너비 (캔버스 픽셀) — 몸 단위(body unit)의 척도 */
  shoulderPx: number;
  /** 캔버스 크기 (픽셀) */
  w: number;
  h: number;
}

/**
 * 채보를 저작한 기준 프레이밍 — docs/reference-choreo-analysis.md의 표준 영상(best.mp4) 실측.
 * 세로 셀카 720×1280(9:16)에서 어깨너비 0.70·어깨선 y 0.55.
 * 이 값들이 "채보 좌표 → 몸 단위" 환산의 원점이다.
 */
const REF_ASPECT = 9 / 16; // 저작 기준 화면의 가로/세로
const REF_SHOULDER_W = 0.7; // 화면 가로 대비 어깨너비
const REF_SHOULDER_Y = 0.55; // 화면 세로 대비 어깨선

/**
 * 채보 좌표를 몸 기준으로 재배치한다.
 *
 * 기존 방식은 채보 x/y를 캔버스 폭·높이에 그대로 곱했다. 그래서 세로 폰(9:19.5)과
 * 가로 PC(16:9)에서 같은 채보가 몸 기준으로 전혀 다른 위치에 떴다 —
 * 앵커 x 0.28/0.72가 차지하는 카메라 화각이 11% vs 44%로 4배 차이났다.
 *
 * 여기서는 저작 기준(REF_*)에서의 "어깨너비 몇 배만큼 떨어진 곳"을 구한 뒤,
 * 실제 화면에서 측정된 어깨너비(픽셀)로 되돌린다. 픽셀 기준으로 계산하므로
 * 가로/세로 어느 쪽이든 몸에 대한 상대 위치와 모양이 보존된다.
 */
export function remapChartToBody(chart: Chart, a: BodyAnchor): Chart {
  const refH = 1 / REF_ASPECT; // 저작 화면 높이 (가로=1 기준)
  const unit = a.shoulderPx / REF_SHOULDER_W; // 저작 화면 가로 1.0에 해당하는 픽셀
  const map = (x: number, y: number) => ({
    x: +clamp01((a.cx + (x - 0.5) * unit) / a.w, 0.06, 0.94).toFixed(3),
    y: +clamp01((a.cy + (y - REF_SHOULDER_Y) * refH * unit) / a.h, 0.06, 0.94).toFixed(3),
  });
  return {
    ...chart,
    notes: chart.notes.map((n) =>
      n.x === undefined || n.y === undefined ? n : { ...n, ...map(n.x, n.y) },
    ),
  };
}

const clamp01 = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** 몸 기준 좌표 한 점 — 보정 버블처럼 채보 밖에서 쓰는 좌표용 */
export const bodyPoint = (x: number, y: number, a: BodyAnchor): { x: number; y: number } => {
  const refH = 1 / REF_ASPECT;
  const unit = a.shoulderPx / REF_SHOULDER_W;
  return {
    x: clamp01((a.cx + (x - 0.5) * unit) / a.w, 0.06, 0.94),
    y: clamp01((a.cy + (y - REF_SHOULDER_Y) * refH * unit) / a.h, 0.06, 0.94),
  };
};

export function remapChartForFraming(chart: Chart, framing: Framing): Chart {
  if (framing !== 'fullbody') return chart;
  return {
    ...chart,
    notes: chart.notes.map((n) =>
      n.x === undefined || n.y === undefined ? n : { ...n, x: remapX(n.x), y: remapY(n.y) },
    ),
  };
}

export async function loadChart(url: string): Promise<Chart> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`채보 로드 실패: ${res.status}`);
  const chart = (await res.json()) as Chart;
  if (chart.version !== 1 || !Array.isArray(chart.notes)) {
    throw new Error('지원하지 않는 채보 포맷');
  }
  return chart;
}
