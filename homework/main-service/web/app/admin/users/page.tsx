'use client';

import { useEffect, useState } from 'react';
import { fetchAdminUsers, type AdminUser } from '@/lib/admin-api';

/** 유저 관리 — 목록·검색 (docs/admin-page.md §5). 닉네임 강제 변경 등은 후속 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null | 'error'>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let on = true;
    void fetchAdminUsers().then((u) => on && setUsers(u ?? 'error'));
    return () => {
      on = false;
    };
  }, []);

  if (users === null) return <p className="dim">유저 목록 불러오는 중…</p>;
  if (users === 'error') return <p className="dim">유저 목록을 불러오지 못했습니다</p>;

  const q = query.trim().toLowerCase();
  const filtered = q ? users.filter((u) => u.nickname.toLowerCase().includes(q)) : users;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' });

  return (
    <>
      <section className="admin-section">
        <input
          type="text"
          placeholder="닉네임 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="card admin-section">
        <h2>
          유저 {filtered.length.toLocaleString()}명{' '}
          <span className="dim">플레이 수·마지막 플레이는 최근 1000판 표본 기준</span>
        </h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>닉네임</th>
                <th>가입일</th>
                <th>플레이</th>
                <th>마지막 플레이</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.nickname}</td>
                  <td>{fmt(u.createdAt)}</td>
                  <td>{u.playCount}</td>
                  <td>{u.lastPlayedAt ? fmt(u.lastPlayedAt) : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="dim">
                    검색 결과 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
