# Tasks: 마이페이지 자기소개 등록·수정·조회

**Input**: Design documents from `/specs/001-profile-introduction/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/profile-data-contract.md, quickstart.md

**Tests**: 스펙에서 자동화 테스트를 요구하지 않았고 프로젝트에 테스트 프레임워크가 없다. 검증은 quickstart.md 수동 시나리오(S1~S5) + `npm run build`로 수행한다.

**Organization**: 유저 스토리별 단계 구성. 수정 파일이 `lib/store.jsx`, `app/profile/page.jsx` 2개뿐이므로 같은 파일을 만지는 태스크는 순차 실행한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 미완료 태스크에 대한 의존 없음)
- **[Story]**: 소속 유저 스토리 (US1, US2, US3)

## Path Conventions

Next.js 단일 프로젝트 (repository root): `app/`, `lib/`, `specs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 개발 환경이 구동 가능한지 확인 (신규 인프라 없음)

- [X] T001 개발 환경 확인 — `npm install` 완료, `.env.local`의 Supabase 키 존재, `npm run dev` 기동 및 Google 로그인 → 마이 페이지 진입 확인 (repository root)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 데이터 계층(스토어) 확장 — 모든 유저 스토리가 이 경로로 저장/조회하므로 선행 필수

**⚠️ CRITICAL**: 스키마 변경 금지(FR-011). 아래 태스크는 코드만 수정하며 `supabase/` 및 DB에 DDL을 적용하지 않는다.

- [X] T002 `lib/store.jsx`: profile 조회 select를 `"id, name"` → `"id, name, introduction"`으로 확장 (contracts ② SELECT 계약)
- [X] T003 `lib/store.jsx`: `user` 객체에 `introduction: profile?.introduction ?? ""` 노출 — 항상 문자열 보장 (contracts ① 조회 계약)
- [X] T004 `lib/store.jsx`: `updateUser(patch)`에서 `introduction`을 **명시 destructure**(`const { name, introduction, ...rest } = patch`)로 분리하고, trim 결과가 빈 문자열이면 `null`로 정규화해 `profile` update → `.select("id, name, introduction").single()` 반환 행으로 `setProfile` 동기화, 실패 시 사용자용 오류 메시지 문자열 반환 (contracts ① 저장 계약 · R2 경고: 분리 누락 시 localStorage 오버레이로 새는 버그)

**Checkpoint**: 스토어가 introduction을 읽고 쓸 수 있음 — 유저 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 자기소개 등록 및 조회 (Priority: P1) 🎯 MVP

**Goal**: 마이페이지에서 자기소개를 작성·저장하고, 새로고침·재로그인 후에도 그대로 조회된다

**Independent Test**: quickstart.md S1 — 빈 계정으로 로그인 → 자기소개 입력·저장 → 새로고침/재로그인 후 동일 내용 표시

### Implementation for User Story 1

- [X] T005 [US1] `app/profile/page.jsx`: 별명 f-row 아래에 자기소개 f-row 추가 — `<textarea className="input">`(rows≈5, `resize: vertical`), placeholder 작성 유도 문구, 저장 버튼 배치 (contracts ③ · R5)
- [X] T006 [US1] `app/profile/page.jsx`: 자기소개 로컬 상태 추가 + `user.introduction` 변경 시 입력값 동기화 `useEffect` (별명과 동일 패턴 — 늦은 로드 edge case 대응, R6)
- [X] T007 [US1] `app/profile/page.jsx`: 저장 핸들러 — `updateUser({ introduction })` 호출, 저장 중 버튼 disabled + "저장 중…" 라벨, 성공 시 `.saved-msg` "저장되었습니다 ✓" 2초 표시 (SC-003)
- [X] T008 [US1] `app/profile/page.jsx`: 500자 제한 — `maxLength={500}` + 저장 전 `length > 500` 재검증(초과 시 저장 차단·안내), `.f-hint`로 글자 수 표시 (FR-006 · R4)
- [ ] T009 [US1] quickstart.md **S1·S4** 수동 검증 — 등록, 줄바꿈 유지, 새로고침·재로그인 조회, 길이 제한 (specs/001-profile-introduction/quickstart.md)

**Checkpoint**: US1 단독으로 완전 동작 — MVP 배포/데모 가능

---

## Phase 4: User Story 2 - 자기소개 수정 (Priority: P2)

**Goal**: 기존 자기소개를 고쳐 저장하면 수정본이 조회되고, 저장 실패 시 작성 내용이 보존된다

**Independent Test**: quickstart.md S2 — 저장된 계정으로 수정·저장 → 새로고침 후 수정본 확인, Offline 상태 저장 실패 시 오류 표시 + 내용 유지

### Implementation for User Story 2

- [X] T010 [US2] `app/profile/page.jsx`: 저장 실패 처리 — `updateUser` 반환 메시지를 `.f-error`로 표시하고 textarea 입력값을 보존(리셋 금지), 재시도 가능 상태 유지 (FR-008 · contracts ③)
- [ ] T011 [US2] quickstart.md **S2** 수동 검증 — 수정 반영 + 개발자도구 Offline 실패 경로 (specs/001-profile-introduction/quickstart.md)

**Checkpoint**: US1 + US2 동작 — 수정·실패 복원력 확보

---

## Phase 5: User Story 3 - 자기소개 비우기 (Priority: P3)

**Goal**: 내용을 모두 지우고 저장하면 등록 전 상태(placeholder)로 돌아간다

**Independent Test**: quickstart.md S3 — 전체 삭제(또는 공백만) 후 저장 → 새로고침 시 빈 입력란 + placeholder

### Implementation for User Story 3

- [X] T012 [US3] `app/profile/page.jsx`: 빈 값 저장 흐름 확인·보완 — 빈 입력/공백만 입력 저장을 허용(차단 로직 없음)하고 저장 후 placeholder 복귀 확인. null 정규화는 T004(스토어) 책임이므로 UI에서 중복 검증하지 않음 (FR-007 · R3)
- [ ] T013 [US3] quickstart.md **S3** 수동 검증 — 비우기 후 placeholder 복귀, (선택) Supabase 대시보드에서 `introduction = null` 확인 (specs/001-profile-introduction/quickstart.md)

**Checkpoint**: 세 유저 스토리 모두 독립 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 회귀 방지 및 최종 검증

- [ ] T014 quickstart.md **S5** 회귀 검증 — 별명 변경 저장·유지, 별명↔자기소개 연속 저장 상호 훼손 없음, 프로필 이미지 변경/제거, 로그아웃 (FR-010 · SC-004)
- [X] T015 [P] 최종 빌드·제약 검증 — `npm run build` 오류 0건, `git diff`에 `supabase/` 변경 없음(스키마 변경 0건, SC-005) (repository root)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작
- **Foundational (Phase 2)**: T001 이후. T002 → T003 → T004 순차(같은 파일) — **모든 유저 스토리를 블록**
- **User Stories (Phase 3~5)**: Phase 2 완료 후. 세 스토리 모두 `app/profile/page.jsx` 한 파일을 수정하므로 우선순위 순 순차 진행 권장 (P1 → P2 → P3)
- **Polish (Phase 6)**: 원하는 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: Foundational만 필요 — 다른 스토리 의존 없음
- **US2 (P2)**: Foundational만 필요 — US1의 저장 핸들러(T007)를 확장하므로 US1 이후 진행이 자연스러움. 독립 테스트는 S2로 가능
- **US3 (P3)**: Foundational(T004의 null 정규화)만 필요 — 독립 테스트는 S3로 가능

### Within Each User Story

- UI 골격(T005) → 상태/동기화(T006) → 핸들러(T007) → 검증 로직(T008) → 수동 검증(T009)
- 각 스토리는 체크포인트에서 독립 검증 후 다음 스토리로 진행

### Parallel Opportunities

- 이 피처는 수정 파일이 2개(`lib/store.jsx`, `app/profile/page.jsx`)뿐이라 병렬 여지가 작다
- T015(빌드 검증)는 T014(수동 회귀 검증)와 다른 작업이므로 병렬 가능 — 유일한 [P]
- 1인 진행 기준 전체 순차 실행이 가장 안전하다

---

## Parallel Example: Phase 6

```bash
# T014 수동 회귀 검증과 T015 빌드 검증은 동시 진행 가능:
Task: "quickstart.md S5 회귀 검증 (브라우저)"
Task: "npm run build && git diff --stat supabase/ (터미널)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002~T004) — CRITICAL, 모든 스토리 블록
3. Phase 3: US1 (T005~T009)
4. **STOP and VALIDATE**: S1·S4 독립 검증 → MVP 데모 가능
5. 이후 US2(T010~T011) → US3(T012~T013) → Polish(T014~T015) 순 증분 진행

### Incremental Delivery

- 각 스토리 체크포인트마다 `npm run dev`로 즉시 확인 가능
- 커밋 단위: Phase 2 완료 후 1커밋, 각 스토리 완료 후 1커밋 권장

---

## Notes

- **스키마 변경 절대 금지** (FR-011): 어떤 태스크도 DDL·마이그레이션·RLS 변경을 포함하지 않는다
- `introduction` destructure 누락(R2 경고)이 이 피처 최대 함정 — T004에서 반드시 처리
- 별명 관련 기존 코드는 수정하지 않는 것이 원칙 (FR-010) — f-row 추가만
