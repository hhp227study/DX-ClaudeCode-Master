-- CatchRhy 백엔드 스키마 (prd-detail.md 11장) — Supabase 대시보드 SQL Editor에 그대로 붙여넣어 실행
--
-- PRD와 다른 점 (근거는 web/README.md):
--  * songs.id는 uuid 대신 text 슬러그 — 채보 파일 경로(/charts/{id}-{diff}.json)와
--    localStorage 기록 키(`{id}:{diff}`)를 그대로 쓰기 위함
--  * videos 테이블은 만들지 않음 — 영상 업로드/공유 페이지(API 6~7)는 배포 단계에서 (YAGNI)
--  * plays.migrated_from_local — 게스트 시절 localStorage 베스트를 옮긴 행 표시
--    (판정 분포·콤보가 없어서 점수/랭크/정확도만 있는 행)

-- ─── 테이블 ──────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 12),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.songs (
  id text primary key, -- 슬러그 (예: 'demo-track')
  title text not null,
  artist text not null,
  bpm int not null,
  duration_sec int not null,
  jacket_url text,
  audio_url text,
  preview_url text,
  license_note text, -- 라이선스 출처 기록 (PRD 11.1)
  is_active boolean not null default true
);

create table public.charts (
  id uuid primary key default gen_random_uuid(),
  song_id text not null references public.songs (id) on delete cascade,
  difficulty text not null check (difficulty in ('easy', 'normal')),
  note_count int,
  chart_url text not null,
  version int not null default 1,
  unique (song_id, difficulty)
);

create table public.plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chart_id uuid not null references public.charts (id) on delete cascade,
  -- 서버측 sanity check (PRD 10장 422): 클라이언트 계산 점수의 상식적 상한
  score int not null check (score between 0 and 500000),
  accuracy numeric(5, 2) not null check (accuracy between 0 and 100),
  rank text not null check (rank in ('SSS', 'SS', 'S', 'A', 'B', 'C', 'F')),
  max_combo int check (max_combo between 0 and 1000),
  judgements jsonb not null default '{}'::jsonb, -- {perfect, great, good, miss}
  full_combo boolean not null default false,
  play_duration_sec int,
  migrated_from_local boolean not null default false,
  created_at timestamptz not null default now()
);

-- 개인 베스트 조회용 (PRD 11.2: 베스트 캐시 테이블 대신 이 인덱스로 충분)
create index plays_best_idx on public.plays (user_id, chart_id, score desc);

-- ─── 가입 트리거: auth.users → profiles 자동 생성 (PRD 11.2) ──

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    'Player_' || substr(md5(new.id::text), 1, 4), -- FR-02: 미입력 시 자동 생성 닉네임
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RLS (PRD 11.2: 본인 행만 write, songs/charts는 public read) ──

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.charts enable row level security;
alter table public.plays enable row level security;

create policy "본인 프로필 조회" on public.profiles
  for select using (auth.uid() = id);
create policy "본인 프로필 수정" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "곡 공개 조회" on public.songs
  for select using (is_active);
create policy "채보 공개 조회" on public.charts
  for select using (true);

create policy "본인 기록 조회" on public.plays
  for select using (auth.uid() = user_id);
create policy "본인 기록 저장" on public.plays
  for insert with check (auth.uid() = user_id);

-- ─── 시드: 데모 트랙 (콘텐츠 확충은 태스크 #6) ─────────────────

insert into public.songs (id, title, artist, bpm, duration_sec, license_note) values
  ('demo-track', '데모 트랙', 'CatchRhy Synth', 120, 62, 'Web Audio 합성 비트 — 외부 음원 미사용');

-- chart_url은 앱이 서빙하는 정적 경로 (채보 Storage 이전은 콘텐츠 파이프라인에서)
insert into public.charts (song_id, difficulty, note_count, chart_url) values
  ('demo-track', 'easy', 22, '/charts/demo-track-easy.json'),
  ('demo-track', 'normal', 27, '/charts/demo-track-normal.json');
