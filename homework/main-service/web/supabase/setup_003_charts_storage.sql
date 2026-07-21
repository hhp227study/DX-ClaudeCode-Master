-- CatchRhy 채보 에디터 Storage (docs/admin-page.md "저장 경로 A안")
-- — setup_002_admin.sql(is_admin) 실행 후 Supabase 대시보드 SQL Editor에서 실행
--
-- 에디터가 채보 JSON을 charts 버킷에 `{song}-{diff}-v{N}.json`으로 올리고
-- charts.chart_url을 그 공개 URL로 갱신한다 → 게임은 resolveChartUrl(api.ts)로
-- DB URL을 우선 로드하므로 배포 없이 즉시 반영된다.
-- 버전마다 새 경로라 CDN 캐시 무효화가 필요 없고, 이전 버전이 히스토리로 남는다.

insert into storage.buckets (id, name, public)
values ('charts', 'charts', true)
on conflict (id) do nothing;

-- 공개 버킷이라 읽기는 정책 불필요 (public URL). 쓰기는 관리자만
create policy "관리자 채보 업로드" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'charts' and public.is_admin());

-- 업로드 성공 후 DB 갱신이 실패했을 때 같은 경로 재업로드(upsert) 대비
create policy "관리자 채보 덮어쓰기" on storage.objects
  for update to authenticated
  using (bucket_id = 'charts' and public.is_admin())
  with check (bucket_id = 'charts' and public.is_admin());
