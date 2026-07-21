import type { Grade } from './game';
import { playHitOn, type MusicTrack } from './audio';

/**
 * 음원 파일 트랙 — MP3를 AudioBuffer로 디코딩해 재생한다.
 *
 * <audio> 엘리먼트가 아니라 AudioBufferSourceNode를 쓰는 이유: 판정 클록이
 * AudioContext.currentTime이어야 하기 때문(prd-detail.md R4). HTMLMediaElement.currentTime은
 * 갱신이 성기고 지터가 커서 ±250ms 판정 윈도우의 기준으로 쓸 수 없다.
 * BufferSource로 재생하면 SynthTrack과 완전히 같은 클록·일시정지(suspend) 규약을 공유한다.
 *
 * 좌표계 주의: timeMs는 "음원 파일 내 재생 위치"다. 채보의 노트 t도 같은 기준이므로
 * 첫 다운비트가 파일 0ms가 아닌 곡(대부분의 실제 음원)은 firstBeatMs만큼 밀린 비트 그리드를
 * 채보 생성기가 그대로 반영한다 (scripts/gen-chart.mjs).
 */

export interface AudioSpec {
  /** public/ 기준 절대 경로 */
  url: string;
  bpm: number;
  /** 게임이 끝나는 시점(초) — 파일이 더 길어도 여기서 종료한다 */
  durationSec: number;
  /** 파일 시작 기준 첫 다운비트 위치(ms) — 비트 그리드의 원점 */
  firstBeatMs: number;
  /** 곡 끝에서 페이드아웃할 길이(ms). 하이라이트 구간만 쓰는 곡의 급정거 방지 */
  fadeOutMs?: number;
  /** 곡 선택 화면 미리듣기 시작 위치(ms) — 조용한 인트로 대신 후렴을 들려준다 */
  previewFromMs?: number;
}

/** 디코딩 결과 캐시 — 재시도·seek(에디터)마다 7MB를 다시 받지 않게 한다 */
const bufferCache = new Map<string, Promise<ArrayBuffer>>();

const fetchAudio = (url: string): Promise<ArrayBuffer> => {
  const hit = bufferCache.get(url);
  if (hit) return hit;
  const p = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`음원 로드 실패: ${res.status}`);
    return res.arrayBuffer();
  });
  bufferCache.set(url, p);
  // 실패한 응답은 캐시에 남기지 않는다 (다음 시도에서 재요청)
  void p.catch(() => bufferCache.delete(url));
  return p;
};

export class FileTrack implements MusicTrack {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private startAt = 0;
  private volumeValue = 0.5;

  readonly bpm: number;
  readonly durationSec: number;

  constructor(private readonly spec: AudioSpec) {
    this.bpm = spec.bpm;
    this.durationSec = spec.durationSec;
  }

  get timeMs(): number {
    if (!this.ctx) return 0;
    return (this.ctx.currentTime - this.startAt) * 1000;
  }

  get ended(): boolean {
    return this.ctx !== null && this.timeMs >= this.durationSec * 1000;
  }

  setVolume(v: number): void {
    this.volumeValue = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volumeValue;
  }

  /**
   * 네트워크 수신 + 디코딩을 미리 끝내둔다. PlaySession.init()이 카메라·모델 로딩과
   * 함께 병렬로 호출하므로, 카운트다운 후 start()는 즉시 소리가 난다.
   */
  async preload(): Promise<void> {
    if (this.buffer) return;
    const bytes = await fetchAudio(this.spec.url);
    // 디코딩 전용 컨텍스트 — 재생용 ctx는 start()에서 새로 만든다(수명이 다름).
    // decodeAudioData는 ArrayBuffer를 소비(detach)하므로 캐시본은 복사해서 넘긴다
    const tmp = new AudioContext();
    try {
      this.buffer = await tmp.decodeAudioData(bytes.slice(0));
    } finally {
      await tmp.close().catch(() => {});
    }
  }

  async start(fromMs = 0): Promise<void> {
    await this.stop();
    await this.preload();
    const buffer = this.buffer;
    if (!buffer) throw new Error('음원이 준비되지 않았습니다');

    const ctx = new AudioContext();
    this.ctx = ctx;
    await ctx.resume();

    this.master = ctx.createGain();
    this.master.gain.value = this.volumeValue;
    this.master.connect(ctx.destination);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.master);

    // SynthTrack과 같은 규약: startAt을 과거로 밀어 timeMs가 fromMs부터 이어지게 한다
    const at = ctx.currentTime + 0.1;
    this.startAt = at - fromMs / 1000;
    src.start(at, Math.max(0, fromMs / 1000));
    this.source = src;

    this.scheduleFadeOut();
  }

  /** 곡 끝(durationSec)에 맞춰 볼륨을 내린다 — 하이라이트 구간 컷의 급정거 방지 */
  private scheduleFadeOut(): void {
    const fade = this.spec.fadeOutMs ?? 0;
    const ctx = this.ctx;
    const master = this.master;
    // 볼륨 0에서는 지수 램프를 걸 수 없다 (0에서 출발 불가) — 어차피 무음이라 건너뛴다
    if (!fade || !ctx || !master || this.volumeValue <= 0.0001) return;
    const endT = this.startAt + this.durationSec;
    const fadeFrom = Math.max(ctx.currentTime, endT - fade / 1000);
    master.gain.setValueAtTime(this.volumeValue, fadeFrom);
    // exponentialRamp는 0에 닿지 못한다 — 청감상 무음인 값까지 내리고 끝낸다
    master.gain.exponentialRampToValueAtTime(0.0001, endT);
  }

  async suspend(): Promise<void> {
    if (this.ctx?.state === 'running') await this.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
  }

  async stop(): Promise<void> {
    try {
      this.source?.stop();
    } catch {
      /* 이미 끝났거나 시작 전인 소스 — ctx.close()로 어차피 정리된다 */
    }
    this.source = null;
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      this.master = null;
      await ctx.close().catch(() => {});
    }
  }

  playHit(grade: Grade): void {
    if (this.ctx && this.master) playHitOn(this.ctx, this.master, grade);
  }
}
