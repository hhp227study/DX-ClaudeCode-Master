# Research: 사이드바 접기/펼치기

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

Technical Context에 NEEDS CLARIFICATION 항목은 없었다. 아래는 구현 방향이 갈릴 수 있는 지점에 대한 결정 기록이다.

## R1. 접힘 상태의 저장 위치

- **Decision**: `lib/store.jsx`의 `StoreProvider`에 `sidebarCollapsed` 상태와 `toggleSidebar` 액션을 추가한다.
- **Rationale**: `AppShell`은 페이지(`app/page.jsx`, `app/notes/[id]/page.jsx`, `app/profile/page.jsx`)마다 개별 마운트되어 라우트 이동 시 리마운트된다. 컴포넌트 로컬 `useState`로는 FR-006(화면 이동 간 유지)을 만족할 수 없다. `StoreProvider`는 루트 레이아웃(`app/layout.jsx`)에 상주해 클라이언트 사이드 내비게이션에서 언마운트되지 않으므로 상태가 자연히 유지된다. 프로젝트에 이미 확립된 패턴(노트·프로필도 동일 방식)이다.
- **Alternatives considered**:
  - `AppShell` 로컬 state + 매 마운트 시 localStorage 읽기 — 동작은 하지만 상태 소스가 이원화되고, 라우트 전환마다 저장소 읽기가 발생. 스토어 패턴이 이미 있으므로 이점 없음.
  - URL 쿼리/쿠키 — 과도한 복잡도, SSR 고려 불필요한 기능에 서버 개입 유발.

## R2. 새로고침 간 복원 방식 (SSR 하이드레이션 안전성)

- **Decision**: `localStorage` 키 `mini-notion-sidebar`에 저장하고, `StoreProvider` 마운트 후 `useEffect`에서 읽어 상태를 초기화한다. `useState` 초기값 함수에서 직접 `localStorage`를 읽지 않는다.
- **Rationale**: Next.js는 클라이언트 컴포넌트도 서버에서 초기 렌더링하므로 초기값 함수에서 `localStorage`에 접근하면 서버 크래시 또는 하이드레이션 불일치가 발생한다. `AppShell`은 `ready && user`가 되기 전까지 부트 화면(`.boot`)만 렌더링하므로, `useEffect` 초기화가 사이드바 첫 표시보다 먼저 완료되어 접힘 상태 깜빡임(FOUC)이 실사용에서 발생하지 않는다. 기존 코드(`notes`, `profile` 로딩)도 동일한 useEffect 패턴을 쓴다.
- **Alternatives considered**:
  - `useState(() => localStorage.getItem(...))` + `typeof window` 가드 — 서버/클라이언트 첫 렌더 결과가 달라져 하이드레이션 경고 위험.
  - 쿠키 + 서버 렌더링 반영 — 깜빡임은 원천 차단되지만 이 앱은 어차피 인증 확인까지 부트 화면을 보여주므로 이득이 없고 복잡도만 증가.

## R3. 접힘 표현 방식 (CSS 전략)

- **Decision**: `<aside className="sidebar">`에 접힘 시 `collapsed` 클래스를 추가하고, CSS에서 `width`를 248px → 레일 폭(약 52px)으로 `transition`한다. 레이블·브랜드명·섹션 라벨·글 목록은 접힘 상태에서 `display: none` 처리하고, 남는 아이콘 버튼은 중앙 정렬한다.
- **Rationale**: 기존 `.sidebar`가 고정 폭 flex 컬럼이라 `width` 전환만으로 본문(`.main`, `flex: 1`)이 자동 확장된다(FR-002/SC-002). 별도 레이아웃 개편 불필요. transition은 기존 CSS 변수(`--dur-fast`, `--ease-standard`) 계열을 재사용해 0.5초 이내(SC-004)를 만족한다.
- **Alternatives considered**:
  - 사이드바 조건부 렌더링(두 벌의 JSX) — 마크업 중복, 전환 애니메이션 불가.
  - CSS `transform: translateX` — 본문 폭이 따라 늘어나지 않아 레일 형태에 부적합.

## R4. 접힘 레일의 구성 요소와 토글 버튼 위치

- **Decision**: 레일에는 위에서부터 토글 버튼, 검색, 새 글, (하단 고정) 프로필 아바타를 표시한다. 토글 버튼은 펼침 상태에서는 사이드바 상단 브랜드 행 우측에, 접힘 상태에서는 레일 최상단에 위치하며 동일한 버튼 요소다. 아이콘은 접힘/펼침 방향을 나타내는 셰브론(« / »)을 상태에 따라 바꾼다.
- **Rationale**: Clarification 결정(주요 액션만, 글 목록 숨김) 그대로. 동일 버튼 유지로 FR-001("버튼 하나")과 FR-004를 만족하고, 셰브론 방향 전환으로 FR-008의 시각 단서를 제공한다.
- **Alternatives considered**:
  - 접힘 시 본문 좌상단에 별도 펼침 버튼 — 버튼이 두 개가 되어 사용자의 "버튼 하나" 요구와 어긋남.

## R5. 접근성 (FR-009)

- **Decision**: 토글은 `<button>` 요소로 만들고 `aria-label`("사이드바 접기"/"사이드바 펼치기")과 `aria-expanded` 속성을 상태에 따라 갱신한다. 레일 아이콘 버튼에는 `title` 속성으로 이름을 제공한다(FR-008 호버 확인).
- **Rationale**: 네이티브 버튼으로 키보드 포커스·Enter/Space 동작이 무료로 확보된다. `aria-expanded`는 접힘 컨트롤의 표준 패턴.
- **Alternatives considered**: 커스텀 div + tabindex — 접근성 재구현 비용만 늘어남.
