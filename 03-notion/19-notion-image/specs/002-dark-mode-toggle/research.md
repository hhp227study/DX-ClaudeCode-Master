# Research: 다크모드 (Dark Mode)

**Feature**: 002-dark-mode-toggle | **Date**: 2026-07-16

Technical Context에 NEEDS CLARIFICATION 항목은 없으며, 구현 방식 선택지에 대한 조사 결과를 기록한다.

## R1. 테마 전환 메커니즘

- **Decision**: `<html>` 요소의 `data-theme` 속성 + CSS 커스텀 프로퍼티 오버라이드. `:root`가 라이트 기본값을 정의하고, `:root[data-theme="dark"]`에서 동일한 변수 이름(`--gray-*`, `--blue-*`, `--shadow-*` 등)을 다크 값으로 재정의한다.
- **Rationale**: `globals.css`가 이미 색상을 100곳에서 변수로만 참조한다(하드코딩 4곳). 변수 레이어만 바꾸면 761줄 CSS와 5개 화면을 수정 없이 일괄 전환할 수 있고, 사이드바가 없는 로그인 화면도 자동 적용된다(FR-005). 속성 전환은 JS 한 줄이라 새로고침 없는 즉시 전환(FR-002)이 보장된다.
- **Alternatives considered**:
  - 별도 다크 스타일시트 교체 — 로드 타이밍에 따라 깜빡임 위험, 유지보수 이중화. 기각.
  - Tailwind `dark:` 클래스 — 이 프로젝트는 Tailwind 미사용. 기각.
  - `prefers-color-scheme` 미디어 쿼리 단독 — 수동 토글(FR-001~002) 불가. 기각(첫 방문 초기값으로만 사용).

## R2. 그레이 램프 다크 매핑 전략

- **Decision**: 라이트의 웜 그레이 램프(`--gray-0`=흰색 → `--gray-900`=거의 검정)를 다크에서 **역방향으로 재정의**한다: `--gray-0`이 가장 어두운 배경(#191918 계열 웜 다크), `--gray-900`이 가장 밝은 텍스트가 되도록 톤을 뒤집되, 순수 반전이 아니라 다크 UI 관례에 맞게 채도·명도를 보정한다. `--shadow-*`는 다크에서 더 진한 그림자로, `--blue-500` 등 액센트는 다크 배경 대비를 위해 한 단계 밝힌다. 상태 색(`--green/red`)의 `-50` 틴트는 어두운 배경용 저채도 딥 톤으로 재정의한다.
- **Rationale**: 기존 CSS는 "낮은 숫자 = 배경, 높은 숫자 = 텍스트" 규칙으로 일관되게 사용 중이므로 역방향 재정의만으로 의미가 유지된다. 시맨틱 토큰(`--bg`, `--text`) 체계로 전면 리팩터링하는 것보다 변경 범위가 훨씬 작다.
- **Alternatives considered**: 시맨틱 토큰 도입 후 전 CSS 치환 — 이상적이지만 761줄 전면 수정로 리스크·범위 과다. 기각(추후 리팩터링 후보로만 기록).

## R3. 하드코딩 색상 4곳 처리

- **Decision**: 변수로 토큰화한다 — `#fff`(버튼/브랜드 타일 전경) → `--on-accent`, `rgba(255,255,255,0.92)`(반투명 서피스) → `--surface-glass`, `rgba(15,15,15,0.35)`(모달 오버레이) → `--overlay`. 각각 라이트 기본값 + 다크 오버라이드를 정의한다.
- **Rationale**: 4곳만 남기고 전부 변수 경유이므로, 이 4곳을 토큰화해야 SC-002(이전 테마 색 잔존 0)를 만족한다.
- **Alternatives considered**: 그대로 두기 — 다크에서 흰 배경 잔존으로 FR-005 위반. 기각.

## R4. 선택 저장(퍼시스턴스)

- **Decision**: `localStorage`, 키 `mini-notion-theme`, 값 `"light" | "dark"`. 저장 실패(프라이빗 모드 등)는 try/catch로 무시하고 세션 내 동작만 유지한다.
- **Rationale**: 스펙 Assumption이 기기 단위 저장으로 확정. 프로젝트가 이미 `mini-notion-v1`, `mini-notion-profile-<uid>` 키를 사용하므로 관례가 일치한다. 로그인 여부와 무관하게 동작해야 하므로(로그인 화면에도 적용) 계정 저장보다 적합하다.
- **Alternatives considered**:
  - Supabase `profile` 테이블 컬럼 — 기기 간 동기화 장점이 있으나 스펙 범위 외(Assumptions), 로그인 전 화면 적용 불가, 마이그레이션 필요. 기각.
  - 쿠키 — SSR에서 유리하지만 이 앱은 인증·데이터가 전부 클라이언트 렌더링이라 이점 없음. 기각.

## R5. 로드 시 깜빡임(FOUC) 방지

- **Decision**: `app/layout.jsx`(서버 컴포넌트)의 `<head>`에 동기 인라인 `<script>`(dangerouslySetInnerHTML)를 넣어, body 렌더 전에 `localStorage` → 없으면 `matchMedia("(prefers-color-scheme: dark)")` 순으로 판정해 `document.documentElement.dataset.theme`를 설정한다.
- **Rationale**: React 하이드레이션 이후에 테마를 적용하면 라이트가 한 프레임 먼저 보인다(FR-008/SC-005 위반). first paint 전 동기 실행이 표준 해법이며, next-themes 같은 라이브러리가 내부적으로 쓰는 방식과 동일하다.
- **Alternatives considered**:
  - `next-themes` 도입 — 동작은 동일하나 의존성 추가 금지 제약과 충돌. 기각.
  - `useEffect`에서 적용 — FOUC 발생. 기각.

## R6. React 측 상태 관리와 토글 UI

- **Decision**: `lib/theme.js`에 `useTheme()` 훅(현재 테마 state + `toggle()`)을 두고, 소비자는 `components/ThemeToggle.jsx` 하나만 둔다. 훅은 마운트 시 `<html data-theme>`에서 현재값을 읽고, 토글 시 DOM 속성·localStorage·state를 함께 갱신한다. 전역 Context는 만들지 않는다. 토글 버튼은 사이드바 `.side-foot`(프로필 링크 위)에 배치하고, 현재 모드를 아이콘(🌙/☀️)과 라벨로 표시하며 `aria-pressed`로 상태를 노출한다(FR-003).
- **Rationale**: 테마를 구독하는 컴포넌트가 토글 버튼 하나뿐이므로 Context/Provider는 과설계다. DOM 속성이 단일 진실 공급원(single source of truth)이라 어디서든 일관된다.
- **Alternatives considered**:
  - `lib/store.jsx`(StoreProvider)에 편입 — 스토어는 인증·노트 도메인 담당. 관심사 혼합 + AppShell 밖(로그인) 사용 불가. 기각.
  - 멀티탭 실시간 동기화(`storage` 이벤트) — 스펙에서 필수 아님으로 명시. 범위 외로 기록만.
