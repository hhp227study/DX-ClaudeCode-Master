'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlaySession, type PlayPhase, type PlayResultPayload } from '@/lib/play-session';
import { extractHighlight } from '@/lib/engine/highlight';
import { chartUrl, getSong, trackOf, type Difficulty } from '@/lib/songs';
import { loadPrefs, savePrefs } from '@/lib/store';
import { resolveChartUrl, submitPlay } from '@/lib/api';
import { track } from '@/lib/analytics';

// FR-15: 최대 콤보 시점 -7초부터 15초 클립. 클립보다 넉넉히 긴 플레이만 추출한다.
const HIGHLIGHT_MS = 15_000;
const HIGHLIGHT_LEAD_MS = 7_000;
const HIGHLIGHT_MIN_GAMEPLAY_MS = HIGHLIGHT_MS + 2_000;

type Clip =
  | { status: 'none' }
  | { status: 'making' }
  | { status: 'ready'; url: string; ext: string; blob: Blob }
  | { status: 'failed' };

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}

/** Camera Calibration + Game + Pause + Result (8.5~8.8) */
function PlayInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const songId = sp.get('song') ?? 'demo-track';
  const difficulty = (sp.get('difficulty') as Difficulty) ?? 'normal';
  const song = getSong(songId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<PlaySession | null>(null);

  const [phase, setPhase] = useState<PlayPhase>('loading');
  const [count, setCount] = useState(0);
  const [calProgress, setCalProgress] = useState<[number, number]>([0, 3]);
  const [offsetMs, setOffsetMs] = useState<number | null>(null);
  const [payload, setPayload] = useState<PlayResultPayload | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [clip, setClip] = useState<Clip>({ status: 'none' });
  const [tab, setTab] = useState<'highlight' | 'full'>('full');
  const [feedback, setFeedback] = useState<boolean | null>(null); // 인식 체감 👍/👎 (8.8)
  const clipRunRef = useRef(0);
  const prevPhaseRef = useRef<PlayPhase>('loading');
  const beforeCountdownRef = useRef<PlayPhase>('loading');

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !song) return;

    const prefs = loadPrefs();
    const session = new PlaySession(canvas, video, {
      chartUrl: chartUrl(songId, difficulty),
      // DB chart_url 우선 (에디터가 Storage에 저장한 채보가 배포 없이 반영) — 실패 시 위 정적 경로
      resolveChartUrl: () => resolveChartUrl(songId, difficulty),
      track: trackOf(songId),
      volume: prefs.volume / 100,
      resolution: prefs.resolution,
      initialOffsetMs: prefs.offsetMs,
      skipCalibration: prefs.calibrated,
      decoyEnabled: prefs.decoyEnabled,
      framing: prefs.framing,
      framingAuto: prefs.framingAuto,
      onFramingDetected: (framing) => savePrefs({ framing }),
      onPhase: (ph) => {
        // game_start: 일시정지 재개(paused→countdown→playing)가 아닌 곡 시작만 기록 (12.1)
        if (ph === 'countdown') beforeCountdownRef.current = prevPhaseRef.current;
        if (
          ph === 'playing' &&
          prevPhaseRef.current === 'countdown' &&
          beforeCountdownRef.current !== 'paused'
        ) {
          track('game_start', { song_id: songId, difficulty });
        }
        prevPhaseRef.current = ph;
        setPhase(ph);
      },
      onCountdown: setCount,
      onCalProgress: (n, total) => setCalProgress([n, total]),
      onCalibrated: (ms, retryCount) => {
        savePrefs({ offsetMs: ms, calibrated: true });
        setOffsetMs(ms);
        track('calibration_complete', { measured_latency_ms: ms, retry_count: retryCount });
      },
      onJudge: (grade, gesture) => {
        if (Math.random() < 0.1) track('gesture_detected', { gesture, judgement: grade }); // 10% 샘플링
      },
      onResult: (p) => {
        setPayload(p);
        setFeedback(null);
        track('game_finish', {
          song_id: songId,
          difficulty,
          score: p.result.score,
          accuracy: Number(p.result.accuracy.toFixed(1)),
          rank: p.result.rank,
          max_combo: p.result.maxCombo,
          avg_fps: Math.round(sessionRef.current?.fps ?? 0),
        });
        // 로그인 시 서버 plays 저장(FR-11), 항상 로컬 베스트 갱신(FR-17) — api.ts
        void submitPlay(songId, difficulty, p.result, p.gameplayMs / 1000).then((o) => {
          setIsNewRecord(o.isNewRecord);
          track('result_viewed', { is_new_record: o.isNewRecord });
        });
      },
      onToast: (m) => {
        setToast(m);
        window.setTimeout(() => setToast(''), 3500);
      },
    });
    sessionRef.current = session;

    session
      .init()
      .then(() => {
        if (sessionRef.current !== session) return; // 재마운트로 교체된 세션 — 무시
        track('camera_permission', { status: 'granted' });
      })
      .catch((err: unknown) => {
        if (sessionRef.current !== session) return; // 교체된 세션의 에러로 오버레이 띄우지 않기
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          track('camera_permission', { status: 'denied' });
          setError(
            '카메라 권한이 거부되었습니다.\n브라우저 주소창의 카메라 아이콘(또는 사이트 설정)에서 허용한 뒤 다시 시도해주세요.',
          );
        } else {
          setError(err instanceof Error ? err.message : '초기화에 실패했습니다.');
        }
      });

    const onResize = () => session.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      session.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, difficulty]);

  // 결과 도착 시 하이라이트 클립을 백그라운드에서 재인코딩 (FR-15, 공유 기본값)
  useEffect(() => {
    const v = payload?.video;
    if (!payload || !v || payload.gameplayMs < HIGHLIGHT_MIN_GAMEPLAY_MS) {
      setClip({ status: 'none' });
      setTab('full');
      return;
    }
    const run = ++clipRunRef.current;
    setClip({ status: 'making' });
    setTab('highlight');
    const startMs = Math.max(
      0,
      Math.min(payload.result.maxComboAtMs - HIGHLIGHT_LEAD_MS, payload.gameplayMs - HIGHLIGHT_MS),
    );
    extractHighlight(v.blob, {
      startMs,
      durationMs: HIGHLIGHT_MS,
      endCard: { rank: payload.result.rank, score: payload.result.score },
    })
      .then((blob) => {
        if (clipRunRef.current !== run) return;
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        setClip({ status: 'ready', url: URL.createObjectURL(blob), ext, blob });
      })
      .catch(() => {
        if (clipRunRef.current !== run) return;
        setClip({ status: 'failed' });
        setTab('full');
      });
    return () => {
      clipRunRef.current++;
    };
  }, [payload]);

  /** 현재 탭이 가리키는 공유/저장 대상 */
  const shownVideo =
    tab === 'highlight'
      ? clip.status === 'ready'
        ? { url: clip.url, ext: clip.ext, blob: clip.blob, name: 'catchrhy-highlight' }
        : null
      : payload?.video
        ? { ...payload.video, name: 'catchrhy-play' }
        : null;

  const share = async () => {
    const shareType = tab === 'highlight' ? 'highlight' : 'full';
    track('share_clicked', { type: shareType }); // H2 North Star (12.1)
    if (tab === 'highlight' && clip.status === 'making') {
      setToast('하이라이트 생성 중이에요 — 잠시 후 다시 시도해주세요');
      window.setTimeout(() => setToast(''), 3500);
      return;
    }
    const v = shownVideo;
    if (!v) return;
    const file = new File([v.blob], `${v.name}.${v.ext}`, { type: v.blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'CatchRhy', text: 'Catch the Rhythm!' });
        track('share_completed', { type: shareType });
      } catch {
        /* 유저가 공유 시트를 닫음 */
      }
    } else {
      setToast('이 브라우저는 파일 공유 미지원 — 저장 후 업로드해주세요');
      window.setTimeout(() => setToast(''), 3500);
    }
  };

  if (!song) {
    return (
      <main className="screen">
        <p>곡을 찾을 수 없습니다.</p>
        <button className="btn secondary" onClick={() => router.push('/select')}>
          곡 선택으로
        </button>
      </main>
    );
  }

  return (
    <div className="play-root">
      <canvas ref={canvasRef} className="stage" />
      <video ref={videoRef} playsInline muted autoPlay style={{ display: 'none' }} />

      {phase === 'playing' && (
        <button className="hud-btn" aria-label="일시정지" onClick={() => void sessionRef.current?.pause()}>
          ⏸
        </button>
      )}

      {phase === 'countdown' && <div className="countdown">{count > 0 ? count : 'GO!'}</div>}
      {toast && <div className="toast">{toast}</div>}

      {error && (
        <div className="play-overlay">
          <p style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>{error}</p>
          <div className="actions">
            <button className="btn" onClick={() => window.location.reload()}>
              다시 시도
            </button>
            <button className="btn secondary" onClick={() => router.push('/select')}>
              돌아가기
            </button>
          </div>
        </div>
      )}

      {!error && phase === 'loading' && (
        <div className="play-overlay">
          <p>AI 모델 로딩 + 카메라 준비 중…</p>
          <p className="dim">첫 실행은 몇 초 걸릴 수 있어요</p>
        </div>
      )}

      {phase === 'calibration' && (
        <div className="play-overlay transparent">
          <div className="cal-banner">
            <b>판정 보정</b> — 얼굴과 양손이 화면에 나오게 서서
            <br />
            나타나는 버블을 <b>링이 닿는 순간</b> 잡아주세요 ({calProgress[0]}/{calProgress[1]})
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <div className="play-overlay">
          <h2>
            {song.title} · {difficulty === 'easy' ? 'Easy' : 'Normal'}
          </h2>
          <p className="dim">{sessionRef.current?.mission}</p>
          {offsetMs !== null && <p className="dim">측정된 판정 오프셋: {offsetMs}ms</p>}
          <button className="btn" onClick={() => sessionRef.current?.startGame()}>
            START
          </button>
          <button className="btn secondary small" onClick={() => sessionRef.current?.startCalibration()}>
            다시 보정
          </button>
          <p className="dim">시작하면 플레이 영상이 자동 녹화됩니다 (기기에서만 처리)</p>
        </div>
      )}

      {phase === 'paused' && (
        <div className="play-overlay">
          <h2>일시정지</h2>
          <div className="actions" style={{ flexDirection: 'column' }}>
            <button className="btn" onClick={() => sessionRef.current?.resume()}>
              계속하기
            </button>
            <button className="btn secondary" onClick={() => sessionRef.current?.restart()}>
              다시 시작
            </button>
            <button
              className="btn secondary"
              onClick={() => {
                if (window.confirm('나가면 이번 플레이 기록과 영상이 사라집니다.')) {
                  track('game_quit', {
                    progress_pct: Math.round((sessionRef.current?.progress ?? 0) * 100),
                  });
                  router.push('/select');
                }
              }}
            >
              나가기
            </button>
          </div>
        </div>
      )}

      {phase === 'result' && payload && (
        <div className="play-overlay" style={{ gap: 8 }}>
          <div className="result-rank">{payload.result.rank}</div>
          {payload.result.fullCombo && <div style={{ color: '#6bffb0', fontWeight: 800 }}>★ FULL COMBO ★</div>}
          {isNewRecord && <span className="badge">NEW RECORD!</span>}
          <div className="result-score">{payload.result.score.toLocaleString()}</div>
          <table className="result-table">
            <tbody>
              <tr>
                <td>Accuracy</td>
                <td>{payload.result.accuracy.toFixed(1)}%</td>
              </tr>
              <tr>
                <td>PERFECT / GREAT / GOOD</td>
                <td>
                  {payload.result.counts.PERFECT} / {payload.result.counts.GREAT} /{' '}
                  {payload.result.counts.GOOD}
                </td>
              </tr>
              <tr>
                <td>MISS / 함정 접촉</td>
                <td>
                  {payload.result.counts.MISS} / {payload.result.counts.DECOY}
                </td>
              </tr>
              <tr>
                <td>MAX COMBO</td>
                <td>{payload.result.maxCombo}</td>
              </tr>
            </tbody>
          </table>

          {payload.video && (
            <>
              {clip.status !== 'none' && (
                <div className="tabs" role="tablist">
                  <button
                    role="tab"
                    aria-selected={tab === 'highlight'}
                    className={tab === 'highlight' ? 'active' : ''}
                    onClick={() => setTab('highlight')}
                  >
                    하이라이트 15초
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === 'full'}
                    className={tab === 'full' ? 'active' : ''}
                    onClick={() => setTab('full')}
                  >
                    전체 영상
                  </button>
                </div>
              )}
              {tab === 'highlight' && clip.status === 'making' && (
                <div className="clip-placeholder">
                  최대 콤보 구간으로
                  <br />
                  하이라이트 클립 생성 중… (약 15초)
                </div>
              )}
              {tab === 'highlight' && clip.status === 'ready' && (
                <video className="result-video" src={clip.url} controls playsInline loop />
              )}
              {tab === 'full' && (
                <video className="result-video" src={payload.video.url} controls playsInline loop />
              )}
            </>
          )}

          <div className="actions">
            <button className="btn" onClick={() => void share()}>
              공유하기
            </button>
            {shownVideo && (
              <a
                className="btn secondary"
                href={shownVideo.url}
                download={`${shownVideo.name}.${shownVideo.ext}`}
                onClick={() =>
                  track('video_saved', {
                    type: tab === 'highlight' ? 'highlight' : 'full',
                    size_mb: +(shownVideo.blob.size / 1048576).toFixed(1),
                  })
                }
              >
                영상 저장
              </a>
            )}
          </div>

          <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
            {feedback === null ? (
              <>
                <span className="dim">손 인식이 잘 됐나요?</span>
                {[true, false].map((positive) => (
                  <button
                    key={String(positive)}
                    className="btn secondary small"
                    onClick={() => {
                      setFeedback(positive);
                      track('recognition_feedback', { positive }); // H3 (12.1)
                    }}
                  >
                    {positive ? '👍' : '👎'}
                  </button>
                ))}
              </>
            ) : (
              <span className="dim">피드백 감사합니다!</span>
            )}
          </div>
          <div className="actions">
            <button className="btn secondary small" onClick={() => sessionRef.current?.restart()}>
              다시하기
            </button>
            <button className="btn secondary small" onClick={() => router.push('/select')}>
              다른 곡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
