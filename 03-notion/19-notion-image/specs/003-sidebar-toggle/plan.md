# Implementation Plan: 사이드바 접기/펼치기

**Branch**: `001-sidebar-toggle` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-sidebar-toggle/spec.md`

## Summary

사이드바에 토글 버튼을 추가해 클릭 시 아이콘 전용 레일(토글·검색·새 글·프로필만 표시, 글 목록 숨김)로 접히고, 다시 클릭하면 펼쳐지게 한다. 접힘/펼침 상태는 페이지 이동·새로고침 간에 유지된다.

기술 접근: 접힘 상태를 `StoreProvider`(루트 레이아웃에 상주)에 두어 페이지 이동 시 유지하고, `localStorage`(`mini-notion-sidebar` 키)로 새로고침 간 복원한다. 접힘 표현은 `AppShell`의 `<aside>`에 상태 클래스를 붙이고 CSS(`width` 전환 + 레이블/목록 숨김)로 처리한다. 새 의존성 없음.

## Technical Context

**Language/Version**: JavaScript (ES2022), React 19.1, Next.js 15.5 (App Router, client components)

**Primary Dependencies**: next, react, react-dom (기존 그대로 — 이 기능은 신규 의존성 없음)

**Storage**: `localStorage` — 키 `mini-notion-sidebar` (기존 `mini-notion-*` 키 네이밍 관례 준수, 브라우저 단위 저장)

**Testing**: 테스트 프레임워크 미도입 프로젝트 — quickstart.md의 수동 검증 시나리오 + dev 서버 구동 확인으로 대체

**Target Platform**: 데스크톱 모던 브라우저 (Next.js dev/production)

**Project Type**: 단일 Next.js 웹 앱 (`app/`, `components/`, `lib/` 구조)

**Performance Goals**: 접힘/펼침 전환 0.5초 이내 완료 (SC-004) — CSS transition ~200ms 목표

**Constraints**: 기존 디자인 시스템(globals.css의 CSS 변수·클래스) 준수, SSR 하이드레이션 불일치 없이 localStorage 읽기, 새 라이브러리 추가 금지

**Scale/Scope**: 파일 3개 수정 (`lib/store.jsx`, `components/AppShell.jsx`, `app/globals.css`), 영향 화면 3개 (홈·글 상세·프로필)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md`는 아직 채워지지 않은 템플릿 상태로, 프로젝트 고유 원칙이 정의되어 있지 않다. 적용할 게이트 없음 — **PASS** (Phase 0 이전 / Phase 1 이후 동일).

일반 원칙 차원 자체 점검: 신규 의존성 없음, 기존 패턴(스토어 컨텍스트 + localStorage) 재사용, 최소 파일 변경 — 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/001-sidebar-toggle/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ui-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── globals.css          # [수정] .sidebar 접힘 상태 CSS (레일 폭, 레이블/목록 숨김, transition)
├── layout.jsx           # (변경 없음 — StoreProvider 이미 상주)
├── page.jsx             # (변경 없음 — AppShell 사용처)
├── notes/[id]/page.jsx  # (변경 없음 — AppShell 사용처)
└── profile/page.jsx     # (변경 없음 — AppShell 사용처)

components/
└── AppShell.jsx         # [수정] 토글 버튼 추가, 접힘 상태 클래스 적용, 접힘 시 글 목록·레이블 숨김

lib/
└── store.jsx            # [수정] sidebarCollapsed 상태 + toggleSidebar 액션 + localStorage 동기화
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 신규 디렉터리·파일 없이 위 3개 파일만 수정한다. 상태는 페이지 이동에도 살아남아야 하므로(FR-006) 페이지별로 리마운트되는 `AppShell`이 아닌, 루트 레이아웃의 `StoreProvider`에 둔다.

## Complexity Tracking

> Constitution Check 위반 없음 — 해당 없음.
