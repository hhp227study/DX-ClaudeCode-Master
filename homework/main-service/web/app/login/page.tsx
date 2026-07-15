'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chooseGuestMode, getSession, sendMagicLink, signInWithGoogle } from '@/lib/api';
import { hasBackend } from '@/lib/supabase';

/** Login — 최소 마찰 인증, 기록·영상의 계정 귀속 (8.2, FR-01) */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // env 미설정 빌드거나 이미 로그인된 상태면 이 화면은 건너뛴다
    if (!hasBackend()) {
      router.replace('/home');
      return;
    }
    void getSession().then((s) => {
      if (s) router.replace('/home');
    });
  }, [router]);

  const magicLink = async () => {
    setError('');
    setBusy(true);
    const { error: err } = await sendMagicLink(email.trim());
    setBusy(false);
    if (err) setError(`전송 실패: ${err}`);
    else setSent(true);
  };

  return (
    <main className="screen">
      <h1 className="logo">
        Catch<em>Rhy</em>
      </h1>
      <p className="tagline">카메라 앞에서 손으로 버블을 잡는 리듬게임</p>

      <button className="btn" style={{ minWidth: 240 }} onClick={() => void signInWithGoogle()}>
        Google로 계속하기
      </button>

      {sent ? (
        <p style={{ maxWidth: 280, lineHeight: 1.7 }}>
          📬 <b>{email}</b>로 로그인 링크를 보냈어요.
          <br />
          메일함에서 링크를 열면 로그인됩니다.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 240 }}>
          <input
            type="text"
            inputMode="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="btn secondary"
            disabled={busy || !email.includes('@')}
            onClick={() => void magicLink()}
          >
            {busy ? '전송 중…' : '이메일로 계속하기'}
          </button>
        </div>
      )}
      {error && <p style={{ color: 'var(--pink-soft)' }}>{error}</p>}

      <button
        className="btn secondary small"
        onClick={() => {
          chooseGuestMode();
          router.replace('/home');
        }}
      >
        게스트로 계속하기 (기록은 이 기기에만 저장)
      </button>

      <p className="dim">
        카메라 영상은 기기에서만 처리되며 서버로 전송되지 않습니다.
        <br />
        계정에는 플레이 점수·랭크 기록만 저장됩니다.
      </p>
    </main>
  );
}
