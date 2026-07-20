# Data Model: 페이지 게시글 Supabase 저장 전환

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Entity: 게시글 (Page)

저장소: `public.page` — **구조 변경 금지** (아래는 실측된 현행 구조 그대로)

| 컬럼 | 타입 | 제약 | 용도 |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | 글 고유 식별자. 클라이언트가 `crypto.randomUUID()`로 생성해 삽입 (R5) |
| `created_at` | timestamptz | default `now()` | 작성 시각. 목록 정렬(desc) 및 날짜 표시에 사용 (R6) |
| `title` | text | nullable | 제목. 빈 문자열 허용(화면에서 "제목 없음" 표시) |
| `content` | text | nullable | 본문. 빈 문자열 허용 |
| `user_id` | uuid | nullable, FK → `auth.users.id` | 작성자. RLS with_check로 사실상 NOT NULL 강제 (R2) |

### UI 모델 ↔ 테이블 매핑

화면(컴포넌트)이 쓰는 note 객체와 DB 행의 변환 규칙:

| UI 필드 | 매핑 | 비고 |
|---|---|---|
| `note.id` | `page.id` | 그대로 |
| `note.title` | `page.title ?? ""` | null → 빈 문자열 정규화 |
| `note.content` | `page.content ?? ""` | null → 빈 문자열 정규화 |
| `note.createdAt` | `page.created_at` | ISO 문자열 |
| `note.updatedAt` | (컬럼 없음) → `page.created_at` 재사용 | 목록 날짜 표기는 "작성" 기준 (R6) |
| `note.emoji` | (컬럼 없음) → 상수 `"🗒️"` | 저장하지 않음 (R6) |

## Entity: 사용자 (User)

- `auth.users` (Supabase Auth 관리, Google OAuth) — 이 기능에서 직접 조작하지 않음.
- 게시글 소유 관계: `page.user_id = auth.users.id` (1:N). 소유자만 조회·수정·삭제 가능.
- `public.profile`은 기존 기능(이름 표시)으로 범위 외.

## 접근 규칙 (RLS)

`page` 테이블은 RLS enabled + 정책 0개(전면 차단) 상태 → 아래 own-only 정책 4개를 추가한다.
정책 DDL 계약: [contracts/page-rls.sql](./contracts/page-rls.sql)

| 작업 | 롤 | 규칙 |
|---|---|---|
| SELECT | authenticated | `(select auth.uid()) = user_id` — 본인 글만 조회 (FR-003) |
| INSERT | authenticated | with check 동일 — 본인 uid로만 등록, null 차단 (FR-001, R2) |
| UPDATE | authenticated | using + with check 동일 — 본인 글만, 소유권 이전 불가 (FR-005) |
| DELETE | authenticated | using 동일 — 본인 글만 삭제 (FR-004) |

`anon` 롤에는 정책을 부여하지 않는다 → 비로그인 접근은 DB 수준에서 전면 차단 (FR-001, FR-007).

## 상태 전이

```text
[없음] --createNote(빈 제목/내용, 본인 uid)--> [작성됨]
[작성됨] --updateNote(title/content, 디바운스 자동 저장)--> [작성됨] (LWW, R4)
[작성됨] --deleteNote--> [삭제됨(행 제거, 복구 없음)]
```

- 삭제는 물리 삭제(soft delete 컬럼이 없고 추가 불가).
- 수정 시각은 저장하지 않으므로 상태 전이가 `created_at`에 영향을 주지 않는다.

## Validation Rules

- 등록·수정·삭제는 로그인 세션(`auth.uid()`) 필수 — 미로그인 시 store가 호출 자체를 거부하고, 우회 시 RLS가 차단 (이중 방어, FR-007)
- `title`/`content`는 빈 값 허용 (기존 UX: 새 글은 빈 제목·내용으로 시작)
- `user_id`는 항상 현재 세션의 uid — 다른 값·null은 RLS가 거부
- 존재하지 않는(또는 타인의) id 조회 → 빈 결과로 처리, 오류 아님 (Edge Case: "글이 없음" 상태)
