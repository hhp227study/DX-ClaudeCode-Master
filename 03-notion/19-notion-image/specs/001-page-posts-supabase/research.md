# Research: 페이지 게시글 Supabase 저장 전환

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

Technical Context에 NEEDS CLARIFICATION은 없으나, 설계 확정을 위해 조사한 사항과 결정을 기록한다. DB 현황은 Supabase MCP로 실측했다.

## R1. 접근 제어 방식 — RLS 정책 추가

- **Decision**: `page` 테이블에 `authenticated` 롤 대상 own-only 정책 4개(SELECT/INSERT/UPDATE/DELETE)를 추가한다. 판별식은 기존 profile 정책과 동일한 `(select auth.uid()) = user_id` 패턴.
- **Rationale**: 실측 결과 `page`는 RLS enabled + 정책 0개로 현재 모든 접근이 차단된 상태라 정책 추가 없이는 기능 자체가 동작하지 않는다. 정책은 테이블 구조(컬럼·제약)가 아니므로 "구조 변경 금지" 제약을 지키면서 FR-007(저장소 수준 강제)을 충족한다. `(select auth.uid())` 형태는 profile 정책에서 이미 쓰는 관용구이며 행별 재평가를 피해 성능에도 유리하다.
- **Alternatives considered**: ① 클라이언트 필터링(`eq("user_id", uid)`)만 사용 — 화면 우회 요청으로 타인 글 접근 가능, FR-007 위반으로 기각. ② Edge Function/서버 API 경유 — 이 규모의 개인 노트 앱에 과도하고 기존 클라이언트 직접 호출 패턴과도 불일치하여 기각.

## R2. `user_id` nullable 문제 — INSERT 정책 with_check로 해결

- **Decision**: NOT NULL 제약을 추가하지 않고(구조 변경 금지), INSERT 정책 `with check ((select auth.uid()) = user_id)`로 본인 uid가 아닌 값(널 포함)의 삽입을 차단한다. 클라이언트는 insert 시 `user_id: uid`를 명시한다.
- **Rationale**: `null = uid`는 SQL에서 true가 아니므로 user_id 누락 삽입은 정책에서 자동 거부된다. 구조를 건드리지 않고 데이터 무결성을 보장하는 유일한 방법.
- **Alternatives considered**: NOT NULL 제약/트리거 추가 — 테이블 구조 변경에 해당하여 기각.

## R3. 데이터 접근 계층 — 클라이언트 supabase-js 직접 호출

- **Decision**: `lib/store.jsx` 안에서 supabase-js로 직접 `from("page")` CRUD를 수행한다. 화면 컴포넌트가 의존하는 `useStore()` 계약(notes, createNote, updateNote, deleteNote, ready)은 유지하되 비동기 실패 상태를 추가한다.
- **Rationale**: 앱 전체가 클라이언트 컴포넌트이고 profile 연동이 이미 이 패턴(store 내 supabase 직접 호출)으로 구현돼 있다. RLS가 서버 측 보안을 담당하므로 클라이언트 직접 호출로 충분하다.
- **Alternatives considered**: Next.js Route Handler/Server Action 도입 — 서버 계층 신설은 기존 구조와 불일치, RLS로 이미 보안이 충족되므로 기각.

## R4. 자동 저장 구현 — 디바운스 + 낙관적 업데이트, last-write-wins

- **Decision**: 타이핑 시 로컬 상태는 즉시 갱신(낙관적), DB `update`는 노트별 600ms 디바운스로 전송한다. 동시 편집(두 탭/기기)은 마지막 저장 우선(last-write-wins)으로 처리하고 충돌 감지는 하지 않는다. 저장 실패 시 화면에 오류 배너를 띄우고 입력 내용은 유지한다(FR-008, Edge Case).
- **Rationale**: 기존 자동 저장 UX 유지(Clarify Q2 답변). 개인 노트 특성상 동일 사용자 간 충돌 빈도가 낮아 LWW가 표준적이고 단순하다. 키 입력마다 DB 왕복하는 것은 낭비이므로 디바운스 필수.
- **Alternatives considered**: 저장 버튼(기각 — Q2에서 자동 저장 확정), 버전 컬럼 기반 충돌 감지(기각 — 컬럼 추가 불가 + 과설계).

## R5. 새 글 생성 흐름 — 클라이언트 생성 UUID로 즉시 라우팅 유지

- **Decision**: `crypto.randomUUID()`로 id를 클라이언트에서 생성해 `insert({ id, user_id, title: "", content: "" })` 하고, 라우팅은 기존처럼 즉시 수행한다(낙관적). insert 실패 시 오류 안내 후 로컬 상태에서 제거한다.
- **Rationale**: 현재 `createNote()`는 동기적으로 id를 반환하고 즉시 `/notes/{id}`로 이동하는 UX다. 테이블 PK가 uuid(default 있음)이므로 클라이언트 지정 uuid 삽입이 가능해 이 UX를 그대로 유지할 수 있다.
- **Alternatives considered**: insert 응답의 서버 생성 id 대기 후 라우팅 — 네트워크 지연이 UX에 그대로 노출되어 기각.

## R6. 테이블에 없는 화면 속성 — emoji 고정, 날짜는 created_at

- **Decision**: `emoji`는 저장하지 않고 화면 상수 "🗒️"로 표시한다. 목록의 "N월 N일 편집" 표기는 `updatedAt` 부재로 `created_at` 기반 "작성" 표기로 바꾼다. 목록 정렬은 `created_at desc`(새 글이 위).
- **Rationale**: 구조 변경 금지 제약. 현재도 emoji는 항상 기본값 🗒️로만 생성되므로 실질 기능 손실 없음. (spec Assumptions에 문서화됨)
- **Alternatives considered**: title에 emoji 인코딩(기각 — 데이터 오염), 별도 테이블(기각 — 범위 외 과설계).

## R7. 비로그인 접근 처리 — 기존 AppShell 가드 재사용 + 복귀 경로 보존

- **Decision**: AppShell의 기존 `ready && !user → /login` 리다이렉트를 유지하고, 이동 시 원래 경로를 쿼리 파라미터(`/login?next=/notes/abc`)로 전달한다. 로그인 페이지는 로그인 완료 후 `next` 경로로 복귀한다(OAuth `redirectTo`는 origin 유지, 복귀는 세션 확립 후 클라이언트 라우팅으로 처리).
- **Rationale**: 가드 구조가 이미 있어 최소 변경으로 Clarify Q3(로그인 화면 이동 + 원래 화면 복귀)를 충족한다. Google OAuth 왕복 후에도 `next` 값을 유지하려면 쿼리 파라미터를 `signInWithOAuth`의 `redirectTo`에 실어 보내는 방식이 가장 단순하다.
- **Alternatives considered**: sessionStorage에 경로 저장(동작하나 URL보다 불투명), 복귀 없이 항상 홈으로(기각 — Q3 답변 위배).

## R8. localStorage 제거 범위

- **Decision**: 노트 데이터(`mini-notion-v1`)와 시드 노트 로직만 제거한다. 보기 방식(`mini-notion-view`), 프로필 아바타 오버레이(`mini-notion-profile-*`)는 게시글 범위 밖이므로 유지한다. 기존 로컬 노트 데이터는 이관하지 않는다(Clarify Q1).
- **Rationale**: FR-009는 "게시글 저장 경로"의 대체를 요구하며, UI 환경설정까지 DB화하는 것은 범위 밖이다.
- **Alternatives considered**: 전체 localStorage 제거(기각 — 범위 확대), 자동 이관(기각 — Q1에서 이관 안 함 확정).

## R9. 목록·상세 로딩 상태

- **Decision**: `notesReady`를 "DB 첫 조회 완료"로 재정의하고, 상세 페이지의 `note 없음 → 홈으로 replace` 로직은 로딩 완료 전에는 발동하지 않게 한다. 삭제된/타인 글 id 접근은 조회 결과 부재로 자연히 홈 복귀 처리된다(Edge Case 충족).
- **Rationale**: 현재 상세 페이지는 notes 배열에 없으면 즉시 리다이렉트하는데, 비동기 로딩 중 오판하면 새로고침 시 본인 글도 홈으로 튕긴다. 로딩 게이트가 필요하다.
- **Alternatives considered**: 상세 진입 시 단건 조회 추가(가능하나 store 목록 캐시로 충분, 필요 시 후속 개선).
