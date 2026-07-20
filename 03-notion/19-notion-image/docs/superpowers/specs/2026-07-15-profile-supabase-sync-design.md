# 프로필 Supabase 연동 설계

2026-07-15 · 16-notion-profile

## 목표

1. 구글 최초 로그인 시 `public.profile` 테이블에 1:1 행을 자동 생성하고 `auth.users`와 FK로 연결한다.
2. `profile.name` 초기값은 구글 계정의 DisplayName(`raw_user_meta_data`)에서 가져온다.
3. 마이페이지의 이름 변경 기능을 localStorage 대신 `profile` 테이블과 연동한다.

**범위 제외**: 프로필 이미지(아바타)는 이번에 연동하지 않고 현행 localStorage(base64) 저장을 유지한다.

## 현재 상태

- `public.profile`: `id`(uuid PK), `created_at`, `name`(text), `user_id`(uuid, nullable, default `gen_random_uuid()`, FK → `auth.users.id` on delete cascade). RLS는 켜져 있으나 **정책 0개** — 클라이언트에서 접근 불가. 데이터 0행.
- `user_id`에 unique 제약이 없어 1:1이 강제되지 않음.
- 기존 가입자 1명은 profile 행이 없음.
- 앱(`lib/store.jsx`)은 이름/아바타를 `mini-notion-profile-<uid>` localStorage 오버레이에 저장.

## 설계

### 1. DB 마이그레이션

하나의 마이그레이션으로 적용한다.

**스키마 정리** (현재 0행이라 안전):

- `user_id`의 default `gen_random_uuid()` 제거 — FK 컬럼에 무작위 기본값은 오류 유발원.
- `user_id`를 `not null`로 변경.
- `unique (user_id)` 제약 추가 — 1:1 관계를 DB 레벨에서 강제.

**자동 생성 트리거**:

```sql
create function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

구글 OAuth는 DisplayName을 `raw_user_meta_data.full_name`(및 `name`)으로 전달하므로 `full_name → name → email` 순으로 채택한다.

**기존 사용자 backfill**: profile 행이 없는 `auth.users` 전원에게 같은 규칙으로 insert (`on conflict (user_id) do nothing`).

**RLS 정책** (본인 행만):

- `select`: `auth.uid() = user_id`
- `update`: using / with check 모두 `auth.uid() = user_id`
- `insert`/`delete` 정책은 만들지 않는다 — 생성은 security definer 트리거가 전담, 삭제는 auth.users cascade가 전담.

### 2. 앱 연동 — `lib/store.jsx`

- 세션 확보 후 `profile`에서 본인 행을 조회(`select id, name … eq user_id`)해 상태로 보관.
- `user.name` 우선순위: profile.name → 구글 metadata(full_name/name/email) fallback (profile 로딩 전·조회 실패 시).
- `updateUser({ name })`을 async로 전환: `profile` 테이블 `update` 실행 → 성공 시 로컬 상태 갱신, 실패 시 에러 메시지 문자열 반환 (기존 `login()`과 같은 패턴).
- `updateUser({ avatar })`는 기존 localStorage 오버레이 경로 유지. name은 오버레이에 더 이상 저장하지 않는다 (기존 오버레이에 name이 남아 있어도 profile 값이 우선).
- 로그아웃 시 profile 상태 초기화.

### 3. 마이페이지 — `app/profile/page.jsx`

- 저장 버튼: `await updateUser(...)` 후 성공 시에만 "저장되었습니다 ✓", 실패 시 에러 문구 표시. 저장 중 버튼 비활성화.
- 아바타 UI는 변경 없음.

### 4. 에러 처리

- profile 조회 실패(네트워크 등): 콘솔 경고 + metadata fallback으로 앱은 정상 동작.
- name 저장 실패: 마이페이지에 에러 메시지 노출, 로컬 상태는 갱신하지 않음.

### 5. 검증

- backfill: SQL로 기존 유저의 profile 행과 name 값 확인.
- 트리거: 함수·트리거 존재 확인 (`pg_trigger`).
- 앱: 이름 변경 → 새로고침 후 유지 확인(localStorage가 아닌 DB에서 로드), 시크릿 창 재로그인 시 변경된 이름 표시 확인.
- 사이드바/헤더 등 `user.name`을 쓰는 모든 표시 위치가 profile 값을 반영하는지 확인.
