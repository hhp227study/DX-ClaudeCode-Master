# DESIGN.md — 미니 노션 (Mini Notion)

> 이 문서는 새로운 디자인을 제안하는 문서가 아니라, `app/globals.css` · `components/*.jsx` · `app/**/*.jsx` 에 이미 구현되어 있는 디자인 결정을 그대로 옮겨 적은 기록입니다. 모든 수치는 코드에서 그대로 가져왔으며, 추정한 내용은 "9. 확인 필요 / 추정 사항"에 별도로 표기했습니다.

## 1. 개요

- **제품명**: 미니 노션 (Mini Notion)
- **목적**(`02-prd.md` 기준): 유료 구독 없이 무료로 쓸 수 있고, 나에게 맞는 기능을 직접 확장할 수 있는 1인용 업무 관리 도구
- **기술 스택**(`package.json`): Next.js 15.5.4 (App Router), React 19.1.0 / React DOM 19.1.0
- **스타일링**: 별도 CSS 프레임워크·UI 라이브러리 없이 순수 CSS 한 파일(`app/globals.css`), CSS 커스텀 프로퍼티(`:root`) 기반 토큰 사용
- **상태 관리**: `lib/store.jsx`의 React Context + `localStorage`(`mini-notion-v1`) — 서버/DB 없음
- **인증 현황**: PRD에는 "구글 로그인"이 명시되어 있으나, 현재 `login()`은 실제 OAuth 없이 고정된 목업 사용자(`{ name: "유아이볼", avatar: null }`)를 생성만 함. 프론트엔드 전용 프로토타입 상태.

## 2. 디자인 원칙

코드와 PRD에서 관찰되는 패턴을 근거로 도출했습니다.

| 원칙 | 근거 |
|---|---|
| **컨텐츠 중심의 절제된 색상** | 웜그레이 뉴트럴 13단계(`--gray-0`~`--gray-900`)가 화면 대부분을 구성하고, 브랜드 블루는 기본 액션(`.btn.pri`, `.nav.blue`, 포커스 링, "새 카드" 강조)에만 쓰임. 빨강/초록은 각각 삭제(위험)·저장 완료(성공) 단 두 상태에만 한정 사용됨(`globals.css` 시맨틱 컬러). |
| **빠르고 조용한 인터랙션** | 모든 트랜지션이 `--dur-fast`(120ms) 하나와 `--ease-standard` 큐빅베지어만 사용하고 별도의 바운스·스프링 효과가 없음. PRD의 "가벼운 도구" 포지셔닝과 일치. |
| **1인 업무용 최소 기능 세트** | PRD 가치 곡선에서 협업·템플릿 다양성을 의도적으로 낮춤. 실제로 에디터 슬래시 메뉴는 "페이지"/"텍스트" 2종뿐이고, 노트 데이터 모델도 제목+내용 두 필드뿐(`lib/store.jsx`). |
| **밀도를 고를 수 있는 뷰 전환** | 업무 페이지가 리스트형·카드형·3단형 3가지 보기를 세그먼트 컨트롤로 제공하고, 선택값을 `localStorage("mini-notion-view")`에 저장(`app/page.jsx`)해 사용자가 자신에게 맞는 밀도를 고정할 수 있게 함. |

## 3. 디자인 토큰

`app/globals.css`의 `:root`에 정의된 값입니다(주석: "Imported from the Claude Design project (`_ds/mini-notion-design-system` / tokens)"). 총 36개 중 5개는 현재 코드 어디에서도 `var()`로 참조되지 않습니다(미사용 표시).

### 3.1 색상 — 뉴트럴 (웜 그레이)

| 토큰 | 값 | 주요 용도 |
|---|---|---|
| `--gray-0` | `#ffffff` | 본문 배경, ghost 버튼, 카드/인풋/모달 배경 |
| `--gray-25` | `#fbfbfa` | 부트 화면, 로그인/사이드바 배경, 카드 영역 배경, 슬래시 아이콘 배경 |
| `--gray-50` | `#f7f7f6` | ghost 버튼 hover, 노트 리스트 행 hover |
| `--gray-100` | `#f1f1f0` | 구글 마크 배경, nav hover, 세그먼트 배경, 프로필 아바타 배경, 3단뷰 선택 배경, 메뉴 항목 hover |
| `--gray-150` | `#ececeb` | 사이드바 nav 활성(`on`) 배경 |
| `--gray-200` | `#e6e6e4` | 전역 보더 색상(사이드바, 카드, 구분선, 모달, 인풋 보더 등) |
| `--gray-300` | `#d8d8d5` | ghost 버튼 보더, 카드 hover 보더, 점선 보더(빈 상태/새 카드), 인풋 보더 |
| `--gray-400` | `#b7b7b3` | 로그인 안내문, 메타 텍스트(날짜), placeholder |
| `--gray-500` | `#8f8f8b` | 아이콘/보조 텍스트/섹션 라벨/설명 텍스트 전반 |
| `--gray-600` | `#6c6c68` | 로그인 서브카피, 아바타 이니셜, 구글 마크 텍스트 |
| `--gray-700` | `#4a4a47` | ghost 버튼 텍스트, nav 기본 텍스트, 본문(에디터) 텍스트 |
| `--gray-800` | `#323230` | 브랜드 타일 배경, 페이지 제목(`.h1`) |
| `--gray-900` | `#1e1e1c` | 본문 기본 색, 제목류(로그인 타이틀, 노트 제목, 에디터 제목) |

### 3.2 색상 — 브랜드 블루

| 토큰 | 값 | 주요 용도 |
|---|---|---|
| `--blue-50` | `#eef4ff` | "새 카드" hover 배경 |
| `--blue-100` | `#d2e4fa` | *(미사용 — 9장 참고)* |
| `--blue-500` | `#4076ff` | primary 버튼, `.nav.blue`, 3단뷰 선택 표시줄, "새 카드" 텍스트, 인풋 포커스 보더 |
| `--blue-600` | `#2f63e6` | primary 버튼 hover |
| `--blue-700` | `#2453c9` | primary 버튼 active |

### 3.3 색상 — 시맨틱(상태)

| 토큰 | 값 | 주요 용도 |
|---|---|---|
| `--green-500` | `#22b673` | 저장 완료 메시지(`.saved-msg`) |
| `--green-50` | `#e7f7ef` | *(미사용 — 9장 참고)* |
| `--red-500` | `#e5484d` | 삭제(danger) 메뉴 텍스트, 폼 에러 텍스트 |
| `--red-50` | `#fcecec` | 삭제 메뉴 hover 배경 |

### 3.4 타이포그래피

| 토큰 | 값 |
|---|---|
| `--font-sans` | `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif` |
| `--font-mono` | `"SFMono-Regular", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |

실제 폰트 로드는 `app/layout.jsx`에서 jsDelivr CDN(`orioncactus/pretendard@v1.3.9`, dynamic-subset variable css)을 `<link rel="stylesheet">`로 불러오는 방식이며, 별도 `--text-*` 크기 토큰은 없고 컴포넌트마다 `font-size`를 직접 지정합니다(정확한 값은 5장 컴포넌트별 표 참고). 관찰되는 크기 스케일은 10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 15 / 16 / 17 / 20 / 21 / 24 / 26 / 28px 입니다.

### 3.5 반경(Radius)

| 토큰 | 값 | 사용처 |
|---|---|---|
| `--radius-sm` | `6px` | nav, 세그먼트 버튼, 더보기 버튼, 메뉴 항목, 인풋(md와 혼용 아님, sm은 소형 요소) |
| `--radius-md` | `8px` | 버튼(`.btn`), 세그먼트 배경, 인풋(`.input`) |
| `--radius-lg` | `12px` | 카드 영역, 노트 카드, 3단뷰 컨테이너, 검색창, 빈 상태 박스 |
| `--radius-xl` | `16px` | *(미사용 — 9장 참고)* |

토큰화되지 않고 하드코딩된 반경도 존재합니다: `50%`(구글 마크), `4px`(브레드크럼 링크, 빈 상태 코드), `7px`(아바타, 슬래시 아이템/아이콘), `9px`(더보기 팝업), `10px`(슬래시 메뉴), `14px`(프로필 아바타).

### 3.6 그림자(Shadow)

| 토큰 | 값 | 사용처 |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(24,24,22,.04)` | 세그먼트 활성 버튼 |
| `--shadow-sm` | `0 1px 3px rgba(24,24,22,.06), 0 1px 2px rgba(24,24,22,.04)` | 노트 카드 hover |
| `--shadow-md` | `0 4px 12px rgba(24,24,22,.07), 0 2px 4px rgba(24,24,22,.04)` | *(미사용 — 9장 참고)* |
| `--shadow-lg` | `0 12px 32px rgba(24,24,22,.10), 0 4px 8px rgba(24,24,22,.05)` | 더보기 팝업, 슬래시 메뉴, 검색창 |
| `--shadow-focus` | `0 0 0 3px rgba(64,118,255,.20)` | 인풋 포커스 링 |

### 3.7 모션(Motion)

| 토큰 | 값 | 사용처 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 모든 트랜지션의 이징 |
| `--dur-fast` | `120ms` | 버튼/nav/카드/인풋 hover·focus 트랜지션 전체 |
| `--dur-normal` | `180ms` | *(미사용 — 9장 참고)* |

### 3.8 다크 테마

`<html data-theme="dark">`가 설정되면 `:root[data-theme="dark"]` 블록이 위 토큰들을 다크 값으로 재정의합니다. 컴포넌트 CSS는 수정 없이 그대로 동작하며, **색상은 반드시 변수 경유** — 리터럴 색상값을 컴포넌트 스타일에 새로 넣지 않는 것이 규칙입니다.

- **그레이 램프은 역방향으로 재정의**됩니다: 라이트의 "낮은 숫자 = 밝은 배경, 높은 숫자 = 어두운 텍스트" 의미가 다크에서 "낮은 숫자 = 어두운 배경(`--gray-0`=`#191918`), 높은 숫자 = 밝은 텍스트(`--gray-900`=`#ececea`)"로 유지됩니다. 순수 반전이 아니라 웜 톤을 유지한 보정값입니다.
- **블루/상태색은 다크 배경 대비를 위해 한 단계 밝게** 조정됩니다(`--blue-500`=`#6b95ff` 등). primary 버튼 hover/active는 라이트에서 어두워지는 대신 다크에서는 밝아지는 방향입니다.
- `color-scheme`을 테마별로 선언해 스크롤바 등 네이티브 UI도 함께 전환됩니다.

테마 의존 리터럴을 흡수하는 신규 토큰 3종:

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--on-accent` | `#ffffff` | `#191918` | primary 버튼 텍스트 — 다크에선 액센트가 밝아지므로 글자는 어둡게 (대비 6.17:1) |
| `--surface-glass` | `rgba(255,255,255,.92)` | `rgba(25,25,24,.92)` | 상세 상단바(`.detail-bar`)의 반투명 배경 |
| `--overlay` | `rgba(15,15,15,.35)` | `rgba(0,0,0,.55)` | 검색 모달 오버레이 |

브랜드 타일(`.brand-tile`)의 글자색은 `var(--gray-0)`을 사용합니다 — 램프가 뒤집히면 타일 배경(`--gray-800`)과 글자색이 함께 반전되어 어느 테마에서든 대비가 유지됩니다.

테마 결정·저장 로직은 `lib/theme-script.js`(first-paint 전 인라인 스크립트, `localStorage["mini-notion-theme"]` → `prefers-color-scheme` 순)와 `lib/theme.js`(`useTheme()` 훅), 토글 UI는 `components/ThemeToggle.jsx`(사이드바 하단) 참고.

## 4. 레이아웃 구조

- **앱 셸**(`.shell`): `height: 100vh`, flex 가로 배치, 내부 스크롤(overflow hidden), 반응형 브레이크포인트 없음(고정 폭 기준).
- **사이드바**(`.sidebar`): 고정 폭 `248px`, 배경 `--gray-25`, 우측 보더 `1px --gray-200`, 내부 패딩 `14px 11px`, 세로 스크롤 가능.
- **메인 영역**(`.main`): `flex: 1`, 배경 `--gray-0`, 세로 스크롤.
- **본문 컨테이너**(`.page`): 최대 폭 `860px`, 가운데 정렬, 패딩 `44px 40px 64px` (마이페이지는 `app/profile/page.jsx`에서 인라인으로 `maxWidth: 640`으로 축소).
- **에디터 컨테이너**(`.editor`): 최대 폭 `720px`, 패딩 `34px 40px 80px`. `.compact` 변형은 3단뷰 안에서 쓰이며 `max-width: none`, 패딩 제거.
- **3단 뷰**(`.threepane`): 좌측 리스트 고정 폭 `250px` + 우측 상세 가변폭, 전체 높이 `calc(100vh - 200px)`(최소 `430px`).
- 미디어 쿼리(`@media`)는 `globals.css` 전체에 하나도 없음 — 모바일/반응형 대응 없음.

## 5. 컴포넌트 명세

### 5.1 버튼 (`.btn`)

| 클래스 | 치수/스타일 | 상태 | 쓰이는 곳 |
|---|---|---|---|
| `.btn` | 높이 32px, 패딩 `0 13px`, radius `--radius-md`, `13px/600`, 보더 `1px solid transparent`, gap 6px | — | 공통 베이스 |
| `.btn.pri` | 배경 `--blue-500`, 글자 `#fff` | hover `--blue-600` / active `--blue-700` | "새 글"(업무 페이지 헤더/빈 상태), 마이페이지 "저장" |
| `.btn.gho` | 배경 `--gray-0`, 글자 `--gray-700`, 보더 `--gray-300` | hover 배경 `--gray-50` | 구글 로그인, 프로필 이미지 변경/제거, 로그아웃 |

### 5.2 로그인 (`app/login/page.jsx`)

| 클래스 | 치수/스타일 |
|---|---|
| `.login-wrap` | `min-height:100vh`, flex column 중앙 정렬, 배경 `--gray-25`, 패딩 24px |
| `.brand-tile` | 배경 `--gray-800`, 글자 `#fff`, `font-weight:700`. 로그인 화면은 인라인 스타일로 `44×44`, radius `12px`, `font-size:20px` |
| `.login-title` | `24px/700`, `letter-spacing:-0.02em`, 색 `--gray-900` |
| `.login-sub` | `14px/1.5`, 색 `--gray-600`, `margin:10px 0 30px` |
| `.login-google`(`.btn.gho`와 조합) | 높이 44px, `width:100%`, `max-width:330px`, `14px` |
| `.g-mark` | `18×18`, `border-radius:50%`, 배경 `--gray-100`, 보더 `1px --gray-200`, `11px/700`, 색 `--gray-600` |
| `.login-note` | `11.5px`, 색 `--gray-400`, `margin-top:16px` |

### 5.3 앱 셸 & 사이드바 (`AppShell.jsx`)

| 클래스 | 치수/스타일 | 상태 |
|---|---|---|
| `.brand` | flex, gap 9px, 패딩 `2px 6px 12px` | 사이드바 상단 로고 영역, 인라인으로 브랜드 타일 `22×22 / radius 6 / font 11` |
| `.brand-name` | `14px/700`, `letter-spacing:-0.02em` | — |
| `.nav` | 높이 32px, 패딩 `0 8px`, radius `--radius-sm`, `13.5px/500`, 색 `--gray-700`, 배경 없음, 텍스트 좌측 정렬 | hover 배경 `--gray-100` |
| `.nav .ic` | 폭 16px, `13px`, 색 `--gray-500` | — |
| `.nav.on` | 배경 `--gray-150`, 색 `--gray-900`, `font-weight:600` | 현재 라우트(pathname 일치) |
| `.nav.blue` | 색 `--blue-600`, 아이콘 색 `--blue-500` `font-weight:700` | "새 글" 항목 전용 |
| `.seclab` | `11px/700`, 색 `--gray-500`, `letter-spacing:0.04em`, 패딩 `14px 8px 6px` | "글 목록" 라벨 + 개수(`.count`, 색 `--gray-400`) |
| `.side-foot` | `margin-top:auto`, 상단 보더 `1px --gray-200`, 내부 `.nav` 높이 40px | 프로필 링크(현재 라우트면 `.on`) |
| `.ava` | `26×26`, radius 7px, 배경 `--gray-200`, `11px/600`, 색 `--gray-600` | `img`가 있으면 `object-fit: cover`로 채움, 없으면 이름 첫 글자 |

### 5.4 페이지 공통 헤더

| 클래스 | 치수/스타일 |
|---|---|
| `.page` | 최대폭 860px, 패딩 `44px 40px 64px` |
| `.page-head` | flex, `justify-content: space-between`, `margin-bottom:22px` |
| `.h1` | `24px/700`, `letter-spacing:-0.02em`, 색 `--gray-800` |
| `.head-actions` | flex, gap 10px |

### 5.5 세그먼트 컨트롤 (뷰 전환, `app/page.jsx`)

| 클래스 | 치수/스타일 | 상태 |
|---|---|---|
| `.seg` | `inline-flex`, 배경 `--gray-100`, radius `--radius-md`, 패딩 2px, gap 2px | `role="tablist"`, `aria-label="보기 방식"` |
| `.seg button` | 높이 28px, 패딩 `0 10px`, radius `--radius-sm`, `12.5px/600`, 색 `--gray-500` | `.on`: 배경 `--gray-0`, 색 `--gray-900`, `--shadow-xs` |

리스트(☰)/카드(▦)/3단(◫) 3가지, 선택값은 `localStorage("mini-notion-view")`에 저장되어 새로고침 후에도 유지됨.

### 5.6 노트 리스트뷰 (`.note-row`)

| 클래스 | 치수/스타일 |
|---|---|
| `.note-rows` | flex column |
| `.note-row` | 패딩 `14px 4px`, 상단 보더 `1px --gray-200`, 마지막 요소만 하단 보더도 추가 | hover 배경 `--gray-50` |
| `.note-row .t` | `15px/600`, 색 `--gray-900`, 이모지+제목 flex 배치 |
| `.note-row .p` | `13.5px/1.55`, 색 `--gray-500`, 2줄에서 말줄임(`-webkit-line-clamp:2`) |
| `.note-row .m` | `12px`, 색 `--gray-400` — "n월 n일 편집" |

### 5.7 노트 카드뷰 (`.note-card`)

| 클래스 | 치수/스타일 | 상태 |
|---|---|---|
| `.card-area` | 배경 `--gray-25`, radius `--radius-lg`, 패딩 16px, `margin:0 -16px` | — |
| `.note-grid` | `grid-template-columns: repeat(auto-fill, minmax(230px,1fr))`, gap 13px | — |
| `.note-card` | 배경 `--gray-0`, 보더 `1px --gray-200`, radius `--radius-lg`, 패딩 `15px 15px 17px`, `min-height:150px` | hover: 보더 `--gray-300`, `--shadow-sm` |
| `.note-card .e/.t/.p/.m` | 이모지 17px · 제목 `14.5px/600` · 본문 `12.5px/1.55` 3줄 말줄임 · 메타 `11.5px --gray-400`(`margin-top:auto`) | — |
| `.note-card.new` | 점선 보더 `1.5px --gray-300`, 배경 투명, 색 `--blue-500`, 가운데 정렬 | hover: 보더 `--blue-500`, 배경 `--blue-50` |

### 5.8 3단 뷰 (`.threepane`)

| 클래스 | 치수/스타일 | 상태 |
|---|---|---|
| `.threepane` | 보더 `1px --gray-200`, radius `--radius-lg`, `height: calc(100vh - 200px)`, `min-height:430px` | — |
| `.pane-list` | 폭 250px, 우측 보더 `1px --gray-200`, 패딩 `8px 0` | — |
| `.pane-item` | 패딴 `12px 16px`, 좌측 보더 `2px solid transparent` | hover 배경 `--gray-50` / `.on`: 배경 `--gray-100`, 좌측 보더 `--blue-500` |
| `.pane-item .t/.p` | `13.5px/600` 1줄 말줄임 / `12px/1.5` 2줄 말줄임 | — |
| `.pane-detail` | `flex:1`, 세로 스크롤 | — |
| `.pane-toolbar` | 우측 정렬, 패딩 `8px 14px`, 하단 보더 `1px --gray-200` | — |
| `.pane-open` | `12px/600`, 색 `--gray-500` | hover 배경 `--gray-100`, 색 `--gray-700` — "전체 화면으로 열기 ↗" |
| `.pane-editor` | 패딩 `26px 30px` | 내부에 `NoteEditor compact` |
| `.pane-empty` | 가운데 정렬, 색 `--gray-400`, `13.5px` | "왼쪽에서 글을 선택하세요." |

### 5.9 상세 바 + 브레드크럼 + 더보기 메뉴 (`app/notes/[id]/page.jsx`)

| 클래스 | 치수/스타일 | 상태 |
|---|---|---|
| `.detail-bar` | 높이 44px, 하단 보더 `1px --gray-200`, `position: sticky; top:0`, 배경 `rgba(255,255,255,.92)` + `backdrop-filter: blur(4px)`, `z-index:20` | — |
| `.crumb` | `12.5px`, 색 `--gray-500` | `a` hover: 배경 `--gray-100`, 색 `--gray-700` |
| `.crumb .cur` | 색 `--gray-700/500`, `max-width:320px` 말줄임 | 현재 글 제목 |
| `.more-btn` | `16px/700`, `letter-spacing:1px`, 색 `--gray-500`("···") | hover 배경 `--gray-100` |
| `.menu-pop` | 폭 160px, 배경 `--gray-0`, 보더 `1px --gray-200`, radius 9px, `--shadow-lg` | 클릭 시 표시, 바깥 클릭 시 자동 닫힘 |
| `.menu-item` | `12.5px/500`, 색 `--gray-700` | hover 배경 `--gray-100` |
| `.menu-item.danger` | 색 `--red-500` | hover 배경 `--red-50` — "삭제" |

### 5.10 에디터 + 슬래시 메뉴 (`NoteEditor.jsx`)

| 클래스 | 치수/스타일 | 비고 |
|---|---|---|
| `.editor` | 최대폭 720px, 패딩 `34px 40px 80px` | `.compact`: 패딩 제거, 최대폭 없음(3단뷰용) |
| `.ed-title` | `28px/700`, `line-height:1.25`, `letter-spacing:-0.02em`, 색 `--gray-900`, placeholder `--gray-300` | `.compact`에서 `21px` |
| `.ed-body` | `15px/1.7`, 색 `--gray-700`, `min-height:300px`, placeholder `--gray-400` | `.compact`에서 `14px`, `min-height:180px` |
| `.slash-menu` | 폭 300px, 배경 `--gray-0`, 보더 `1px --gray-200`, radius 10px, `--shadow-lg` | 캐럿이 있는 줄 바로 아래에 `top` 좌표로 위치(줄 높이 `25.5px = 15px×1.7`과 반드시 일치해야 함 — 코드 주석) |
| `.slash-sec` | `10.5px/700`, 색 `--gray-500` | "기본 블록" |
| `.slash-item` | 패딩 `9px 10px`, radius 7px | `.on`: 배경 `--gray-100`(키보드/마우스 hover로 이동) |
| `.slash-ic` | `32×32`, radius 7px, 보더 `1px --gray-200`, 배경 `--gray-25` | 블록 아이콘(📄/📝) |
| `.slash-name` / `.slash-desc` | `13px/600` / `11.5px --gray-500` | — |

블록 종류는 코드상 2개뿐: `page`(새 페이지 생성 후 이동), `text`(해당 줄만 지우고 캐럿 유지).

### 5.11 마이페이지 폼 (`app/profile/page.jsx`)

| 클래스 | 치수/스타일 |
|---|---|
| `.f-label` | `11px/700`, 색 `--gray-500`, `letter-spacing:0.04em` |
| `.f-row` | `margin-bottom:28px` |
| `.profile-ava` | `64×64`, radius 14px, 배경 `--gray-100`, 보더 `1px --gray-200`, `20px/600` |
| `.f-hint` / `.f-error` | `11.5px --gray-400` / `11.5px --red-500` |
| `.input` | 높이 38px, 보더 `1px --gray-300`, radius `--radius-md`, `14px` | focus: 보더 `--blue-500` + `--shadow-focus` |
| `.saved-msg` | `12.5px/600`, 색 `--green-500` |

업로드 제약(코드 하드코딩, 토큰 아님): JPG/PNG만 허용, 최대 `2MB`(`MAX_IMAGE_BYTES = 2*1024*1024`), `FileReader`로 dataURL 변환 후 저장. 저장 메시지는 2초 뒤 자동으로 사라짐(`setTimeout(2000)`).

### 5.12 검색 모달 (`SearchModal.jsx`)

| 클래스 | 치수/스타일 | 상태 |
|---|---|---|
| `.overlay` | `position:fixed; inset:0`, 배경 `rgba(15,15,15,.35)`, `padding-top:14vh`, `z-index:100` | 클릭 시 닫힘 |
| `.search-box` | 폭 560px(`max-width: calc(100vw - 48px)`), radius `--radius-lg`, `--shadow-lg` | — |
| `.search-input` | `16px`, 패딩 `16px 18px`, 하단 보더 `1px --gray-200` | placeholder `--gray-400` |
| `.search-res` | `max-height:330px`, 패딩 6px | — |
| `.search-item` | 패딩 `10px 12px`, radius 7px | `.on`/hover: 배경 `--gray-100` |
| `.search-empty` | 패딩 28px, 색 `--gray-500`, `13.5px` | "검색 결과가 없습니다." |

### 5.13 빈 상태 (`.empty`)

| 클래스 | 치수/스타일 |
|---|---|
| `.empty` | 점선 보더 `1.5px --gray-300`, radius `--radius-lg`, 패딩 `48px 24px`, 가운데 정렬, 색 `--gray-500` |
| `.empty .big` | `26px` (이모지) |
| `.empty .t` / `.p` | `14.5px/600 --gray-700` / `13px` |
| `.empty code` | `--font-mono`, `12px`, 배경 `--gray-100`, radius 4px |

### 5.14 전역 베이스

`* { box-sizing: border-box }`, `html/body { margin:0; padding:0; height:100% }`, `body`는 `--font-sans` / 색 `--gray-900` / 배경 `--gray-0` / `antialiased`, `button`·`input`·`textarea`는 `font-family: inherit`, `a`는 밑줄 없음. `.boot`(로딩 화면)은 `height:100vh`, 배경 `--gray-25`.

## 6. 페이지 화면 명세

| 페이지 | 경로 | 구성 |
|---|---|---|
| 로그인 | `app/login/page.jsx` | 중앙 정렬 카드 없는 레이아웃. 브랜드 타일 → 타이틀 → 서브카피 → 구글 로그인 버튼(`.btn.gho.login-google`) → 안내문. 로그인 시 목업 사용자 생성 후 `/`로 이동. |
| 업무 페이지(홈) | `app/page.jsx` | 헤더(`.h1` "내 글" + 세그먼트 컨트롤 + `.btn.pri` "새 글"). 노트 0개면 `.empty`, 아니면 `list`/`card`/`pane` 3뷰 중 택1(로컬스토리지 기억). |
| 글 상세 | `app/notes/[id]/page.jsx` | sticky `.detail-bar`(브레드크럼 + 더보기 메뉴: 이름 바꾸기 / 삭제) + `NoteEditor`(비compact, 제목 28px + 본문). |
| 마이 페이지 | `app/profile/page.jsx` | `.page`(`maxWidth:640` 인라인 축소) 안에 프로필 이미지 필드 / 별명 필드(저장 버튼 + Enter 지원) / 계정(로그아웃) 3개 `.f-row`. |
| 검색 모달 | `components/SearchModal.jsx` | `AppShell` 어디서든 `Cmd/Ctrl+K`로 열리는 오버레이. 제목·본문 부분일치 검색, 결과 없으면 `.search-empty`. |

## 7. 인터랙션 & 키보드 단축키

| 트리거 | 동작 | 위치 |
|---|---|---|
| `Cmd/Ctrl + K` | 검색 모달 토글 | `AppShell.jsx` 전역 keydown 리스너 |
| 검색 모달: `↑` `↓` | 결과 목록 선택 이동(범위 clamp) | `SearchModal.jsx` |
| 검색 모달: `Enter` | 선택된 결과로 이동 후 모달 닫힘 | 〃 |
| 검색 모달: `Escape` / 바깥 클릭 | 모달 닫힘 | 〃 |
| 에디터: `/` + 텍스트 | 현재 줄이 `^/(\S*)$` 패턴과 일치하면 슬래시 메뉴 노출, 캐럿 줄 바로 아래(`(lineNo+1) * 25.5px + 6px`)에 위치 | `NoteEditor.jsx` |
| 슬래시 메뉴: `↑` `↓` | 항목 순환 이동(모듈로 연산, 끝에서 처음으로 순환) | 〃 |
| 슬래시 메뉴: `Enter` / `Tab` | 선택 항목 적용 | 〃 |
| 슬래시 메뉴: `Escape` | 메뉴 닫힘 | 〃 |
| 본문 blur | 150ms 지연 후 메뉴 닫힘(항목 클릭 유예 시간 확보) | 〃 |
| 제목 입력: `Enter` | 줄바꿈 대신 본문(textarea)으로 포커스 이동 | 〃 |
| 더보기 메뉴 바깥 클릭 | 메뉴 자동 닫힘(`mousedown` 리스너) | `app/notes/[id]/page.jsx` |
| 글 삭제 | 네이티브 `window.confirm()`으로 확인 후 삭제, 목록으로 이동 | 〃 |

이 앱은 서버 통신이 없고 상태가 로컬(React state + `localStorage`)이므로, 별도의 "낙관적 업데이트/롤백" 개념 없이 모든 변경이 즉시(동기적으로) 반영됩니다.

## 8. 접근성 메모 (코드에서 실제로 확인되는 것만)

- 인풋 포커스 시 `--shadow-focus`(3px, `rgba(64,118,255,.20)`) 링이 표시됨(`.input:focus`).
- 세그먼트 컨트롤에 `role="tablist"`와 `aria-label="보기 방식"`이 지정됨(`app/page.jsx`).
- 더보기 버튼에 `aria-label="더 보기"`가 지정됨(`app/notes/[id]/page.jsx`).
- 슬래시 메뉴·검색 모달 모두 키보드(방향키/Enter/Escape)만으로 완전히 조작 가능하도록 구현되어 있음.
- 그 외 버튼·입력 요소에 추가 `aria-*` 속성은 없으며, 색 대비 수치는 코드만으로 계산할 수 없어 검증되지 않음.

## 9. 확인 필요 / 추정 사항

1. **레퍼런스 이미지 불일치**: `03-reference-design.png`는 미니 노션 화면이 아니라 "Sprinkler"라는 별개 제품(uibowl 브랜드의 AI 어시스턴트/채팅 워크스페이스, 토픽·채팅 사이드바 + AI 프롬프트 카드 + 도넛차트 위젯 구성)의 스크린샷입니다. 로그인/업무 페이지/글 상세/마이페이지/검색 중 어느 실제 화면과도 1:1로 대응하지 않습니다. 라이트 테마·흰 배경·좌측 사이드바 내비게이션·파란 포인트 컬러라는 톤앤매너 정도만 공통점이며, 세부 레이아웃은 이 이미지가 아니라 `globals.css` 주석이 언급하는 별도 소스("Claude Design project `_ds/mini-notion-design-system`")에서 온 것으로 보입니다. → 실제 화면 와이어프레임이 별도로 존재하는지 확인이 필요합니다.
2. **미사용 토큰 5개**: `--blue-100`, `--green-50`, `--shadow-md`, `--dur-normal`, `--radius-xl`은 `:root`에 정의되어 있지만 현재 `globals.css` 어디에서도 `var()`로 참조되지 않습니다. 향후 확장(배지, 알림 등)을 위해 미리 선언해 둔 것으로 추정되나 실제 용도는 코드만으로 확인 불가합니다.
3. **로컬 폰트 파일 미사용**: 프로젝트 루트에 `PretendardVariable.woff2`가 있지만 `@font-face`로 참조하는 코드가 어디에도 없습니다. 실제 폰트는 `app/layout.jsx`가 jsDelivr CDN(`orioncactus/pretendard@v1.3.9`)에서 불러옵니다. 오프라인/CDN 장애 대비용으로 남겨둔 파일인지 확인이 필요합니다.
4. **구글 로그인 미구현**: PRD(`02-prd.md`)는 "구글로그인"을 요구사항으로 명시하지만, 실제 `lib/store.jsx`의 `login()`은 OAuth 없이 고정된 목업 사용자를 만들 뿐입니다. 이 문서는 "현재 코드" 기준으로 작성했으므로 이 프로토타입 상태를 그대로 반영했습니다.
5. **토큰화되지 않은 반경 값**: 실제 사용되는 반경은 `sm(6)`/`md(8)`/`lg(12)` 외에도 `50%`, `4px`, `7px`, `9px`, `10px`, `14px`처럼 하드코딩된 값이 다수 있습니다. 토큰 스케일 확장이 필요한지는 확인이 필요합니다.
6. **`.nav.blue`의 의미 범위**: 현재 코드에서는 "새 글" 항목에만 쓰이고 있어, 이름(`blue`)이 "새 글" 전용인지 향후 다른 강조 항목에도 재사용할 의도인지 코드만으로는 판단할 수 없습니다.

## 10. 반영 결과 (자체 검증)

- `globals.css`에 정의된 구조적 클래스 셀렉터는 총 **78개**이며, 5장(컴포넌트 명세)에 **78개 전부** 반영했습니다. (`.pri`/`.gho`/`.on`/`.blue`/`.new`/`.danger`/`.compact` 등 결합형 상태 클래스는 별도 셀렉터로 세지 않고 각 표의 "상태" 컬럼에 포함했습니다.)
- `:root` 디자인 토큰은 총 **36개**이며, 3장에 **36개 전부** 문서화했습니다. 이 중 **5개**(`--blue-100`, `--green-50`, `--shadow-md`, `--dur-normal`, `--radius-xl`)는 코드 내 미사용으로 9장에 별도 표기했습니다.
- 검증 명령: `grep -oE '(^|[^a-zA-Z0-9_-])\.[a-zA-Z][a-zA-Z0-9_-]*' app/globals.css | sed -E 's/^.*(\.[a-zA-Z][a-zA-Z0-9_-]*)$/\1/' | sort -u | wc -l` → `78`
