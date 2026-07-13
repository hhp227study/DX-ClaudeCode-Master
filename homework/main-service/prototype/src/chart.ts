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

export async function loadChart(url: string): Promise<Chart> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`채보 로드 실패: ${res.status}`);
  const chart = (await res.json()) as Chart;
  if (chart.version !== 1 || !Array.isArray(chart.notes)) {
    throw new Error('지원하지 않는 채보 포맷');
  }
  return chart;
}
