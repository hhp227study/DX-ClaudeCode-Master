# Tasks: 다크모드 (Dark Mode)

**Input**: Design documents from `/specs/002-dark-mode-toggle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/theme-ui.md, quickstart.md

**Tests**: 프로젝트에 테스트 러너가 없고 스펙에서 자동화 테스트를 요청하지 않음 — 각 스토리의 검증은 `quickstart.md` 수동 시나리오로 수행한다.

**Organization**: 유저 스토리별로 그룹화 — 각 스토리는 독립적으로 구현·검증 가능한 증분이다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 미완료 태스크에 대한 의존 없음)
- **[Story]**: 소속 유저 스토리 (US1, US2, US3)
- 설명에 정확한 파일 경로 포함

## Path Conventions

단일 Next.js 앱 (repository root 기준): `app/`, `components/`, `lib/` — plan.md 구조 결정 참조.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 기존 프로젝트 확인 — 신규 초기화·의존성 없음 (plan.md Constraints)

- [X] T001 개발 서버 기동 확인 — `npm run dev`로 http://localhost:3000 접속, 로그인·글 목록이 현재(라이트) 상태로 정상 동작하는 베이스라인 확인

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리가 의존하는 테마 토큰 레이어와 테마 모듈 — 이 페이즈 완료 전에는 어떤 스토리도 시작 불가

**⚠️ CRITICAL**: US1~US3 모두 이 변수 레이어와 `lib/theme.js` 위에서 동작한다

- [X] T002 `app/globals.css`에 `:root[data-theme="dark"]` 변수 오버라이드 블록 추가 — 그레이 램프 역방향 재정의(`--gray-0`=웜 다크 배경 ~ `--gray-900`=밝은 텍스트), `--blue-*` 대비 보정, `--green/red-*` 딥 톤, `--shadow-*` 강화, 테마별 `color-scheme` 선언 (research.md R1·R2, contracts C2)
- [X] T003 `app/globals.css` 하드코딩 색상 4곳 토큰화 — `--on-accent`(#fff 2곳), `--surface-glass`(rgba(255,255,255,0.92)), `--overlay`(rgba(15,15,15,0.35))를 `:root`에 정의하고 다크 오버라이드 추가, 사용처를 var()로 교체 (research.md R3)
- [X] T004 [P] `lib/theme.js` 생성 — `THEME_KEY = "mini-notion-theme"` 상수, 값 검증 헬퍼, `applyTheme(theme)`(html data-theme 설정), `useTheme()` 훅(현재 테마 state + `toggle()`: DOM 속성 전환·state 갱신, SSR 안전 초기화) (contracts C4)

**Checkpoint**: DevTools에서 `document.documentElement.dataset.theme = "dark"` 수동 설정 시 전 화면이 다크로 보임 — 이후 스토리 시작 가능

---

## Phase 3: User Story 1 - 사이드바 토글로 다크모드 전환 (Priority: P1) 🎯 MVP

**Goal**: 사이드바 버튼 클릭으로 새로고침 없이 라이트↔다크 즉시 전환 (FR-001~003, FR-005)

**Independent Test**: 사이드바 토글 클릭 → 전 화면(목록·편집·검색·프로필)이 즉시 다크 전환, 재클릭 시 라이트 복귀 (quickstart.md US1)

### Implementation for User Story 1

- [X] T005 [P] [US1] `components/ThemeToggle.jsx` 생성 — `useTheme()` 사용, 현재 모드 아이콘(🌙/☀️)·라벨 표시, `aria-pressed={theme === "dark"}`, 클릭 시 `toggle()` (contracts C5)
- [X] T006 [P] [US1] `app/globals.css`에 `.theme-toggle` 스타일 추가 — 기존 사이드바 `.nav` 버튼과 동일한 시각 언어(높이·패딩·호버·포커스 링)
- [X] T007 [US1] `components/AppShell.jsx` 사이드바 `.side-foot` 내 프로필 링크 위에 `<ThemeToggle />` 배치 (T005 완료 후)
- [X] T008 [US1] US1 수동 검증 — quickstart.md "US1" 시나리오 5단계 수행, 5개 화면 전환 확인 (SC-001·SC-002)

**Checkpoint**: US1 단독으로 완전 동작 — MVP 배포 가능 (이 시점엔 새로고침 시 라이트로 초기화되는 것이 정상)

---

## Phase 4: User Story 2 - 선택한 테마 유지 (Priority: P2)

**Goal**: 토글 선택을 localStorage에 저장, 재방문·새로고침 시 깜빡임 없이 복원 (FR-004, FR-008)

**Independent Test**: 다크 전환 → 새로고침·브라우저 재시작 후에도 다크 유지, 로드 시 라이트 프레임 노출 없음 (quickstart.md US2)

### Implementation for User Story 2

- [X] T009 [US2] `lib/theme.js` 확장 — `toggle()`에 try/catch 감싼 `localStorage[THEME_KEY]` 저장 추가, `getInitialThemeScript()` 구현(저장값 읽어 유효하면 적용, 없으면 `"light"` — 폴백은 US3에서 교체) (data-model.md State Transitions, contracts C3)
- [X] T010 [US2] `app/layout.jsx` `<head>`에 `getInitialThemeScript()` 소스를 동기 인라인 `<script dangerouslySetInnerHTML>`로 주입 — first paint 전 `data-theme` 설정 (research.md R5) (T009 완료 후)
- [X] T011 [US2] US2 수동 검증 — quickstart.md "US2" 시나리오 수행: 새로고침 유지, 재접속 유지, Slow 3G에서 FOUC 없음, localStorage 값 확인 (SC-003·SC-005)

**Checkpoint**: US1 + US2 동작 — 저장·복원 완성, 첫 방문 기본값은 아직 라이트 고정

---

## Phase 5: User Story 3 - 첫 방문 시 기기 설정 따르기 (Priority: P3)

**Goal**: 저장값이 없으면 `prefers-color-scheme`으로 초기 테마 결정, 사용자 선택이 항상 우선 (FR-006)

**Independent Test**: localStorage 삭제 + OS 다크 에뮬레이션 → 다크로 로드; 토글로 라이트 선택 후엔 에뮬레이션과 무관하게 라이트 (quickstart.md US3)

### Implementation for User Story 3

- [X] T012 [US3] `lib/theme.js`의 `getInitialThemeScript()` 폴백을 `matchMedia("(prefers-color-scheme: dark)")` 판정으로 교체 — 기기 설정으로 정한 초기값은 저장하지 않아 "선택 안 함" 상태 보존 (data-model.md Validation Rules)
- [X] T013 [US3] US3 수동 검증 — quickstart.md "US3" 시나리오 수행: 에뮬레이션 다크→다크 로드, 라이트 선택 후 저장값 우선 확인

**Checkpoint**: 세 스토리 모두 독립 검증 완료

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전 스토리에 걸친 품질 마감

- [X] T014 다크모드 대비 육안 점검 및 팔레트 보정 — 5개 화면(글 목록·편집·검색 모달·프로필·로그인)에서 읽기 불가/배경 묻힘 요소 0건이 될 때까지 `app/globals.css` 다크 토큰 조정 (SC-004, 스펙 Edge Case: 이미지·아이콘·강조색)
- [X] T015 [P] 엣지케이스 검증 및 빌드 확인 — quickstart.md Edge Cases 수행(로그아웃 상태 `/login` 테마 적용, 시크릿 모드 저장소 차단 시 콘솔 에러 0) + `npm run build` 통과
- [X] T016 [P] `DESIGN.md`에 다크 테마 토큰 문서화 — 신규 토큰(`--on-accent`, `--surface-glass`, `--overlay`)과 `[data-theme="dark"]` 오버라이드 규칙("색상은 반드시 변수 경유") 추가

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작
- **Foundational (Phase 2)**: Phase 1 완료 후 — 모든 유저 스토리를 차단
- **US1 (Phase 3)**: Phase 2 완료 후
- **US2 (Phase 4)**: Phase 2 완료 후 시작 가능하나, 검증(T011)은 토글(US1)이 있어야 의미 있음 — 우선순위대로 US1 후 진행 권장
- **US3 (Phase 5)**: T009의 `getInitialThemeScript()`가 선행 필요 → US2 완료 후
- **Polish (Phase 6)**: 모든 스토리 완료 후

### Task-Level Dependencies

- T002 → T003 (같은 파일 `globals.css`, 순차)
- T004는 T002·T003과 병렬 가능 (다른 파일)
- T005 → T007 (컴포넌트 생성 후 배치), T006은 T005와 병렬
- T009 → T010 → T012 (같은 모듈 `lib/theme.js` 점진 확장)
- T014는 T002의 팔레트를 수정하므로 모든 화면 검증 가능 시점(전 스토리 완료) 이후

### Parallel Opportunities

```bash
# Phase 2: CSS 작업과 테마 모듈은 파일이 달라 병렬 가능
Task: "T002+T003 app/globals.css 다크 토큰 레이어"
Task: "T004 lib/theme.js 테마 모듈"

# Phase 3: 컴포넌트와 스타일 병렬
Task: "T005 components/ThemeToggle.jsx"
Task: "T006 app/globals.css .theme-toggle 스타일"

# Phase 6: 검증과 문서화 병렬
Task: "T015 엣지케이스 + 빌드 확인"
Task: "T016 DESIGN.md 문서화"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2 → Phase 3 (T001~T008)
2. **STOP and VALIDATE**: 토글 전환만으로 이미 데모 가능한 MVP (새로고침 시 초기화는 US2에서 해결)

### Incremental Delivery

1. Setup + Foundational → 다크 토큰 레이어 준비
2. US1 → 토글 전환 (MVP!)
3. US2 → 저장·복원 + FOUC 제거
4. US3 → 첫 방문 시스템 설정
5. Polish → 대비 보정·엣지케이스·문서화

각 스토리는 이전 스토리를 깨뜨리지 않고 가치를 더한다.

---

## Notes

- 단독 개발 프로젝트이므로 순차 진행(P1→P2→P3)이 기본, [P]는 원할 때만 활용
- 각 태스크(또는 논리 묶음) 완료 시 커밋 권장
- 색상 리터럴 신규 도입 금지 — 반드시 CSS 변수 경유 (contracts C2)
