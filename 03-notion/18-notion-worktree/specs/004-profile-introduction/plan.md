# Implementation Plan: 마이페이지 자기소개 등록·수정·조회

**Branch**: `001-profile-introduction` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-profile-introduction/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

마이페이지에 별명과 동일한 인라인 편집 패턴(항상 편집 가능한 여러 줄 입력란 + 저장 버튼)으로 자기소개 등록·수정·조회를 추가한다. 저장소는 **기존 `public.profile` 테이블의 `introduction` 컬럼(text, nullable, 이미 존재)** 을 그대로 사용하며 스키마 변경은 0건이다. 데이터 흐름은 기존 별명 저장 경로(`useStore().updateUser` → Supabase `profile` update → `setProfile` 동기화)를 확장한다.

## Technical Context

**Language/Version**: JavaScript (ESM), React 19.1, Next.js 15.5 (App Router, 클라이언트 컴포넌트)

**Primary Dependencies**: `next ^15.5.4`, `react ^19.1.0`, `@supabase/supabase-js ^2.109.0`

**Storage**: Supabase Postgres — 기존 `public.profile` 테이블 (`introduction` text nullable 컬럼 기존재, RLS: 본인 행만 select/update). **스키마 변경 금지(FR-011)**

**Testing**: 전용 테스트 프레임워크 없음 → `npm run build` + `quickstart.md` 수동 시나리오 검증으로 대체

**Target Platform**: 모던 브라우저 (데스크톱 웹), 로컬 `next dev` / Vercel 배포

**Project Type**: 웹 앱 (Next.js 단일 프로젝트, 백엔드 없이 클라이언트에서 Supabase 직접 호출)

**Performance Goals**: 저장 시도 후 2초 이내 성공/실패 피드백 표시 (SC-003)

**Constraints**: DB 테이블·컬럼 변경 0건 (FR-011, SC-005) / 기존 마이페이지 기능 회귀 0건 (FR-010, SC-004) / 자기소개 최대 500자 (FR-006)

**Scale/Scope**: 사용자당 프로필 1행, 필드 1개 추가 노출. 변경 파일 2개(`lib/store.jsx`, `app/profile/page.jsx`) 수준의 소규모 증분

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md`가 미작성 템플릿(플레이스홀더) 상태로 비준된 원칙이 없다. 따라서 프로젝트 고유 게이트는 없으며, 일반 원칙(단순성 우선, 기존 패턴 재사용, 불필요한 추상화 금지)으로 검토한다:

- ✅ 새 라이브러리·추상화 도입 없음 — 기존 store/updateUser 패턴 확장
- ✅ 스키마·인프라 변경 없음 — 사용자 명시 제약과 일치
- ✅ 기존 UI 패턴(f-row, .input, 저장 버튼) 재사용

**GATE 통과** (Phase 1 설계 후 재검토: 위반 없음 유지)

## Project Structure

### Documentation (this feature)

```text
specs/001-profile-introduction/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── profile-data-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── profile/
│   └── page.jsx         # [수정] 자기소개 f-row(textarea + 저장 버튼, 500자 제한, 피드백) 추가
├── login/
├── notes/
├── layout.jsx
└── globals.css          # [필요 시 수정] textarea 전용 보조 스타일(.input 재사용이 기본)

components/
├── AppShell.jsx         # 변경 없음
├── NoteEditor.jsx       # 변경 없음
└── SearchModal.jsx      # 변경 없음

lib/
├── store.jsx            # [수정] profile select에 introduction 포함, updateUser에 introduction DB 저장 경로 추가
└── supabaseClient.js    # 변경 없음

supabase/
└── profile_sync.sql     # 변경 없음 (참고용 사본 — 스키마 변경 금지)
```

**Structure Decision**: 기존 Next.js 단일 프로젝트 구조를 그대로 사용한다. 신규 파일 없이 `lib/store.jsx`(데이터 계층)와 `app/profile/page.jsx`(UI 계층) 두 파일만 수정한다. `globals.css`는 textarea가 기존 `.input` 스타일로 부족할 때만 최소 보조 클래스를 추가한다.

## Complexity Tracking

> Constitution Check 위반 없음 — 해당 없음
