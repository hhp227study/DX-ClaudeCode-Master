'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { synthOf, type Difficulty } from '@/lib/songs';
import { fetchSongs, type SongWithBest } from '@/lib/api';
import { SynthTrack } from '@/lib/engine/audio';
import { track } from '@/lib/analytics';

/** Song Select — 곡·난이도 선택 + 미리듣기 (8.4) */
export default function SelectPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongWithBest[] | null>(null);
  const trackRef = useRef<SynthTrack | null>(null);
  const previewTimer = useRef(0);

  useEffect(() => {
    let on = true;
    // 서버 카탈로그 + 내 베스트, 실패/게스트 시 정적 목록 + 로컬 기록 (api.ts에서 폴백)
    void fetchSongs().then((s) => on && setSongs(s));
    return () => {
      on = false;
      window.clearTimeout(previewTimer.current);
      void trackRef.current?.stop();
    };
  }, []);

  // 곡 탭 미리듣기 (FR-03) — 다른 곡을 누르면 그 곡으로 전환
  const togglePreview = async (songId: string) => {
    window.clearTimeout(previewTimer.current);
    await trackRef.current?.stop();
    if (previewingId === songId) {
      setPreviewingId(null);
      return;
    }
    trackRef.current = new SynthTrack(synthOf(songId));
    trackRef.current.setVolume(0.5);
    await trackRef.current.start();
    setPreviewingId(songId);
    previewTimer.current = window.setTimeout(async () => {
      await trackRef.current?.stop();
      setPreviewingId(null);
    }, 6000);
  };

  return (
    <main className="screen top" style={{ gap: 18 }}>
      <div className="row">
        <Link href="/home" style={{ fontSize: 20 }}>
          ←
        </Link>
        <strong>곡 선택</strong>
        <span style={{ width: 20 }} />
      </div>

      {songs === null && <p className="dim">곡 목록 불러오는 중…</p>}

      {(songs ?? []).map((song) => {
        const best = song.myBest[difficulty];
        return (
          <div className="card" key={song.id}>
            <div className="row">
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{song.title}</div>
                <div className="dim">
                  {song.artist} · {song.bpm} BPM · {song.durationSec}초
                </div>
                <div className="dim">
                  내 최고 기록:{' '}
                  {best ? `${best.rank} · ${best.score.toLocaleString()}점` : '없음'}
                </div>
              </div>
              <button className="btn secondary small" onClick={() => void togglePreview(song.id)}>
                {previewingId === song.id ? '■ 정지' : '▶ 미리듣기'}
              </button>
            </div>

            <div className="row" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {song.difficulties.map((d) => (
                  <button
                    key={d}
                    className="btn small"
                    style={{
                      background: d === difficulty ? 'var(--pink)' : 'rgba(255,255,255,0.14)',
                    }}
                    onClick={() => setDifficulty(d)}
                  >
                    {d === 'easy' ? 'Easy' : 'Normal'}
                  </button>
                ))}
              </div>
              <button
                className="btn small"
                onClick={() => {
                  track('song_selected', { song_id: song.id, difficulty });
                  router.push(`/play?song=${song.id}&difficulty=${difficulty}`);
                }}
              >
                게임 시작
              </button>
            </div>
          </div>
        );
      })}

      <p className="dim">게임 시작 시 카메라 권한을 요청합니다</p>
    </main>
  );
}
