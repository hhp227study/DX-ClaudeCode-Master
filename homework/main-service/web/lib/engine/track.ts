import { SynthTrack, type MusicTrack, type SynthSpec } from './audio';
import { FileTrack, type AudioSpec } from './audio-file';

/**
 * 곡의 소리를 어디서 얻는지 — 합성(신스)이냐 음원 파일이냐.
 * content/songs.json이 곡마다 둘 중 하나를 정하고(songs.ts trackOf),
 * 게임/에디터는 createTrack으로 받은 MusicTrack만 쓴다.
 */
export type TrackSpec = { kind: 'synth'; synth: SynthSpec } | { kind: 'file'; audio: AudioSpec };

export const createTrack = (spec: TrackSpec): MusicTrack =>
  spec.kind === 'file' ? new FileTrack(spec.audio) : new SynthTrack(spec.synth);

/** 곡의 비트 그리드 원점(ms) — 음원 파일 곡은 첫 다운비트가 0이 아니다 */
export const firstBeatMsOf = (spec: TrackSpec): number =>
  spec.kind === 'file' ? spec.audio.firstBeatMs : 0;

/** 미리듣기 시작 위치(ms) — 음원 곡은 후렴부터, 신스 곡은 처음부터 */
export const previewFromMsOf = (spec: TrackSpec): number =>
  spec.kind === 'file' ? (spec.audio.previewFromMs ?? 0) : 0;
