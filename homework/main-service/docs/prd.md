# CatchRhy PRD

## 프로젝트명

**CatchRhy** - 카메라가 컨트롤러가 되는 AI 리듬게임

**Catch the Rhythm.**

작성일: 2026-07-06

## 1. 프로젝트 개요

CatchRhy은 스마트폰 또는 PC 카메라를 이용하여 손동작, 포즈, 얼굴 표정으로
플레이하는 AI 리듬게임이다. 플레이 결과는 자동으로 숏폼 영상으로
생성되어 SNS에 공유할 수 있다.

## 2. Vision

> 누구나 카메라 앞에서 플레이하면 하나의 숏폼 콘텐츠가 된다.

## 3. 목표

-   AI 카메라 기반 리듬게임 제공
-   숏폼 콘텐츠 생성 및 공유
-   카메라 리듬 플랫폼 구축

## 4. 타겟

-   15\~30세
-   TikTok / Instagram Reels / YouTube Shorts 사용자
-   K-POP 팬
-   리듬게임 유저
-   스트리머

## 5. 핵심 기능

### 카메라 플레이

-   전면 카메라
-   손, 얼굴, 포즈 인식

### 리듬게임

-   Perfect / Great / Good / Miss
-   Combo
-   Rank

### AI 인식

-   MediaPipe
-   TensorFlow.js
-   ONNX Runtime

### 제스처

-   손 올리기
-   양손
-   박수
-   브이
-   하트
-   윙크
-   웃기
-   고개 돌리기

### SNS

-   자동 하이라이트 영상 생성
-   TikTok, Reels, Shorts 공유

## 6. AI 자동 채보

음악 업로드 → BPM 분석 → 자동 채보 생성 → 수정 → 공유

## 7. 기술 스택

### MVP

-   Next.js
-   TypeScript
-   PixiJS
-   WebRTC
-   MediaPipe
-   Spring Boot
-   Supabase
-   Google Cloud Run

### V2

-   Unity
-   Android
-   iOS
-   Windows
-   macOS
-   Steam

## 8. MVP

-   로그인
-   음악 선택
-   카메라 실행
-   손 인식
-   점수 계산
-   결과 화면
-   영상 저장
-   SNS 공유

## 9. 로드맵

### Phase 1

웹 MVP

### Phase 2

AI 자동 채보, 친구 대전

### Phase 3

Unity 네이티브, Steam

### Phase 4

UGC 플랫폼, 공식 챌린지

## 10. USP

-   몸과 표정이 컨트롤러
-   플레이 영상 자동 생성
-   AI 자동 채보
-   UGC 중심 생태계
