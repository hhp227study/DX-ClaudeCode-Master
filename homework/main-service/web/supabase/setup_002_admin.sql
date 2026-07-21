-- CatchRhy 관리자 페이지 스키마 (docs/admin-page.md) — Supabase 대시보드 SQL Editor에서 실행
--
-- 설계 (근거는 docs/admin-page.md "기술 전제"):
--  * 앱이 순수 클라이언트 구조(supabase-js + RLS, 서버 라우트 없음)라
--    service_role 서버 대신 profiles.is_admin + 관리자 RLS 정책으로 구현
--  * is_admin 승격은 이 파일(SQL)로만 가능 — 컬럼 단위 grant로 API 경유 변경을 차단

-- ─── 관리자 플래그 ───────────────────────────────────────────

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ⚠️ 기존 "본인 프로필 수정" 정책은 행 단위라 is_admin 자가 승격을 못 막는다
--    → update 권한을 컬럼 단위로 재부여 (nickname·avatar_url만 API로 수정 가능)
revoke update on table public.profiles from authenticated, anon;
grant update (nickname, avatar_url) on table public.profiles to authenticated;

-- 정책 안에서 profiles를 다시 조회해도 재귀가 없도록 security definer로 우회
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ─── 관리자 RLS 정책 (기존 정책과 OR로 합쳐진다) ─────────────

-- 곡: is_active=false 곡도 보고, 노출 토글·메타 수정·신곡 등록
create policy "관리자 곡 전체 조회" on public.songs
  for select using (public.is_admin());
create policy "관리자 곡 수정" on public.songs
  for update using (public.is_admin()) with check (public.is_admin());
create policy "관리자 곡 등록" on public.songs
  for insert with check (public.is_admin());

-- 채보: note_count·version·chart_url 갱신 + 신규 등록 (채보 에디터 대비)
create policy "관리자 채보 수정" on public.charts
  for update using (public.is_admin()) with check (public.is_admin());
create policy "관리자 채보 등록" on public.charts
  for insert with check (public.is_admin());

-- 유저·기록: 전체 조회 (닉네임 강제 변경은 profiles update — 컬럼 grant 범위 내)
create policy "관리자 프로필 전체 조회" on public.profiles
  for select using (public.is_admin());
create policy "관리자 프로필 수정" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
create policy "관리자 기록 전체 조회" on public.plays
  for select using (public.is_admin());

-- ─── 관리자 지정 ─────────────────────────────────────────────

update public.profiles set is_admin = true
where id in (select id from auth.users where email = 'hhp0227@gmail.com');
