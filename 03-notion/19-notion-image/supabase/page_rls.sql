-- Contract: public.page own-only RLS policies
-- 제약: 테이블 구조(컬럼·제약)는 변경하지 않는다. 정책만 추가한다.
-- 판별식은 기존 profile 정책과 동일한 (select auth.uid()) 관용구를 사용한다.

-- 재실행 안전(idempotent)
drop policy if exists "page_select_own" on public.page;
drop policy if exists "page_insert_own" on public.page;
drop policy if exists "page_update_own" on public.page;
drop policy if exists "page_delete_own" on public.page;

-- 본인 글만 조회 (FR-003)
create policy "page_select_own"
  on public.page for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 로그인 유저가 본인 uid로만 등록 (FR-001) — user_id가 null이거나 타인 uid면 거부 (R2)
create policy "page_insert_own"
  on public.page for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- 본인 글만 수정, 소유권 이전 불가 (FR-005)
create policy "page_update_own"
  on public.page for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 본인 글만 삭제 (FR-004)
create policy "page_delete_own"
  on public.page for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- anon 롤에는 어떤 정책도 부여하지 않는다 → 비로그인 접근 전면 차단 (FR-001, FR-007)
