# CatchRhy 기술 스파이크 (Phase 1, Week 1~2)

`docs/prd-detail.md` 로드맵의 첫 단계. **"보급형 폰 브라우저에서 카메라 + MediaPipe 추론 + 렌더링 + 녹화를 동시에 돌려도 게임이 성립하는가?"**에 답하기 위한 검증 프로토타입이다. 여기서 검증된 판정 코어(`src/game.ts`)와 트래킹 파이프라인(`src/tracker.ts`)은 MVP로 이전된다.

## 실행

```bash
npm install
npm run dev
```

- PC: `https://localhost:5173` (자체 서명 인증서 경고 → "고급 > 계속" 진행)
- 폰: 같은 Wi-Fi에서 `https://<PC의 LAN IP>:5173`
  - **WSL2 주의**: WSL2는 NAT 뒤에 있어 폰에서 바로 접속이 안 될 수 있다. Windows PowerShell(관리자)에서 포트 포워딩:
    ```powershell
    netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=(wsl hostname -I)
    ```
    또는 `npm run build` 후 `dist/`를 Vercel에 올려 테스트하는 것이 가장 간단하다.

## 검증 게이트 (합격 기준)

| # | 질문 | 확인 방법 | 기준 |
|---|---|---|---|
| 1 | 카메라+추론+렌더가 실시간으로 도는가 | 좌상단 FPS 표시 | **≥ 20fps** (보급형 폰 기준) |
| 2 | 지연이 판정 가능한 수준인가 | 추론 ms 표시 + 버블 캐치 체감 | 추론 ≤ 50ms, 캐치가 "억울하지 않은" 체감 |
| 3 | 녹화를 켜도 성능이 유지되는가 | 녹화 중 FPS 변화 + 다운로드 영상 확인 | 녹화 중에도 ≥ 20fps, 영상에 카메라+오버레이 합성 |
| 4 | 조명 악조건에서 얼마나 버티는가 | 역광/어두운 방에서 손 인식 개수 확인 | 실패 조건 문서화 (캘리브레이션 단계 설계 입력) |

## 구조 (v2 — 판정 엔진 코어 포함)

| 파일 | 역할 | MVP 이전 여부 |
|---|---|---|
| `src/tracker.ts` | HandLandmarker 래퍼 — GPU→CPU 폴백, EMA 스무딩, 미러 좌표 변환 | ✅ 그대로 이전 |
| `src/pose-tracker.ts` | PoseLandmarker 래퍼 — 양손 올리기/하트 판별, Pose Note 구간에만 실행 | ✅ 그대로 이전 |
| `src/game.ts` | 판정 엔진 — 채보 기반 스폰, PRD 16.2 상수, 3종 노트, 콤보/배율/Rank | ✅ 그대로 이전 |
| `src/chart.ts` | PRD 16.1 채보 JSON 포맷 타입 + 로더 | ✅ 그대로 이전 |
| `src/audio.ts` | 데모 트랙(Web Audio 합성, 120BPM) + AudioContext 게임 클록 + 판정 SFX | ✅ 클록 구조 이전, 합성 트랙은 실음원으로 교체 |
| `src/recorder.ts` | canvas 합성 녹화 — 코덱 폴백 체인 (webm→mp4), 플레이 자동 녹화 | ✅ 그대로 이전 |
| `src/main.ts` | 상태 머신(intro→ready→countdown→playing→result) + 계측 HUD | ❌ 스파이크 전용 |
| `scripts/gen-chart.mjs` | 데모 채보 생성기 (시드 고정) — 페이스 튜닝은 여기서 | ✅ 채보 제작 도구로 발전 |

## 페이스 튜닝 (유저 피드백 반영 이력)

- 2026-07-07: "노트가 너무 빨리 올라온다" → 접근 시간 1500→2000ms(`game.ts APPROACH_MS`), 노트 간격 1.1초 고정 → 채보 섹션별 2.0/1.75/1.5초(`scripts/gen-chart.mjs`). 추가 조정은 두 파일의 상수만 바꾸고 `node scripts/gen-chart.mjs` 재실행.
- 2026-07-07: "노트가 얼굴을 가린다" → 출현 y 범위 0.30~0.68 → **0.45~0.73** (가슴~허리 높이). 얼굴이 항상 보여야 숏폼 콘텐츠가 성립한다는 원칙(Persona 1)과도 일치 — MVP 채보 제작 시에도 y < 0.45 금지.
- 2026-07-08: "셀카 댄스 영상처럼 자연스러운 동작으로" → `reference/` 영상 5개를 MediaPipe Pose로 분석해 랜덤 배치를 **안무 모티프 기반 배치**로 교체 (근거 수치: `docs/reference-choreo-analysis.md`, 구현: `web/scripts/gen-chart.mjs`). 확정 규칙(y 밴드·1.5초 간격·접근 2000ms)은 유지.
- 2026-07-08: "`reference/best.mp4`가 채보 나타나기 베스트 표준" → 기본 y 밴드 0.56~0.73 → **0.50~0.66**(어깨~가슴, best.mp4 드웰 IQR 0.52~0.59 기준), y 스텝 0.12→0.10, heart(중앙 하트 마무리) 모티프를 easy에도 추가하고 가중치 상향(~4초 주기 하트가 이 영상의 시그니처).
- 2026-07-08: "박자가 빠르면 채보도 빨리, 박자에 맞게" → 간격 "최소 1.5초(BPM 무관)" 규칙 폐지, **비트 단위 간격**(easy 6/5/4, normal 4/3/2비트, 물리 하한 0.75초)으로 교체. 구간 시작을 비트 그리드에 스냅해 모든 노트가 (반)박 위에 떨어짐. 140bpm 클라이맥스 0.86초 ~ 96bpm 1.25초. 동시 노출이 3개까지 늘어 겹침 분리를 2.2초 윈도우 전체로 확장.

## 스파이크에서 의도적으로 뺀 것

실음원(합성 트랙으로 클록만 검증), 일시정지 화면, 로그인/백엔드, Web Share. — MVP 단계에서 순서대로 추가한다 (태스크 #3~#6).
