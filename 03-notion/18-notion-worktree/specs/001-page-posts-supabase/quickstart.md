# Quickstart: 페이지 게시글 Supabase 저장 전환 — 검증 가이드

**Plan**: [plan.md](./plan.md) | 계약: [contracts/](./contracts/)

## Prerequisites

- Node.js 18+, `npm install` 완료
- `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 (기존 로그인이 이미 동작 중이면 충족)
- Google 계정 2개 (계정 A, 계정 B — 교차 검증용)
- RLS 정책 적용: [contracts/page-rls.sql](./contracts/page-rls.sql)을 Supabase에 적용 (`supabase/page_rls.sql`로 반영)

## Run

```bash
npm run dev   # http://localhost:3000 (WSL2: 포트 3000 충돌 시 다른 포트 사용)
```

## 검증 시나리오

### S1. 계정 저장 + 기기 간 유지 (US1 / SC-001)

1. 계정 A로 로그인 → 새 글 작성(제목·내용 입력) → 목록에 표시 확인
2. 입력 멈춘 뒤 잠시 후 새로고침 → 내용 유지 확인 (자동 저장)
3. 시크릿 창(또는 다른 브라우저)에서 계정 A로 로그인 → 같은 글이 보이면 통과
4. 브라우저 개발자도구 → Application → Local Storage에 `mini-notion-v1` 키가 더 이상 생성되지 않으면 통과 (FR-009)

### S2. 본인 글만 조회 (US2 / SC-002)

1. 계정 A로 글 작성 후 해당 글 URL(`/notes/<id>`) 복사
2. 로그아웃 → 계정 B로 로그인 → 목록에 계정 A의 글이 없으면 통과
3. 복사해 둔 계정 A 글 URL로 직접 접근 → 내용이 보이지 않고 홈으로 복귀하면 통과

### S3. 비로그인 접근 (SC-003)

1. 로그아웃 상태에서 `/` 또는 `/notes/<id>` 접근 → 로그인 화면으로 이동하면 통과
2. 그 상태에서 로그인 → 원래 가려던 화면으로 복귀하면 통과 (Clarify Q3)

### S4. 본인 글만 삭제 (US3 / SC-004)

1. 계정 A: 본인 글 상세 → ··· → 삭제 → 목록에서 즉시 사라지고, 새로고침 후에도 없으면 통과
2. 우회 삭제 차단은 S5의 SQL 검증으로 확인

### S5. 저장소 수준 강제 — RLS 직접 검증 (FR-007)

Supabase SQL Editor(또는 MCP)에서:

```sql
-- 정책 4개(select/insert/update/delete own) 존재 확인
select policyname, cmd, roles from pg_policies where tablename = 'page';

-- anon 차단 확인: 정책에 anon 롤이 없어야 함 (전면 차단)
```

브라우저 콘솔(계정 B 세션)에서 우회 요청 검증:

```js
// 계정 A 글 id로 직접 조회 시도 → data: [] (0건)이면 통과
// (supabase 클라이언트는 앱 번들에서 접근: 개발 중 window 노출 또는 콘솔 import 활용)
await supabase.from("page").select().eq("id", "<계정A_글_id>");
// 직접 삭제 시도 → 영향 행 0, 계정 A로 확인 시 글이 남아 있으면 통과
await supabase.from("page").delete().eq("id", "<계정A_글_id>");
```

### S6. 실패 처리 (FR-008 / Edge Case)

1. 개발자도구 → Network → Offline 설정 → 글 내용 수정
2. 오류 안내가 표시되고 입력 내용이 화면에서 사라지지 않으면 통과
3. Online 복귀 후 이어서 입력 → 정상 저장되면 통과

## Expected Outcomes 요약

| 시나리오 | 기대 결과 |
|---|---|
| S1 | 다른 브라우저에서 동일 글 100% 표시, localStorage 노트 키 미생성 |
| S2 | 타인 글 목록·직접 접근 모두 0건 노출 |
| S3 | 비로그인 → 로그인 화면, 로그인 후 원래 화면 복귀 |
| S4 | 본인 글 삭제 즉시 반영·영구 유지 |
| S5 | 정책 4개 존재, 우회 조회·삭제 0행 |
| S6 | 오류 안내 + 입력 유지, 복구 후 정상 저장 |
