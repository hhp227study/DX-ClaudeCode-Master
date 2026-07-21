-- 시드 003: 카라멜단센 (Speedycake Remix) 신스 커버 + 채보 2개 (2026-07-12)
-- setup.sql(+seed_002)을 실행한 프로젝트에서 이것만 추가 실행하면 된다. 재실행해도 안전(멱등).
-- 근거: 레퍼런스 영상 2개 분석 — 165 BPM, F#장조 I–V–vi–IV. docs/reference-choreo-analysis.md 참고.
-- note_count는 gen-chart.mjs 실행 결과의 실측값.

insert into public.songs (id, title, artist, bpm, duration_sec, license_note) values
  ('caramelldansen', '카라멜단센 (Speedycake Remix)', 'Caramell — CatchRhy 신스 커버', 165, 70,
   'Web Audio 신스 커버(자체 합성) — 원곡: Caramell ''Caramelldansen (Speedycake Remix)''. 외부 음원 미사용')
on conflict (id) do update
  set title = excluded.title, artist = excluded.artist, bpm = excluded.bpm,
      duration_sec = excluded.duration_sec, license_note = excluded.license_note;

insert into public.charts (song_id, difficulty, note_count, chart_url) values
  ('caramelldansen', 'easy',   31, '/charts/caramelldansen-easy.json'),
  ('caramelldansen', 'normal', 48, '/charts/caramelldansen-normal.json')
on conflict (song_id, difficulty) do update
  set note_count = excluded.note_count, chart_url = excluded.chart_url;
