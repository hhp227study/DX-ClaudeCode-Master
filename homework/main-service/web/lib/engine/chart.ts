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
