import { HandTracker } from './engine/tracker';
import { PoseTracker, type PoseFlags } from './engine/pose-tracker';
import { ChartGame, type GameResult, type GestureKind, type Grade, type PxPoint } from './engine/game';
import {
  bodyPoint,
  loadChart,
  remapChartForFraming,
  remapChartToBody,
  remapX,
  remapY,
  type BodyAnchor,
  type Chart,
  type Framing,
} from './engine/chart';
import type { MusicTrack } from './engine/audio';
import { createTrack, type TrackSpec } from './engine/track';
import { Recorder } from './engine/recorder';
import { drawEndCard, ENDCARD_MS, type EndCardInfo } from './engine/endcard';
import { FpsMeter } from './engine/metrics';

/**
 * 플레이 화면 오케스트레이터.
 * React는 이 클래스의 콜백으로 오버레이 UI만 갱신하고,
 * 캔버스 렌더링/판정 루프는 전부 여기서 imperative하게 돈다 (60fps 리렌더 방지).
 *
 * 페이즈: loading → calibration → ready → countdown → playing ⇄ paused → outro → result
 * (outro: 곡 종료 후 엔드카드를 캔버스에 그린 채 1.5초 녹화 유지 — FR-16)
 */

export type PlayPhase =
  | 'loading'
  | 'calibration'
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'outro'
  | 'result';

export interface PlayResultPayload {
  result: GameResult;
  /** 엔드카드를 제외한 게임플레이 길이(ms) — 하이라이트 클램프(FR-15)·기록 저장(FR-11)용 */
  gameplayMs: number;
  video: { url: string; ext: string; blob: Blob } | null;
}

export interface SessionOptions {
  chartUrl: string;
  /**
   * 채보 URL 비동기 결정 (api.ts resolveChartUrl 주입용) — 지정 시 chartUrl 대신 사용.
   * 엔진이 데이터 레이어를 직접 알지 않도록 콜백으로 받는다
   */
  resolveChartUrl?: () => Promise<string>;
  /** 곡의 사운드 소스 — 신스 또는 음원 파일 (songs.ts trackOf) */
  track: TrackSpec;
  /** 0~1 */
  volume: number;
  resolution: 720 | 480;
  initialOffsetMs: number;
  /** 이미 보정된 기기면 캘리브레이션 생략 */
  skipCalibration: boolean;
  /** false면 함정(decoy) 노트를 채보에서 제외 (설정 토글) */
  decoyEnabled: boolean;
  /** fullbody면 채보·보정 버블 좌표를 풀바디 리치에 맞게 리매핑 (설정) */
  framing: Framing;
  /** true면 캘리브레이션·ready 중 포즈 샘플로 프레이밍을 자동 판별해 덮어씀 */
  framingAuto: boolean;
  /** 자동 감지가 설정과 다른 프레이밍을 확정했을 때 (설정 영속화용) */
  onFramingDetected?: (framing: Framing) => void;
  onPhase: (phase: PlayPhase) => void;
  onCountdown: (n: number) => void;
  onCalProgress: (caught: number, total: number) => void;
  /** retryCount: 보정 중 놓친 테스트 버블 수 (Analytics calibration_complete) */
  onCalibrated: (offsetMs: number, retryCount: number) => void;
  onResult: (payload: PlayResultPayload) => void;
  onToast: (msg: string) => void;
  /** 판정 발생 훅 — Analytics gesture_detected 샘플링용 */
  onJudge?: (grade: Grade, gesture: GestureKind) => void;
}

// 캘리브레이션 (FR-05): 테스트 버블 3개 캐치 → Δt 중앙값으로 오프셋 산출
const CAL_TOTAL = 3;
const CAL_APPROACH_MS = 2000;
const CAL_WINDOW_MS = 600;
const CAL_MAX_OFFSET = 200;
const BUBBLE_RADIUS_RATIO = 0.075;

interface CalBubble {
  x: number;
  y: number;
  spawnT: number;
  hitT: number;
}

export class PlaySession {
  private readonly hand = new HandTracker();
  private readonly pose = new PoseTracker();
  readonly game = new ChartGame();
  private readonly track: MusicTrack;
  private readonly recorder = new Recorder();
  private readonly fpsMeter = new FpsMeter();

  private chart: Chart | null = null;
  /** 함정 필터만 적용된 클로즈업 좌표계 원본 — 프레이밍이 바뀌면 여기서 다시 리매핑 */
  private rawChart: Chart | null = null;
  private framing: Framing;
  private framingSamples = { full: 0, total: 0 };
  private lastFramingSampleT = 0;
  /** 카메라 영상이 캔버스에 그려진 사각형 — 몸 앵커를 캔버스 좌표로 옮길 때 쓴다 */
  private camRect = { dx: 0, dy: 0, dw: 0, dh: 0 };
  /** 보정·ready 중 모은 어깨 위치/너비 (캔버스 픽셀) — 중앙값이 채보의 몸 앵커가 된다 */
  private bodySamples: { cx: number; cy: number; sw: number }[] = [];
  /** 확정된 몸 앵커 — 리사이즈(화면 회전)에도 채보를 다시 맞추려고 보관 */
  private bodyAnchor: BodyAnchor | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private disposed = false;
  private phase: PlayPhase = 'loading';

  private calBubble: CalBubble | null = null;
  private calDts: number[] = [];
  private calMisses = 0;
  private calMissTotal = 0;

  private endCard: EndCardInfo | null = null;
  private outroStartT = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly video: HTMLVideoElement,
    private readonly opts: SessionOptions,
  ) {
    this.track = createTrack(opts.track);
    this.framing = opts.framing;
    this.game.offsetMs = opts.initialOffsetMs;
    this.track.setVolume(opts.volume);
    this.game.onJudge = (g, gesture) => {
      this.track.playHit(g);
      this.opts.onJudge?.(g, gesture);
    };
  }

  /** 곡 진행률 0~1 — Analytics game_quit progress_pct */
  get progress(): number {
    return Math.min(1, Math.max(0, this.track.timeMs / (this.track.durationSec * 1000)));
  }

  get mission(): string {
    return this.chart?.mission ?? '';
  }

  get fps(): number {
    return this.fpsMeter.fps;
  }

  async init(): Promise<void> {
    const [chart] = await Promise.all([
      (this.opts.resolveChartUrl?.() ?? Promise.resolve(this.opts.chartUrl)).then(loadChart),
      this.hand.init(),
      this.pose.init(),
      this.openStream(),
      // 음원 파일 곡은 여기서 받아 디코딩까지 끝낸다 — 카운트다운 후 바로 소리가 나야 한다
      this.track.preload(),
    ]);
    if (this.disposed) return;
    // 함정 OFF는 채보 자체에서 제외 — decoy는 판정 분모(accuracy)에 안 들어가므로 점수 체계 불변
    this.rawChart = this.opts.decoyEnabled
      ? chart
      : { ...chart, notes: chart.notes.filter((n) => n.type !== 'decoy') };
    // 프레이밍 리매핑은 필터 후 — 채보 파일·DB는 클로즈업 기준 단일 소스 유지.
    // framingAuto면 startGame 직전 resolveFraming()이 감지 결과로 다시 리매핑할 수 있다
    this.chart = remapChartForFraming(this.rawChart, this.framing);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
    if (this.opts.skipCalibration) {
      this.setPhase('ready');
    } else {
      this.startCalibration();
    }
  }

  startCalibration(): void {
    this.calDts = [];
    this.calMisses = 0;
    this.calMissTotal = 0;
    this.calBubble = null;
    this.opts.onCalProgress(0, CAL_TOTAL);
    this.setPhase('calibration');
  }

  /** ready/result에서 시작 (FR-05: 보정 완료 후에만 ready 진입) */
  startGame(): void {
    if (this.phase !== 'ready' && this.phase !== 'result') return;
    this.launch();
  }

  async pause(): Promise<void> {
    if (this.phase !== 'playing') return;
    await this.track.suspend(); // AudioContext 클록이 함께 멈춤 → 노트도 정지 (FR-10)
    this.recorder.pause();
    this.setPhase('paused');
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.countdownThen(async () => {
      await this.track.resume();
      this.recorder.resume();
      this.setPhase('playing');
    });
  }

  /** 곡 처음부터 — 녹화도 리셋 (FR-10) */
  restart(): void {
    if (this.phase !== 'paused' && this.phase !== 'result') return;
    this.recorder.discard();
    void this.track.stop();
    this.launch();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.recorder.discard();
    void this.track.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    // 이 세션의 스트림이 물려 있으면 해제 — 다음 세션이 깨끗한 <video>에서 시작하게
    if (this.video.srcObject === this.stream) this.video.srcObject = null;
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.canvas.width = w;
    this.canvas.height = h;
    // 화면 회전(세로↔가로)으로 비율이 바뀌면 채보 정규 좌표가 몸과 어긋난다 — 다시 맞춘다
    this.applyChartLayout();
  }

  private async openStream(): Promise<void> {
    const [w, h] = this.opts.resolution === 720 ? [1280, 720] : [640, 480];
    this.stream?.getTracks().forEach((t) => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: w }, height: { ideal: h } },
    });
    // dispose 이후에 권한이 도착하는 경쟁(React StrictMode 재마운트, 빠른 화면 이탈):
    // 공용 <video>를 건드리지 말고 카메라를 즉시 반납한다
    if (this.disposed) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    this.video.srcObject = stream;
    try {
      await this.video.play();
    } catch (err) {
      // srcObject가 교체되면 진행 중이던 play()가 AbortError("interrupted by a new load
      // request")로 끊긴다 — 세션이 버려진 경우라 무해. 그 외 에러만 올린다
      if (!this.disposed && (err as DOMException)?.name !== 'AbortError') throw err;
    }
  }

  private setPhase(p: PlayPhase): void {
    this.phase = p;
    this.opts.onPhase(p);
  }

  /**
   * 자동 감지 샘플로 프레이밍 확정 — 게임 시작 직전 1회.
   * 샘플 4개(≥2초) 미만이면 설정값 유지 (ready에서 바로 시작한 경우 등).
   */
  private resolveFraming(): void {
    let framingChanged = false;
    if (this.opts.framingAuto && this.rawChart && this.framingSamples.total >= 4) {
      const detected: Framing =
        this.framingSamples.full / this.framingSamples.total >= 0.5 ? 'fullbody' : 'closeup';
      if (detected !== this.framing) {
        this.framing = detected;
        this.opts.onFramingDetected?.(detected);
        framingChanged = true;
      }
    }
    this.bodyAnchor = this.measureBody();
    this.applyChartLayout();
    this.warnIfNoHeadroom();
    // 몸 앵커가 잡히면 프레이밍 구분 자체가 배치에 흡수된다(어깨너비가 곧 척도) — 안내는 생략.
    // 앵커가 없어 기존 프레이밍 방식으로 폴백한 경우에만 감지 결과를 알린다
    if (framingChanged && !this.bodyAnchor) {
      this.opts.onToast(
        this.framing === 'fullbody'
          ? '풀바디 프레이밍 감지 — 버블을 손 닿는 위치로 조정했어요'
          : '클로즈업 프레이밍 감지 — 버블 위치를 기본으로 조정했어요',
      );
    }
  }

  /**
   * 머리 위 노트가 화면 위로 잘리면 알려준다.
   * 카메라에 바짝 붙어 앉으면 머리 위 여백이 프레임에 없어 '만세' 노트가 상단에 몰린다 —
   * 채보가 틀린 게 아니라 카메라가 그 공간을 못 보는 것이라 유저가 물러서야 해결된다.
   */
  private warnIfNoHeadroom(): void {
    if (!this.bodyAnchor || !this.chart) return;
    const ys = this.chart.notes.map((n) => n.y).filter((y): y is number => y !== undefined);
    if (!ys.length) return;
    const CLAMP_TOP = 0.06; // remapChartToBody의 상단 클램프 값
    const clamped = ys.filter((y) => y <= CLAMP_TOP + 0.001).length;
    if (clamped >= 3) {
      this.opts.onToast('머리 위 버블이 화면에 잘려요 — 카메라에서 조금 더 떨어져 보세요');
    }
  }

  /** 모아둔 샘플의 중앙값으로 몸 앵커 확정 — 샘플이 부족하면 null (기존 프레이밍 방식으로 폴백) */
  private measureBody(): BodyAnchor | null {
    // 카운트다운 3초만으로도 5~6개는 모인다. 2개 미만이면 인식이 안 되는 상황이라 폴백
    if (this.bodySamples.length < 2) return null;
    const med = (pick: (s: { cx: number; cy: number; sw: number }) => number) => {
      const v = this.bodySamples.map(pick).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)];
    };
    const shoulderPx = med((s) => s.sw);
    // 인식이 튀어 어깨가 비정상적으로 좁거나 넓게 잡히면 신뢰하지 않는다
    if (shoulderPx < this.canvas.width * 0.04 || shoulderPx > this.canvas.width * 1.5) return null;
    return {
      cx: med((s) => s.cx),
      cy: med((s) => s.cy),
      shoulderPx,
      w: this.canvas.width,
      h: this.canvas.height,
    };
  }

  /**
   * 채보 좌표계 확정 — 몸 앵커가 있으면 그 기준(화면 비율 무관), 없으면 기존 프레이밍 리매핑.
   * 리사이즈·화면 회전 때도 다시 부른다: 정규 좌표는 캔버스 비율이 바뀌면 어긋난다.
   */
  private applyChartLayout(): void {
    if (!this.rawChart) return;
    const a = this.bodyAnchor;
    if (!a) {
      this.chart = remapChartForFraming(this.rawChart, this.framing);
      return;
    }
    // 회전·리사이즈로 캔버스가 바뀌면 앵커도 같은 비율로 옮긴다 (카메라 cover 기준)
    const scale = Math.min(this.canvas.width / a.w, this.canvas.height / a.h);
    const fitted: BodyAnchor =
      a.w === this.canvas.width && a.h === this.canvas.height
        ? a
        : {
            cx: this.canvas.width / 2 + (a.cx - a.w / 2) * scale,
            cy: this.canvas.height / 2 + (a.cy - a.h / 2) * scale,
            shoulderPx: a.shoulderPx * scale,
            w: this.canvas.width,
            h: this.canvas.height,
          };
    this.chart = remapChartToBody(this.rawChart, fitted);
  }

  private launch(): void {
    // 프레이밍·몸 앵커 확정은 카운트다운 직후 — 카운트다운 3초 동안 모인 샘플까지 쓴다.
    // (보정을 건너뛴 재방문 유저는 ready에서 바로 시작해 샘플이 모자랄 수 있다)
    this.countdownThen(async () => {
      this.resolveFraming();
      await this.track.start();
      try {
        // 곡 소리를 함께 녹화 — 캔버스 스트림에는 소리가 없다 (start 이후에만 잡힌다)
        this.recorder.start(this.canvas, this.track.captureStream()); // FR-12: 플레이 자동 녹화
      } catch {
        this.opts.onToast('이 브라우저는 녹화를 지원하지 않습니다');
      }
      this.game.start(this.chart!);
      this.setPhase('playing');
    });
  }

  private countdownThen(fn: () => void | Promise<void>): void {
    this.setPhase('countdown');
    let n = 3;
    this.opts.onCountdown(n);
    const timer = setInterval(() => {
      if (this.disposed) {
        clearInterval(timer);
        return;
      }
      n--;
      if (n > 0) {
        this.opts.onCountdown(n);
        return;
      }
      clearInterval(timer);
      this.opts.onCountdown(0);
      void fn();
    }, 900);
  }

  private async finishGame(): Promise<void> {
    if (this.phase !== 'playing') return;
    const result = this.game.finish();
    const gameplayMs = this.track.timeMs;
    const recording = this.recorder.active;

    // 녹화 중이면 엔드카드 1.5초를 영상 말미에 담고 나서 stop (FR-16)
    if (recording) {
      this.endCard = { rank: result.rank, score: result.score };
      this.outroStartT = performance.now();
      this.setPhase('outro');
    } else {
      this.setPhase('result');
    }

    let video: PlayResultPayload['video'] = null;
    try {
      if (recording) {
        await new Promise((r) => setTimeout(r, ENDCARD_MS));
        if (this.disposed) return;
      }
      if (this.recorder.active) {
        const blob = await this.recorder.stop();
        video = { url: URL.createObjectURL(blob), ext: this.recorder.ext, blob };
      }
    } catch {
      this.opts.onToast('녹화 저장에 실패했습니다');
    } finally {
      // 오디오는 녹화를 끝낸 뒤에 내린다 — 먼저 stop하면 AudioContext가 닫히면서
      // 녹음 스트림의 오디오 트랙이 끝나 엔드카드 구간이 잘릴 수 있다
      await this.track.stop();
    }
    this.setPhase('result');
    this.opts.onResult({ result, gameplayMs, video });
  }

  // ─── 메인 루프 ───────────────────────────────────────────────

  private loop = (rafNow: number): void => {
    if (this.disposed) return;
    this.fpsMeter.tick(rafNow);

    const ctx = this.canvas.getContext('2d')!;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    let cursorsPx: PxPoint[] = [];
    if (this.video.videoWidth > 0) {
      const vw = this.video.videoWidth;
      const vh = this.video.videoHeight;
      const scale = Math.max(w / vw, h / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      this.camRect = { dx, dy, dw, dh };

      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(this.video, 0, 0, dw, dh);
      ctx.restore();

      const cursors = this.hand.detect(this.video, rafNow);
      cursorsPx = cursors.map((c) => ({ x: dx + c.x * dw, y: dy + c.y * dh }));
    }

    // 몸 앵커 + 프레이밍 자동 감지 샘플링 — 게임 시작 전(보정·ready)에만, 0.5초 스로틀 (성능).
    // 앵커는 프레이밍 설정과 무관하게 늘 모은다 (채보를 화면이 아닌 몸에 맞추기 위한 것)
    if (
      (this.phase === 'calibration' || this.phase === 'ready' || this.phase === 'countdown') &&
      this.video.videoWidth > 0 &&
      rafNow - this.lastFramingSampleT > 500
    ) {
      this.lastFramingSampleT = rafNow;
      const s = this.pose.sampleFraming(this.video, rafNow);
      if (s) {
        const { dx, dy, dw, dh } = this.camRect;
        this.bodySamples.push({
          cx: dx + s.shoulderCx * dw,
          cy: dy + s.shoulderCy * dh,
          sw: s.shoulderWidth * dw,
        });
        this.framingSamples.total++;
        // 발목 가시성이 주지표, 어깨너비 <0.45는 가드 (분류 근거: reference-choreo-analysis.md)
        if (s.anklesVisible && s.shoulderWidth < 0.45) this.framingSamples.full++;
      }
    }

    if (this.phase === 'calibration') {
      this.updateCalibration(rafNow, cursorsPx, ctx, w, h);
    } else if (this.phase === 'playing') {
      const songMs = this.track.timeMs; // 게임 클록 = 오디오 클록 (R4)
      const pose: PoseFlags | null = this.game.needsPose(songMs)
        ? this.pose.detect(this.video, rafNow)
        : null;
      this.game.update(songMs, cursorsPx, pose, w, h);
      this.game.draw(ctx, songMs, w, h, this.track.durationSec * 1000 - songMs);
      if (this.track.ended || (this.game.finished && songMs > this.game.lastNoteEndMs + 1500)) {
        void this.finishGame();
      }
    } else if (this.phase === 'paused') {
      // suspend로 클록이 멈춰 있으므로 마지막 상태 그대로 그려짐
      const songMs = this.track.timeMs;
      this.game.draw(ctx, songMs, w, h, this.track.durationSec * 1000 - songMs);
    } else if (this.phase === 'outro' && this.endCard) {
      drawEndCard(ctx, w, h, this.endCard, rafNow - this.outroStartT);
    }

    // 엔드카드 위에는 손 커서를 그리지 않는다 (영상에 그대로 담기므로)
    if (this.phase === 'outro') cursorsPx = [];

    for (const c of cursorsPx) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.min(w, h) * 0.015, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#ff5c9e';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  // ─── 캘리브레이션 (FR-05) ────────────────────────────────────

  private updateCalibration(
    now: number,
    cursors: PxPoint[],
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ): void {
    if (!this.calBubble) {
      // 보정 버블도 채보와 같은 좌표계 — 오프셋이 실제 플레이 위치에서 측정되게.
      // 보정 중에도 샘플이 쌓이는 대로 몸 기준으로 옮긴다 (아직 없으면 프레이밍 방식)
      const raw = { x: 0.3 + Math.random() * 0.4, y: 0.5 + Math.random() * 0.2 };
      const anchor = this.measureBody();
      const full = this.framing === 'fullbody';
      const pos = anchor
        ? bodyPoint(raw.x, raw.y, anchor)
        : { x: full ? remapX(raw.x) : raw.x, y: full ? remapY(raw.y) : raw.y };
      this.calBubble = { ...pos, spawnT: now, hitT: now + CAL_APPROACH_MS };
    }

    const b = this.calBubble;
    const r = BUBBLE_RADIUS_RATIO * Math.min(w, h);
    const bx = b.x * w;
    const by = b.y * h;
    const dt = now - b.hitT;
    const touched = cursors.some((c) => Math.hypot(c.x - bx, c.y - by) <= r * 1.2);

    if (touched && Math.abs(dt) <= CAL_WINDOW_MS) {
      this.calDts.push(dt);
      this.calBubble = null;
      this.opts.onCalProgress(this.calDts.length, CAL_TOTAL);
      if (this.calDts.length >= CAL_TOTAL) {
        const sorted = [...this.calDts].sort((a, c) => a - c);
        const median = sorted[Math.floor(sorted.length / 2)];
        const offset = Math.max(-CAL_MAX_OFFSET, Math.min(CAL_MAX_OFFSET, Math.round(median)));
        this.game.offsetMs = offset;
        this.opts.onCalibrated(offset, this.calMissTotal);
        this.setPhase('ready');
      }
      return;
    }
    if (dt > CAL_WINDOW_MS) {
      this.calBubble = null;
      this.calMisses++;
      this.calMissTotal++;
      if (this.calMisses >= 4) {
        this.calMisses = 0;
        this.opts.onToast('손이 잘 안 잡히면 조명을 밝게 하고 카메라에서 1m 정도 떨어져 보세요');
      }
      return;
    }

    // 테스트 버블 렌더 (인게임과 동일한 룩)
    const age = now - b.spawnT;
    const alpha = Math.min(1, age / 200);
    ctx.globalAlpha = alpha * 0.9;
    const grad = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, r * 0.1, bx, by, r);
    grad.addColorStop(0, '#ffd3e6');
    grad.addColorStop(1, '#ff5c9e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${r * 0.42}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('잡기!', bx, by);
    const progress = Math.min(1, age / CAL_APPROACH_MS);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bx, by, r * (1.5 - 0.5 * progress), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
