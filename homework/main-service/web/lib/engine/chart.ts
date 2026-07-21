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
 * 채보는 클로즈업(상반신 셀카) 기준으로 생성된다 — 밴드 y 0.08~0.73, 앵커 x 0.28/0.72.
 * 풀바디에선 몸이 작게 잡혀 같은 화면 좌표가 무릎/허리 높이가 되므로,
 * y [0.45, 0.73] → [0.30, 0.62] (레퍼런스 풀바디 영상들의 손목 체류 y 0.23~0.44와
 * 골반선 ~0.55에 맞춤), x는 중심으로 20% 압축 (팔 스팬이 화면의 ~0.6이라 0.2~0.8이 자연 리치.
 * 근거 실측: docs/reference-choreo-analysis.md 프레이밍 분류 절)
 */
// 머리 위 노트(y 0.08~)까지 이 기울기로 늘리면 화면 밖으로 나간다 — 화면 안으로 클램프.
// 몸 앵커가 잡히면 이 경로는 안 쓰이므로(remapChartToBody), 폴백으로서 안전만 보장한다
export const remapY = (y: number): number =>
  +Math.min(0.96, Math.max(0.04, 0.3 + (y - 0.45) * (0.32 / 0.28))).toFixed(3);
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
 * 가로 리치 배율 — 저작 좌표를 그대로 몸 단위로 옮기면 팔을 너무 좁게 쓴다.
 *
 * 저작 x 한계(0.10~0.90)는 원래 "버블이 화면 밖으로 안 나가게" 정한 화면 기준 값이라,
 * 몸 단위로 환산하면 중심에서 ±0.57 어깨너비밖에 안 된다. 사람이 팔을 다 뻗으면
 * 약 ±2.1 어깨너비까지 가므로 실제 리치의 27% 수준이다. 저작 프레임이 셀카(어깨가
 * 화면 폭의 70%)라 팔을 오므리고 찍은 탓인데, 게임은 카메라가 더 멀어 그럴 이유가 없다.
 *
 * 그래서 가로만 이 배율로 벌린다(세로는 몸 기준 그대로 — 머리 위 노트가 더 올라가면 안 된다).
 * 2.0이면 최대 ±1.14 어깨너비 = 완전히 뻗은 팔의 절반 정도라 편하게 닿는다.
 */
const X_REACH = 2.0;
const X_AUTHORED_HALF = 0.4; // 저작 좌표의 중심 대비 최대 오프셋 (0.10~0.90)
const X_REACH_MIN = 0.7; // 화면이 좁아도 이보다 더 오므리지는 않는다

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
  const map = bodyMapper(a);
  return {
    ...chart,
    notes: chart.notes.map((n) => {
      if (n.x === undefined || n.y === undefined) return n;
      const p = map(n.x, n.y);
      return { ...n, x: +p.x.toFixed(3), y: +p.y.toFixed(3) };
    }),
  };
}

const clamp01 = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * 저작 좌표 → 화면 좌표 변환기.
 *
 * 가로 리치(X_REACH)는 화면에 들어가는 만큼만 쓴다. 세로 폰처럼 좁은 화면에서는
 * 완전한 리치를 주면 노트가 화면(그리고 카메라 화각) 밖으로 나가 잡을 수 없기 때문이다.
 * 그래서 "몸 대비 같은 위치"는 세로에서 엄밀히 유지되고, 가로는 **화면이 허용하는 만큼
 * 최대한 넓게**가 된다 — 가로 PC에서는 X_REACH를 다 쓰고, 세로 폰에서는 화면에 맞춰 좁아진다.
 */
function bodyMapper(a: BodyAnchor): (x: number, y: number) => { x: number; y: number } {
  const refH = 1 / REF_ASPECT; // 저작 화면 높이 (가로=1 기준)
  const unit = a.shoulderPx / REF_SHOULDER_W; // 저작 화면 가로 1.0에 해당하는 픽셀
  // 버블이 잘리지 않게 가장자리 여백을 빼고, 몸 중심에서 화면 끝까지 남은 폭에 맞춘다
  const margin = 0.09 * Math.min(a.w, a.h);
  const roomPx = Math.max(0, Math.min(a.cx, a.w - a.cx) - margin);
  const fit = roomPx / (X_AUTHORED_HALF * unit);
  const reach = Math.max(X_REACH_MIN, Math.min(X_REACH, fit));
  return (x, y) => ({
    x: clamp01((a.cx + (x - 0.5) * unit * reach) / a.w, 0.06, 0.94),
    y: clamp01((a.cy + (y - REF_SHOULDER_Y) * refH * unit) / a.h, 0.06, 0.94),
  });
}

/** 몸 기준 좌표 한 점 — 보정 버블처럼 채보 밖에서 쓰는 좌표용 */
export const bodyPoint = (x: number, y: number, a: BodyAnchor): { x: number; y: number } =>
  bodyMapper(a)(x, y);

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
