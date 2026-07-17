# Research: 마이페이지 자기소개 등록·수정·조회

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

Technical Context에 NEEDS CLARIFICATION 항목은 없다. 아래는 구현 방향을 좌우하는 결정 사항과 근거를 정리한 것이다.

## R1. 저장 위치 — 기존 `profile.introduction` 컬럼 사용

- **Decision**: 자기소개를 기존 `public.profile.introduction`(text, nullable) 컬럼에 저장한다. 마이그레이션·스키마 변경 없음.
- **Rationale**: 사용자 제약(FR-011: 테이블 구조 변경 금지). Supabase 실 스키마 조회로 컬럼이 이미 존재함을 확인했다(`list_tables` 결과: `profile` = id, created_at, name, user_id(unique), **introduction**). 기존 RLS 정책(`profile_select_own`, `profile_update_own`)이 본인 행 select/update를 이미 허용하므로 FR-009(본인만 접근)도 추가 작업 없이 충족된다.
- **Alternatives considered**:
  - 새 테이블(`introduction`) 생성 → 스키마 변경 금지 위반. 기각.
  - localStorage 오버레이(아바타 방식) → 기기·세션 간 유지(FR-004) 불충족. 기각.

## R2. 데이터 흐름 — 기존 `updateUser` 확장 (name과 동일 패턴)

- **Decision**: `lib/store.jsx`의 `updateUser(patch)`에서 `introduction`을 `name`과 같은 방식으로 명시 분리(destructure)해 Supabase `profile` update → `select` 반환값으로 `setProfile` 동기화한다. profile 조회 select 목록을 `id, name` → `id, name, introduction`으로 확장하고, `user` 객체에 `introduction`을 노출한다.
- **Rationale**: 기존 별명 저장과 동일한 검증된 경로를 재사용해 회귀 위험(FR-010)을 최소화한다. **주의**: 현재 구현은 `const { name, ...rest } = patch`에서 `rest`를 localStorage 오버레이로 보내므로, `introduction`을 명시적으로 분리하지 않으면 DB가 아닌 localStorage에 저장되는 버그가 된다. 반드시 `const { name, introduction, ...rest } = patch` 형태로 분리해야 한다.
- **Alternatives considered**:
  - 별도 `updateIntroduction()` 함수 신설 → 호출부는 명확해지나 저장 로직이 이원화되고 name+introduction 동시 저장 시 요청이 중복된다. 기존 패턴 유지가 더 단순. 기각.
  - name/introduction을 한 번의 update로 병합 처리 → 현재 화면은 필드별 저장 버튼이 분리돼 있어 필요 없음. patch에 둘 다 오면 한 update로 처리하는 병합 구현은 허용(단순화 여지).

## R3. 빈 값 처리 — trim 후 빈 문자열이면 `null` 저장

- **Decision**: 입력값을 trim해 빈 문자열이면 `introduction`을 `null`로 저장한다(자기소개 비우기, FR-007). 조회 시 `null`/빈 값은 placeholder 안내 문구로 표시한다. 저장 값은 사용자가 입력한 원문(앞뒤 공백만 제거)을 유지해 줄바꿈을 보존한다(FR-005).
- **Rationale**: 컬럼이 nullable이라 "없음" 상태를 명확히 표현할 수 있고, 공백만 입력(edge case)을 자연스럽게 흡수한다.
- **Alternatives considered**: 빈 문자열 `""` 저장 → "등록 안 함"과 "빈 값 등록"이 구분되지 않고 데이터가 지저분해짐. 기각.

## R4. 길이 제한 — 클라이언트 이중 방어 (maxLength + 저장 전 검증)

- **Decision**: textarea에 `maxLength={500}`을 걸어 초과 입력을 차단하고, 저장 핸들러에서도 `length > 500`이면 오류 안내 후 저장을 막는다(FR-006). 남은 글자 수 힌트(`.f-hint`)를 표시한다.
- **Rationale**: DB CHECK 제약 추가는 스키마 변경 금지에 걸리므로 클라이언트 검증이 유일한 지점이다. maxLength만으로는 붙여넣기·프로그램적 setState 우회 여지가 있어 저장 직전 검증을 병행한다.
- **Alternatives considered**: DB CHECK 제약 → FR-011 위반. 기각. Edge Function 검증 → 이 규모에 과설계. 기각.

## R5. UI — 별명 f-row 패턴 재사용, textarea에 `.input` 스타일 적용

- **Decision**: `app/profile/page.jsx`의 별명 f-row 아래에 자기소개 f-row를 추가한다. `<textarea className="input">`(rows≈5, `resize: vertical`, 인라인 스타일 또는 최소 보조 클래스)로 여러 줄 입력을 받고, 별명과 동일하게 저장 버튼 + `저장 중…` 상태 + `.saved-msg`/`.f-error` 피드백을 쓴다. placeholder는 "자기소개를 입력하세요" 계열 안내 문구.
- **Rationale**: 클래리파이 확정 사항(인라인 편집, 조회/편집 모드 없음). `app/globals.css`의 `.input`이 input 전용 selector가 아닌 클래스라 textarea에도 적용 가능(`input, textarea { font-family: inherit }` 리셋도 이미 존재). 기존 패턴 재사용으로 시각 일관성과 회귀 0건을 담보.
- **Alternatives considered**: 조회/편집 모드 분리, 자동 저장 → 클래리파이에서 기각됨.

## R6. 로드 동기화 & 실패 처리 — 별명과 동일 규칙

- **Decision**: profile이 늦게 로드되면 `useEffect`로 입력값을 DB 값으로 동기화한다(별명 입력란과 동일: `user.introduction` 변경 시 setState). 저장 실패 시 `.f-error` 메시지를 보여주고 입력값은 그대로 유지한다(FR-008). Enter 제출은 여러 줄 입력 특성상 두지 않는다(줄바꿈과 충돌).
- **Rationale**: 기존 UX 규칙과 동일해 학습 비용이 없고, edge case(늦은 로드, 네트워크 오류)를 스펙 그대로 충족한다.
- **Alternatives considered**: 낙관적 업데이트 후 롤백 → 저장 버튼 방식에서는 이점이 없고 복잡도만 증가. 기각.
