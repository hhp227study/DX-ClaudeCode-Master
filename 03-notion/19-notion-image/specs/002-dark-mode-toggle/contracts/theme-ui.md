# UI Contract: 테마 시스템

**Feature**: 002-dark-mode-toggle | **Date**: 2026-07-16

애플리케이션 내부 계층(CSS ↔ DOM ↔ React) 간의 계약을 정의한다. 외부 API는 없다.

## C1. DOM 계약 — `<html data-theme>`

- `document.documentElement`는 항상 `data-theme` 속성을 가진다: `"light"` 또는 `"dark"`
- 이 속성은 **first paint 전에** `<head>`의 동기 인라인 스크립트가 설정한다 (FR-008)
- 판정 순서: `localStorage["mini-notion-theme"]` 유효값 → `matchMedia("(prefers-color-scheme: dark)")` → `"light"`
- 속성 변경만으로 전체 UI가 전환되어야 하며, React 리렌더에 의존하지 않는다

## C2. CSS 계약 — 변수 오버라이드

- `:root { ... }` — 라이트 기본값 (기존 값 무변경)
- `:root[data-theme="dark"] { ... }` — 아래 변수를 전부 재정의:
  - `--gray-0` ~ `--gray-900` (램프 역방향 + 다크 보정)
  - `--blue-50/100/500/600/700` (대비 보정)
  - `--green-500/50`, `--red-500/50`
  - `--shadow-xs/sm/md/lg/focus`
  - 신규 토큰: `--on-accent`, `--surface-glass`, `--overlay`
- 컴포넌트 스타일 규칙: 색상은 반드시 변수 경유 — 리터럴 색상값 신규 도입 금지
- `color-scheme` 속성을 테마에 맞게 선언해 네이티브 UI(스크롤바, 폼 컨트롤)도 일치시킨다

## C3. Storage 계약

| 항목 | 값 |
|------|-----|
| 키 | `mini-notion-theme` |
| 쓰기 시점 | 사용자가 토글을 클릭했을 때만 |
| 읽기 시점 | 초기 인라인 스크립트, `useTheme()` 마운트 시 |
| 실패 처리 | try/catch — 조용히 무시, 기능은 세션 한정으로 계속 동작 |

## C4. `lib/theme.js` 모듈 계약

```text
THEME_KEY: "mini-notion-theme"                 # 저장 키 상수
getInitialThemeScript(): string                 # <head> 인라인 스크립트 소스 (layout.jsx가 주입)
useTheme(): { theme: "light"|"dark", toggle: () => void }
  - theme: 현재 DOM 속성의 미러 (초기 렌더는 SSR 안전하게 처리)
  - toggle(): DOM 속성 전환 + localStorage 저장 + state 갱신
```

## C5. `<ThemeToggle />` 컴포넌트 계약

- 렌더 위치: `AppShell.jsx` 사이드바 `.side-foot` 내부, 프로필 링크 위 (FR-001)
- 표시: 현재 모드를 아이콘과 텍스트 라벨로 표시 — 라이트일 때 "다크 모드"(🌙, 누르면 다크로), 다크일 때 "라이트 모드"(☀️) (FR-003)
- 접근성: `<button>` 요소, `aria-pressed={theme === "dark"}`, 키보드 포커스·활성화 가능
- 동작: 클릭(또는 Enter/Space) → `toggle()` 호출 → 즉시 전환 (FR-002)
- 스타일: 기존 사이드바 `.nav` 버튼과 동일한 시각 언어를 따른다
