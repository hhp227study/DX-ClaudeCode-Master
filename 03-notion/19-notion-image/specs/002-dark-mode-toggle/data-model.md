# Data Model: 다크모드 (Dark Mode)

**Feature**: 002-dark-mode-toggle | **Date**: 2026-07-16

이 기능은 서버/DB 스키마 변경이 없다. 유일한 데이터는 브라우저에 저장되는 테마 환경설정이다.

## Entity: Theme Preference (테마 환경설정)

| 속성 | 값 |
|------|-----|
| 저장 위치 | 브라우저 `localStorage` |
| 키 | `mini-notion-theme` |
| 값 타입 | 문자열 리터럴 `"light"` \| `"dark"` |
| 부재 시 의미 | "아직 선택하지 않음" → 기기 설정(`prefers-color-scheme`) 따름 |
| 유효하지 않은 값 | 무시하고 부재와 동일 처리 (기기 설정 폴백) |
| 범위(scope) | 브라우저(기기) 단위 — 계정·탭 간 동기화 없음 |

## Runtime Representation

- **단일 진실 공급원**: `document.documentElement.dataset.theme` (`<html data-theme="light|dark">`)
- CSS는 `:root`(라이트 기본) / `:root[data-theme="dark"]`(다크 오버라이드)로 이 속성만 참조
- React의 `useTheme()` state는 DOM 속성의 미러이며, 토글 시 DOM → localStorage → state 순으로 함께 갱신

## State Transitions

```text
[저장값 없음]
    │  첫 로드: prefers-color-scheme 판정
    ├── 기기 다크   → data-theme="dark"  (저장 안 함 — 선택 전이므로)
    └── 기기 라이트 → data-theme="light" (저장 안 함)

[사용자 토글 클릭]
    → 반대 테마로 DOM 속성 즉시 변경
    → localStorage["mini-notion-theme"]에 새 값 저장  ← 이 시점부터 "선택함"

[저장값 있음]
    → 이후 모든 로드에서 저장값이 기기 설정보다 우선 (US3-AS2)
```

## Validation Rules

- 저장/읽기는 try/catch로 감싸 저장소 접근 불가 시(프라이빗 모드, 차단) 오류 없이 기기 설정 폴백 (Edge Case: 저장소 차단)
- `"light"`/`"dark"` 외의 값은 저장하지 않으며, 읽었을 때도 무시
- 저장은 사용자가 명시적으로 토글했을 때만 수행 — 기기 설정으로 정해진 초기값은 저장하지 않아 "선택 안 함" 상태를 보존
