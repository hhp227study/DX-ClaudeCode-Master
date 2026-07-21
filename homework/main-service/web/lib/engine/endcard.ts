/**
 * 영상 엔드카드 (FR-16): 점수·랭크·로고 오버레이.
 * 녹화 캔버스에 직접 그려서 저장/공유 영상 말미에 포함시킨다 (바이럴 루프용 워터마크).
 * 전체 영상(play-session의 outro)과 하이라이트 클립(highlight.ts) 양쪽에서 사용.
 */

export const ENDCARD_MS = 1500;
const FADE_MS = 350;

export interface EndCardInfo {
  rank: string;
  score: number;
}

/** elapsedMs: 엔드카드 시작 이후 경과 시간 — 페이드인/팝 연출에 사용 */
export function drawEndCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  info: EndCardInfo,
  elapsedMs: number,
): void {
  const t = Math.max(0, Math.min(1, elapsedMs / FADE_MS));
  const base = Math.min(w, h);

  ctx.save();
  ctx.fillStyle = `rgba(20, 10, 35, ${0.78 * t})`;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = t;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 로고: Catch(흰) + Rhy(핑크)
  const logoPx = base * 0.09;
  ctx.font = `900 ${logoPx}px sans-serif`;
  const catchW = ctx.measureText('Catch').width;
  const rhyW = ctx.measureText('Rhy').width;
  const logoX = w / 2 - (catchW + rhyW) / 2;
  const logoY = h * 0.3;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText('Catch', logoX, logoY);
  ctx.fillStyle = '#ff5c9e';
  ctx.fillText('Rhy', logoX + catchW, logoY);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cbb8e0';
  ctx.font = `600 ${base * 0.032}px sans-serif`;
  ctx.fillText('Catch the Rhythm!', w / 2, logoY + logoPx * 0.95);

  // 랭크: 살짝 팝(scale) 연출
  const pop = 1 + 0.25 * (1 - t);
  ctx.save();
  ctx.translate(w / 2, h * 0.52);
  ctx.scale(pop, pop);
  ctx.fillStyle = '#ffd93d';
  ctx.shadowColor = 'rgba(255, 217, 61, 0.55)';
  ctx.shadowBlur = base * 0.05;
  ctx.font = `900 ${base * 0.2}px sans-serif`;
  ctx.fillText(info.rank, 0, 0);
  ctx.restore();

  ctx.globalAlpha = t;
  ctx.fillStyle = '#ff9cc0';
  ctx.font = `800 ${base * 0.07}px sans-serif`;
  ctx.fillText(info.score.toLocaleString(), w / 2, h * 0.66);
  ctx.fillStyle = '#cbb8e0';
  ctx.font = `600 ${base * 0.028}px sans-serif`;
  ctx.fillText('SCORE', w / 2, h * 0.66 + base * 0.065);

  ctx.restore();
}
