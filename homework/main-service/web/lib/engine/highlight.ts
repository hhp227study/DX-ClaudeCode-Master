import { Recorder } from './recorder';
import { drawEndCard, ENDCARD_MS, type EndCardInfo } from './endcard';

/**
 * 하이라이트 클립 추출 (FR-15): 전체 녹화 blob을 숨김 <video>로 실시간 재생하면서
 * 캔버스에 복사 → 두 번째 MediaRecorder로 재인코딩. 말미에 엔드카드 1.5초를 덧붙인다.
 *
 * chunk 슬라이싱 대신 재인코딩을 쓰는 이유: MediaRecorder 청크는 첫 청크(init segment)
 * 없이 독립 재생이 안 되고 키프레임 경계도 보장되지 않는다. 재인코딩은 컨테이너와
 * 무관하게 동작하고(Safari mp4 포함), 클립 길이 15초 = 처리 시간 ~15초라 결과 화면
 * 뒤에서 돌리기에 충분하다.
 */

export interface HighlightSpec {
  /** 클립 시작(전체 영상 기준 ms) — 영상 길이에 맞게 내부에서 클램프된다 */
  startMs: number;
  durationMs: number;
  endCard: EndCardInfo;
}

export async function extractHighlight(source: Blob, spec: HighlightSpec): Promise<Blob> {
  const url = URL.createObjectURL(source);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  let audio: HighlightAudio | null = null;

  try {
    await waitEvent(video, 'loadedmetadata');
    const totalMs = await resolveDuration(video);
    const startMs = Math.max(0, Math.min(spec.startMs, totalMs - spec.durationMs));
    const endSec = Math.min(totalMs, startMs + spec.durationMs) / 1000;
    await seekTo(video, startMs / 1000);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    audio = tapAudio(video);
    const recorder = new Recorder();
    recorder.start(canvas, audio?.stream ?? null);
    try {
      await video.play();
      await copyFramesUntil(video, ctx, endSec);
      video.pause();
      await appendEndCard(video, ctx, spec.endCard);
      return await recorder.stop();
    } catch (err) {
      recorder.discard();
      throw err;
    }
  } finally {
    void audio?.close();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

interface HighlightAudio {
  stream: MediaStream;
  close(): Promise<void>;
}

/**
 * 원본 녹화의 소리를 클립에도 담는다.
 *
 * MediaElementSource로 <video>의 오디오를 그래프로 끌어오고 ctx.destination에는
 * 연결하지 않는다 — 녹음 스트림에만 흘려보내므로, 결과 화면 뒤에서 클립을 만드는 동안
 * 유저에게는 재생음이 들리지 않는다(기존 muted 동작 유지). 라우팅이 성립한 뒤에만
 * muted를 풀어야 안전하다: 실패 시엔 음소거 상태 그대로 무음 클립으로 폴백한다.
 */
function tapAudio(video: HTMLVideoElement): HighlightAudio | null {
  try {
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    ctx.createMediaElementSource(video).connect(dest);
    video.muted = false;
    void ctx.resume();
    return { stream: dest.stream, close: () => ctx.close().catch(() => {}) };
  } catch {
    return null; // 오디오 없이 진행 (기존 동작)
  }
}

/** MediaRecorder가 만든 webm은 duration이 Infinity — 끝으로 시킹해 실제 길이를 알아낸다 */
async function resolveDuration(video: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration * 1000;
  video.currentTime = Number.MAX_SAFE_INTEGER;
  await waitEvent(video, 'seeked');
  const sec = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : video.currentTime;
  return sec * 1000;
}

function seekTo(video: HTMLVideoElement, sec: number): Promise<void> {
  if (Math.abs(video.currentTime - sec) < 0.05) return Promise.resolve();
  const done = waitEvent(video, 'seeked');
  video.currentTime = sec;
  return done;
}

function copyFramesUntil(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  endSec: number,
): Promise<void> {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  // 재생이 멎어도 클립 길이의 2배 + 10초 안에는 반드시 끝낸다
  const deadline = performance.now() + (endSec - video.currentTime) * 2000 + 10_000;
  return new Promise((resolve) => {
    const tick = () => {
      ctx.drawImage(video, 0, 0, w, h);
      if (video.currentTime >= endSec || video.ended || performance.now() > deadline) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function appendEndCard(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  info: EndCardInfo,
): Promise<void> {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const t0 = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - t0;
      ctx.drawImage(video, 0, 0, w, h);
      drawEndCard(ctx, w, h, info, elapsed);
      if (elapsed >= ENDCARD_MS) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

function waitEvent(el: HTMLVideoElement, name: string, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${name} 대기 시간 초과`));
    }, timeoutMs);
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error('영상을 디코딩할 수 없습니다'));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      el.removeEventListener(name, onOk);
      el.removeEventListener('error', onErr);
    };
    el.addEventListener(name, onOk);
    el.addEventListener('error', onErr);
  });
}
