# Tasks: 사이드바 접기/펼치기

**Input**: Design documents from `/specs/001-sidebar-toggle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: 테스트 프레임워크 미도입 프로젝트 — 자동 테스트 태스크 없음. 각 스토리는 quickstart.md의 수동 검증 시나리오(V1~V5)로 확인한다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Path Conventions

기존 단일 Next.js 앱 구조 (plan.md 참조): `app/`, `components/`, `lib/` — 신규 파일 없음, 3개 파일 수정.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 기존 프로젝트 그대로 사용 — 개발 환경이 구동되는지만 확인

- [X] T001 프로젝트 루트에서 `npm install` 상태 확인 후 `npx next dev -p 3100`으로 dev 서버가 부팅되고 로그인 화면이 표시되는지 확인

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리가 의존하는 사이드바 상태의 단일 소스(store) 마련

**⚠️ CRITICAL**: 이 단계 완료 전에는 어떤 유저 스토리도 시작할 수 없음

- [X] T002 `lib/store.jsx`의 `StoreProvider`에 `sidebarCollapsed` 상태(`useState(false)`)와 `toggleSidebar` 액션(함수형 업데이트 `(v) => !v`)을 추가하고 context `value`(useMemo 의존성 포함)에 노출 — contracts/ui-contract.md §1 준수

**Checkpoint**: Foundation ready — `useStore()`에서 `sidebarCollapsed`/`toggleSidebar` 사용 가능

---

## Phase 3: User Story 1 - 사이드바 접고 펼치기 (Priority: P1) 🎯 MVP

**Goal**: 토글 버튼 클릭으로 사이드바가 아이콘 레일로 접히고, 다시 클릭하면 펼쳐지며, 본문 폭이 그에 맞춰 변한다

**Independent Test**: quickstart.md V1 — 로그인 후 토글 버튼을 클릭해 접힘(레일)/펼침이 왕복하는지 확인

### Implementation for User Story 1

- [X] T003 [P] [US1] `components/AppShell.jsx`: 사이드바 상단(브랜드 행 우측)에 토글 `<button>` 추가 — `useStore()`의 `sidebarCollapsed`/`toggleSidebar` 연결, 셰브론 아이콘(펼침 시 «, 접힘 시 »), `aria-label`("사이드바 접기"/"사이드바 펼치기")·`aria-expanded` 상태 반영, `<aside>` 클래스를 `sidebar${sidebarCollapsed ? " collapsed" : ""}`로 바인딩 (contracts/ui-contract.md §2·§3)
- [X] T004 [P] [US1] `app/globals.css`: `.sidebar`에 `width` transition(~200ms, 기존 `--ease-standard` 재사용) 추가, `.sidebar.collapsed` 규칙 작성 — 폭 52px, `.brand-name`·`.nav .label`·`.seclab` 숨김, 아이콘 버튼 중앙 정렬, 토글 버튼 스타일(기존 `.nav` 톤과 일치)
- [X] T005 [US1] quickstart.md V1 시나리오 검증 — 접기/펼치기 왕복, 본문 폭 변화, 전환 0.5초 이내 확인 후 체크

**Checkpoint**: 토글 기능 단독으로 완전 동작 — MVP 데모 가능

---

## Phase 4: User Story 2 - 접힌 상태에서도 주요 액션 사용 (Priority: P2)

**Goal**: 접힌 레일에 토글·검색·새 글·프로필만 남고(글 목록 숨김), 각 아이콘이 펼침 상태와 동일하게 동작한다

**Independent Test**: quickstart.md V2 — 접힌 상태에서 검색·새 글·프로필 아이콘을 각각 클릭해 동작 확인, 글 목록 미표시 확인

### Implementation for User Story 2

- [X] T006 [US2] `components/AppShell.jsx`: 접힘 상태에서 글 목록(노트 링크들)과 `글 목록` 섹션 라벨을 렌더링하지 않도록 조건 처리(`{!sidebarCollapsed && ...}`), 검색·새 글·프로필 버튼/링크에 `title` 속성("검색", "새 글", "프로필") 추가 (contracts/ui-contract.md §2 표·§3)
- [X] T007 [US2] `app/globals.css`: 접힘 레일에서 `.side-foot` 하단 고정 유지 및 `.ava` 아바타 중앙 정렬 보정 — 프로필 아이콘이 레일 하단에 정상 표시되도록
- [X] T008 [US2] quickstart.md V2 시나리오 검증 — 레일 구성(토글·검색·새 글·프로필만), 각 아이콘 클릭 동작, 이동 후 접힘 유지 확인 후 체크

**Checkpoint**: US1 + US2 동시 동작 — 접힌 상태의 실용성 확보

---

## Phase 5: User Story 3 - 페이지 이동·재방문 시 상태 유지 (Priority: P3)

**Goal**: 접힘/펼침 상태가 화면 이동 간 유지되고(스토어 상주로 자동 충족), 새로고침·재방문 시 localStorage에서 복원된다

**Independent Test**: quickstart.md V3 — 접은 뒤 페이지 이동·새로고침으로 상태 유지/복원 확인

### Implementation for User Story 3

- [X] T009 [US3] `lib/store.jsx`: 마운트 후 `useEffect`에서 `localStorage.getItem("mini-notion-sidebar") === "collapsed"`로 초기 상태 복원(그 외 값·결측·접근 불가 시 펼침 기본값), `toggleSidebar`에서 반전 결과를 `"collapsed"`/`"expanded"`로 저장 — data-model.md 영속화 규칙·research.md R2(useState 초기값에서 localStorage 직접 읽기 금지) 준수
- [X] T010 [US3] quickstart.md V3 시나리오 검증 — 이동 간 유지, 새로고침 복원(localStorage 값 확인), 키 삭제 시 펼침 기본값 확인 후 체크

**Checkpoint**: 모든 유저 스토리 독립 동작 완료

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 엣지 케이스·접근성·빌드 무결성 최종 확인

- [X] T011 [P] quickstart.md V4 엣지 케이스 검증 — 접힘 상태 Cmd/Ctrl+K, 토글 연속 5회 클릭, 전환 중 페이지 이동 시 레이아웃 확인
- [X] T012 [P] quickstart.md V5 접근성 검증 — Tab 포커스 + Enter 토글, `aria-expanded`/`aria-label` 전환, 레일 아이콘 title 툴팁 확인
- [X] T013 프로젝트 루트에서 `npx next build` 실행해 빌드 통과 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작 가능
- **Foundational (Phase 2)**: Phase 1 완료 후 — 모든 유저 스토리를 블로킹
- **User Stories (Phase 3~5)**: Phase 2 완료 후. 우선순위 순서(P1 → P2 → P3) 권장
- **Polish (Phase 6)**: 모든 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: Phase 2 이후 시작 — 다른 스토리 의존 없음
- **US2 (P2)**: Phase 2 이후 시작 가능하나 T006이 T003과 같은 파일(`AppShell.jsx`), T007이 T004와 같은 파일(`globals.css`)을 수정하므로 US1 완료 후 진행 권장
- **US3 (P3)**: Phase 2 이후 시작 가능 — T009는 `store.jsx`만 수정하므로 US1/US2와 파일 충돌 없음 (병렬 가능)

### Within Each User Story

- 구현 태스크 → 검증 태스크 순서 (예: T003·T004 → T005)
- 스토리 완료(검증 통과) 후 다음 우선순위로 이동

### Parallel Opportunities

- **T003 ∥ T004** (US1): `AppShell.jsx` vs `globals.css` — 서로 다른 파일
- **T009** (US3): `store.jsx`만 수정 — US1/US2 진행 중에도 병렬 가능
- **T011 ∥ T012** (Polish): 독립 검증 시나리오

---

## Parallel Example: User Story 1

```bash
# Foundational(T002) 완료 후, US1의 두 구현 태스크를 동시에 진행:
Task: "T003 — components/AppShell.jsx에 토글 버튼 + collapsed 클래스 바인딩"
Task: "T004 — app/globals.css에 .sidebar.collapsed 레일 스타일 + transition"
# 이어서 T005 검증
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002) — CRITICAL
3. Phase 3: US1 (T003~T005)
4. **STOP and VALIDATE**: quickstart V1 독립 검증
5. 데모 가능 시점 — 이후 스토리는 증분 추가

### Incremental Delivery

1. Setup + Foundational → 기반 완료
2. US1 추가 → V1 검증 → MVP!
3. US2 추가 → V2 검증 → 레일 실용성 확보
4. US3 추가 → V3 검증 → 상태 영속화 완성
5. Polish (V4·V5 + 빌드) → 마무리

---

## Notes

- [P] tasks = 서로 다른 파일, 미완료 태스크 의존 없음
- 각 스토리는 독립적으로 완료·검증 가능
- 태스크 또는 논리적 그룹 완료 시마다 커밋 권장
- 체크포인트마다 중단하고 스토리 단위 검증 가능
