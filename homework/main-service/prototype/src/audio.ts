import type { Grade } from './game';

/**
 * 데모 트랙: Web Audio로 합성한 120BPM 비트 (음원 라이선스 리스크 0).
 * 핵심은 AudioContext.currentTime을 게임 판정의 단일 클록으로 쓰는 것 —
 * prd-detail.md R4: 판정 기준을 오디오 클록으로 통일.
 */
export class DemoTrack {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private startAt = 0;

  readonly bpm = 120;
  readonly durationSec = 62;

  /** 곡 시작 기준 경과 시간(ms) — 게임 판정의 단일 클록 */
  get timeMs(): number {
    if (!this.ctx) return 0;
    return (this.ctx.currentTime - this.startAt) * 1000;
  }

  get ended(): boolean {
    return this.ctx !== null && this.timeMs >= this.durationSec * 1000;
  }

  async start(): Promise<void> {
    await this.stop();
    const ctx = new AudioContext();
    this.ctx = ctx;
    await ctx.resume();

    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);

    // 스네어/햇용 노이즈 버퍼
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    const beat = 60 / this.bpm;
    this.startAt = ctx.currentTime + 0.1;
    const totalBeats = Math.floor(this.durationSec / beat);
    for (let i = 0; i < totalBeats; i++) {
      const t = this.startAt + i * beat;
      this.kick(t);
      if (i % 2 === 1) this.snare(t);
      this.hat(t + beat / 2);
    }
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
    if (!ctx || !master) return;
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
}
