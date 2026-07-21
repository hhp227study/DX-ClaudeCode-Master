# CatchRhy Web (MVP)

`docs/prd-detail.md`를 구현하는 Next.js 앱. 게임 엔진은 `prototype/`에서 검증된 코드를 이전했다.

## 실행

```bash
npm install
npm run dev        # localhost는 HTTP여도 카메라 권한 OK
npm run gen-charts # 채보 재생성 (public/charts/)
npm run build      # 타입체크 + 프로덕션 빌드
```

백엔드(로그인·서버 기록)를 켜려면 `.env.local.example`을 `.env.local`로 복사해 Supabase
프로젝트의 URL/anon key를 넣고, `supabase/setup.sql` → `supabase/seed_002_songs.sql` 순으로
대시보드 SQL Editor에서 실행한다. **env가 없으면 앱은 게스트 전용 모드(localStorage)로 완전 동작한다.**

배포: Vercel 프로젝트 `catchrhy` → **https://catchrhy.vercel.app** (`npx vercel deploy --prod`).
Supabase env는 Vercel 프로젝트에 등록되어 있고, GA4 측정 ID(`NEXT_PUBLIC_GA_MEASUREMENT_ID`)는
GA4 프로퍼티 생성 후 추가하면 된다.

폰 테스트는 Vercel 배포가 가장 간단하다 (WSL2 NAT 문제 — prototype/README.md 참고).

## 구조

| 경로 | 내용 |
|---|---|
| `app/` | 화면 — Splash(`/`), Login(`/login`), Home, Song Select(`/select`), Play(`/play` — Calibration→Game→Pause→Result), Settings |
| `lib/engine/` | 게임 엔진 (prototype에서 이전) — tracker, pose-tracker, game(판정), chart, audio(클록), recorder, endcard(FR-16), highlight(FR-15) |
| `lib/play-session.ts` | 플레이 오케스트레이터 — 페이즈 상태머신, 캘리브레이션(오프셋 자동 측정), 60fps 루프 (React 밖) |
| `lib/store.ts` | localStorage — 설정(오프셋/볼륨/해상도/닉네임) + 곡별 최고 기록 (게스트/오프라인 폴백) |
| `lib/supabase.ts` | Supabase 클라이언트 — env 미설정이면 null (게스트 전용 모드) |
| `lib/api.ts` | 데이터 레이어 — 프로필/곡 카탈로그+내 베스트/플레이 저장/로컬 기록 이관. 전 함수 localStorage 폴백 |
| `lib/songs.ts` | 정적 곡 카탈로그 + 곡의 사운드 소스 조회(`trackOf` — 신스/음원 파일) (서버 카탈로그 실패 시 폴백) |
| `lib/engine/audio.ts` | `MusicTrack` 인터페이스 + `SynthTrack`(Web Audio 합성) + 공용 판정 효과음 |
| `lib/engine/audio-file.ts` | `FileTrack` — MP3를 decodeAudioData로 디코딩해 BufferSource로 재생 (클록은 신스와 동일) |
| `lib/engine/track.ts` | `TrackSpec` 유니언 + `createTrack` 팩토리 — 게임/에디터는 MusicTrack만 안다 |
| `lib/analytics.ts` | GA4 이벤트 수집 (FR-14) — env 미설정이면 no-op, 공통 파라미터 자동 첨부 |
| `content/songs.json` | 곡 정의 단일 소스 — 메타+사운드(synth 패턴 또는 audio 파일)+구간/포즈+미션. 앱과 채보 생성기가 함께 읽음 |
| `public/audio/` | 음원 파일 곡의 MP3 (카라멜단센 전곡 175초) |
| `supabase/setup.sql` | DB 스키마+RLS+가입 트리거+데모 시드 — 대시보드 SQL Editor에 붙여넣기 |
| `supabase/seed_002_songs.sql` | 신곡 4곡+채보 8개 시드 (setup.sql 실행 후 추가 실행) |
| `supabase/seed_003_caramelldansen.sql` | 카라멜단센 신스 커버+채보 2개 시드 (2026-07-12) |
| `supabase/seed_004_difficulty_rework.sql` | 난이도 개편 note_count 갱신 (2026-07-12, seed_003 다음 실행) |
| `supabase/seed_005_caramelldansen_audio.sql` | 카라멜단센 실제 음원 교체 — 메타·note_count 갱신 (2026-07-22) |
| `scripts/gen-chart.mjs` | 채보 생성기 — songs.json의 전 곡 easy/normal 생성 |

## 설계 결정

- **렌더러 Canvas 2D 유지** — PRD는 PixiJS를 명시했지만 스파이크에서 Canvas 2D로 성능·녹화가 검증됨. 파티클 폴리시가 필요해지는 시점에 재검토 (YAGNI)
- **로그인 없음(게스트)** — Supabase Auth는 태스크 #5에서. 프로필/기록은 localStorage 선행
- **판정 오프셋** — 첫 플레이 시 캘리브레이션(버블 3개 캐치 → Δt 중앙값)으로 자동 측정, Settings에서 수동 조정 및 재보정 가능
- **채보 규칙** — 노트 y 0.45~0.73(얼굴 가림 금지), 간격은 비트 단위(BPM 비례, easy 4/3/2·normal 3/2.5/2비트,
  물리 하한 0.75초, 비트 그리드 스냅) (유저 피드백 반영 이력: prototype/README.md.
  2026-07-12 난이도 개편: 구 easy 폐지, 구 normal이 easy로 승격 — 고BPM 곡은 후반에 두 난이도 수렴)
- **채보는 안무 모티프 기반** — reference/ 셀카 댄스 영상들의 포즈 분석(docs/reference-choreo-analysis.md)에서
  도출한 규칙으로 생성. y 높이·모티프 가중치는 유저 지정 표준 영상(reference/best.mp4) 기준:
  좌/우 앵커존(x 0.28/0.72) 교대 그루브, 4노트 프레이즈 모티프(sway/arc/build/heart 가중치 선택),
  어깨~가슴 높이(y 0.50~0.66) 랜덤 워크 + 프레이즈 끝 액센트(y 0.45~0.53, heart는 중앙 하트 마무리),
  같은 손 스텝 상한, 함정은 직전 캐치 근처(주로 동선 아래)에 y를 비켜 배치(흐름대로 움직이면 자연히 피해짐)
- **하이라이트는 재인코딩으로 추출** (FR-15) — MediaRecorder 청크는 init segment 없이 독립 재생이 안 되고 키프레임 경계도 보장되지 않아 청크 슬라이싱 대신, 전체 녹화를 숨김 `<video>`로 실시간 재생하며 캔버스→두 번째 MediaRecorder로 재인코딩. 15초 클립 = 처리 ~15초라 결과 화면 뒤에서 백그라운드로 돌린다. webm의 duration=Infinity는 끝으로 시킹하는 핵으로 해결 (`lib/engine/highlight.ts`)
- **엔드카드는 캔버스에 직접 그려서 녹화에 포함** (FR-16) — 곡 종료 후 outro 페이즈 1.5초간 녹화를 유지한 채 점수·랭크·로고를 그린다. 하이라이트 클립에도 재인코딩 말미에 동일 엔드카드를 덧붙임 (`lib/engine/endcard.ts` 공용)
- **공유 기본값 = 하이라이트** — 결과 화면에서 전체 영상/하이라이트 탭 전환, 생성 완료 전 공유 시도는 토스트로 안내
- **백엔드는 supabase-js + RLS 직접 호출** (태스크 #5) — PRD 10장의 REST API는 개념 스펙으로 보고
  별도 API 서버를 두지 않았다. 인증·본인 행 제한은 RLS가 보장, 점수 상한 등 sanity check는 DB CHECK 제약으로
- **songs.id는 uuid 대신 text 슬러그** — 채보 파일 경로(`/charts/{id}-{diff}.json`)와 localStorage
  기록 키(`{id}:{diff}`)를 그대로 쓰고, 게스트→계정 기록 이관을 단순하게 유지 (PRD 11장과 다른 점)
- **리더보드 없음** — PRD 7.3 Won't Have. 개인 베스트는 plays에서 `MAX(score)` 조회 (11.2 인덱스)
- **게스트 모드는 항상 유지** — env 미설정이면 전부 로컬, 로그인해도 로컬 베스트를 미러로 계속 기록
  (오프라인/로그아웃 폴백). 최초 로그인 시 로컬 베스트 중 서버 기록보다 높은 것만 1회 이관
- **videos 테이블 미생성** — 영상 업로드/공유 페이지(PRD API 6~7)는 필요해지면 (YAGNI)
- **곡 정의는 content/songs.json 단일 소스** (태스크 #6) — 신스 곡의 사운드(패턴)는 클라이언트에,
  DB에는 메타만. 서버 카탈로그가 우선이므로 신곡은 seed SQL 실행 전까지 목록에 안 뜬다.
  채보 생성기는 BPM이 높아도 최소 간격 1.5초를 비트 단위로 보장한다
- **GA4는 lazy 주입** — 첫 track() 때 gtag 로더 삽입, 측정 ID 없으면 no-op. avg_fps는
  종료 시점 30프레임 이동평균(FpsMeter)을 근사값으로 사용
- **카메라 프레이밍 설정 + 자동 감지** (2026-07-12) — 클로즈업(기본)/풀바디. 채보 파일·DB는 클로즈업 기준
  단일 소스이고, 풀바디는 PlaySession이 로드 시 좌표를 리매핑(y [0.45,0.73]→[0.30,0.62],
  x 중심 20% 압축 — `engine/chart.ts remapChartForFraming`, 보정 버블도 동일 좌표계).
  자동 감지(기본 on)는 보정·ready 중 발목 가시성+어깨너비를 샘플링해 시작 직전 확정 —
  틀린 설정으로 시작해도 스스로 맞춘다. 수동 선택 시 자동 감지 off (유저 의사 우선).
  수치 근거는 풀바디 레퍼런스 실측(docs/reference-choreo-analysis.md 프레이밍 분류 절)
- **함정 버블 토글** (2026-07-12) — 설정에서 decoy on/off(기본 on, `Prefs.decoyEnabled`).
  OFF는 PlaySession이 채보 로드 시 decoy 노트를 제외 — decoy는 accuracy 분모에 없어 점수 체계 불변.
  포즈 노트 유지도 같은 세션에서 2.5초 → 1초 (유저 체감 피드백)
- **전 곡 멀티마디 리메이크** (2026-07-12) — "단순 리듬 반복" 피드백으로 기존 5곡의 bass/lead를
  loopBars 코드 진행+멜로디로 교체 (드럼 그루브는 곡 정체성으로 유지): demo-track C장조 C–Am–F–G,
  neon-run E단조 Em–Em–C–D 8마디, moon-step D단조 Dm–B♭–F–C, star-pop A장조 A–D–F#m–E 8마디,
  bubble-bounce F장조 F–Dm–B♭–C. 전부 자체 작곡(라이선스 리스크 0)
- **신스 멀티마디 루프 + 곡별 안무 오버라이드** (카라멜단센, 2026-07-12) — `SynthSpec.loopBars`로
  bass/lead가 마디를 넘는 멜로디 후크를 표현(드럼은 1마디 반복 유지, 기존 곡 호환).
  카라멜단센의 BPM(165)·코드 진행(F# 장조 I–V–vi–IV)·멜로디(16마디)는 레퍼런스 영상 2개의
  오디오에서 추출해 검증했다(두 영상이 슬롯 단위 일치 — docs/reference-choreo-analysis.md).
  채보는 songs.json `choreo` 오버라이드(yBase [0.46, 0.58], sway 가중치 상향)로
  "손 올리고 추는 춤"을 y 밴드 상부에 번역 — 얼굴 가림 금지(y≥0.45)는 유지

- **실제 음원 곡 지원** (카라멜단센, 2026-07-22) — 곡의 사운드가 신스 합성 또는 음원 파일 둘 중
  하나가 됐다. 둘 다 `MusicTrack`을 구현하고 **AudioContext.currentTime을 클록으로 쓴다**:
  `<audio>` 엘리먼트의 currentTime은 갱신이 성기고 지터가 커서 ±250ms 판정의 기준이 될 수 없어,
  MP3도 decodeAudioData → AudioBufferSourceNode로 재생한다. 덕분에 일시정지(suspend)·seek·
  판정 로직이 신스 곡과 완전히 같은 코드로 돈다.
  실제 녹음은 첫 다운비트가 파일 0ms가 아니므로 `audio.firstBeatMs`(카라멜단센 162.5ms)를
  비트 그리드 원점으로 쓰고, 채보 생성기가 이 원점에 스냅한다. BPM도 반올림하지 않는다
  (164.73 → 165로 반올림하면 87초 구간에서 142ms 어긋남). 곡 구조가 균질한 신스 곡과 달리
  실제 곡은 인트로·후렴이 뚜렷해서 `sections`/`poses`로 구간을 명시 배치한다.
  근거 실측은 docs/reference-choreo-analysis.md "실제 음원 도입" 절

- **판정은 "잡는" 게임 기준** (2026-07-22 수정) — 버블은 접근 2초 내내 고정 위치에 그려지고
  링만 좁혀지므로, 유저는 버블이 올 자리에 손을 미리 대고 기다린다. 접촉 즉시 판정하면
  윈도우가 열리는 첫 순간(dt=-250ms)에 걸려 아무리 잘해도 GOOD만 나왔다(정확도 30%대 → 항상 F).
  지금은 판정 시각 전 접촉은 최선 접근으로 기억만 하고 dt>=0을 지나는 순간 판정한다 —
  링이 닫히는 순간이 곧 판정 시각이라 시각 신호와 일치한다. 손을 미리 댔다 뗀 경우도
  그때의 최선 접근으로 인정. 정확도 가중치·랭크 경계도 카메라 인식 정밀도에 맞게 완화
  (GREAT 0.85·GOOD 0.5, SSS96/SS90/S82/A72/B55/C35 — 랭크 종류는 DB CHECK와 맞춰 7종 유지)
- **녹화에 곡 소리 포함** (2026-07-22 수정) — `canvas.captureStream()`에는 오디오가 없어
  그전까지 저장 영상이 전부 무음이었다. AudioContext master에서 `MediaStreamDestination`으로
  갈라내(스피커 출력은 유지) 캔버스 비디오 트랙과 합쳐 녹화한다. 하이라이트 클립은 재인코딩
  경로라 원본 `<video>`를 `MediaElementSource`로 그래프에 끌어오되 `ctx.destination`에는
  연결하지 않는다 — 클립 생성 중에도 유저에게는 무음이면서 녹음에는 소리가 담긴다.
  오디오 트랙을 먼저 끊으면 엔드카드가 잘리므로 `track.stop()`은 녹화 종료 뒤에 호출한다

- **채보 좌표는 몸 기준** (2026-07-22) — 그전까지 채보 x/y를 캔버스 폭·높이에 그대로 곱해서,
  같은 채보가 세로 폰(9:19.5)과 가로 PC(16:9)에서 몸 기준으로 전혀 다른 위치에 떴다:
  앵커 x 0.28/0.72가 차지하는 카메라 화각이 11% vs 44%로 4배 차이났고, 폰에서는 어깨가
  화면 밖으로 나갔다. 지금은 시작 직전(보정·ready·카운트다운) 0.5초 간격으로 어깨 중심·너비를
  샘플링해 중앙값으로 **몸 앵커**를 잡고, 저작 기준(best.mp4 실측 — 어깨너비 0.70·어깨선 y 0.55,
  9:16)에서의 "어깨너비 몇 배" 오프셋을 실제 어깨너비(픽셀)로 되돌린다
  (`engine/chart.ts remapChartToBody`). 픽셀 기준 계산이라 가로/세로 어느 쪽이든 몸에 대한
  상대 위치와 모양이 보존된다 — 검증: 폰 세로/PC 가로/태블릿에서 몸기준 좌표가 x±0.31,
  y+0.08/−0.15 어깨너비로 완전히 동일. 화면 회전 시 resize에서 다시 맞춘다.
  클로즈업/풀바디 구분은 어깨너비가 곧 척도라 자동으로 흡수된다 — 기존 프레이밍 리매핑은
  사람이 인식되지 않을 때의 폴백으로만 남았다

## 남은 작업

- ~~Google OAuth, seed_002, URL Configuration, 로그인 E2E~~ — 완료 (2026-07-08)
- (유저) seed_003 → seed_004를 대시보드 SQL Editor에서 순서대로 실행
  — seed_003 전까지 카라멜단센이 목록에 안 뜨고, seed_004 전까지 note_count가 구 채보 값
- (유저) GA4 프로퍼티 생성 → 측정 ID를 .env.local과 Vercel env에 추가
- 새 채보 체감 QA → 통과 시 커밋+배포 (2026-07-08 채보 개편분 + 2026-07-12 카라멜단센이 로컬에만 있음)
- 실기기 QA: Safari(iOS) 하이라이트 파이프라인, 신곡 6곡 플레이감
- 다음 단계: 영상 업로드/공유 페이지(PRD API 6~7), 곡 확충(실제 음원+라이선스)
