'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasBackend } from '@/lib/supabase';
import { fetchIsAdmin } from '@/lib/admin-api';

/**
 * 관리자 섹션 공통 셸 (docs/admin-page.md) — 권한 게이트 + 탭 내비게이션.
 * UI 게이트일 뿐이고 실제 접근 제어는 setup_002_admin.sql의 RLS가 담당한다
 * (비관리자가 API를 직접 불러도 빈 결과만 온다).
 */

const TABS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/songs', label: '곡·채보' },
  { href: '/admin/users', label: '유저' },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const pathname = usePathname();

  useEffect(() => {
    if (!hasBackend()) {
      setState('denied');
      return;
    }
    void fetchIsAdmin().then((ok) => setState(ok ? 'ok' : 'denied'));
  }, []);

  if (state === 'loading') {
    return (
      <main className="screen">
        <p className="dim">권한 확인 중…</p>
      </main>
    );
  }

  if (state === 'denied') {
    return (
      <main className="screen">
        <div className="logo">
          Catch<em>Rhy</em>
        </div>
        <p className="tagline">관리자 권한이 필요한 페이지입니다</p>
        <p className="dim">관리자 계정으로 로그인되어 있는지 확인해 주세요</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="btn secondary small" href="/login">
            로그인
          </Link>
          <Link className="btn secondary small" href="/home">
            홈으로
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-head">
        <Link href="/home" className="logo" style={{ fontSize: 22 }}>
          Catch<em>Rhy</em> <span className="badge">ADMIN</span>
        </Link>
        <nav className="admin-nav">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={pathname === t.href ? 'active' : ''}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </main>
  );
}
