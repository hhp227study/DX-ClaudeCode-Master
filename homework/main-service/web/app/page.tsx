'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, guestModeChosen } from '@/lib/api';
import { hasBackend } from '@/lib/supabase';
import { track } from '@/lib/analytics';

/** Splash — 브랜드 노출 + 세션 상태에 따라 Home/Login으로 자동 이동 (8.1) */
export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    // referrer로 공유 링크 유입 구분 (12.1 바이럴 루프 가설)
    track('app_open', { referrer: document.referrer || 'direct' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        const dest =
          !hasBackend() || guestModeChosen() || (await getSession()) ? '/home' : '/login';
        if (!cancelled) router.replace(dest);
      })();
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [router]);

  return (
    <main className="screen">
      <h1 className="logo">
        Catch<em>Rhy</em>
      </h1>
      <p className="tagline">Catch the Rhythm.</p>
    </main>
  );
}
