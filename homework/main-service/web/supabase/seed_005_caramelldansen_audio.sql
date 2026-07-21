-- 시드 005: 카라멜단센을 실제 음원으로 교체 (2026-07-22)
--
-- 신스 커버(Speedycake Remix 재현) → Caramella Girls 원곡 MP3 전곡 수록으로 변경.
-- 음원 분석 실측: 164.73 BPM, 첫 다운비트 162.5ms (기존 영상 분석 164.75와 일치).
-- 곡 길이는 원곡 전체 175.2초 — 처음엔 하이라이트 87.6초만 잘라 썼으나 중간에 끊기는 것이
-- 어색하다는 유저 피드백으로 전곡으로 되돌렸다. 구간은 실제 곡 구조(인트로/후렴/브레이크다운)에
-- 맞춰 10개로 나눠 배치. note_count는 gen-chart.mjs 재실행 결과의 실측값. 재실행해도 안전(멱등).
--
-- ⚠️ bpm/duration_sec 컬럼은 int라 표시용 반올림값(165/175)이 들어간다.
--    판정에 쓰이는 정확한 값(164.73 / 175.2)은 채보 JSON과 content/songs.json에 있다.
-- ⚠️ 에디터로 수정한 채보가 있으면 chart_url이 정적 경로로 되돌아간다 —
--    실행 전 /admin/songs에서 버전을 확인할 것.

update public.songs set
  title = 'Caramelldansen',
  artist = 'Caramella Girls',
  bpm = 165,
  duration_sec = 175,
  audio_url = '/audio/caramelldansen.mp3',
  license_note = '원곡 음원 전곡 수록: Caramella Girls ''Caramelldansen (HD Version, Swedish Original)'' 175초. ' ||
                 '상업 음원 — 배포 시 라이선스 확인 필요'
where id = 'caramelldansen';

insert into public.charts (song_id, difficulty, note_count, chart_url) values
  ('caramelldansen', 'easy',   134, '/charts/caramelldansen-easy.json'),
  ('caramelldansen', 'normal', 154, '/charts/caramelldansen-normal.json')
on conflict (song_id, difficulty) do update
  set note_count = excluded.note_count, chart_url = excluded.chart_url;
