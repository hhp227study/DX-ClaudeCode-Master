import type { Chart, ChartNote } from './chart';
import type { PoseFlags } from './pose-tracker';

/**
 * 채보 기반 판정 엔진. 판정 상수는 prd-detail.md 16.2와 동일.
 * 클록은 호출자가 주입한다 (프로토타입: DemoTrack의 AudioContext 클록).
 */

export const JUDGEMENT = {
  PERFECT_MS: 80,
  GREAT_MS: 160,
  GOOD_MS: 250, // == 히트 윈도우 한계
  HIT_RADIUS_SCALE: 1.2,
  DECOY_PENALTY: -100,
  SCORE: { PERFECT: 1000, GREAT: 700, GOOD: 300 },
  COMBO_MULTIPLIER: [
    [0, 1],
    [10, 2],
    [25, 3],
    [50, 4],
  ],
  CLEAR_BONUS: 5000,
  FULL_COMBO_BONUS: 10000,
} as const;

// 유저 피드백(2026-07-07): 노트 진행이 빠르다 → 접근 시간 1500 → 2000ms
const APPROACH_MS = 2000;
const DECOY_LINGER_MS = 500; // 판정 시각 이후 함정 버블 유지 시간
const BUBBLE_RADIUS_RATIO = 0.075;
const FEEDBACK_LIFETIME_MS = 800;
const POSE_HOLD_PERFECT = 0.8; // prd-detail.md 5.4: 유지율 80% 이상 PERFECT
const POSE_HOLD_GOOD = 0.5;

export type Grade = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | 'DECOY';

export interface PxPoint {
  x: number;
  y: number;
}

export interface GameResult {
  score: number;
  accuracy: number;
  rank: string;
  maxCombo: number;
  fullCombo: boolean;
  counts: Record<Grade, number>;
}

interface LiveNote {
  def: ChartNote;
  poseOk: number;
  poseTotal: number;
}

interface Feedback {
  text: string;
  color: string;
  x: number;
  y: number;
  bornT: number;
}

const GRADE_STYLE: Record<Grade, { text: string; color: string }> = {
  PERFECT: { text: 'PERFECT!', color: '#ffd93d' },
  GREAT: { text: 'GREAT!', color: '#6bffb0' },
  GOOD: { text: 'GOOD', color: '#7ec8ff' },
  MISS: { text: 'MISS', color: '#aaaaaa' },
  DECOY: { text: 'X!', color: '#ff6b81' },
};

const POSE_LABEL: Record<string, string> = {
  hands_up: '🙌 양손 올리기!',
  heart: '🫶 머리 위 하트!',
};

export function rankOf(accuracy: number): string {
  if (accuracy >= 97) return 'SSS';
  if (accuracy >= 92) return 'SS';
  if (accuracy >= 85) return 'S';
  if (accuracy >= 75) return 'A';
  if (accuracy >= 60) return 'B';
  if (accuracy >= 40) return 'C';
  return 'F';
}

export class ChartGame {
  private chart: Chart | null = null;
  private queue: ChartNote[] = [];
  private nextIdx = 0;
  private live: LiveNote[] = [];
  private feedbacks: Feedback[] = [];

  running = false;
  score = 0;
  combo = 0;
  maxCombo = 0;
  counts: Record<Grade, number> = { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0, DECOY: 0 };
  targetTotal = 0;
  targetCaught = 0;
  /** 판정 대상 노트 수 (catch + pose) — Accuracy 분모 */
  private judgeableTotal = 0;
  lastNoteEndMs = 0;

  onJudge?: (grade: Grade) => void;

  start(chart: Chart): void {
    this.chart = chart;
    this.queue = [...chart.notes].sort((a, b) => a.t - b.t);
    this.nextIdx = 0;
    this.live = [];
    this.feedbacks = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0, DECOY: 0 };
    this.targetTotal = this.queue.filter((n) => n.type === 'catch').length;
    this.targetCaught = 0;
    this.judgeableTotal = this.queue.filter((n) => n.type !== 'decoy').length;
    this.lastNoteEndMs = this.queue.reduce((m, n) => Math.max(m, n.t + (n.durationMs ?? 0)), 0);
    this.running = true;
  }

  get finished(): boolean {
    return this.running && this.nextIdx >= this.queue.length && this.live.length === 0;
  }

  get multiplier(): number {
    let m = 1;
    for (const [threshold, mult] of JUDGEMENT.COMBO_MULTIPLIER) {
      if (this.combo >= threshold) m = mult;
    }
    return m;
  }

  /** Pose Note 구간 근처인가 — main이 PoseLandmarker 실행 여부를 결정하는 데 사용 */
  needsPose(now: number): boolean {
    return (
      this.live.some((n) => n.def.type === 'pose') ||
      this.queue
        .slice(this.nextIdx, this.nextIdx + 2)
        .some((n) => n.type === 'pose' && n.t - APPROACH_MS - 500 <= now)
    );
  }

  update(now: number, cursors: PxPoint[], pose: PoseFlags | null, w: number, h: number): void {
    if (!this.running) return;

    // 스폰: 판정 시각 - APPROACH_MS 도달 시 활성화
    while (this.nextIdx < this.queue.length && this.queue[this.nextIdx].t - APPROACH_MS <= now) {
      this.live.push({ def: this.queue[this.nextIdx++], poseOk: 0, poseTotal: 0 });
    }

    const r = BUBBLE_RADIUS_RATIO * Math.min(w, h);
    const hitR = r * JUDGEMENT.HIT_RADIUS_SCALE;

    this.live = this.live.filter((n) => {
      const def = n.def;
      const dt = now - def.t;

      if (def.type === 'pose') {
        const dur = def.durationMs ?? 2000;
        if (dt >= 0 && dt <= dur) {
          n.poseTotal++;
          if (pose && def.pose && pose[def.pose]) n.poseOk++;
        }
        if (dt > dur) {
          const ratio = n.poseTotal > 0 ? n.poseOk / n.poseTotal : 0;
          const grade: Grade =
            ratio >= POSE_HOLD_PERFECT ? 'PERFECT' : ratio >= POSE_HOLD_GOOD ? 'GOOD' : 'MISS';
          this.judge(grade, 0.5, 0.35, now);
          return false;
        }
        return true;
      }

      const bx = (def.x ?? 0.5) * w;
      const by = (def.y ?? 0.5) * h;
      const touched = cursors.some((c) => Math.hypot(c.x - bx, c.y - by) <= hitR);

      if (def.type === 'decoy') {
        if (touched && dt >= -APPROACH_MS) {
          this.judge('DECOY', def.x ?? 0.5, def.y ?? 0.5, now);
          return false;
        }
        return dt <= DECOY_LINGER_MS; // 안 건드리면 조용히 소멸
      }

      // catch: 윈도우(-250ms) 이전의 접촉은 무시
      if (touched && dt >= -JUDGEMENT.GOOD_MS) {
        const adt = Math.abs(dt);
        const grade: Grade =
          adt <= JUDGEMENT.PERFECT_MS ? 'PERFECT' : adt <= JUDGEMENT.GREAT_MS ? 'GREAT' : 'GOOD';
        this.targetCaught++;
        this.judge(grade, def.x ?? 0.5, def.y ?? 0.5, now);
        return false;
      }
      if (dt > JUDGEMENT.GOOD_MS) {
        this.judge('MISS', def.x ?? 0.5, def.y ?? 0.5, now);
        return false;
      }
      return true;
    });

    this.feedbacks = this.feedbacks.filter((f) => now - f.bornT <= FEEDBACK_LIFETIME_MS);
  }

  private judge(grade: Grade, x: number, y: number, now: number): void {
    this.counts[grade]++;
    if (grade === 'MISS') {
      this.combo = 0;
    } else if (grade === 'DECOY') {
      this.score = Math.max(0, this.score + JUDGEMENT.DECOY_PENALTY);
      this.combo = 0;
    } else {
      this.score += JUDGEMENT.SCORE[grade] * this.multiplier;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    }
    this.feedbacks.push({ ...GRADE_STYLE[grade], x, y, bornT: now });
    this.onJudge?.(grade);
  }

  /** 곡 종료 시 1회 호출 — 보너스 합산 + 결과 산출 */
  finish(): GameResult {
    this.running = false;
    const c = this.counts;
    const fullCombo = c.MISS === 0 && c.DECOY === 0;
    this.score += JUDGEMENT.CLEAR_BONUS + (fullCombo ? JUDGEMENT.FULL_COMBO_BONUS : 0);
    const accuracy =
      this.judgeableTotal > 0
        ? ((c.PERFECT * 1.0 + c.GREAT * 0.7 + c.GOOD * 0.3) / this.judgeableTotal) * 100
        : 0;
    return {
      score: this.score,
      accuracy,
      rank: rankOf(accuracy),
      maxCombo: this.maxCombo,
      fullCombo,
      counts: { ...c },
    };
  }

  draw(ctx: CanvasRenderingContext2D, now: number, w: number, h: number, remainMs: number): void {
    if (!this.chart) return;
    const r = BUBBLE_RADIUS_RATIO * Math.min(w, h);

    for (const n of this.live) {
      const def = n.def;
      if (def.type === 'pose') {
        this.drawPose(ctx, n, now, w, h);
        continue;
      }
      const bx = (def.x ?? 0.5) * w;
      const by = (def.y ?? 0.5) * h;
      const age = now - (def.t - APPROACH_MS);
      const alpha = Math.min(1, age / 200);

      ctx.globalAlpha = alpha * 0.9;
      const grad = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, r * 0.1, bx, by, r);
      if (def.type === 'catch') {
        grad.addColorStop(0, '#ffd3e6');
        grad.addColorStop(1, '#ff5c9e');
      } else {
        grad.addColorStop(0, '#e2d6ff');
        grad.addColorStop(1, '#8f6bdf');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${r * 0.42}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.type === 'catch' ? this.chart.targetWord : (def.label ?? '다른 단어'), bx, by);

      if (def.type === 'catch') {
        const progress = Math.min(1, age / APPROACH_MS);
        const ringR = r * (1.5 - 0.5 * progress);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bx, by, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    for (const f of this.feedbacks) {
      const t = (now - f.bornT) / FEEDBACK_LIFETIME_MS;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = f.color;
      ctx.font = `800 ${Math.min(w, h) * 0.06}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x * w, f.y * h - r - t * 30);
      ctx.globalAlpha = 1;
    }

    this.drawHud(ctx, w, h, remainMs);
  }

  private drawPose(ctx: CanvasRenderingContext2D, n: LiveNote, now: number, w: number, h: number): void {
    const def = n.def;
    const dur = def.durationMs ?? 2000;
    const dt = now - def.t;
    const label = POSE_LABEL[def.pose ?? ''] ?? '포즈!';
    const cx = w / 2;
    const cy = h * 0.32;
    const fontPx = Math.min(w, h) * 0.065;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(ctx, cx - w * 0.34, cy - fontPx, w * 0.68, fontPx * 2.9, 16);
    ctx.fill();

    ctx.fillStyle = '#ffd93d';
    ctx.font = `800 ${fontPx}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dt < 0 ? `준비… ${label}` : label, cx, cy);

    // 게이지: 준비 중엔 카운트다운, 판정 중엔 유지율
    const gw = w * 0.56;
    const gy = cy + fontPx * 1.2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    this.roundRect(ctx, cx - gw / 2, gy, gw, 10, 5);
    ctx.fill();
    const ratio = dt < 0 ? 1 - -dt / APPROACH_MS : n.poseTotal > 0 ? n.poseOk / n.poseTotal : 0;
    ctx.fillStyle = dt < 0 ? '#7ec8ff' : ratio >= POSE_HOLD_PERFECT ? '#ffd93d' : '#ff5c9e';
    this.roundRect(ctx, cx - gw / 2, gy, gw * Math.max(0, Math.min(1, ratio)), 10, 5);
    ctx.fill();

    if (dt >= 0) {
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${fontPx * 0.5}px sans-serif`;
      ctx.fillText(`${Math.ceil((dur - dt) / 1000)}s`, cx, gy + fontPx * 0.9);
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D, w: number, h: number, remainMs: number): void {
    if (!this.chart) return;
    const hudFont = Math.min(w, h) * 0.045;
    ctx.textBaseline = 'top';

    // 중앙 상단: SCORE + 배율
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.roundRect(ctx, w / 2 - w * 0.18, 10, w * 0.36, hudFont * 2.6, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${hudFont * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SCORE', w / 2, 16);
    ctx.fillStyle = '#ff9cc0';
    ctx.font = `800 ${hudFont}px sans-serif`;
    ctx.fillText(`${this.score}`, w / 2, 16 + hudFont * 0.7);
    ctx.fillStyle = '#ffd93d';
    ctx.font = `700 ${hudFont * 0.6}px sans-serif`;
    ctx.fillText(`x ${this.multiplier}`, w / 2 + w * 0.13, 16 + hudFont * 0.9);

    // 좌상단: 남은 시간
    const sec = Math.max(0, Math.ceil(remainMs / 1000));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.roundRect(ctx, 10, 10, hudFont * 3.4, hudFont * 1.5, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `700 ${hudFont * 0.8}px sans-serif`;
    ctx.fillText(
      `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`,
      10 + hudFont * 0.5,
      10 + hudFont * 0.4,
    );

    // 좌측: COMBO
    ctx.fillStyle = '#ff9cc0';
    ctx.font = `700 ${hudFont * 0.6}px sans-serif`;
    ctx.fillText('COMBO', 14, h * 0.16);
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${hudFont * 1.3}px sans-serif`;
    ctx.fillText(`${this.combo}`, 14, h * 0.16 + hudFont * 0.8);

    // 우측: TARGET 진행도 (ref.png의 8/15 패널)
    const pw = w * 0.3;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.roundRect(ctx, w - pw - 10, h * 0.14, pw, hudFont * 3, 12);
    ctx.fill();
    ctx.textAlign = 'center';
    const px = w - pw / 2 - 10;
    ctx.fillStyle = '#ff9cc0';
    ctx.font = `700 ${hudFont * 0.55}px sans-serif`;
    ctx.fillText('TARGET', px, h * 0.14 + hudFont * 0.3);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${hudFont * 0.5}px sans-serif`;
    ctx.fillText(`${this.chart.targetWord} 단어`, px, h * 0.14 + hudFont * 1.05);
    ctx.font = `800 ${hudFont * 0.9}px sans-serif`;
    ctx.fillText(`${this.targetCaught} / ${this.targetTotal}`, px, h * 0.14 + hudFont * 1.8);

    // 하단: MISSION 배너
    const mh = hudFont * 1.9;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    this.roundRect(ctx, w * 0.08, h - mh - h * 0.09, w * 0.84, mh, 14);
    ctx.fill();
    ctx.fillStyle = '#ff9cc0';
    ctx.font = `700 ${hudFont * 0.45}px sans-serif`;
    ctx.fillText('MISSION', w / 2, h - mh - h * 0.09 + hudFont * 0.25);
    ctx.fillStyle = '#fff';
    ctx.font = `500 ${hudFont * 0.5}px sans-serif`;
    ctx.fillText(this.chart.mission, w / 2, h - mh - h * 0.09 + hudFont * 1.05);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
