# CatchRhy — 다음 세션 재개 프롬프트

> 아래 블록을 복사해서 새 세션의 첫 메시지로 붙여넣으면 이어서 작업할 수 있다.

```
CatchRhy(카메라 AI 리듬게임) MVP 개발을 이어서 진행하자.

## 먼저 읽을 것
1. homework/main-service/docs/NEXT_SESSION.md — 이 파일 (진행 상황·다음 할 일)
2. homework/main-service/web/README.md — 웹앱 구조와 설계 결정 (PRD와 다른 점 포함)
3. homework/main-service/docs/reference-choreo-analysis.md — 채보 규칙·음원 분석의 근거 실측
4. homework/main-service/docs/prd-detail.md — 상세 PRD (필요할 때만)

## 상태 (2026-07-30 기준)
MVP + 백엔드 + 관리자 페이지/에디터 완료.
- 브랜치: 실음원 세션 커밋(dc69c12~f9bab1d)은 origin에 push 완료 — origin/develop·
  origin/week5-day1 양쪽에 포함 확인(2026-07-30). 유실 위험 해소
- 채보 y밴드 상향 (2026-07-27 작업 → 2026-07-30 커밋·배포 완료): 유저 "카라멜단센 외 곡들
  채보가 아래쪽 위주" → gen-chart.mjs 기본 y 밴드 [0.50,0.66]→[0.44,0.58](턱~가슴),
  액센트 [0.45,0.53]→[0.38,0.47]로 상향 후 전 채보 재생성. 카라멜단센은 오버라이드 곡이라
  변화 없음. 노트 총수 전 곡 불변 → DB seed 재실행 불필요. 규칙 검증(y·스냅·750ms·분리)
  통과, 신곡 y중앙값 0.47~0.54(전 0.54~0.59). 프로덕션 반영 확인됨(neon-run-easy y중앙값 0.526)
- 배포: https://catchrhy.vercel.app — Vercel 프로젝트 `catchrhy`, CLI 인증됨.
  ⚠️ GitHub 연동이 아니라 `npx vercel deploy --prod`로 로컬 파일을 올리는 방식이다.
  커밋·push해도 자동 배포되지 않는다 (유저가 수동 배포 유지를 선택)
- Supabase: cobxmdoqxrcrmopshlpg — setup.sql·seed_002·003·004·setup_002·003 실행 확인됨
- 커밋 흐름: ce462e1(웹앱 최초) → dc69c12(실제 음원) → 4ef9391(전곡) → 948d5cc(판정·녹화)
  → 몸 기준 좌표

## ⚠️ 지금 당장 할 일 (유저 작업)
~~seed_005 실행~~ → **실행 확인됨** (2026-07-27 REST로 검증: songs.title=Caramelldansen,
charts note_count 134/154). ~~브랜치 정리~~ ~~채보 상향분 커밋+배포~~ → 완료(2026-07-30).
남은 당장 할 일: 채보 상향분 커밋을 origin에 push (WSL엔 hhp227study 인증이 없어 push 불가 —
IntelliJ 등 유저 환경에서 push할 것). 그다음은 아래 실기기 QA.

## 다음 작업
1. **실기기 QA (가장 중요 — 최근 변경 3건이 전부 실기기에서만 확인 가능하다)**
   ① 몸 기준 좌표: 폰 세로 / PC 가로 양쪽에서 버블이 팔 닿는 위치에 뜨는가.
      좌표 변환 수학은 검증했지만 실제 카메라·포즈 인식으로는 확인 못 했다
      (헤드리스에서 MediaPipe가 안 돌아감). 멀리/가까이 서서도 볼 것
   ② 점수: 이제 F가 안 나오는가. 반대로 너무 후하면 랭크 경계를 다시 조인다
      (engine/game.ts rankOf — 현재 SSS96/SS90/S82/A72/B55/C35)
   ③ 녹화: 저장한 영상·하이라이트 클립에서 소리가 나는가. iOS Safari도 확인
2. 카라멜단센 전곡(175초) 체감 — 3분이 길지 않은지, 브레이크다운(122.5~134.2s)이
   의도대로 숨 돌리는 구간이 되는지. 길다고 느껴지면 곡을 자르기보다 sections 밀도를 낮출 것
3. 에디터 실사용 QA: /admin/songs → 에디터 → 노트 수정 → 저장 → /play 반영 확인
   ※ 음원 곡도 에디터에서 틀어놓고 편집 가능(FileTrack seek 지원)
   ⚠️ 에디터로 저장한 곡이 있는 상태에서 seed를 재실행하면 chart_url이 정적 경로로 롤백된다
      — 시드 재실행 전 /admin/songs에서 버전 확인
4. 관리자 계정: setup_002는 hhp0227@gmail.com만 승격한다. 다른 계정은 그 계정으로 최초 로그인한 뒤
   아래 SQL을 대시보드에서 직접 실행해야 /admin에 들어갈 수 있다 (앱 API로는 승격 불가 — 컬럼 grant로 차단)
   update public.profiles set is_admin = true
   where id in (select id from auth.users where email = '<이메일>');

## 백로그 (우선순위 유저와 상의)
- Hard 난이도 — 접근 속도 단축(APPROACH_MS 2000→~1500ms) 중심 + 함정 비율 증가로 설계할 것.
  간격 축소만으로는 물리 하한 0.75초에 걸려 고BPM 곡에서 normal과 차별화 안 됨.
  DB CHECK 제약(difficulty in easy|normal) 마이그레이션 필요
- 판정 등급 변별력 — 판정 수정 후 "손 대고 기다리기" 플레이는 거의 전부 PERFECT라
  정확도 ≈ 캐치율이 된다. 캐주얼 게임엔 직관적이지만 타이밍 정밀도로도 변별하려면 별도 설계 필요
  (유저에게 이미 안내함)
- (선택) GA4 프로퍼티 생성 → NEXT_PUBLIC_GA_MEASUREMENT_ID를 .env.local과 vercel env add로 등록
- 영상 업로드 + 공유 페이지 (PRD API 6~7, videos 테이블, OG 태그 — 바이럴 루프 완성)
- 콘텐츠 고도화: 곡 추가, 재킷 이미지 / 폴리시: 파티클·랭크 연출(이때 PixiJS 재검토)

## 확정된 제품 규칙
- **채보 좌표는 몸 기준** (2026-07-22) — 저작은 클로즈업 세로 셀카(9:16) 기준 단일 소스로 하되,
  시작 직전 어깨 중심·너비를 재서 "어깨너비 배수" 오프셋으로 환산해 배치한다
  (engine/chart.ts remapChartToBody). 세로는 기기와 무관하게 몸 대비 같은 자리.
  가로는 X_REACH(2.0) 상한 안에서 화면이 허용하는 만큼 벌린다 — 저작 x 한계가 화면 기준
  값이라 몸 단위로는 ±0.57 어깨너비로 너무 좁았다(PC 가로에서 체감됨). 지금은 ±1.14까지.
  프레이밍(클로즈업/풀바디) 설정은 사람이 인식 안 될 때의 폴백으로만 남았다
- **노트 y 밴드 0.08~0.73** — 2026-07-22 유저 요청으로 '얼굴 가림 금지(y≥0.45)' 상한 폐지.
  머리 위로 손을 올리는 춤(카라멜단센)이 노트로 표현되지 못하던 원인이었다.
  저작 좌표계에서 몸 기준선: 0.55 어깨 / 0.43 턱 / 0.31 눈 / 0.20 정수리 / 0.08 만세한 손.
  곡별로 choreo.yBase(기본 밴드)·yAccent(프레이즈 끝)·xScale(앵커 벌림)로 조절한다.
  접근 시간 2000ms 고정(BPM 무관)
- 노트 간격은 비트 단위(BPM 비례): easy 4/3/2비트, normal 3/2.5/2비트, 물리 하한 0.75초,
  비트 그리드 스냅. 실제 음원 곡은 songs.json `sections`로 곡 구조에 맞춰 명시 배치
  (level: sparse/low/mid/high — sparse는 인트로·브레이크다운용)
- 포즈 노트 유지 1초 / 함정(decoy)은 설정에서 끌 수 있음(기본 on, 끄면 채보에서 제외)
- 판정은 "잡는" 게임 기준 — 판정 시각 전 접촉은 최선 접근으로 기억만 하고 dt>=0에 판정
  (미리 대고 기다리면 PERFECT). 링이 닫히는 순간 = 판정 시각
- 곡 사운드는 신스 합성 또는 음원 파일 — 둘 다 MusicTrack 구현, 클록은 AudioContext.currentTime.
  실제 음원은 BPM 반올림 금지(164.73을 165로 하면 87초에서 142ms 어긋남),
  첫 다운비트(firstBeatMs)가 비트 그리드 원점
- 렌더러 Canvas 2D / 카메라 영상 서버 전송 금지 / 리더보드 없음(개인 베스트만)

## 실행 방법
- 로컬: cd homework/main-service/web && npm run dev (https://localhost:3000)
  — 3000 포트를 다른 프로젝트가 쓰고 있으면 npm run dev -- -p 3100
- 채보 재생성: npm run gen-charts / 검증 빌드: npm run build / 배포: npx vercel deploy --prod
- 곡 직접 진입: /play?song={demo-track|neon-run|moon-step|star-pop|bubble-bounce|caramelldansen}
  &difficulty={easy|normal}
- 곡 추가 레시피: songs.json(synth 또는 audio + choreo/sections/poses) → npm run gen-charts
  → seed SQL 작성 → 유저가 대시보드에서 실행
- 주의 (WSL2 + /mnt/c):
  · 브라우저 검증은 Windows Chrome headless
    ("/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new)
    — virtual-time-budget은 오디오/MediaPipe와 안 맞는다. 결과 회수는 python3 -m http.server의
    액세스 로그를 쓰는 방식이 잘 됐다 (페이지에서 fetch("/RESULT?...") 호출 → 로그 grep)
  · 오디오 분석은 pip install이 PEP 668로 막힌다 → wheel을 받아 PYTHONPATH로 쓸 것:
    python3 -m pip download --no-deps -d <dir> miniaudio → unzip → PYTHONPATH=<dir> python3
  · clip.exe는 UTF-8 한글이 깨진다 → PowerShell Set-Clipboard 사용
  · ⚠️ dev 서버 켠 채 npm run build 금지 — dev 상태가 오염돼 페이지 JS가 실행 안 됨
  · ⚠️ npm run build를 `| tail`로 파이프하면 실패해도 exit 0이 된다 — 종료 코드를 따로 볼 것
- reference/ 폴더는 .gitignore 처리됨 (영상·원본 음원 — 저작권상 커밋 금지).
  단 public/audio/의 카라멜단센 MP3는 유저 확정으로 커밋·공개 배포 중(상업 음원, 리스크 감수)
```

---

## 세션 이력 (요약)

- **2026-07-07~08**: MVP 구현 → 채보를 안무 모티프 기반으로 재설계(표준 영상 reference/best.mp4),
  노트 간격을 비트 단위로 교체, Supabase 연동 + Google OAuth + 프로덕션 로그인 E2E
- **2026-07-12**: 카라멜단센 신스 커버(레퍼런스 영상 3개 교차검증), 포즈 1초로 단축, 함정 토글,
  난이도 개편(구 easy 폐지·구 normal→easy), 5곡 멀티마디 리메이크, 카메라 프레이밍 설정+자동 감지
- **2026-07-16**: 관리자 페이지(/admin·songs·users) + 채보 에디터 — 설계는 docs/admin-page.md
- **2026-07-21**: 최초 커밋 + 배포. 배포 전 빌드에서 `resolveChartUrl` 누락 발견 —
  세션 노트엔 "구현 완료"였지만 실제 코드가 없었다. **노트를 믿지 말고 빌드로 재검증할 것**
- **2026-07-22**: 카라멜단센을 실제 음원으로 교체(164.73 BPM·첫 다운비트 162.5ms 실측,
  FileTrack 오디오 엔진 신설) → 하이라이트 87.6초로 갔다가 유저 피드백으로 전곡 175.2초 복귀,
  곡 구조 10구간 명시 배치(채보 easy 134·normal 154) → 유저 신고 2건 수정(점수 항상 F·녹화 무음)
  → 모바일/PC 채보 불일치를 몸 기준 좌표로 해결

*갱신: 2026-07-22 세션 종료. 남은 것: seed_005 실행 + 실기기 QA 3종(몸 기준 좌표·점수·녹화 소리).*
