import catalog from '@/content/songs.json';
import { DEFAULT_SYNTH, type SynthSpec } from './engine/audio';
import type { AudioSpec } from './engine/audio-file';
import type { TrackSpec } from './engine/track';

/**
 * 정적 곡 카탈로그 — content/songs.json 단일 소스 (채보 생성기와 공유).
 * 서버 카탈로그(fetchSongs)의 폴백이자, 곡 사운드의 유일한 출처다:
 * 합성 곡의 소리 정의는 클라이언트에 있고 DB에는 메타데이터만 둔다.
 * 음원 파일 곡(audio 필드)은 public/audio/의 파일을 FileTrack이 재생한다.
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

/**
 * songs.json 항목의 런타임 타입. JSON 임포트의 구조적 추론에 기대면 곡마다 필드가
 * 달라질 때(synth 곡 vs audio 곡) 유니언이 되어 접근이 막히므로 여기서 명시한다.
 */
interface CatalogSong extends SongMeta {
  targetWord: string;
  mission: string;
  licenseNote?: string;
  synth?: Omit<SynthSpec, 'bpm' | 'durationSec'>;
  audio?: Omit<AudioSpec, 'bpm' | 'durationSec'>;
}

const SONG_ENTRIES = catalog.songs as unknown as CatalogSong[];

export const SONGS: SongMeta[] = SONG_ENTRIES.map((s) => ({
  id: s.id,
  title: s.title,
  artist: s.artist,
  bpm: s.bpm,
  durationSec: s.durationSec,
  difficulties: s.difficulties as Difficulty[],
}));

export const getSong = (id: string): SongMeta | undefined => SONGS.find((s) => s.id === id);

/**
 * 곡의 사운드 소스 — audio 필드가 있으면 음원 파일, 없으면 신스.
 * 카탈로그에 없는 곡(서버 전용)은 데모 사운드로 폴백한다.
 */
export function trackOf(id: string): TrackSpec {
  const s = SONG_ENTRIES.find((c) => c.id === id);
  if (!s) return { kind: 'synth', synth: DEFAULT_SYNTH };
  if (s.audio) {
    return { kind: 'file', audio: { ...s.audio, bpm: s.bpm, durationSec: s.durationSec } };
  }
  const synth = s.synth ?? DEFAULT_SYNTH;
  return {
    kind: 'synth',
    synth: {
      bpm: s.bpm,
      durationSec: s.durationSec,
      loopBars: synth.loopBars ?? 1,
      kick: synth.kick,
      snare: synth.snare,
      hat: synth.hat,
      bass: synth.bass,
      lead: synth.lead,
    },
  };
}

export const chartUrl = (songId: string, difficulty: Difficulty): string =>
  `/charts/${songId}-${difficulty}.json`;
