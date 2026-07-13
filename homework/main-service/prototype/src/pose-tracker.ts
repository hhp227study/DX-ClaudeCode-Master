import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { RollingAvg } from './metrics';

export interface PoseFlags {
  hands_up: boolean;
  heart: boolean;
}

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// BlazePose 랜드마크 인덱스
const NOSE = 0;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_WRIST = 15;
const R_WRIST = 16;
const L_INDEX = 19;
const R_INDEX = 20;

const HEART_INDEX_DIST = 0.18; // 정규화 좌표 기준 양손 검지 근접 임계값

/**
 * PoseLandmarker 래퍼. prd-detail.md 6.2:
 * 성능 절약을 위해 Pose Note 구간에서만 detect()가 호출된다 (호출 제어는 main).
 */
export class PoseTracker {
  private landmarker: PoseLandmarker | null = null;
  private lastVideoTime = -1;
  private lastFlags: PoseFlags = { hands_up: false, heart: false };
  readonly inferenceMs = new RollingAvg(30);

  async init(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      this.landmarker = await this.create(fileset, 'GPU');
    } catch {
      this.landmarker = await this.create(fileset, 'CPU');
    }
  }

  private create(fileset: unknown, delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
    return PoseLandmarker.createFromOptions(fileset as never, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  }

  detect(video: HTMLVideoElement, nowMs: number): PoseFlags {
    if (!this.landmarker) return this.lastFlags;
    if (video.currentTime === this.lastVideoTime) return this.lastFlags;
    this.lastVideoTime = video.currentTime;

    const t0 = performance.now();
    const result = this.landmarker.detectForVideo(video, nowMs);
    this.inferenceMs.push(performance.now() - t0);

    const lm = result.landmarks[0];
    if (!lm) {
      this.lastFlags = { hands_up: false, heart: false };
      return this.lastFlags;
    }

    // y는 화면 아래로 갈수록 커짐 → "위"는 y가 작은 것
    const handsUp = lm[L_WRIST].y < lm[L_SHOULDER].y && lm[R_WRIST].y < lm[R_SHOULDER].y;
    const indexDist = Math.hypot(lm[L_INDEX].x - lm[R_INDEX].x, lm[L_INDEX].y - lm[R_INDEX].y);
    const heart =
      lm[L_WRIST].y < lm[NOSE].y && lm[R_WRIST].y < lm[NOSE].y && indexDist < HEART_INDEX_DIST;

    this.lastFlags = { hands_up: handsUp, heart };
    return this.lastFlags;
  }
}
