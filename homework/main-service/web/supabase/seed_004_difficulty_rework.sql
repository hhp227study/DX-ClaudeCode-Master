-- 시드 004: 난이도 개편 + 5곡 리메이크 반영 (2026-07-12)
-- 구 easy(6/5/4비트) 폐지 — 구 normal(4/3/2)이 easy로 승격, normal은 3/2.5/2비트로 더 촘촘하게.
-- 채보 재생성으로 note_count가 전부 변경됨 (실측값). 재실행해도 안전(멱등).
-- 주의: 기존 easy 베스트 기록은 더 어려운 새 easy 채보 기준으로 보이게 된다 (기록 초기화는 하지 않음).

insert into public.charts (song_id, difficulty, note_count, chart_url) values
  ('demo-track',     'easy',   33, '/charts/demo-track-easy.json'),
  ('demo-track',     'normal', 37, '/charts/demo-track-normal.json'),
  ('neon-run',       'easy',   51, '/charts/neon-run-easy.json'),
  ('neon-run',       'normal', 57, '/charts/neon-run-normal.json'),
  ('moon-step',      'easy',   31, '/charts/moon-step-easy.json'),
  ('moon-step',      'normal', 36, '/charts/moon-step-normal.json'),
  ('star-pop',       'easy',   39, '/charts/star-pop-easy.json'),
  ('star-pop',       'normal', 44, '/charts/star-pop-normal.json'),
  ('bubble-bounce',  'easy',   33, '/charts/bubble-bounce-easy.json'),
  ('bubble-bounce',  'normal', 36, '/charts/bubble-bounce-normal.json'),
  ('caramelldansen', 'easy',   48, '/charts/caramelldansen-easy.json'),
  ('caramelldansen', 'normal', 55, '/charts/caramelldansen-normal.json')
on conflict (song_id, difficulty) do update
  set note_count = excluded.note_count, chart_url = excluded.chart_url;
