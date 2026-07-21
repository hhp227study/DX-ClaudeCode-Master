# CatchRhy — 다음 세션 재개 프롬프트

> 아래 블록을 복사해서 새 세션의 첫 메시지로 붙여넣으면 이어서 작업할 수 있다.

```
CatchRhy(카메라 AI 리듬게임) MVP 개발을 이어서 진행하자.

## 먼저 읽을 것
1. homework/main-service/docs/NEXT_SESSION.md — 이 파일 (진행 상황)
2. homework/main-service/web/README.md — 웹앱 구조와 설계 결정 (PRD와 다른 점 포함)
3. homework/main-service/docs/prd-detail.md — 상세 PRD
4. homework/main-service/docs/reference-choreo-analysis.md — 채보 안무 규칙의 근거 (레퍼런스 영상 분석)

## 상태: MVP+백엔드 완료. 2026-07-08 채보 대개편 + 2026-07-12 대규모 업데이트(신곡·난이도 개편·5곡 리메이크·프레이밍)가 전부 로컬만 (미커밋·미배포!)
- ⚠️ web/·prototype/·docs 전체가 git에 한 번도 커밋된 적 없음 (유실 위험).
  2026-07-12 세션에서 커밋을 제안했으나 유저가 "커밋은 나중에" — 다음 세션에서 커밋+배포 예정
- 2026-07-12 세션 (①~⑮ 전부 로컬):
  ① reference/carameldansen01·02.mp4 분석 — 오디오 비트그리드로 165 BPM 확정,
     멜로디를 8분음표 슬롯 단위로 추출(두 영상 교차검증 일치), 코드 F#–C#–D#m–B(I–V–vi–IV)
  ② MediaPipe 포즈 분석 — 손목 y 상단(중앙값 0.33~0.38), 어깨 위 42~59%, 2비트 스웨이,
     양손 미러 바운스 → docs/reference-choreo-analysis.md에 표로 추가
  ③ SynthSpec.loopBars 신설(audio.ts) — bass/lead 16마디 루프(멜로디 95노트+베이스 64노트),
     드럼은 1마디 반복 유지, 기존 곡 호환 (synthOf도 수정)
  ④ songs.json에 caramelldansen 추가 + choreo 오버라이드 신설(yBase [0.46,0.58], sway 상향)
     — gen-chart.mjs가 곡별 choreo를 읽음. 기존 10개 채보는 바이트 동일(회귀 없음) 확인
  ⑤ 채보 생성 easy 31/normal 48노트 — 규칙 검증 통과(y 밴드·비트 스냅·750ms 하한),
     좌우 교대율 81%/66%, 밴드 상부 집중 90%/72%
  ⑥ npm run build 통과, /play?song=caramelldansen 헤드리스 스모크 통과
  ⑦ 신스 커버 폐루프 검증 — 미리듣기 WAV(reference/caramell-synth-preview.wav, 미커밋)를
     같은 추출기로 재분석 → 95/95 노트 일치
  ⑧ supabase/seed_003_caramelldansen.sql 작성 — ⚠️ 아직 미실행 (실행 전까지 곡 목록에 안 뜸)
  ⑨ 포즈 노트 유지 2.5초 → 1초 (유저: 하트·손올리기가 길다) — gen-chart POSE_DURATION,
     전 채보 12개 재생성 (노트 수 불변 → 시드 영향 없음)
  ⑩ 설정에 "함정 버블 (다른 단어)" on/off 토글 — Prefs.decoyEnabled(기본 on),
     OFF면 PlaySession이 채보 로드 시 decoy 노트 제외 (decoy는 accuracy 분모에 없어 점수 체계 불변)
  ⑪ 난이도 개편 (유저: "난이도가 애매") — 구 easy(6/5/4비트) 폐지, 구 normal(4/3/2)이 easy로
     승격(시드 동일해 채보 내용도 그대로), normal은 3/2.5/2비트·함정 0.25로 더 촘촘하게.
     전 채보 note_count 변경 → seed_004_difficulty_rework.sql 작성 (미실행)
  ⑫ 기존 5곡 멀티마디 리메이크 (유저: "단순 리듬 반복") — 드럼 그루브는 유지, bass/lead를
     loopBars 코드 진행+멜로디로 교체: demo-track C장조 C–Am–F–G(4마디), neon-run E단조
     Em–Em–C–D(8마디 드라이브), moon-step D단조 Dm–B♭–F–C(하프타임), star-pop A장조
     A–D–F#m–E(8마디 아르페지오), bubble-bounce F장조 F–Dm–B♭–C(스타카토).
     미리듣기: reference/*-remake-preview.wav (미커밋)
  ⑬ carameldansen03.mp4(트라이포드 풀바디) 반영 — 멜로디 3영상 98% 교차검증,
     턴어라운드 마디를 실제 곡(D#5 하강 해결)으로 교정(lead 95→97노트), Y자 팔벌리기를
     vspread 모티프(와이드 x 0.16/0.84 + 상단 액센트)로 채보에 반영(노트 수 48/55 불변
     → seed_004 그대로). 프레이밍 분류 규칙(발목 가시성·어깨너비)을
     reference-choreo-analysis.md에 문서화
  ⑭ 설정에 "카메라 프레이밍" 선택 추가 (클로즈업/풀바디, 기본 클로즈업) — Prefs.framing.
     풀바디면 PlaySession이 로드 시 채보·보정 버블 좌표를 리매핑: y [0.45,0.73]→[0.30,0.62],
     x 중심으로 20% 압축 (근거: 풀바디 레퍼런스 손목 체류 실측 — engine/chart.ts remapChartForFraming).
     채보 파일·DB는 클로즈업 기준 단일 소스 유지 (파일 복제 없음)
  ⑮ 프레이밍 자동 감지 (Prefs.framingAuto, 기본 on) — 보정·ready 중 0.5초 스로틀로
     PoseTracker.sampleFraming(발목 가시성 + 어깨너비<0.45 가드), 샘플 4개 이상이면
     게임 시작 직전 resolveFraming()이 확정 → 채보 재리매핑 + 토스트 + 설정 영속화.
     설정에서 프레이밍을 수동 선택하면 framingAuto가 꺼진다 (유저 의사 우선)
- 배포: https://catchrhy.vercel.app (Vercel 프로젝트 catchrhy, hong227-2018 계정, CLI 인증됨)
  — 2026-07-21 `npx vercel deploy --prod`로 최신 로컬 상태(채보 개편·난이도 개편·5곡 리메이크·
  프레이밍·관리자 페이지·에디터) 전부 반영 완료. ⚠️ git에는 여전히 미커밋 상태로 배포한 것 —
  vercel deploy는 git과 무관하게 로컬 파일을 업로드하므로 가능했음. 다음 세션 전 커밋 필요
- 2026-07-21 세션: 배포 전 `npm run build`에서 컴파일 에러 발견 — `app/play/page.tsx`가
  `lib/api.ts`에서 `resolveChartUrl`을 import하는데 실제로는 export된 적이 없었음
  (2026-07-16 세션 기록엔 "구현 완료"로 남아있었으나 실제 코드 누락 — 세션 기록과 실제 상태가
  어긋난 사례). `lib/api.ts`에 `resolveChartUrl(songId, difficulty)` 추가해서 해결:
  charts 테이블에서 chart_url 조회 → 있으면 그 값, 없거나 sb 없거나 에러면 정적 chartUrl()로 폴백.
  이 함수 없이는 /play 페이지 자체가 빌드 실패했으므로, 지금까지 배포된 적 없었다는 뜻
- Supabase: cobxmdoqxrcrmopshlpg — setup.sql + seed_002 실행됨(5곡·채보 10개), REST/RLS 검증됨
- 2026-07-08 1차 세션 (로컬만, 빌드 통과):
  ① 채보를 안무 모티프 기반으로 재설계 — 표준 영상 = reference/best.mp4 (y 높이·모티프 가중치)
  ② 노트 간격을 비트 단위(BPM 비례)로 교체 — "최소 1.5초" 규칙 폐지 (유저 요청)
  ③ /play 진입 시 play() interrupted 에러 수정 (openStream dispose 경쟁 + 카메라 누수)
- 2026-07-08 2차 세션:
  ④ 자동 QA 통과 — 빌드·채보 10개 규칙 검증(섹션 브레이크 pose 노트 2개는 비트 스냅 대상 아님
     — 정상)·/play 헤드리스 스모크(play() 버그 재발 없음)
  ⑤ Supabase 설정 완료 — seed_002 실행(멱등 upsert로 개편, note_count 새 채보 실측값으로 수정),
     Google OAuth 연동(GCC 클라이언트 "CatchRhy", Secret은 재발급으로 해결 — 생성 후엔 다시 못 봄),
     URL Configuration(Site URL=https://catchrhy.vercel.app, Redirect URLs:
     catchrhy.vercel.app/**·localhost:3000/**·localhost:3100/**)
  ⑥ 프로덕션 로그인 E2E 성공 (홈에 닉네임 표시 확인)
  ⑦ 유저 체감 QA 1차 — 완화 요청 없음
- 2026-07-16 세션: 관리자 페이지 MVP + 채보 에디터 (로컬만, 빌드 통과) — docs/admin-page.md
  ① setup_002_admin.sql (is_admin + 관리자 RLS, 자가 승격은 컬럼 grant로 차단) — 실행 확인됨
  ② /admin 대시보드·/admin/songs(is_active 토글 + note_count 정합 체크)·/admin/users
  ③ lib/admin-api.ts — 분포 통계는 최근 1000판 표본, 총계는 exact count
  ④ 채보 에디터 /admin/editor?song=&difficulty= 구현 — 곡 재생 중 클릭 입력(비트 스냅),
     검증(밴드·750ms·그리드), Storage 저장 vN + charts 행 갱신. setup_003 실행 필요(미실행)
  ⑤ SynthTrack.start(fromMs) 중간 재생, api.ts resolveChartUrl(DB chart_url 우선) —
     플레이가 정적 경로 하드코딩이던 것을 DB 우선으로 교체 (에디터 저장 즉시 반영의 근거)
  ⑥ 검증: 빌드 통과, /admin·에디터 게이트 헤드리스 확인, resolveChartUrl 체인 PostgREST 실증
     (demo-track easy: DB 33 = 파일 33). /play 헤드리스는 MediaPipe CDN이 가상 시간과 안 맞아
     "AI 모델 로딩"에서 멈춤 — 에러 아님, 실기기 QA로 대체
- reference/ 폴더는 .gitignore 처리됨 (인스타 다운로드 영상 — 저작권상 커밋 금지)

- 2026-07-22 세션: **카라멜단센을 실제 음원(MP3)으로 교체 + 채보 재작성**
  ① 오디오 엔진 이원화 — `MusicTrack` 인터페이스(engine/audio.ts) 아래 기존 `SynthTrack`과
     새 `FileTrack`(engine/audio-file.ts). FileTrack은 `<audio>`가 아니라
     decodeAudioData + AudioBufferSourceNode — 판정 클록이 AudioContext.currentTime이어야 하기
     때문(R4). suspend/resume·timeMs 규약이 신스와 동일해 게임 루프는 어느 쪽인지 모른다.
     `engine/track.ts`의 createTrack(TrackSpec)이 songs.json을 보고 고른다
  ② songs.ts `synthOf` → `trackOf`로 교체 (play/select/editor 전부 경유). 카탈로그 타입은
     JSON 구조 추론 대신 `CatalogSong` 명시 — 곡마다 synth/audio가 달라 유니언이 되면 접근이 막힌다
  ③ 음원 분석 실측: **164.73 BPM, 첫 다운비트 162.5ms** (근거·방법은
     docs/reference-choreo-analysis.md의 "실제 음원 도입" 절). 165로 반올림하면 87초에서
     142ms 어긋나므로 카탈로그·채보는 164.73을 그대로 쓴다
  ④ **전곡 175.2초 수록**(7.01MB). 처음엔 하이라이트 87.6초만 잘라 썼으나 "중간에 끊기니
     어색하다"는 유저 피드백으로 전곡으로 되돌렸다. 아웃트로가 자연 페이드라 인위적
     페이드아웃 불필요. (프레임 경계 컷+Info 헤더 patch로 비트 그리드가 보존된다는 것은
     검증해 뒀으니 다시 잘라 쓸 일이 생기면 그 방법을 쓰면 된다)
  ⑤ gen-chart.mjs 확장 — 비트 그리드 원점이 0이 아닌 `firstBeatMs`, songs.json의
     `sections`(곡 실제 구조에 맞춘 명시 구간, level = sparse/low/mid/high)·`poses` 지원.
     sparse 단계는 인트로·브레이크다운처럼 쉬어가는 구간용으로 신설.
     구간 경계에서 물리 하한(0.75초)이 깨지는 것을 막는 전역 가드 추가.
     폴백 경로는 그대로라 기존 10개 채보는 바이트 동일(회귀 없음) 확인
  ⑥ 채보 easy 134 / normal 154노트, 구간 10개(인트로 sparse → 후렴 high → 브레이크다운
     sparse 휴식 → 마지막 후렴 mid). 검증: 0.5비트 그리드 오차 <0.5ms, 최소 간격 910ms,
     y 0.45~0.73, 동시 노출 최대 3개, **노트 지점 온셋 강도 +2.7σ**(무작위 +0.07σ)
  ⑦ 인코더 딜레이 검증 — Chrome headless의 decodeAudioData로 위상 재측정해 162.5ms 동일 확인
     (디코더마다 앞머리 처리가 달라 채보 전체가 밀릴 수 있는데, 어긋남 없음)
  ⑧ 곡 선택 미리듣기는 조용한 인트로 대신 후렴(29.3s)부터 — `audio.previewFromMs`
  ⑨ seed_005_caramelldansen_audio.sql 작성 — **아직 미실행**
  ⚠️ 상업 음원을 public/에 담아 공개 배포한다(유저 확정). 라이선스 리스크는 감수하는 선택이며,
     신스 커버 원본은 커밋 ce462e1에 남아 있다

## 다음 작업
1. **seed_005_caramelldansen_audio.sql을 Supabase 대시보드에서 실행** — 실행 전까지 곡 목록의
   카라멜단센은 옛 제목·노트 수(신스 커버 기준)로 보인다. 채보 JSON·음원은 배포에 이미 반영됨
2. 폰 실기기에서 새 카라멜단센 체감 QA — 실제 음원이라 싱크가 눈에 띈다.
   판정이 밀리면 설정의 오프셋 보정을 먼저 확인할 것 (곡 자체 그리드는 브라우저에서 검증됨)
3. 에디터 실사용 QA: /admin/songs → 에디터 → 노트 수정(필드 드래그 x/y·타임라인 드래그 t)
   → 저장 → /play에서 바뀐 채보 로드 확인 (resolveChartUrl 경유)
   (마이그레이션 4종 seed_003·004·setup_002·setup_003 전부 실행 확인됨 — 2026-07-16)
   ※ 에디터도 이제 음원 곡을 그대로 틀어놓고 편집할 수 있다(FileTrack seek 지원)
4. 배포된 프로덕션(https://catchrhy.vercel.app)에서 나머지 곡·난이도 개편·관리자 에디터
   체감 재확인 — 로컬 빌드로만 확인했고 프로덕션 실기기 QA는 아직
⚠️ 에디터로 저장한 곡이 있는 상태에서 seed_00N을 재실행하면 chart_url이 정적 경로로
   되돌아가 수제 채보가 빠진다 — 시드 재실행 전 /admin/songs에서 버전 확인

## 백로그 (우선순위 유저와 상의)
- Hard 난이도 — 접근 속도 단축(APPROACH_MS 2000→~1500ms) 중심 + 함정 비율 증가로 설계할 것.
  간격 축소만으로는 물리 하한 0.75초에 걸려 고BPM 곡에서 normal과 차별화 안 됨.
  DB CHECK 제약(difficulty in easy|normal) 마이그레이션 필요. GA4로 normal 소진 유저 확인 후 착수 권장
- (선택) GA4 프로퍼티 생성 → NEXT_PUBLIC_GA_MEASUREMENT_ID를 .env.local과 vercel env add로 등록 → 재배포
- 영상 업로드 + 공유 페이지 (PRD API 6~7, videos 테이블, OG 태그 — 바이럴 루프 완성)
- 실기기 QA: iOS Safari 하이라이트 클립 파이프라인
- 콘텐츠 고도화: 실제 음원 도입(라이선스 확인), 재킷 이미지
- 폴리시: 파티클/이펙트(이때 PixiJS 재검토), 랭크 연출
- easy 후반이 바쁘다는 피드백 오면: gen-chart.mjs SECTION_BEATS.easy [4,3,2] → [4,3,2.5]
  후 npm run gen-charts (2026-07-12 개편으로 구 normal 설정이 easy가 됨)

## 확정된 제품 규칙
- 노트 y 0.45~0.73(얼굴 가림 금지), 접근 시간 2000ms 고정(BPM 무관 — 등장 빈도만 BPM 비례)
- 포즈 노트 유지 1초 (2026-07-12 유저 요청으로 2.5초에서 단축)
- 함정(decoy)은 설정에서 끌 수 있음 (기본 on) — 끄면 채보에서 제외
- 채보 좌표계는 클로즈업(상반신) 기준 단일 소스 — 풀바디 플레이는 설정의
  "카메라 프레이밍"으로 로드 시 리매핑 (y→[0.30,0.62], x 20% 압축)
- 노트 간격은 비트 단위(BPM 비례): easy 4/3/2비트, normal 3/2.5/2비트(구간 1→3),
  물리 하한 0.75초, 비트 그리드 스냅 — 2026-07-08 "최소 1.5초" 대체,
  2026-07-12 개편(구 easy 폐지·구 normal→easy·normal 신설). 고BPM 곡은 후반에 두 난이도가 수렴
- 채보는 안무 모티프 기반 (docs/reference-choreo-analysis.md의 규칙 준수)
- 렌더러 Canvas 2D / 카메라 영상 서버 전송 금지 / 리더보드 없음(개인 베스트만)

## 실행 방법
- 로컬: cd homework/main-service/web && npm run dev (https://localhost:3000)
  — 3000 포트를 다른 프로젝트(StoryGroup dev 서버)가 쓰고 있으면 npm run dev -- -p 3100
- 채보 재생성: npm run gen-charts / 검증 빌드: npm run build / 배포: npx vercel deploy --prod
- 곡 직접 진입: /play?song={demo-track|neon-run|moon-step|star-pop|bubble-bounce|caramelldansen}&difficulty={easy|normal}
  — caramelldansen은 seed_003 실행 전에도 직접 진입은 가능(목록에만 안 뜸)
- 로그인은 프로덕션에서 E2E 검증됨. localhost 로그인도 Redirect URLs(3000/3100) 등록되어 가능
- 주의: WSL2 + /mnt/c — 브라우저 검증은 Windows Chrome headless(가짜 카메라 플래그).
  clip.exe는 UTF-8 한글이 깨진다 → PowerShell Set-Clipboard 사용.
  vercel link가 .env.local에 VERCEL_OIDC_TOKEN을 덧붙이니 놀라지 말 것.
  ⚠️ dev 서버 켠 채 npm run build 금지 — dev 상태가 오염돼 페이지 JS가 실행 안 됨 (재시작으로 복구)
```

---

*갱신: 2026-07-22 세션 종료 시점 — 카라멜단센을 실제 음원 전곡(175.2초)으로 교체, FileTrack 오디오 엔진 추가, 음원 실측(164.73 BPM/162.5ms)과 곡 구조(10구간) 기반 채보 재생성(easy 134·normal 154). 커밋·배포 완료. 남은 것: seed_005 실행 + 실기기 QA.*
