# 실제 구글 로그인 전환 설계 (Supabase Auth)

- 날짜: 2026-07-15
- 범위: 로그인/로그아웃/세션만 실제 전환. 노트 CRUD는 localStorage 유지.
- 승인: 사용자 승인 완료 (2026-07-15)

## 배경

미니 노션(Next.js 15 App Router, 전 페이지 클라이언트 컴포넌트)의 로그인은
`lib/store.jsx`의 가짜 `login()`이 localStorage에 `{ name: "유아이볼" }`을
저장하는 방식이다. 이를 Supabase Auth의 구글 OAuth로 교체한다.

Supabase 프로젝트 상태(확인 완료):

- 프로젝트 URL: `https://ayjeyrfdyvrwtnshkjrm.supabase.co`
- Google provider 활성화됨 (`/auth/v1/settings` 확인)
- publishable key: `sb_publishable_7txhjWxRuRhaDNtt41reuw__k4hlaiN`
- `public.page`, `public.profile` 테이블 존재하나 이번 범위에서는 사용하지 않음

## 아키텍처

`@supabase/supabase-js`만 추가한다 (`@supabase/ssr` 미사용 — 서버에서
세션을 읽는 코드가 없는 올-클라이언트 구조이므로).

| 파일 | 변경 |
| --- | --- |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (신규) |
| `lib/supabaseClient.js` | 싱글톤 클라이언트 생성 (신규, ~10줄) |
| `lib/store.jsx` | 가짜 인증 → Supabase 세션 기반으로 교체 |
| `app/login/page.jsx` | 버튼 핸들러에서 리다이렉트 제거, 에러 표시 추가 |

## 인증 흐름

1. 로그인 버튼 → `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })`
2. 구글 동의 → 앱 복귀 → supabase-js가 URL에서 세션 수립
3. `onAuthStateChange`가 `store.user`를 설정. `ready`는 초기 세션 확인 후
   true — 기존 가드(`AppShell`, 로그인 페이지)는 수정 없이 동작
4. 로그아웃 → `supabase.auth.signOut()` → 가드가 `/login`으로 이동
5. 세션은 supabase-js 기본 동작대로 localStorage에 저장되어 새로고침에도 유지

## 사용자 정보와 마이페이지

- `user.name` / `user.avatar` 초기값: 구글 계정 `user_metadata.full_name`,
  `user_metadata.avatar_url`
- 마이페이지의 별명 수정·이미지 업로드는 사용자별 로컬 오버레이
  `mini-notion-profile-<uid>` 키에 저장. 구글 값 위에 덮어쓴다.
- 근거: 2MB data URL을 user_metadata(JWT 포함)에 넣는 것은 부적절하고,
  Supabase Storage 연동은 이번 범위 밖.

## 데이터 저장 구조 변경

- 기존 `mini-notion-v1` 키의 `{ user, notes }` 중 `user`는 더 이상 사용하지
  않는다(세션이 대체). `notes`는 그대로 유지.
- 프로필 오버레이는 `mini-notion-profile-<uid>`에 `{ name?, avatar? }` 형태.

## 에러 처리

- `signInWithOAuth`가 에러를 반환하면 로그인 버튼 아래에 메시지 표시
- OAuth 취소/실패 시 로그인 페이지에 그대로 남음 (가드가 처리)

## 테스트 계획

프로젝트에 테스트 러너가 없고 핵심 검증 대상이 외부 OAuth 리다이렉트이므로
브라우저 E2E 수동 검증으로 대체한다:

1. dev 서버 실행 → wmux 브라우저로 `/login` 접속
2. 버튼 클릭 → 구글 동의 화면 도달 확인 (자동 검증 한계 지점)
3. 사용자가 브라우저 패널에서 직접 로그인 → 복귀 후 사이드바에 구글
   이름/아바타 표시 확인
4. 새로고침 시 세션 유지, 로그아웃 시 `/login` 복귀 확인

주의: Supabase Redirect URL 허용 목록에 dev 서버 origin
(`http://localhost:3000`)이 있어야 함. 복귀 실패 시 대시보드에서 추가 필요.
