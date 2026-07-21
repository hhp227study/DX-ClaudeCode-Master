import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { RollingAvg } from './metrics';

/** 비디오 정규화 좌표(0~1). x는 미러 표시 기준으로 이미 반전됨 */
export interface Cursor {
  x: number;
  y: number;
}

// npm 패키지 버전(0.10.14)과 wasm 버전을 반드시 일치시킬 것
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';
// prd-detail.md 6.4: 손떨림 판정 오작동 방지용 EMA 스무딩
const EMA_ALPHA = 0.5;

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private smoothed = new Map<number, Cursor[]>();
  private lastVideoTime = -1;
  private lastCursors: Cursor[] = [];
  readonly inferenceMs = new RollingAvg(30);
  delegate: 'GPU' | 'CPU' = 'GPU';

  async init(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      this.landmarker = await this.create(fileset, 'GPU');
    } catch {
      // 일부 기기는 WebGL delegate 초기화에 실패 → CPU 폴백
      this.delegate = 'CPU';
      this.landmarker = await this.create(fileset, 'CPU');
    }
  }

  private create(fileset: unknown, delegate: 'GPU' | 'CPU'): Promise<HandLandmarker> {
    return HandLandmarker.createFromOptions(fileset as never, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    });
  }

  /** 새 비디오 프레임이 있을 때만 추론. 손마다 [검지 끝, 손바닥 중심] 2개 커서 반환 */
  detect(video: HTMLVideoElement, nowMs: number): Cursor[] {
    if (!this.landmarker) return this.lastCursors;
    if (video.currentTime === this.lastVideoTime) return this.lastCursors;
    this.lastVideoTime = video.currentTime;

    const t0 = performance.now();
    const result = this.landmarker.detectForVideo(video, nowMs);
    this.inferenceMs.push(performance.now() - t0);

    const cursors: Cursor[] = [];
    result.landmarks.forEach((lm, handIdx) => {
      const tip = lm[8]; // INDEX_FINGER_TIP
      const palm = {
        x: (lm[0].x + lm[5].x + lm[17].x) / 3,
        y: (lm[0].y + lm[5].y + lm[17].y) / 3,
      };
      const raw: Cursor[] = [
        { x: 1 - tip.x, y: tip.y },
        { x: 1 - palm.x, y: palm.y },
      ];
      const prev = this.smoothed.get(handIdx);
      const pair = raw.map((c, i) => {
        const p = prev?.[i];
        if (!p) return c;
        return {
          x: p.x + EMA_ALPHA * (c.x - p.x),
          y: p.y + EMA_ALPHA * (c.y - p.y),
        };
      });
      this.smoothed.set(handIdx, pair);
      cursors.push(...pair);
    });
    if (result.landmarks.length === 0) this.smoothed.clear();

    this.lastCursors = cursors;
    return cursors;
  }
}
