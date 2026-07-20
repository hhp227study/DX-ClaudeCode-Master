# Implementation Plan: 페이지 게시글 Supabase 저장 전환

**Branch**: `001-page-posts-supabase` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-page-posts-supabase/spec.md`

## Summary

게시글(노트) 저장소를 브라우저 localStorage에서 사용자가 만들어 둔 Supabase `page` 테이블로 전환한다. 테이블 구조(id, created_at, title, content, user_id)는 변경하지 않고, 현재 정책이 0개인 `page` 테이블에 own-only RLS 정책(SELECT/INSERT/UPDATE/DELETE)을 추가해 "로그인 유저만 등록, 본인 글만 조회·수정·삭제"를 데이터 계층에서 강제한다. 클라이언트는 기존 `lib/store.jsx`의 노트 CRUD를 supabase-js 호출로 교체하되(profile 연동과 동일한 패턴), 자동 저장 UX는 디바운스 + 낙관적 업데이트로 유지한다.

## Technical Context

**Language/Version**: JavaScript (ES2023), React 19, Next.js 15 (App Router, 전 화면 `"use client"` 클라이언트 컴포넌트)

**Primary Dependencies**: `@supabase/supabase-js` ^2.109 (인증 + DB), `next` ^15.5, `react` ^19.1 — 신규 의존성 추가 없음

**Storage**: Supabase Postgres `public.page` 테이블 (구조 고정: `id` uuid PK default `gen_random_uuid()`, `created_at` timestamptz default `now()`, `title` text null, `content` text null, `user_id` uuid null FK→`auth.users.id`). RLS 활성화 상태, 현재 정책 0개(전면 차단) → own-only 정책 추가 필요. 보기 방식(`mini-notion-view`)·프로필 아바타 오버레이 localStorage는 범위 외로 유지

**Testing**: 테스트 프레임워크 미도입 프로젝트 — quickstart.md의 수동 검증 시나리오(2계정 교차 검증) + SQL 기반 RLS 검증으로 대체

**Target Platform**: 모던 브라우저 (데스크톱 위주), Vercel/로컬 `next dev`

**Project Type**: 웹 앱 (클라이언트 사이드 SPA 성격의 Next.js App Router 단일 프로젝트)

**Performance Goals**: 작성·수정·삭제 결과 3초 이내 화면 반영 (SC-005). 낙관적 업데이트로 체감 지연 0에 가깝게 유지

**Constraints**: `page` 테이블 구조 변경 금지 (컬럼·제약 추가/삭제/변경 불가 — RLS 정책 추가는 구조 변경이 아니므로 허용). `updated_at` 컬럼 부재 → 수정 시각 미저장, 날짜 표시는 `created_at` 사용. `user_id`가 nullable이지만 NOT NULL 제약 추가 불가 → INSERT 정책의 `with_check`로 본인 uid 강제(널 삽입도 자동 차단)

**Scale/Scope**: 개인용 노트 — 계정당 수십~수백 건, 동시 사용자 소수. 화면 4개(홈 목록, 상세, 로그인, 프로필) 중 데이터 계층 교체가 핵심이고 화면 변경은 최소

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md`는 미작성 템플릿(플레이스홀더) 상태로, 비준된 원칙이 없다. 적용 가능한 게이트 없음 → **PASS** (Phase 0 진입 허용, Phase 1 이후 재평가에서도 동일).

## Project Structure

### Documentation (this feature)

```text
specs/001-page-posts-supabase/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── store-api.md     # useStore() 노트 CRUD 계약 (화면이 의존하는 인터페이스)
│   └── page-rls.sql     # page 테이블 RLS 정책 계약 (DB에 적용할 DDL)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── page.jsx             # 홈(글 목록 3뷰) — notes 로딩 상태 대응 외 변경 최소
├── notes/[id]/page.jsx  # 상세 — 로딩 전 리다이렉트 방지 보완
├── login/page.jsx       # 로그인 — 로그인 후 원래 화면 복귀 처리
└── profile/page.jsx     # 범위 외 (변경 없음)

components/
├── AppShell.jsx         # 비로그인 리다이렉트(기존) + 이동 전 원래 경로 보존
├── NoteEditor.jsx       # 변경 없음 (store 계약 유지 시)
└── SearchModal.jsx      # 변경 없음 (store 계약 유지 시)

lib/
├── store.jsx            # ★ 핵심 변경: localStorage 노트 CRUD → page 테이블 CRUD(디바운스 자동 저장, 낙관적 업데이트, 오류 상태)
└── supabaseClient.js    # 변경 없음

supabase/
├── profile_sync.sql     # 기존 (참고용 선례)
└── page_rls.sql         # ★ 신규: page 테이블 own-only RLS 정책 (contracts/page-rls.sql과 동일 내용 적용본)
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 데이터 계층이 `lib/store.jsx` 한 곳에 모여 있고 화면들은 `useStore()` 계약에만 의존하므로, store 내부 구현 교체 + RLS 정책 SQL 추가만으로 요구사항을 충족한다. 새 디렉터리·새 아키텍처 도입 없음.

## Complexity Tracking

> Constitution Check 위반 없음 — 해당 없음.
