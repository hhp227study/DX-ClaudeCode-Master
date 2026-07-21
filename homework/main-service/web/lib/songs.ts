import catalog from '@/content/songs.json';
import { DEFAULT_SYNTH, type SynthSpec } from './engine/audio';

/**
 * 정적 곡 카탈로그 — content/songs.json 단일 소스 (채보 생성기와 공유).
 * 서버 카탈로그(fetchSongs)의 폴백이자, 신스 스펙의 유일한 출처다:
 * 합성 곡의 소리 정의는 클라이언트에 있고 DB에는 메타데이터만 둔다.
 */

export type Difficulty = 'easy' | 'normal';

export interface SongMeta {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  durationSec: number;
  difficulties: Difficulty[];
}

export const SONGS: SongMeta[] = catalog.songs.map((s) => ({
  id: s.id,
  title: s.title,
  artist: s.artist,
  bpm: s.bpm,
  durationSec: s.durationSec,
  difficulties: s.difficulties as Difficulty[],
}));

export const getSong = (id: string): SongMeta | undefined => SONGS.find((s) => s.id === id);

/** 곡의 신스 스펙 — 카탈로그에 없는 곡(서버 전용)은 데모 사운드로 폴백 */
export function synthOf(id: string): SynthSpec {
  const s = catalog.songs.find((c) => c.id === id);
  if (!s) return DEFAULT_SYNTH;
  // loopBars는 멀티마디 곡에만 있는 선택 필드 — JSON 유니언 타입이라 직접 접근 불가
  const synth = s.synth as Omit<SynthSpec, 'bpm' | 'durationSec'>;
  return {
    bpm: s.bpm,
    durationSec: s.durationSec,
    loopBars: synth.loopBars ?? 1,
    kick: synth.kick,
    snare: synth.snare,
    hat: synth.hat,
    bass: synth.bass,
    lead: synth.lead,
  };
}

export const chartUrl = (songId: string, difficulty: Difficulty): string =>
  `/charts/${songId}-${difficulty}.json`;
