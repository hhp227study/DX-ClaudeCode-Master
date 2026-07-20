# Implementation Plan: 다크모드 (Dark Mode)

**Branch**: `002-dark-mode-toggle` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-dark-mode-toggle/spec.md`

## Summary

사이드바 하단에 테마 토글 버튼을 추가하고, 클릭 시 `<html data-theme="dark|light">` 속성을 전환한다. `app/globals.css`가 이미 CSS 커스텀 프로퍼티(웜 그레이 램프 + 브랜드 블루 + 시맨틱 컬러)만으로 색을 참조하고 있으므로(100곳, 하드코딩 4곳뿐), `[data-theme="dark"]` 셀렉터에서 동일한 변수들을 다크 값으로 재정의하는 방식으로 앱 전체(로그인 화면 포함)에 일관 적용한다. 선택은 `localStorage`(`mini-notion-theme` 키)에 저장하고, `app/layout.jsx` `<head>`의 인라인 스크립트가 first paint 전에 저장값(없으면 `prefers-color-scheme`)을 읽어 적용해 깜빡임(FOUC)을 방지한다. 새 라이브러리 의존성 없음, DB 변경 없음.

## Technical Context

**Language/Version**: JavaScript (JSX, TypeScript 미사용), React 19.1, Next.js 15.5 (App Router)

**Primary Dependencies**: next, react, react-dom, @supabase/supabase-js — 이 기능에서 새 의존성 추가 없음 (next-themes 등 불사용)

**Storage**: 브라우저 `localStorage` — 키 `mini-notion-theme`, 값 `"light" | "dark"` (기존 키 관례 `mini-notion-*` 준수). DB/Supabase 변경 없음 (스펙 Assumption: 기기 단위 저장)

**Testing**: 프로젝트에 테스트 러너 없음 — `quickstart.md`의 수동 검증 시나리오로 인수 확인 (기존 프로젝트 관례와 동일)

**Target Platform**: 최신 에버그린 브라우저 (데스크톱/모바일), 클라이언트 렌더링 중심 Next.js 웹앱

**Project Type**: 웹 애플리케이션 (단일 Next.js 앱, 프론트엔드 전용 변경)

**Performance Goals**: 테마 전환 체감 즉시(1초 이내, SC-001), 페이지 로드 시 반대 테마 노출 프레임 0 (SC-005)

**Constraints**: 기존 라이트 팔레트 값 무변경(다크는 오버라이드로만), 새 의존성 금지, 컴포넌트 마크업 변경 최소화(색상은 전부 CSS 변수 경유)

**Scale/Scope**: 화면 5개(글 목록·글 편집·검색 모달·프로필·로그인), `globals.css` 1파일 761줄, 신규 파일 2개(`lib/theme.js`, `components/ThemeToggle.jsx`) + 수정 3개(`globals.css`, `layout.jsx`, `AppShell.jsx`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md`는 아직 비준되지 않은 빈 템플릿 상태로, 프로젝트 고유 원칙이 정의되어 있지 않다. 적용 가능한 게이트 없음 → **PASS (vacuous)**.

일반 원칙 차원의 자체 점검:
- 단순성: 라이브러리 추가 없이 CSS 변수 오버라이드 + 훅 1개로 해결 — 통과
- 기존 코드 존중: 라이트 테마 토큰·레이아웃 무변경, 기존 `mini-notion-*` 저장 키 관례 준수 — 통과

**Post-Phase 1 re-check (2026-07-16)**: 설계 산출물(data-model, contracts) 확정 후에도 위반 없음 → **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/002-dark-mode-toggle/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── theme-ui.md      # Phase 1 output — DOM/저장소/컴포넌트 계약
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── layout.jsx           # [수정] <head>에 테마 초기화 인라인 스크립트 추가 (FOUC 방지)
├── globals.css          # [수정] [data-theme="dark"] 변수 오버라이드 블록 추가,
│                        #        하드코딩 색상 4곳(#fff, rgba 오버레이 등) 토큰화,
│                        #        .theme-toggle 버튼 스타일
├── page.jsx             # 변경 없음 (CSS 변수 상속)
├── login/page.jsx       # 변경 없음 (html 속성 기반이라 자동 적용)
├── profile/page.jsx     # 변경 없음
└── notes/[id]/page.jsx  # 변경 없음

components/
├── AppShell.jsx         # [수정] 사이드바 .side-foot에 <ThemeToggle /> 배치
├── ThemeToggle.jsx      # [신규] 토글 버튼 — 현재 모드 아이콘/라벨 표시, aria-pressed
├── NoteEditor.jsx       # 변경 없음
└── SearchModal.jsx      # 변경 없음

lib/
├── theme.js             # [신규] 테마 상수·읽기/적용/저장 유틸 + useTheme() 훅
├── store.jsx            # 변경 없음
└── supabaseClient.js    # 변경 없음
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 색상 전환은 전역 CSS 변수 레이어에서 처리하므로 화면별 페이지 파일은 건드리지 않고, 신규 코드는 `lib/theme.js`(로직)와 `components/ThemeToggle.jsx`(UI) 두 파일로 격리한다.

## Complexity Tracking

> Constitution Check 위반 없음 — 해당 없음.
