import { getSupabase } from './supabase';
import type { Difficulty } from './songs';
import type { Chart } from './engine/chart';

/**
 * 관리자 데이터 레이어 (docs/admin-page.md).
 * api.ts와 달리 로컬 폴백이 없다 — 백엔드 없이는 관리자 페이지 자체가 무의미.
 * 접근 제어는 setup_002_admin.sql의 관리자 RLS 정책이 담당하고,
 * 여기서는 비관리자가 호출하면 빈 결과가 돌아올 뿐이다 (UI 게이트는 layout에서).
 */

export interface AdminChart {
  id: string;
  difficulty: Difficulty;
  noteCount: number | null;
  chartUrl: string;
  version: number;
}

export interface AdminSong {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  durationSec: number;
  isActive: boolean;
  licenseNote: string | null;
  charts: AdminChart[];
}

export interface AdminUser {
  id: string;
  nickname: string;
  createdAt: string;
  playCount: number;
  lastPlayedAt: string | null;
}

export interface SongStat {
  songId: string;
  title: string;
  playCount: number;
  avgAccuracy: number | null;
  fullComboCount: number;
}

export interface RecentPlay {
  id: string;
  nickname: string;
  songId: string;
  difficulty: Difficulty;
  score: number;
  accuracy: number;
  rank: string;
  migratedFromLocal: boolean;
  createdAt: string;
}

export interface AdminOverview {
  userCount: number;
  playCount: number;
  /** 오래된 날 → 오늘 순 7칸 (플레이 없는 날은 0) */
  daily: { date: string; count: number }[];
  /** ⚠️ 아래 통계는 최근 1000판 표본 기준 (PostgREST 기본 행 한도) */
  songStats: SongStat[];
  recent: RecentPlay[];
}

/** 통계용 표본 크기 — PostgREST 기본 max-rows와 맞춤 */
const SAMPLE = 1000;

export async function fetchIsAdmin(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: sess } = await sb.auth.getSession();
  if (!sess.session) return false;
  const { data } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('id', sess.session.user.id)
    .maybeSingle();
  return data?.is_admin === true;
}

// ─── 대시보드 ────────────────────────────────────────────────

export async function fetchAdminOverview(): Promise<AdminOverview | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const [users, plays, sample, songs, charts, recent] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('plays').select('*', { count: 'exact', head: true }),
    sb
      .from('plays')
      .select('chart_id, accuracy, full_combo, created_at, migrated_from_local')
      .order('created_at', { ascending: false })
      .limit(SAMPLE),
    sb.from('songs').select('id, title'),
    sb.from('charts').select('id, song_id'),
    sb
      .from('plays')
      .select(
        'id, score, accuracy, rank, created_at, migrated_from_local, profiles (nickname), charts (song_id, difficulty)',
      )
      .order('created_at', { ascending: false })
      .limit(12),
  ]);
  if (sample.error || songs.error) return null;

  // 채보 → 곡 매핑
  const songOfChart = new Map<string, string>();
  for (const c of charts.data ?? []) songOfChart.set(c.id, c.song_id);
  const titleOf = new Map<string, string>();
  for (const s of songs.data ?? []) titleOf.set(s.id, s.title);

  // 최근 7일 일별 플레이 수 (이관 행 제외 — 실제 플레이가 아님)
  const daily: { date: string; count: number }[] = [];
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    daily.push({ date: dayKey(d), count: 0 });
  }
  const dayIndex = new Map(daily.map((d, i) => [d.date, i]));
  for (const p of sample.data ?? []) {
    if (p.migrated_from_local) continue;
    const i = dayIndex.get(String(p.created_at).slice(0, 10));
    if (i !== undefined) daily[i].count++;
  }

  // 곡별 통계 (표본 기준, 이관 행 제외)
  const bySong = new Map<string, { count: number; accSum: number; fc: number }>();
  for (const p of sample.data ?? []) {
    if (p.migrated_from_local) continue;
    const songId = songOfChart.get(p.chart_id);
    if (!songId) continue;
    const s = bySong.get(songId) ?? { count: 0, accSum: 0, fc: 0 };
    s.count++;
    s.accSum += Number(p.accuracy);
    if (p.full_combo) s.fc++;
    bySong.set(songId, s);
  }
  const songStats: SongStat[] = [...bySong.entries()]
    .map(([songId, s]) => ({
      songId,
      title: titleOf.get(songId) ?? songId,
      playCount: s.count,
      avgAccuracy: s.count ? +(s.accSum / s.count).toFixed(1) : null,
      fullComboCount: s.fc,
    }))
    .sort((a, b) => b.playCount - a.playCount);

  interface RecentRow {
    id: string;
    score: number;
    accuracy: number;
    rank: string;
    created_at: string;
    migrated_from_local: boolean;
    profiles: { nickname: string } | null;
    charts: { song_id: string; difficulty: Difficulty } | null;
  }
  const recentPlays: RecentPlay[] = ((recent.data ?? []) as unknown as RecentRow[]).map((p) => ({
    id: p.id,
    nickname: p.profiles?.nickname ?? '(탈퇴)',
    songId: p.charts?.song_id ?? '?',
    difficulty: p.charts?.difficulty ?? 'easy',
    score: p.score,
    accuracy: Number(p.accuracy),
    rank: p.rank,
    migratedFromLocal: p.migrated_from_local,
    createdAt: p.created_at,
  }));

  return {
    userCount: users.count ?? 0,
    playCount: plays.count ?? 0,
    daily,
    songStats,
    recent: recentPlays,
  };
}

// ─── 곡·채보 관리 ────────────────────────────────────────────

interface ChartRow {
  id: string;
  difficulty: Difficulty;
  note_count: number | null;
  chart_url: string;
  version: number;
}

export async function fetchAdminSongs(): Promise<AdminSong[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('songs')
    .select(
      'id, title, artist, bpm, duration_sec, is_active, license_note, charts (id, difficulty, note_count, chart_url, version)',
    )
    .order('title');
  if (error || !data) return null;
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    bpm: row.bpm,
    durationSec: row.duration_sec,
    isActive: row.is_active,
    licenseNote: row.license_note,
    charts: ((row.charts ?? []) as ChartRow[])
      .map((c) => ({
        id: c.id,
        difficulty: c.difficulty,
        noteCount: c.note_count,
        chartUrl: c.chart_url,
        version: c.version,
      }))
      .sort((a, b) => a.difficulty.localeCompare(b.difficulty)), // easy < normal
  }));
}

export async function setSongActive(
  songId: string,
  active: boolean,
): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: '백엔드가 설정되지 않았습니다' };
  const { error } = await sb.from('songs').update({ is_active: active }).eq('id', songId);
  return { error: error?.message ?? null };
}

// ─── note_count 정합 체크 (DB ↔ 정적 채보 JSON) ──────────────

export interface IntegrityResult {
  chartId: string;
  /** DB note_count와 채보 JSON notes.length(decoy 포함 실측) 일치 여부 */
  ok: boolean;
  fileCount: number | null;
  error: string | null;
}

export async function checkChartIntegrity(songs: AdminSong[]): Promise<Map<string, IntegrityResult>> {
  const results = await Promise.all(
    songs
      .flatMap((s) => s.charts)
      .map(async (c): Promise<IntegrityResult> => {
        try {
          const res = await fetch(c.chartUrl, { cache: 'no-store' });
          if (!res.ok) return { chartId: c.id, ok: false, fileCount: null, error: `HTTP ${res.status}` };
          const json = (await res.json()) as { notes?: unknown[] };
          const fileCount = json.notes?.length ?? 0;
          return { chartId: c.id, ok: fileCount === c.noteCount, fileCount, error: null };
        } catch (e) {
          return { chartId: c.id, ok: false, fileCount: null, error: String(e) };
        }
      }),
  );
  return new Map(results.map((r) => [r.chartId, r]));
}

// ─── 채보 에디터 (docs/admin-page.md "구현 현황") ─────────────

export interface ChartRowInfo {
  id: string;
  version: number;
  chartUrl: string;
  noteCount: number | null;
}

/** 채보 DB 행 조회 — row: null은 "행 없음"(신규 채보), error는 조회 실패 */
export async function fetchChartRow(
  songId: string,
  difficulty: Difficulty,
): Promise<{ row: ChartRowInfo | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { row: null, error: '백엔드가 설정되지 않았습니다' };
  const { data, error } = await sb
    .from('charts')
    .select('id, version, chart_url, note_count')
    .eq('song_id', songId)
    .eq('difficulty', difficulty)
    .maybeSingle();
  if (error) return { row: null, error: error.message };
  return {
    row: data
      ? { id: data.id, version: data.version, chartUrl: data.chart_url, noteCount: data.note_count }
      : null,
    error: null,
  };
}

/**
 * 채보 저장 (A안): Storage `charts/{song}-{diff}-v{N}.json` 업로드 → charts 행 갱신/생성.
 * 버전마다 새 경로 → CDN 캐시 문제 없음, 게임은 resolveChartUrl(api.ts)로 즉시 새 채보 로드.
 * 주의: JSON의 chart.version은 포맷 버전(항상 1), DB charts.version이 콘텐츠 버전.
 */
export async function saveChart(
  chart: Chart,
  existing: { id: string; version: number } | null,
): Promise<{ error: string | null; row?: ChartRowInfo }> {
  const sb = getSupabase();
  if (!sb) return { error: '백엔드가 설정되지 않았습니다' };

  const version = (existing?.version ?? 0) + 1;
  const path = `${chart.songId}-${chart.difficulty}-v${version}.json`;
  const body = JSON.stringify(chart, null, 2);
  const { error: upErr } = await sb.storage
    .from('charts')
    .upload(path, new Blob([body], { type: 'application/json' }), {
      upsert: true, // 직전 저장의 DB 갱신 실패 재시도 대비
      contentType: 'application/json',
    });
  if (upErr) return { error: `Storage 업로드 실패: ${upErr.message}` };

  const url = sb.storage.from('charts').getPublicUrl(path).data.publicUrl;
  const fields = { chart_url: url, note_count: chart.notes.length, version };
  const { data, error: dbErr } = existing
    ? await sb.from('charts').update(fields).eq('id', existing.id).select('id').maybeSingle()
    : await sb
        .from('charts')
        .insert({ song_id: chart.songId, difficulty: chart.difficulty, ...fields })
        .select('id')
        .maybeSingle();
  if (dbErr || !data) return { error: `DB 갱신 실패: ${dbErr?.message ?? '권한 없음'}` };

  return {
    error: null,
    row: { id: data.id, version, chartUrl: url, noteCount: chart.notes.length },
  };
}

// ─── 유저 관리 ───────────────────────────────────────────────

export async function fetchAdminUsers(): Promise<AdminUser[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const [profiles, plays] = await Promise.all([
    sb.from('profiles').select('id, nickname, created_at').order('created_at', { ascending: false }),
    sb
      .from('plays')
      .select('user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(SAMPLE),
  ]);
  if (profiles.error || !profiles.data) return null;

  // 유저별 플레이 수·마지막 플레이 (최근 1000판 표본 기준)
  const stats = new Map<string, { count: number; last: string }>();
  for (const p of plays.data ?? []) {
    const s = stats.get(p.user_id);
    if (s) s.count++;
    else stats.set(p.user_id, { count: 1, last: p.created_at }); // desc 정렬이라 첫 행이 마지막 플레이
  }

  return profiles.data.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    createdAt: row.created_at,
    playCount: stats.get(row.id)?.count ?? 0,
    lastPlayedAt: stats.get(row.id)?.last ?? null,
  }));
}
