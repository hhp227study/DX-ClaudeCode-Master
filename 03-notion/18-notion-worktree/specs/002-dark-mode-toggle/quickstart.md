# Quickstart: 다크모드 검증 가이드

**Feature**: 002-dark-mode-toggle | **Date**: 2026-07-16

## Prerequisites

- Node.js 18+ / npm
- `.env.local`에 Supabase 키 설정 (기존 로그인 기능용 — 이미 구성됨)
- 의존성 설치: `npm install`

## Run

```bash
npm run dev
# http://localhost:3000 접속 → 구글 로그인
```

## Validation Scenarios

계약·데이터 상세는 [contracts/theme-ui.md](./contracts/theme-ui.md), [data-model.md](./data-model.md) 참조.

### US1 — 사이드바 토글로 전환 (P1)

1. 로그인 후 사이드바 하단의 테마 토글 버튼 확인 (프로필 링크 위)
2. 클릭 → **새로고침 없이** 사이드바·글 목록·본문이 즉시 다크로 전환되는지 확인
3. 다시 클릭 → 라이트로 복귀 확인
4. 버튼 아이콘/라벨이 현재 모드를 나타내는지 확인
5. 글 편집 화면(`/notes/<id>`), 검색 모달(Cmd/Ctrl+K), 프로필(`/profile`)을 열어 모두 다크 적용 확인

### US2 — 테마 유지 (P2)

1. 다크모드로 전환
2. 새로고침(F5) → 다크 유지 + **라이트가 번쩍이는 프레임이 없는지** 육안 확인 (네트워크 탭 Slow 3G로 재확인 권장)
3. 브라우저 완전 종료 후 재접속 → 다크 유지 확인
4. DevTools → Application → Local Storage에서 `mini-notion-theme: "dark"` 확인

### US3 — 첫 방문 시 기기 설정 (P3)

1. Local Storage에서 `mini-notion-theme` 삭제
2. DevTools → Rendering → "Emulate CSS prefers-color-scheme: dark" 설정 후 새로고침 → 다크로 표시
3. 같은 상태에서 토글로 라이트 선택 → 에뮬레이션이 다크여도 라이트 유지 (저장값 우선)

### Edge Cases

- **로그아웃 상태**: 로그아웃 후 `/login` → 저장된 테마가 로그인 화면에도 적용되는지 확인 (토글 버튼은 없음 — 정상)
- **저장소 차단**: 시크릿 모드 + 사이트 데이터 차단 상태에서 오류 없이 동작(콘솔 에러 0), 토글은 세션 내에서만 유지
- **대비 점검**: 다크모드에서 5개 화면 전부 육안 점검 — 읽을 수 없는 텍스트/아이콘/구분선 0건 (SC-004)

## Expected Outcome

- 스펙의 SC-001~SC-005 전부 통과
- `npm run build` 경고/에러 없이 성공
