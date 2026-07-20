# Data Model: 사이드바 접기/펼치기

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

## 엔티티

### 사이드바 표시 상태 (SidebarDisplayState)

사용자별 화면 선호 값. 서버 저장 없음 — 브라우저 로컬 전용.

| 필드 | 타입 | 값 | 설명 |
|------|------|-----|------|
| `sidebarCollapsed` | boolean | `true`(접힘) / `false`(펼침) | 스토어 내 런타임 상태. 기본값 `false` |

### 영속화 (localStorage)

| 항목 | 값 |
|------|-----|
| 키 | `mini-notion-sidebar` (기존 `mini-notion-*` 관례 준수) |
| 값 | `"collapsed"` 또는 `"expanded"` 문자열 |
| 읽기 시점 | `StoreProvider` 마운트 후 `useEffect` (R2 참조) |
| 쓰기 시점 | `toggleSidebar` 호출 직후 |
| 결측/파싱 불가 시 | 기본값 펼침(`false`) — FR-007 |

## 상태 전이

```text
                 toggleSidebar()
  ┌──────────┐ ────────────────▶ ┌──────────┐
  │  펼침     │                   │  접힘     │
  │ (false)  │ ◀──────────────── │ (true)   │
  └──────────┘   toggleSidebar()  └──────────┘

  초기화: localStorage["mini-notion-sidebar"] === "collapsed" → 접힘, 그 외 → 펼침
```

- 전이는 토글 단일 액션뿐이며 멱등적 set이 아닌 반전이다. 연속 클릭 시 매 클릭이 반전되어 최종 클릭 기준 상태로 정착한다(Edge Case 충족 — React 상태 업데이트는 함수형 업데이트 `(v) => !v` 사용).
- 상태는 라우트 이동과 무관하게 `StoreProvider` 수명 동안 유지된다(FR-006).

## 검증 규칙

- `sidebarCollapsed`는 boolean 외 값을 가질 수 없다 (localStorage 값이 `"collapsed"`가 아니면 모두 `false`로 정규화).
- 저장 실패(localStorage 접근 불가 환경)는 기능을 막지 않는다 — 런타임 토글은 정상 동작하고 복원만 포기한다.
