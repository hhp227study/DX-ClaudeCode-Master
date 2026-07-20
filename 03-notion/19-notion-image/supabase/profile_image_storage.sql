-- 2026-07-20 profile_image_storage
-- Supabase에 적용된 마이그레이션 사본

-- profile-image 공개 버킷: 프로필 이미지 저장용 (2MB, JPG/PNG — 클라이언트 검증과 동일 제한)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-image', 'profile-image', true, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 재실행 안전(idempotent)
drop policy if exists "profile_image_insert_authenticated" on storage.objects;
drop policy if exists "profile_image_delete_own" on storage.objects;

-- 로그인 유저만 업로드 가능
create policy "profile_image_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-image');

-- 본인이 올린 파일만 삭제 (이미지 교체·제거 시 옛 파일 정리용)
create policy "profile_image_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-image' and owner_id = (select auth.uid()::text));

-- 공개 버킷이므로 조회(select) 정책은 불필요 — public URL로 직접 접근
-- 수정(update) 정책도 의도적으로 없음 — 파일은 교체 시 새 uuid로 올리고 옛 파일은 삭제
