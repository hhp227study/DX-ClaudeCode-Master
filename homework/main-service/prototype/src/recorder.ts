/**
 * canvas.captureStream + MediaRecorder 녹화 (스파이크 게이트 #3).
 * Safari는 webm 미지원 → mp4 폴백 체인. prd-detail.md R5 검증 포인트.
 */

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
];

const VIDEO_BITRATE = 2_500_000; // prd-detail.md R7: 2.5Mbps 상한

export class Recorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  mimeType = '';

  static pickMime(): string {
    if (typeof MediaRecorder === 'undefined') return '';
    return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  }

  get recording(): boolean {
    return this.recorder?.state === 'recording';
  }

  start(canvas: HTMLCanvasElement): void {
    const mime = Recorder.pickMime();
    if (!mime) throw new Error('이 브라우저는 MediaRecorder를 지원하지 않습니다');
    this.mimeType = mime;
    this.chunks = [];
    const stream = canvas.captureStream(30);
    this.recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: VIDEO_BITRATE,
    });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(1000);
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const r = this.recorder;
      if (!r || r.state === 'inactive') {
        reject(new Error('녹화 중이 아닙니다'));
        return;
      }
      r.onstop = () => resolve(new Blob(this.chunks, { type: this.mimeType }));
      r.stop();
    });
  }
}
