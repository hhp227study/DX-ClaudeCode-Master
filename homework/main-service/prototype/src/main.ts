import { HandTracker } from './tracker';
import { PoseTracker, type PoseFlags } from './pose-tracker';
import { ChartGame } from './game';
import { loadChart, type Chart } from './chart';
import { DemoTrack } from './audio';
import { Recorder } from './recorder';
import { FpsMeter } from './metrics';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>('stage');
const ctx = canvas.getContext('2d')!;
const video = $<HTMLVideoElement>('cam');
const statsEl = $<HTMLDivElement>('stats');
const controlsEl = $<HTMLDivElement>('controls');
const countdownEl = $<HTMLDivElement>('countdown');
const toastEl = $<HTMLDivElement>('toast');

const introEl = $<HTMLDivElement>('intro');
const introStatusEl = $<HTMLDivElement>('intro-status');
const btnStart = $<HTMLButtonElement>('btn-start');

const songReadyEl = $<HTMLDivElement>('song-ready');
const songMissionEl = $<HTMLParagraphElement>('song-mission');
const btnSong = $<HTMLButtonElement>('btn-song');

const resultEl = $<HTMLDivElement>('result');
const btnRetry = $<HTMLButtonElement>('btn-retry');
const btnDownload = $<HTMLAnchorElement>('btn-download');
const btnRes = $<HTMLButtonElement>('btn-res');

const handTracker = new HandTracker();
const poseTracker = new PoseTracker();
const game = new ChartGame();
const track = new DemoTrack();
const recorder = new Recorder();
const fpsMeter = new FpsMeter();

type State = 'intro' | 'ready' | 'countdown' | 'playing' | 'result';
let state: State = 'intro';
let chart: Chart | null = null;
let stream: MediaStream | null = null;
let resolution: 720 | 480 = 720;
let lowFpsMs = 0;
let downgradeSuggested = false;
let handsDetected = 0;
let toastTimer = 0;

game.onJudge = (grade) => track.playHit(grade);

function showToast(msg: string, ms = 3000): void {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), ms);
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}
window.addEventListener('resize', resize);

async function openStream(width: number, height: number): Promise<void> {
  stream?.getTracks().forEach((t) => t.stop());
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user', width: { ideal: width }, height: { ideal: height } },
  });
  video.srcObject = stream;
  await video.play();
}

/** cover-fit으로 그려진 비디오의 캔버스 내 배치 (커서 좌표 매핑에도 사용) */
function coverRect(vw: number, vh: number, cw: number, ch: number) {
  const scale = Math.max(cw / vw, ch / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
}

function loop(rafNow: number): void {
  fpsMeter.tick(rafNow);
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);

  let cursorsPx: { x: number; y: number }[] = [];
  if (video.videoWidth > 0) {
    const r = coverRect(video.videoWidth, video.videoHeight, w, h);
    ctx.save();
    ctx.translate(r.dx + r.dw, r.dy);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, r.dw, r.dh);
    ctx.restore();

    const cursors = handTracker.detect(video, rafNow);
    handsDetected = Math.floor(cursors.length / 2);
    cursorsPx = cursors.map((c) => ({ x: r.dx + c.x * r.dw, y: r.dy + c.y * r.dh }));
  }

  if (state === 'playing') {
    // 게임 클록 = 오디오 클록 (prd-detail.md R4)
    const songMs = track.timeMs;
    // Pose Note 구간에서만 PoseLandmarker 실행 (prd-detail.md 6.2)
    const pose: PoseFlags | null = game.needsPose(songMs)
      ? poseTracker.detect(video, rafNow)
      : null;
    game.update(songMs, cursorsPx, pose, w, h);
    game.draw(ctx, songMs, w, h, track.durationSec * 1000 - songMs);

    if (track.ended || (game.finished && songMs > game.lastNoteEndMs + 1500)) {
      void finishSong();
    }
  }

  for (const c of cursorsPx) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.min(w, h) * 0.015, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#ff5c9e';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  requestAnimationFrame(loop);
}

async function finishSong(): Promise<void> {
  if (state !== 'playing') return;
  state = 'result';
  const result = game.finish();
  await track.stop();

  $('res-rank').textContent = result.rank;
  $('res-fc').textContent = result.fullCombo ? '★ FULL COMBO ★' : '';
  $('res-score').textContent = result.score.toLocaleString();
  $('res-acc').textContent = `${result.accuracy.toFixed(1)}%`;
  $('res-p').textContent = `${result.counts.PERFECT}`;
  $('res-g').textContent = `${result.counts.GREAT}`;
  $('res-gd').textContent = `${result.counts.GOOD}`;
  $('res-m').textContent = `${result.counts.MISS}`;
  $('res-x').textContent = `${result.counts.DECOY}`;
  $('res-combo').textContent = `${result.maxCombo}`;

  btnDownload.hidden = true;
  try {
    if (recorder.recording) {
      const blob = await recorder.stop();
      const ext = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
      btnDownload.href = URL.createObjectURL(blob);
      btnDownload.download = `catchrhy-play.${ext}`;
      btnDownload.textContent = `영상 다운로드 (${(blob.size / 1024 / 1024).toFixed(1)}MB)`;
      btnDownload.hidden = false;
    }
  } catch {
    showToast('녹화 저장에 실패했습니다');
  }
  resultEl.hidden = false;
}

function startCountdown(): void {
  if (!chart) return;
  state = 'countdown';
  songReadyEl.hidden = true;
  resultEl.hidden = true;
  countdownEl.style.display = 'flex';
  let n = 3;
  countdownEl.textContent = `${n}`;
  const timer = window.setInterval(() => {
    n--;
    if (n > 0) {
      countdownEl.textContent = `${n}`;
      return;
    }
    window.clearInterval(timer);
    countdownEl.style.display = 'none';
    void (async () => {
      await track.start();
      try {
        recorder.start(canvas); // FR-12: 플레이 자동 녹화
      } catch {
        showToast('이 브라우저는 녹화를 지원하지 않습니다');
      }
      game.start(chart!);
      state = 'playing';
    })();
  }, 900);
}

function updateStats(): void {
  const fps = fpsMeter.fps;
  const handMs = handTracker.inferenceMs.avg;
  const poseMs = poseTracker.inferenceMs.avg;
  const fpsClass = fps >= 20 ? 'ok' : 'warn';
  const c = game.counts;

  statsEl.innerHTML =
    `<span class="${fpsClass}">FPS ${fps.toFixed(1)}</span>  손 ${handMs.toFixed(1)}ms (${handTracker.delegate})  포즈 ${poseMs.toFixed(1)}ms\n` +
    `해상도 ${video.videoWidth}×${video.videoHeight}  손 ${handsDetected}개  코덱 ${recorder.mimeType || Recorder.pickMime() || '미지원'}` +
    (recorder.recording ? '  <span class="warn">● REC</span>' : '') +
    `\nP ${c.PERFECT} / G ${c.GREAT} / g ${c.GOOD} / M ${c.MISS} / X ${c.DECOY}  MAX콤보 ${game.maxCombo}`;

  // 지속 저성능 → 480p 다운그레이드 권장 (prd-detail.md 6.4)
  if (video.videoWidth > 0) {
    lowFpsMs = fps > 0 && fps < 20 ? lowFpsMs + 250 : 0;
    if (lowFpsMs >= 5000 && resolution === 720 && !downgradeSuggested) {
      downgradeSuggested = true;
      showToast('성능이 낮습니다 — 우상단 버튼으로 480p 전환을 권장합니다', 5000);
    }
  }
}

btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  try {
    introStatusEl.textContent = 'AI 모델(손+포즈) 로딩 + 카메라 권한 요청 중…';
    const [, , loadedChart] = await Promise.all([
      handTracker.init(),
      poseTracker.init(),
      loadChart('/charts/demo-normal.json'),
      openStream(1280, 720),
    ] as const);
    chart = loadedChart;

    introEl.remove();
    controlsEl.hidden = false;
    statsEl.hidden = false;
    songMissionEl.textContent = chart.mission;
    songReadyEl.hidden = false;
    state = 'ready';
    resize();
    requestAnimationFrame(loop);
    setInterval(updateStats, 250);
  } catch (err) {
    btnStart.disabled = false;
    introStatusEl.textContent =
      err instanceof Error ? `실패: ${err.message}` : '초기화에 실패했습니다. 다시 시도해주세요.';
  }
});

btnSong.addEventListener('click', startCountdown);
btnRetry.addEventListener('click', startCountdown);

btnRes.addEventListener('click', async () => {
  btnRes.disabled = true;
  try {
    if (resolution === 720) {
      await openStream(640, 480);
      resolution = 480;
      btnRes.textContent = '480p → 720p';
    } else {
      await openStream(1280, 720);
      resolution = 720;
      btnRes.textContent = '720p → 480p';
    }
    showToast(`해상도 전환: ${video.videoWidth}×${video.videoHeight}`);
  } catch {
    showToast('해상도 전환 실패');
  } finally {
    btnRes.disabled = false;
  }
});
