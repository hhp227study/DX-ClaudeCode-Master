# Tasks: 페이지 게시글 Supabase 저장 전환

**Input**: Design documents from `/specs/001-page-posts-supabase/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (모두 존재)

**Tests**: 프로젝트에 테스트 프레임워크가 없어 테스트 태스크는 생성하지 않음. 각 스토리의 검증은 quickstart.md 시나리오(S1~S6)를 체크포인트로 사용.

**Organization**: 사용자 스토리별 페이즈 구성 — 각 스토리는 독립적으로 구현·검증 가능.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 미완료 태스크에 대한 의존 없음)
- **[Story]**: 소속 사용자 스토리 (US1, US2, US3)

## Path Conventions

단일 Next.js 앱 (repository root 기준): `app/`, `components/`, `lib/`, `supabase/`

---

## Phase 1: Setup (RLS 정책 준비)

**Purpose**: 데이터 계층 보안 규칙을 저장소와 DB에 반영 — 이 기능의 유일한 인프라 작업

- [X] T001 contracts/page-rls.sql 내용으로 `supabase/page_rls.sql` 생성 (own-only 정책 4개, 재실행 안전 DDL)
- [X] T002 `supabase/page_rls.sql`을 Supabase DB에 마이그레이션으로 적용하고, `pg_policies` 조회로 `page` 테이블에 select/insert/update/delete own 정책 4개 존재 확인 (테이블 구조 변경 없음 확인 포함)

**Checkpoint**: RLS 적용 완료 — 이후 클라이언트 코드가 본인 글만 읽고 쓸 수 있는 상태

---

## Phase 2: Foundational (store 데이터 계층 전환 기반)

**Purpose**: 모든 스토리가 의존하는 store 로드 경로 전환 — 완료 전에는 어떤 스토리도 시작 불가

**⚠️ CRITICAL**: 세 스토리 모두 `lib/store.jsx`의 DB 로드 기반 위에서 동작한다

- [X] T003 `lib/store.jsx`에서 localStorage 노트 영속화 제거 — `KEY`·`seedNotes`·`daysAgo` 및 노트 로드/저장 useEffect 2개 삭제, 보기 방식·프로필 오버레이 localStorage는 유지 (FR-009, R8)
- [X] T004 `lib/store.jsx`에 DB 조회 로드 구현 — uid 변경 시 `page` 테이블에서 `created_at` 내림차순 조회, row↔UI 매핑(title/content null→"" 정규화, emoji 상수 "🗒️", updatedAt←created_at, data-model.md 매핑표), 로그아웃 시 `notes=[]`, `notesReady`를 "첫 DB 조회 완료"로 재정의 (R6, R9)
- [X] T005 `lib/store.jsx`에 `noteError`/`clearNoteError` 상태 추가하고 useStore 반환 계약에 노출 (contracts/store-api.md)

**Checkpoint**: 로그인 시 DB에서 목록(현재는 빈 목록)이 로드되고 화면이 오류 없이 렌더됨

---

## Phase 3: User Story 1 - 내 계정에 게시글 저장 (Priority: P1) 🎯 MVP

**Goal**: 글 작성·수정이 브라우저가 아닌 계정(page 테이블)에 저장되어 어느 기기에서든 유지

**Independent Test**: quickstart.md **S1** — 계정 A로 작성 → 다른 브라우저에서 재로그인 시 동일 글 표시, localStorage `mini-notion-v1` 키 미생성

- [X] T006 [US1] `lib/store.jsx`의 `createNote`를 DB insert로 전환 — `crypto.randomUUID()`로 id 생성, `user_id: uid` 명시, 낙관적으로 목록 맨 앞 추가 + id 동기 반환 유지, 미로그인 시 no-op, insert 실패 시 낙관적 항목 제거 + `noteError` 설정 (R5, FR-001)
- [X] T007 [US1] `lib/store.jsx`의 `updateNote`를 자동 저장으로 전환 — 로컬 상태 즉시 반영 + 노트별 600ms 디바운스 후 `update`(title/content), 언마운트·페이지 이탈 시 보류 저장 flush, 실패 시 입력 내용 유지 + `noteError` 설정 (R4, FR-005, FR-008)
- [X] T008 [P] [US1] `components/AppShell.jsx`에 `noteError` 오류 배너 렌더링 추가 — 메시지 표시 + 닫기 버튼(`clearNoteError`) (FR-008)
- [X] T009 [P] [US1] `app/page.jsx` 목록 3뷰(리스트/카드/3단)의 날짜 표기를 "N월 N일 편집"→"N월 N일 작성"으로 변경 (updatedAt이 created_at 매핑이므로 라벨 정합화, R6)

**Checkpoint**: quickstart S1 통과 — MVP 완성

---

## Phase 4: User Story 2 - 내 글만 조회 (Priority: P2)

**Goal**: 본인 글만 목록·상세에 노출, 비로그인 접근은 로그인 화면 이동 후 원래 화면 복귀

**Independent Test**: quickstart.md **S2·S3** — 계정 B에서 계정 A 글이 목록·URL 직접 접근 모두 0건, 비로그인 접근 시 로그인 → 원래 화면 복귀

> 참고: "본인 글만 조회" 자체는 Phase 1의 RLS(select own) + Phase 2의 DB 로드로 이미 강제됨. 이 페이즈는 화면 흐름(가드·복귀·상세 게이트)을 완성한다.

- [X] T010 [US2] `components/AppShell.jsx`의 비로그인 리다이렉트를 `/login?next=<현재 pathname>`으로 변경해 원래 경로 보존 (R7)
- [X] T011 [US2] `lib/store.jsx`의 `login()`이 복귀 경로를 유지하도록 확장하고, `app/login/page.jsx`에서 로그인 완료 후 `next` 경로로 `router.replace` (OAuth 왕복 후에도 next 유지 — R7 방식, 미지정 시 `/`)
- [X] T012 [P] [US2] `app/notes/[id]/page.jsx`에 로딩 게이트 적용 — `ready` 전에는 홈 리다이렉트 금지(부팅 표시), 로딩 완료 후 notes에 없는 id(타인·삭제 글)면 홈으로 복귀 (R9, Edge Case)

**Checkpoint**: quickstart S2·S3 통과 — US1과 US2 모두 독립 동작

---

## Phase 5: User Story 3 - 내 글만 삭제 (Priority: P3)

**Goal**: 본인 글만 삭제 가능, 삭제는 즉시 반영되고 영구적

**Independent Test**: quickstart.md **S4** — 본인 글 삭제 후 재접속에도 없음; **S5** — 우회 삭제 시도 0행

- [X] T013 [US3] `lib/store.jsx`의 `deleteNote`를 DB delete로 전환 — 낙관적으로 목록에서 즉시 제거, 실패 시 목록 복원 + `noteError` 설정 (FR-004, FR-008; 타인 글 차단은 RLS delete own이 강제)

**Checkpoint**: quickstart S4 통과 — 세 스토리 모두 독립 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전체 검증과 마무리

- [ ] T014 [P] quickstart.md 검증 시나리오 S1~S6 전체 수행 (2계정 교차, RLS SQL 검증, 오프라인 실패 처리 포함) 및 결과 기록
  - 진행 상황(2026-07-16): S5 중 자동 검증 가능 부분 완료 — 정책 4개 존재 확인, anon SELECT `[]` / INSERT 42501 거부 / DELETE 0행. S1~S4·S6과 로그인 세션 기반 교차 검증은 Google 계정 2개 브라우저 로그인이 필요해 수동 수행 남음
- [X] T015 [P] Supabase advisors(security/performance) 점검 실행 — page 정책 관련 신규 경고 없음 확인
- [X] T016 코드 정리 및 빌드 확인 — `lib/store.jsx` 미사용 잔재 제거 확인, `npm run build` 통과

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작 가능
- **Foundational (Phase 2)**: 코드만 보면 Phase 1과 독립이지만, 동작 검증에 RLS가 필요하므로 Phase 1 완료 후 진행 권장 — **모든 스토리를 블로킹**
- **User Stories (Phase 3~5)**: Phase 2 완료 후. 우선순위 순서(P1→P2→P3) 권장
- **Polish (Phase 6)**: 모든 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: Phase 2 이후 시작 — 다른 스토리 의존 없음
- **US2 (P2)**: Phase 2 이후 시작 — US1과 독립 (조회 강제는 RLS+로드가 담당, 화면 흐름만 추가)
- **US3 (P3)**: Phase 2 이후 시작 — US1과 독립적으로 검증 가능하나 글 생성이 필요하므로 US1 완료 후가 자연스러움

### Within Each Story

- `lib/store.jsx`를 건드리는 태스크(T003→T004→T005, T006→T007, T011, T013)는 같은 파일이므로 순차 실행
- 다른 파일 태스크([P] 표시)는 병렬 가능

### Parallel Opportunities

- Phase 3: T008(AppShell 배너) ∥ T009(목록 라벨) — T006·T007과 파일이 달라 병렬 가능
- Phase 4: T012(상세 게이트) ∥ T010·T011(가드·복귀 흐름)
- Phase 6: T014 ∥ T015

## Parallel Example: User Story 1

```text
# T006, T007 (lib/store.jsx) 순차 진행하는 동안 병렬로:
Task: "T008 components/AppShell.jsx에 noteError 배너 추가"
Task: "T009 app/page.jsx 날짜 라벨 편집→작성 변경"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: RLS 정책 적용 (T001~T002)
2. Phase 2: store 로드 전환 (T003~T005)
3. Phase 3: 저장 기능 (T006~T009)
4. **STOP & VALIDATE**: quickstart S1 — 이 시점에 "계정 기반 저장"이라는 핵심 가치 전달 완료
5. 이후 US2(화면 흐름), US3(삭제), Polish 순차 추가

### Incremental Delivery

- 각 체크포인트에서 앱이 동작하는 상태를 유지 — Phase 2 완료 시점에도 화면은 깨지지 않음(빈 목록)
- 스토리 하나 완료할 때마다 quickstart 해당 시나리오로 검증 후 커밋

---

## Notes

- 전 구간에서 `page` 테이블 구조 변경 금지 — 정책(RLS)만 추가 (FR-006)
- NoteEditor.jsx, SearchModal.jsx는 store 계약 유지로 무변경 (contracts/store-api.md)
- 총 16개 태스크: Setup 2, Foundational 3, US1 4, US2 3, US3 1, Polish 3
