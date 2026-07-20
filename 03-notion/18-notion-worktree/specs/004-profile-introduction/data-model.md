# Data Model: 마이페이지 자기소개 등록·수정·조회

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

> **스키마 변경 없음 (FR-011)**. 아래는 기존 구조의 기록이며, 이 피처는 `profile.introduction` 컬럼을 *사용*만 한다.

## Entity: Profile (`public.profile`) — 기존 테이블, 변경 금지

| 컬럼 | 타입 | 제약 | 이 피처에서의 역할 |
|------|------|------|--------------------|
| `id` | uuid | PK, default `gen_random_uuid()` | 행 식별 (변경 없음) |
| `created_at` | timestamptz | default `now()` | (변경 없음) |
| `name` | text | nullable | 별명 — 기존 기능, 동작 유지 (FR-010) |
| `user_id` | uuid | NOT NULL, UNIQUE, FK → `auth.users.id` | 사용자당 1행 보장 (1:1) |
| `introduction` | text | nullable | **자기소개 저장 필드 (이 피처가 읽고 씀)** |

### 접근 제어 (기존 RLS — 변경 없음)

- `profile_select_own`: 본인(`auth.uid() = user_id`) 행만 조회 → FR-009 충족
- `profile_update_own`: 본인 행만 수정 → FR-009 충족
- insert/delete 정책 없음(트리거·FK cascade 전담) — 이 피처는 update/select만 사용하므로 영향 없음

## 검증 규칙 (애플리케이션 레이어)

| 규칙 | 값 | 근거 |
|------|-----|------|
| 최대 길이 | 500자 (trim 후 기준) | FR-006, Clarifications |
| 빈 값 정규화 | trim 결과 빈 문자열 → `null` 저장 | FR-007, R3 |
| 줄바꿈 | 원문 보존 (text 컬럼 그대로) | FR-005 |
| 저장 전제 | 로그인 상태(`uid` 존재) | FR-009 |

## 상태 전이

```text
[자기소개 없음 (introduction = null)]
        │ 내용 입력 + 저장 (등록)
        ▼
[자기소개 있음 (introduction = text)]
        │ 내용 변경 + 저장 (수정)      ──▶ [자기소개 있음] (갱신)
        │ 전체 삭제/공백만 + 저장 (비우기)
        ▼
[자기소개 없음 (introduction = null)]
```

## 클라이언트 상태 매핑 (`lib/store.jsx`)

| 위치 | 현재 | 변경 후 |
|------|------|---------|
| profile 조회 select | `"id, name"` | `"id, name, introduction"` |
| `user` 객체 | `{ name, avatar, ... }` | `{ name, avatar, introduction: profile?.introduction ?? "", ... }` |
| `updateUser(patch)` | `name`만 DB, 나머지 localStorage 오버레이 | `name`, `introduction` 모두 DB 경로(명시 destructure), 나머지만 오버레이 |

> ⚠️ `introduction`을 destructure하지 않으면 `...rest`로 localStorage에 저장되는 버그가 됨 (R2 참고).
