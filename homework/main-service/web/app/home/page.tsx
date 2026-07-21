'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadPrefs, savePrefs } from '@/lib/store';
import { getProfile, getSession, migrateLocalRecords, updateNickname } from '@/lib/api';
import { hasBackend } from '@/lib/supabase';
import { setAnalyticsUser, track } from '@/lib/analytics';

/** OAuth/매직링크 리다이렉트로 세션이 새로 생겼을 때 login/sign_up 1회 기록 (12.1) */
async function trackAuthOnce(): Promise<void> {
  try {
    if (sessionStorage.getItem('catchrhy.ga.auth')) return;
    const session = await getSession();
    if (!session) return;
    sessionStorage.setItem('catchrhy.ga.auth', '1');
    const isNew = Date.now() - new Date(session.user.created_at).getTime() < 120_000;
    track(isNew ? 'sign_up' : 'login', {
      method: session.user.app_metadata.provider === 'google' ? 'google' : 'email',
    });
  } catch {
    /* sessionStorage 불가 환경 — 이벤트 중복만 감수 */
  }
}

/** Home — 플레이 진입 허브. "3초 안에 PLAY를 누르게 한다" (8.3) */
export default function HomePage() {
  const [nickname, setNickname] = useState('');
  const [authed, setAuthed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let on = true;
    void getProfile().then((p) => {
      if (!on) return;
      if (p) {
        setAuthed(true);
        setNickname(p.nickname);
        setAnalyticsUser(p.id);
        void trackAuthOnce();
        void migrateLocalRecords(); // 게스트 시절 로컬 베스트 1회 이관
      } else {
        setNickname(loadPrefs().nickname);
      }
    });
    return () => {
      on = false;
    };
  }, []);

  const saveNickname = async () => {
    const v = draft.trim();
    if (v.length < 2) {
      setError('닉네임은 2~12자로 입력해주세요');
      return;
    }
    if (authed) {
      const { error: err } = await updateNickname(v);
      if (err) {
        setError(`저장 실패: ${err}`);
        return;
      }
    }
    savePrefs({ nickname: v }); // 게스트 표시용 미러
    setNickname(v);
    setEditing(false);
    setError('');
  };

  return (
    <main className="screen">
      <div className="row" style={{ position: 'absolute', top: 20, left: 0, padding: '0 20px' }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="badge"
            style={{ border: 'none', cursor: 'pointer', font: 'inherit' }}
            onClick={() => {
              setDraft(nickname);
              setEditing(true);
            }}
            aria-label="닉네임 수정"
          >
            {nickname || '…'} ✏️
          </button>
          {hasBackend() && !authed && (
            <Link href="/login" className="badge" style={{ background: 'var(--pink)' }}>
              로그인
            </Link>
          )}
        </span>
        <Link href="/settings" aria-label="설정" style={{ fontSize: 22 }}>
          ⚙️
        </Link>
      </div>

      <h1 className="logo">
        Catch<em>Rhy</em>
      </h1>
      <p className="tagline">카메라 앞에서 손으로 버블을 잡는 리듬게임</p>

      <Link href="/select" className="btn" style={{ fontSize: 22, padding: '20px 64px' }}>
        PLAY
      </Link>

      <p className="dim">
        전면 카메라를 사용합니다 · 영상은 기기에서만 처리되고
        <br />
        업로드는 내가 선택할 때만 이루어집니다
      </p>

      {editing && (
        <div className="modal" role="dialog" aria-label="닉네임 수정">
          <div className="card" style={{ width: 280 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>닉네임 수정</div>
            <input
              type="text"
              maxLength={12}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void saveNickname()}
            />
            {error && (
              <p className="dim" style={{ color: 'var(--pink-soft)', marginTop: 6 }}>
                {error}
              </p>
            )}
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn small" onClick={() => void saveNickname()}>
                저장
              </button>
              <button className="btn secondary small" onClick={() => setEditing(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
