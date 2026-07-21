import type { Grade } from './game';

/**
 * 신스 트랙: Web Audio로 합성한 곡 (음원 라이선스 리스크 0).
 * 곡별 패턴은 content/songs.json의 synth 스펙으로 정의한다 (태스크 #6에서 다곡화).
 * AudioContext.currentTime이 게임 판정의 단일 클록 (prd-detail.md R4).
 * suspend/resume으로 일시정지를 지원한다 — suspend 중에는 currentTime이
 * 멈추므로 게임 클록도 자동으로 함께 멈춘다 (FR-10).
 */

export interface SynthSpec {
  bpm: number;
  durationSec: number;
  /**
   * bass/lead 패턴 길이(마디) — 코드 진행·멜로디 후크처럼 1마디를 넘는 프레이즈용.
   * kick/snare/hat는 항상 1마디(4비트) 반복. 기본 1 (기존 곡 호환)
   */
  loopBars?: number;
  /** 마디(4비트) 내 비트 오프셋 */
  kick: number[];
  snare: number[];
  hat: number[];
  /** [비트 오프셋, MIDI 노트] — 오프셋은 loopBars×4비트 안 */
  bass: number[][];
  lead: number[][];
}

/** 기존 데모 트랙과 동일한 사운드 — 스펙 없는 곡(서버 전용 곡 등)의 폴백 */
export const DEFAULT_SYNTH: SynthSpec = {
  bpm: 120,
  durationSec: 62,
  kick: [0, 1, 2, 3],
  snare: [1, 3],
  hat: [0.5, 1.5, 2.5, 3.5],
  bass: [],
  lead: [],
};

const midiHz = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

export class SynthTrack {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private startAt = 0;
  private volumeValue = 0.5;

  readonly bpm: number;
  readonly durationSec: number;

  constructor(private readonly spec: SynthSpec = DEFAULT_SYNTH) {
    this.bpm = spec.bpm;
    this.durationSec = spec.durationSec;
  }

  /** 곡 시작 기준 경과 시간(ms) — 게임 판정의 단일 클록 */
  get timeMs(): number {
    if (!this.ctx) return 0;
    return (this.ctx.currentTime - this.startAt) * 1000;
  }

  get ended(): boolean {
    return this.ctx !== null && this.timeMs >= this.durationSec * 1000;
  }

  /** 0~1 */
  setVolume(v: number): void {
    this.volumeValue = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volumeValue;
  }

  /** fromMs부터 재생 — 곡 중간 시작(채보 에디터 seek). 이전 이벤트는 예약에서 제외 */
  async start(fromMs = 0): Promise<void> {
    await this.stop();
    const ctx = new AudioContext();
    this.ctx = ctx;
    await ctx.resume();

    this.master = ctx.createGain();
    this.master.gain.value = this.volumeValue;
    this.master.connect(ctx.destination);

    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    const beat = 60 / this.bpm;
    const bar = beat * 4;
    // startAt을 과거로 밀어 timeMs가 fromMs부터 이어지게 한다.
    // 과거 시각 이벤트는 예약하면 즉시 한꺼번에 터지므로 minT로 걸러낸다
    this.startAt = ctx.currentTime + 0.1 - fromMs / 1000;
    const minT = ctx.currentTime + 0.05;
    const songEnd = this.startAt + this.durationSec;
    const totalBars = Math.ceil(this.durationSec / bar);
    for (let b = 0; b < totalBars; b++) {
      const barT = this.startAt + b * bar;
      const inSong = (off: number) => barT + off * beat >= minT && barT + off * beat < songEnd;
      for (const off of this.spec.kick) if (inSong(off)) this.kick(barT + off * beat);
      for (const off of this.spec.snare) if (inSong(off)) this.snare(barT + off * beat);
      for (const off of this.spec.hat) if (inSong(off)) this.hat(barT + off * beat);
    }
    // bass/lead는 loopBars 단위로 반복 — 멜로디 프레이즈가 마디를 넘을 수 있다
    const loop = bar * (this.spec.loopBars ?? 1);
    const totalLoops = Math.ceil(this.durationSec / loop);
    for (let l = 0; l < totalLoops; l++) {
      const loopT = this.startAt + l * loop;
      const inSong = (off: number) => loopT + off * beat >= minT && loopT + off * beat < songEnd;
      for (const [off, note] of this.spec.bass)
        if (inSong(off)) this.bass(loopT + off * beat, midiHz(note), beat * 0.9);
      for (const [off, note] of this.spec.lead)
        if (inSong(off)) this.lead(loopT + off * beat, midiHz(note));
    }
  }

  async suspend(): Promise<void> {
    if (this.ctx?.state === 'running') await this.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
  }

  async stop(): Promise<void> {
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      await ctx.close().catch(() => {});
    }
  }

  /** 판정 효과음 */
  playHit(grade: Grade): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || ctx.state !== 'running') return;
    if (grade === 'MISS') return;
    const freq = { PERFECT: 1320, GREAT: 990, GOOD: 660, DECOY: 180, MISS: 0 }[grade];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = grade === 'DECOY' ? 'sawtooth' : 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  private snare(t: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    src.connect(bp).connect(gain).connect(this.master!);
    src.start(t);
    src.stop(t + 0.15);
  }

  private hat(t: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(hp).connect(gain).connect(this.master!);
    src.start(t);
    src.stop(t + 0.06);
  }

  private bass(t: number, hz: number, dur: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = hz;
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp).connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur);
  }

  /** 리드: 짧은 플럭 톤 */
  private lead(t: number, hz: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.22);
  }
}
