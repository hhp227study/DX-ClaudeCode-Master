'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  checkChartIntegrity,
  fetchAdminSongs,
  setSongActive,
  type AdminSong,
  type IntegrityResult,
} from '@/lib/admin-api';

/**
 * 곡·채보 관리 (docs/admin-page.md §2·3)
 * — is_active 토글 (기존: SQL 직접 실행)
 * — note_count 정합 체크: DB ↔ /charts/*.json 실측 비교 (기존: seed 수동 대조)
 * — 채보 에디터 진입점: /admin/editor?song=&difficulty= (다음 단계, /play와 같은 쿼리 관례)
 */
export default function AdminSongsPage() {
  const [songs, setSongs] = useState<AdminSong[] | null | 'error'>(null);
  const [integrity, setIntegrity] = useState<Map<string, IntegrityResult> | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // 토글 중인 곡 id
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    void fetchAdminSongs().then((s) => on && setSongs(s ?? 'error'));
    return () => {
      on = false;
    };
  }, []);

  const toggleActive = async (song: AdminSong) => {
    setBusy(song.id);
    setError(null);
    const { error } = await setSongActive(song.id, !song.isActive);
    if (error) setError(`${song.title}: ${error}`);
    else if (songs !== null && songs !== 'error') {
      setSongs(songs.map((s) => (s.id === song.id ? { ...s, isActive: !s.isActive } : s)));
    }
    setBusy(null);
  };

  const runIntegrityCheck = async () => {
    if (songs === null || songs === 'error') return;
    setChecking(true);
    setIntegrity(await checkChartIntegrity(songs));
    setChecking(false);
  };

  if (songs === null) return <p className="dim">곡 목록 불러오는 중…</p>;
  if (songs === 'error') return <p className="dim">곡 목록을 불러오지 못했습니다</p>;

  const mismatches = integrity ? [...integrity.values()].filter((r) => !r.ok).length : null;

  return (
    <>
      <section className="row admin-section" style={{ alignItems: 'flex-start' }}>
        <p className="dim">
          숨긴 곡은 곡 목록 API에서 즉시 제외됩니다 (RLS is_active).
          <br />
          정합 체크는 DB note_count와 배포된 채보 JSON의 노트 수(함정 포함)를 비교합니다.
        </p>
        <button className="btn secondary small" disabled={checking} onClick={() => void runIntegrityCheck()}>
          {checking ? '검사 중…' : '채보 정합 체크'}
        </button>
      </section>

      {mismatches !== null && (
        <p className={mismatches === 0 ? 'ok' : 'bad'} style={{ marginBottom: 14, fontSize: 14 }}>
          {mismatches === 0
            ? '✓ 모든 채보의 note_count가 파일과 일치합니다'
            : `✗ ${mismatches}개 채보가 불일치 — 시드 재실행 또는 배포 누락 확인 필요`}
        </p>
      )}
      {error && <p className="bad" style={{ marginBottom: 14, fontSize: 14 }}>{error}</p>}

      {songs.map((song) => (
        <section className="card admin-section" key={song.id}>
          <div className="row">
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {song.title}{' '}
                <span className="dim" style={{ fontWeight: 400 }}>
                  {song.id} · {song.artist} · {song.bpm} BPM · {song.durationSec}초
                </span>
              </div>
              {song.licenseNote && <div className="dim">라이선스: {song.licenseNote}</div>}
            </div>
            <button
              className="btn small"
              disabled={busy === song.id}
              style={{ background: song.isActive ? 'var(--pink)' : 'rgba(255,255,255,0.14)' }}
              onClick={() => void toggleActive(song)}
            >
              {song.isActive ? '공개 중' : '숨김'}
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>난이도</th>
                  <th>note_count (DB)</th>
                  <th>파일 실측</th>
                  <th>버전</th>
                  <th>채보</th>
                </tr>
              </thead>
              <tbody>
                {song.charts.map((c) => {
                  const r = integrity?.get(c.id);
                  return (
                    <tr key={c.id}>
                      <td>{c.difficulty}</td>
                      <td>{c.noteCount ?? '—'}</td>
                      <td>
                        {r === undefined && <span className="dim">미검사</span>}
                        {r && r.error && <span className="bad">{r.error}</span>}
                        {r && !r.error && (
                          <span className={r.ok ? 'ok' : 'bad'}>
                            {r.fileCount} {r.ok ? '✓' : '✗'}
                          </span>
                        )}
                      </td>
                      <td>v{c.version}</td>
                      <td>
                        <Link
                          className="btn secondary small"
                          href={`/admin/editor?song=${song.id}&difficulty=${c.difficulty}`}
                        >
                          에디터
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {song.charts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="dim">
                      등록된 채보 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
