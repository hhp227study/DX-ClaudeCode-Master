# CatchRhy 관리자 페이지 — 들어갈 내용 정리

> 2026-07-16 작성. 현재 스키마(setup.sql: profiles·songs·charts·plays)와
> 수동 운영 지점을 기준으로 정리. 아직 설계 문서이며 구현 전.

## 0. 왜 필요한가 — 지금 수동으로 하고 있는 것

| 현재 방식 | 관리자 페이지로 대체 |
|---|---|
| 곡 추가: seed SQL 작성 → Supabase 대시보드 SQL Editor에서 수동 실행 | 신곡 등록 폼 (songs·charts insert) |
| 곡 노출 제어: `songs.is_active`를 SQL로 직접 토글 | 목록에서 토글 스위치 |
| note_count 정합: 채보 재생성 때마다 seed 수정 (seed_004 사례) | DB ↔ 채보 JSON 자동 비교 버튼 |
| 난이도 밸런스 판단 근거 없음 (Hard 착수 조건: "normal 소진 유저 확인") | 채보별 정확도·랭크 분포 통계 |

⚠️ 한계: 채보 JSON 생성(`npm run gen-charts`)과 정적 서빙(`/charts/*.json`)은
빌드·배포에 묶여 있어 관리자 페이지로 대체 불가. 관리자 페이지는 **DB 시드 부분만** 대체한다.

## 1. 대시보드 (관리자 홈)

- 핵심 지표: DAU/WAU, 신규 가입 수, 일별 플레이 수 추이
- 곡별 플레이 수 순위 (어떤 곡이 소비되는지)
- 품질 지표: 평균 정확도, 랭크 분포, 풀콤보 비율
- 최근 플레이 피드 (이상치 하이라이트 포함)

## 2. 곡 관리

- 곡 목록 테이블: id(슬러그), 제목, 아티스트, BPM, 길이, is_active, 채보 수, 누적 플레이 수
- **is_active 토글** — 즉시 노출/숨김 (현재 SQL 직접 실행 대체)
- 곡 메타 수정: 제목, 아티스트, jacket_url, preview_url, **license_note**(PRD 11.1 — 필수 입력 강제)
- 신곡 등록 폼: 시드 SQL 수동 실행 대체 (단, 채보 JSON은 배포에 포함돼 있어야 함 — 안내 문구 표시)

## 3. 채보 관리

- 곡별 채보 목록: 난이도, note_count, chart_url, version
- **정합 체크**: DB의 note_count vs 실제 `/charts/*.json` 노트 수 비교 (버튼 1개로 전체 검증)
- 채보 version 관리: 재생성 배포 시 version 증가 기록
- (선택) 채보 미리보기: 노트 타임라인·y 분포 시각화 + 규칙 위반 하이라이트
  (y 0.45~0.73 밴드, 0.75초 하한, 비트 스냅 — gen-chart 검증 규칙과 동일 기준)

## 4. 플레이 데이터 / 밸런스

- 채보별 통계: 플레이 수, 평균 점수·정확도, 랭크 분포, judgements 집계(miss 비율)
- **난이도 밸런스 뷰**: easy vs normal 정확도·랭크 분포 비교
  → 백로그 Hard 난이도 착수 판단 근거 (normal에서 SS 이상 상위 유저 비율)
- 이상치 탐지 필터: score 상한(500,000) 근접, accuracy 100% 반복, 비정상적으로 짧은
  play_duration_sec — 클라이언트 계산 점수라 치팅 감시 필요 (PRD 10장 sanity check의 연장)
- `migrated_from_local` 행 구분 표시 (판정 분포 없는 이관 데이터 — 통계에서 제외 옵션)

## 5. 유저 관리

- 유저 목록: 닉네임, 가입일, 플레이 수, 마지막 플레이 시각 / 닉네임 검색
- 부적절 닉네임 강제 변경 (2~12자 체크는 DB에 있음, 내용 필터는 없음)
- 계정 삭제 (profiles cascade → plays 함께 삭제됨 — 확인 다이얼로그 필수)
- 유저 상세: 개인 플레이 이력 (집계 중심, 개인정보 최소 노출)

## 6. 운영 도구 (후순위)

- 공지/점검 배너 관리 — `announcements` 테이블 신설 필요
- videos 모더레이션 — 영상 업로드+공유 기능(백로그) 도입 시 함께
- 관리자 조작 감사 로그 (누가 언제 무엇을 바꿨나)

## 기술 전제 — 구현 전에 결정할 것

1. **관리자 식별**: `profiles.is_admin boolean`(간단) vs Supabase custom claim.
   MVP는 is_admin 컬럼 + 마이그레이션 권장.
2. **RLS 주의**: 현재 정책상 `is_active=false` 곡은 select 자체가 안 되고,
   songs/charts에 write 정책이 아예 없다 → 관리자용 정책 추가 또는 ③으로 우회.
3. **쓰기 경로**: 클라이언트 직접(RLS 의존) vs **Next.js Route Handler + service_role 키(서버 전용)**.
   관리자 페이지는 후자가 안전 — plays 전체 조회도 RLS(본인 행만)를 넘어야 해서 어차피 필요.
4. 경로는 `/admin`, 미들웨어에서 is_admin 체크 + 비관리자는 404.
5. "리더보드 없음(개인 베스트만)" 규칙과의 관계: 관리자 통계는 내부 운영용 집계이므로
   규칙 위반 아님 — 단, 유저에게 노출되는 화면에 재사용하지 말 것.

## MVP 범위 제안

1순위(지금 아픈 것): 대시보드 간이 지표 + 곡 is_active 토글 + note_count 정합 체크
2순위: 채보별 통계·난이도 밸런스 뷰 (Hard 착수 판단용) + 유저/플레이 조회
3순위: 신곡 등록 폼, 이상치 탐지, 운영 도구

## 구현 현황 (2026-07-16 — MVP 1순위 + 유저 조회 완료)

**확정된 설계 (위 "기술 전제"의 결정)**
- ~~service_role 서버 라우트~~ → **profiles.is_admin + 관리자 RLS 정책** 채택.
  근거: 앱이 순수 클라이언트 구조(supabase-js + RLS, API 라우트 0개)라 서버 경로 신설은
  아키텍처 이탈 + service_role 키 관리 부담. 관리자 정책은 기존 정책과 OR로 합쳐져 안전.
- ⚠️ 자가 승격 차단: 기존 "본인 프로필 수정" 정책이 행 단위라 is_admin 컬럼 변경을 못 막음
  → `revoke update` 후 `grant update (nickname, avatar_url)`로 컬럼 단위 제한 (setup_002_admin.sql)
- 대시보드 분포 통계는 **최근 1000판 표본** 기준 (PostgREST 기본 행 한도) — 총계는 exact count

**만든 것**
- `supabase/setup_002_admin.sql` — is_admin 컬럼·컬럼 grant·is_admin() 함수·관리자 정책 8개·
  hhp0227@gmail.com 승격. **⚠️ 대시보드 SQL Editor에서 실행 필요 (seed_003·004 다음 순서)**
- `lib/admin-api.ts` — 관리자 데이터 레이어 (api.ts와 달리 로컬 폴백 없음)
- `/admin` 대시보드 (가입자·플레이 총계, 7일 추이, 곡별 소비, 최근 플레이)
- `/admin/songs` 곡·채보 관리 (is_active 토글, note_count 정합 체크 — decoy 포함 실측 비교)
- `/admin/users` 유저 목록·검색
- 접근 게이트는 `app/admin/layout.tsx` (UI 편의) + RLS (실제 통제)

**채보 에디터 (2026-07-16 구현 완료 — `/admin/editor?song={id}&difficulty={diff}`)**
- 진입점: `/admin/songs`의 채보 행 "에디터" 버튼. `/play`와 같은 쿼리 파라미터 관례,
  admin 레이아웃 하위라 권한 게이트 자동 상속
- 입력 방식: SynthTrack으로 곡을 틀고 필드 클릭 → 그 시점(비트 스냅)·위치에 노트 생성.
  도구 1~4(캐치/함정/포즈🙌/포즈🫶), 스냅 1·0.5·0.25비트, Space 재생/일시정지,
  ←/→ 스냅 단위 시크, 타임라인 클릭 시크, 노트 드래그로 위치 이동(포인터 캡처,
  4px 임계로 클릭-추가와 구분, 밴드 클램프), 타임라인 노트 틱 드래그로 시간(t) 이동
  (스냅 그리드에 물림·750ms 하한 차단·재정렬 시 인덱스 추적), 포즈는 상단 배너 클릭 선택, Del 삭제
- 이를 위해 `SynthTrack.start(fromMs)` 중간 재생 추가 (audio.ts — 과거 이벤트는 minT로 걸러 예약 제외)
- 검증: y 밴드·x 여백·750ms 하한(함정 제외)·0.25비트 그리드·BPM 일치 — 경고만 하고 저장은 허용
- **저장 = A안 확정**: Storage `charts/{song}-{diff}-v{N}.json` 업로드 → charts 행
  (chart_url·note_count·version) 갱신. 버전마다 새 경로라 CDN 캐시 문제 없음
- **게임 연동 (핵심 변경)**: 플레이가 정적 경로 하드코딩이었음 → `api.ts resolveChartUrl()`
  신설(DB chart_url 우선, 실패·게스트 시 정적 폴백), play-session에 콜백 주입.
  에디터 저장이 **배포 없이 즉시 게임에 반영**되는 근거
- gen-charts 충돌: 에디터 저장 후 seed_00N를 재실행하면 chart_url이 정적 경로로 되돌아가
  수제 채보가 게임에서 빠진다(파일은 Storage에 남음) — 시드 재실행 전 확인 필요
- 필요 마이그레이션: `setup_003_charts_storage.sql` (charts 버킷 + 관리자 쓰기 정책)
