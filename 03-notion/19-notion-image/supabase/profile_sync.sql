-- 2026-07-15 profile_auto_create_and_rls
-- Supabase에 적용된 마이그레이션 사본 (docs/superpowers/specs/2026-07-15-profile-supabase-sync-design.md 참고)

-- 1:1 관계 강제를 위한 스키마 정리 (적용 시점 0행이라 안전)
alter table public.profile alter column user_id drop default;
alter table public.profile alter column user_id set not null;
alter table public.profile add constraint profile_user_id_key unique (user_id);

-- 최초 로그인(가입) 시 profile 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (user_id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 기존 가입자 backfill (profile 없는 유저만)
insert into public.profile (user_id, name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.email
  )
from auth.users u
where not exists (
  select 1 from public.profile p where p.user_id = u.id
);

-- RLS: 본인 행만 조회/수정 (insert/delete 정책은 의도적으로 없음 —
-- 생성은 security definer 트리거, 삭제는 FK cascade가 전담)
create policy "profile_select_own"
  on public.profile for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "profile_update_own"
  on public.profile for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
