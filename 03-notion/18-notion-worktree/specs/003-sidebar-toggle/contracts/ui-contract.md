# UI Contract: 사이드바 접기/펼치기

**Date**: 2026-07-16 | **Plan**: [../plan.md](../plan.md)

이 기능은 외부 API를 노출하지 않는다. 계약 대상은 (1) 스토어 인터페이스, (2) DOM/CSS 상태 계약, (3) 접근성 계약이다.

## 1. 스토어 인터페이스 (`lib/store.jsx` → `useStore()`)

```js
const {
  sidebarCollapsed, // boolean — true면 접힘(아이콘 레일), false면 펼침. 기본 false
  toggleSidebar,    // () => void — 상태 반전 + localStorage("mini-notion-sidebar") 동기화
} = useStore();
```

- `toggleSidebar`는 함수형 업데이트로 반전한다(연속 클릭 안전).
- 소비자는 `AppShell` 하나지만, 다른 컴포넌트가 읽어도 되는 공개 상태로 취급한다.

## 2. DOM / CSS 상태 계약 (`components/AppShell.jsx` + `app/globals.css`)

| 상태 | `<aside>` 클래스 | 표시 요소 | 숨김 요소 |
|------|-----------------|-----------|-----------|
| 펼침 | `sidebar` | 브랜드(타일+이름), 토글, 검색, 새 글, 글 목록(라벨 포함), 프로필(아바타+이름) | — |
| 접힘 | `sidebar collapsed` | 토글, 검색 아이콘, 새 글 아이콘, 프로필 아바타(하단 고정) | 브랜드명, 모든 텍스트 레이블, `글 목록` 섹션 전체(seclab + 목록) |

- 접힘 레일 폭: 약 52px (아이콘 버튼 + 여백), 펼침 폭: 기존 248px 유지.
- `width` 전환에 CSS transition 적용, 총 소요 ≤ 0.5s (SC-004).
- 본문 확장은 기존 `.shell`(flex) + `.main`(`flex: 1`)이 자동 처리 — 별도 계약 없음.
- 접힘 상태에서 검색 모달, Cmd/Ctrl+K 단축키, 라우팅 동작은 펼침 상태와 동일해야 한다.

## 3. 접근성 계약

| 요소 | 속성 | 펼침 상태 | 접힘 상태 |
|------|------|-----------|-----------|
| 토글 버튼 | `aria-label` | `"사이드바 접기"` | `"사이드바 펼치기"` |
| 토글 버튼 | `aria-expanded` | `"true"` | `"false"` |
| 토글 버튼 | 아이콘 | `«` (접기 방향) | `»` (펼치기 방향) |
| 레일 아이콘 버튼(검색·새 글·프로필) | `title` | (선택) | 각 항목 이름 필수 |

- 토글은 네이티브 `<button>` — Tab 포커스, Enter/Space 활성화 보장 (FR-009).
- 상태 변화 시 위 속성들은 동기적으로 갱신되어야 한다.
