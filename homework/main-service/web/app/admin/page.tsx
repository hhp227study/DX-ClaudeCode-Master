'use client';

import { useEffect, useState } from 'react';
import { fetchAdminOverview, type AdminOverview } from '@/lib/admin-api';

/** 관리자 대시보드 — 핵심 지표 + 곡별 소비 + 최근 플레이 (docs/admin-page.md §1) */
export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null | 'error'>(null);

  useEffect(() => {
    let on = true;
    void fetchAdminOverview().then((d) => on && setData(d ?? 'error'));
    return () => {
      on = false;
    };
  }, []);

  if (data === null) return <p className="dim">지표 불러오는 중…</p>;
  if (data === 'error') return <p className="dim">지표를 불러오지 못했습니다 — 콘솔을 확인하세요</p>;

  const today = data.daily[data.daily.length - 1]?.count ?? 0;
  const week = data.daily.reduce((a, d) => a + d.count, 0);
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.count));

  return (
    <>
      <section className="stat-grid">
        <div className="stat-card">
          <b>{data.userCount.toLocaleString()}</b>
          <span>가입자</span>
        </div>
        <div className="stat-card">
          <b>{data.playCount.toLocaleString()}</b>
          <span>누적 플레이</span>
        </div>
        <div className="stat-card">
          <b>{today.toLocaleString()}</b>
          <span>오늘 플레이</span>
        </div>
        <div className="stat-card">
          <b>{week.toLocaleString()}</b>
          <span>최근 7일 플레이</span>
        </div>
      </section>

      <section className="card admin-section">
        <h2>일별 플레이 (7일)</h2>
        <div className="bars">
          {data.daily.map((d) => (
            <div key={d.date} className="bar-col" title={`${d.date}: ${d.count}판`}>
              <i style={{ height: `${(d.count / maxDaily) * 100}%` }} />
              <span>{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card admin-section">
        <h2>곡별 소비 <span className="dim">최근 1000판 표본 · 이관 기록 제외</span></h2>
        {data.songStats.length === 0 && <p className="dim">아직 플레이 기록이 없습니다</p>}
        {data.songStats.length > 0 && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>곡</th>
                  <th>플레이</th>
                  <th>평균 정확도</th>
                  <th>풀콤보</th>
                </tr>
              </thead>
              <tbody>
                {data.songStats.map((s) => (
                  <tr key={s.songId}>
                    <td>{s.title}</td>
                    <td>{s.playCount.toLocaleString()}</td>
                    <td>{s.avgAccuracy !== null ? `${s.avgAccuracy}%` : '—'}</td>
                    <td>{s.fullComboCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card admin-section">
        <h2>최근 플레이</h2>
        {data.recent.length === 0 && <p className="dim">아직 플레이 기록이 없습니다</p>}
        {data.recent.length > 0 && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>시각</th>
                  <th>유저</th>
                  <th>곡</th>
                  <th>점수</th>
                  <th>정확도</th>
                  <th>랭크</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{p.nickname}</td>
                    <td>
                      {p.songId} <span className="dim">{p.difficulty}</span>
                      {p.migratedFromLocal && <span className="badge" style={{ marginLeft: 6 }}>이관</span>}
                    </td>
                    <td>{p.score.toLocaleString()}</td>
                    <td>{p.accuracy}%</td>
                    <td>{p.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
