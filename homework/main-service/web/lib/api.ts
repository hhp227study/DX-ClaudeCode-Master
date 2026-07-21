import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { SONGS, chartUrl, type Difficulty, type SongMeta } from './songs';
import { loadAllBests, loadBest, saveBestIfBetter, type BestRecord } from './store';
import type { GameResult } from './engine/game';

/**
 * 데이터 레이어 (태스크 #5, PRD 10장의 API를 supabase-js + RLS로 구현).
 * 모든 함수는 게스트/오프라인/env 미설정에서 localStorage로 폴백한다 —
 * 백엔드는 부가 기능이고, 게임은 항상 돌아가야 한다.
 */

export interface Profile {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface SongWithBest extends SongMeta {
  myBest: Partial<Record<Difficulty, BestRecord>>;
}

export interface SubmitOutcome {
  isNewRecord: boolean;
  savedToServer: boolean;
}

// ─── Auth (FR-01) ────────────────────────────────────────────

/** "게스트로 계속하기"를 고른 유저는 Splash에서 Login으로 다시 보내지 않는다 */
const GUEST_KEY = 'catchrhy.guest.v1';

export function chooseGuestMode(): void {
  try {
    localStorage.setItem(GUEST_KEY, '1');
  } catch {
    /* 저장 불가 환경 — 다음 진입 시 로그인 화면이 다시 뜰 뿐 */
  }
}

export function guestModeChosen(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) !== null;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signInWithGoogle(): Promise<void> {
  await getSupabase()?.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/home` },
  });
}

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: '백엔드가 설정되지 않았습니다' };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/home` },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

// ─── Profile (FR-02, API 1~2) ────────────────────────────────

export async function getProfile(): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const session = await getSession();
  if (!session) return null;
  const { data } = await sb
    .from('profiles')
    .select('id, nickname, avatar_url')
    .eq('id', session.user.id)
    .maybeSingle();
  return data ? { id: data.id, nickname: data.nickname, avatarUrl: data.avatar_url } : null;
}

export async function updateNickname(nickname: string): Promise<{ error: string | null }> {
  const sb = getSupabase();
  const session = await getSession();
  if (!sb || !session) return { error: '로그인이 필요합니다' };
  const { error } = await sb.from('profiles').update({ nickname }).eq('id', session.user.id);
  return { error: error?.message ?? null };
}

// ─── 곡 카탈로그 + 내 베스트 (FR-03, API 3) ──────────────────

const localSongs = (): SongWithBest[] =>
  SONGS.map((s) => ({ ...s, myBest: localBestOf(s.id, s.difficulties) }));

const localBestOf = (
  songId: string,
  difficulties: Difficulty[],
): Partial<Record<Difficulty, BestRecord>> => {
  const out: Partial<Record<Difficulty, BestRecord>> = {};
  for (const d of difficulties) {
    const b = loadBest(songId, d);
    if (b) out[d] = b;
  }
  return out;
};

interface ChartRef {
  id: string;
  difficulty: Difficulty;
}

/** submitPlay의 chart_id 조회를 아끼기 위한 세션 캐시 (키: `songId:difficulty`) */
const chartIdCache = new Map<string, string>();

export async function fetchSongs(): Promise<SongWithBest[]> {
  const sb = getSupabase();
  if (!sb) return localSongs();
  try {
    const { data: rows, error } = await sb
      .from('songs')
      .select('id, title, artist, bpm, duration_sec, charts (id, difficulty)')
      .eq('is_active', true)
      .order('title');
    if (error || !rows?.length) return localSongs();

    const session = await getSession();
    const bestByChart = session ? await serverBests(sb, session.user.id) : null;

    return rows.map((row) => {
      const charts = (row.charts ?? []) as ChartRef[];
      const difficulties = charts.map((c) => c.difficulty).sort(); // easy < normal
      const myBest: Partial<Record<Difficulty, BestRecord>> = {};
      for (const c of charts) {
        chartIdCache.set(`${row.id}:${c.difficulty}`, c.id);
        const b = bestByChart ? bestByChart.get(c.id) : loadBest(row.id, c.difficulty);
        if (b) myBest[c.difficulty] = b;
      }
      return {
        id: row.id,
        title: row.title,
        artist: row.artist,
        bpm: row.bpm,
        durationSec: row.duration_sec,
        difficulties,
        myBest,
      };
    });
  } catch {
    return localSongs();
  }
}

/** 개인 베스트 — plays에서 chart별 최고점 (PRD 11.2: 캐시 테이블 대신 인덱스 조회) */
async function serverBests(sb: SupabaseClient, userId: string): Promise<Map<string, BestRecord>> {
  const best = new Map<string, BestRecord>();
  const { data } = await sb
    .from('plays')
    .select('chart_id, score, rank, accuracy')
    .eq('user_id', userId)
    .order('score', { ascending: false });
  for (const p of data ?? []) {
    if (!best.has(p.chart_id)) {
      best.set(p.chart_id, { score: p.score, rank: p.rank, accuracy: Number(p.accuracy) });
    }
  }
  return best;
}

async function chartIdOf(
  sb: SupabaseClient,
  songId: string,
  difficulty: Difficulty,
): Promise<string | null> {
  const key = `${songId}:${difficulty}`;
  const hit = chartIdCache.get(key);
  if (hit) return hit;
  const { data } = await sb
    .from('charts')
    .select('id')
    .eq('song_id', songId)
    .eq('difficulty', difficulty)
    .maybeSingle();
  if (data) chartIdCache.set(key, data.id);
  return data?.id ?? null;
}

// ─── 채보 URL 해석 (에디터 연동) ──────────────────────────────

/** 에디터가 Storage에 저장한 채보(charts.chart_url) 우선, 없으면 정적 경로로 폴백 */
export async function resolveChartUrl(songId: string, difficulty: Difficulty): Promise<string> {
  const fallback = chartUrl(songId, difficulty);
  const sb = getSupabase();
  if (!sb) return fallback;
  try {
    const { data } = await sb
      .from('charts')
      .select('chart_url')
      .eq('song_id', songId)
      .eq('difficulty', difficulty)
      .maybeSingle();
    return data?.chart_url ?? fallback;
  } catch {
    return fallback;
  }
}

// ─── 플레이 기록 저장 (FR-11, FR-17, API 5) ──────────────────

export async function submitPlay(
  songId: string,
  difficulty: Difficulty,
  result: GameResult,
  playDurationSec: number,
): Promise<SubmitOutcome> {
  // 서버 저장 여부와 무관하게 로컬에도 항상 기록 — 오프라인/로그아웃 폴백 유지
  const local = saveBestIfBetter(songId, difficulty, {
    score: result.score,
    rank: result.rank,
    accuracy: result.accuracy,
  });

  const sb = getSupabase();
  const session = sb ? await getSession() : null;
  if (!sb || !session) return { isNewRecord: local.isNew, savedToServer: false };

  try {
    const chartId = await chartIdOf(sb, songId, difficulty);
    if (!chartId) return { isNewRecord: local.isNew, savedToServer: false };

    const { data: prev } = await sb
      .from('plays')
      .select('score')
      .eq('user_id', session.user.id)
      .eq('chart_id', chartId)
      .order('score', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await sb.from('plays').insert({
      user_id: session.user.id,
      chart_id: chartId,
      score: result.score,
      accuracy: Number(result.accuracy.toFixed(2)),
      rank: result.rank,
      max_combo: result.maxCombo,
      judgements: {
        perfect: result.counts.PERFECT,
        great: result.counts.GREAT,
        good: result.counts.GOOD,
        miss: result.counts.MISS,
        decoy: result.counts.DECOY,
      },
      full_combo: result.fullCombo,
      play_duration_sec: Math.round(playDurationSec),
    });
    if (error) return { isNewRecord: local.isNew, savedToServer: false };
    return { isNewRecord: !prev || result.score > prev.score, savedToServer: true };
  } catch {
    return { isNewRecord: local.isNew, savedToServer: false };
  }
}

// ─── 게스트 → 계정 전환: 로컬 베스트 1회 이관 ─────────────────

const MIGRATED_KEY = 'catchrhy.migrated.v1';

/** 로그인 후 최초 1회, 게스트 시절 로컬 베스트를 서버보다 높은 것만 plays로 이관 */
export async function migrateLocalRecords(): Promise<void> {
  const sb = getSupabase();
  if (!sb || typeof window === 'undefined') return;
  if (localStorage.getItem(MIGRATED_KEY)) return;
  const session = await getSession();
  if (!session) return;

  const bests = loadAllBests();
  const entries = Object.entries(bests);
  try {
    for (const [key, rec] of entries) {
      const [songId, difficulty] = key.split(':') as [string, Difficulty];
      const chartId = await chartIdOf(sb, songId, difficulty);
      if (!chartId) continue; // 서버 카탈로그에 없는 곡은 로컬에만 유지
      const { data: prev } = await sb
        .from('plays')
        .select('score')
        .eq('user_id', session.user.id)
        .eq('chart_id', chartId)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prev && prev.score >= rec.score) continue;
      await sb.from('plays').insert({
        user_id: session.user.id,
        chart_id: chartId,
        score: rec.score,
        accuracy: Number(rec.accuracy.toFixed(2)),
        rank: rec.rank,
        migrated_from_local: true, // 판정 분포·콤보 없는 행 표시
      });
    }
    localStorage.setItem(MIGRATED_KEY, '1');
  } catch {
    /* 다음 로그인 진입 시 재시도 (플래그 미설정) */
  }
}
