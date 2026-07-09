-- 시드 002: 콘텐츠 확충 — 신곡 4곡 + 채보 8개 (태스크 #6, FR-03 "5곡 이상")
-- setup.sql을 이미 실행한 프로젝트에서 이것만 추가 실행하면 된다. 재실행해도 안전(멱등).
-- 신스 곡의 사운드 정의는 web/content/songs.json(클라이언트)에 있고 DB에는 메타만 둔다.
-- note_count는 2026-07-08 채보 개편(안무 모티프·비트 간격) 후 재생성된 실제 값.

insert into public.songs (id, title, artist, bpm, duration_sec, license_note) values
  ('neon-run',      '네온 런',     'CatchRhy Synth', 140, 76, 'Web Audio 합성 비트 — 외부 음원 미사용'),
  ('moon-step',     '문스텝',      'CatchRhy Synth',  96, 70, 'Web Audio 합성 비트 — 외부 음원 미사용'),
  ('star-pop',      '스타 팝',     'CatchRhy Synth', 128, 68, 'Web Audio 합성 비트 — 외부 음원 미사용'),
  ('bubble-bounce', '버블 바운스', 'CatchRhy Synth', 110, 66, 'Web Audio 합성 비트 — 외부 음원 미사용')
on conflict (id) do nothing;

insert into public.charts (song_id, difficulty, note_count, chart_url) values
  ('neon-run',      'easy',   30, '/charts/neon-run-easy.json'),
  ('neon-run',      'normal', 51, '/charts/neon-run-normal.json'),
  ('moon-step',     'easy',   20, '/charts/moon-step-easy.json'),
  ('moon-step',     'normal', 31, '/charts/moon-step-normal.json'),
  ('star-pop',      'easy',   23, '/charts/star-pop-easy.json'),
  ('star-pop',      'normal', 39, '/charts/star-pop-normal.json'),
  ('bubble-bounce', 'easy',   20, '/charts/bubble-bounce-easy.json'),
  ('bubble-bounce', 'normal', 33, '/charts/bubble-bounce-normal.json')
on conflict (song_id, difficulty) do update
  set note_count = excluded.note_count, chart_url = excluded.chart_url;

-- setup.sql이 시드한 demo-track도 채보 재생성으로 노트 수 변경 (easy 22→21, normal 27→33)
update public.charts set note_count = 21
  where song_id = 'demo-track' and difficulty = 'easy';
update public.charts set note_count = 33
  where song_id = 'demo-track' and difficulty = 'normal';
