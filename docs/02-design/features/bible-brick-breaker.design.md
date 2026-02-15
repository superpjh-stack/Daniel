# Bible Brick Breaker Game Design Document

> **Summary**: 게임 메뉴 + 성경 벽돌깨기 게임의 상세 기술 설계
>
> **Project**: 다니엘 - 동은교회 초등부 출석부
> **Author**: AI Assistant
> **Date**: 2026-02-16
> **Status**: Draft
> **Planning Doc**: [bible-brick-breaker.plan.md](../../01-plan/features/bible-brick-breaker.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- HTML5 Canvas 기반 60fps 벽돌깨기 게임 엔진
- 기존 QuizQuestion DB와 연동하여 퀴즈 벽돌 구현
- 달란트 보상 시스템과 통합 (어뷰징 방지 포함)
- 모바일/데스크톱 반응형 지원
- 향후 게임 추가를 위한 확장 가능한 `/games` 구조

### 1.2 Design Principles

- Client-side 게임 로직 (Canvas + React hooks)
- Server-side 보상 처리 (보안/검증)
- 기존 DB 함수 재활용 (`src/lib/db.ts`)
- 외부 게임 라이브러리 미사용 (순수 Canvas API)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Client)                                       │
│  ┌──────────────┐  ┌────────────────────────────────┐   │
│  │  Games List  │  │  Brick Breaker Game             │   │
│  │  /games      │  │  /games/brick-breaker           │   │
│  │  page.tsx    │  │  ┌──────────────────────────┐   │   │
│  └──────────────┘  │  │  BrickBreakerGame.tsx     │   │   │
│                    │  │  (Canvas + Game Loop)      │   │   │
│                    │  ├──────────────────────────┤   │   │
│                    │  │  QuizModal.tsx             │   │   │
│                    │  │  GameOverModal.tsx         │   │   │
│                    │  └──────────────────────────┘   │   │
│                    └────────────────────────────────┘   │
└──────────────┬──────────────────────┬──────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────┐
│  GET /api/quiz/start │  │  POST /api/games/         │
│  (퀴즈 문제 조회)      │  │  brick-breaker/reward     │
│  기존 API 재사용       │  │  (달란트 보상 지급)         │
└──────────┬───────────┘  └─────────────┬────────────┘
           │                            │
           ▼                            ▼
┌───────────────────────────────────────────────────────┐
│  PostgreSQL (RDS)                                      │
│  - QuizQuestion (100문제)                               │
│  - Student (talentBalance)                              │
│  - Talent (거래 기록)                                    │
└───────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. 게임 시작
   User → /games → "벽돌깨기" 클릭 → /games/brick-breaker
   → GET /api/quiz/start?count=20 → 퀴즈 20문제 사전 로드

2. 게임 플레이
   Canvas Game Loop (60fps) → 충돌 감지 → 벽돌 파괴
   → 퀴즈 벽돌 파괴 시 → 게임 일시정지 → QuizModal 표시
   → 정답/오답 → 점수 반영 → 게임 재개

3. 게임 종료 & 보상
   전체 벽돌 파괴 or 공 놓침(생명 0)
   → GameOverModal 표시 → POST /api/games/brick-breaker/reward
   → 서버: 학생 확인 + 일일 제한 확인 + 달란트 지급
   → 결과 표시 (점수, 보상 달란트)
```

---

## 3. File Structure

```
src/app/(dashboard)/games/
  page.tsx                          # 게임 목록 페이지 (서버 컴포넌트)
  brick-breaker/
    page.tsx                        # 게임 래퍼 페이지 (서버 컴포넌트)
    _components/
      BrickBreakerGame.tsx          # 메인 게임 컴포넌트 (client, Canvas)
      QuizModal.tsx                 # 퀴즈 팝업 모달 (client)
      GameOverModal.tsx             # 게임 종료/결과 모달 (client)
    _lib/
      gameEngine.ts                 # 게임 엔진 (공, 패들, 충돌, 렌더링)
      stages.ts                     # 5 스테이지 벽돌 배치 데이터
      types.ts                      # 게임 타입 정의

src/app/api/games/brick-breaker/
  reward/route.ts                   # 달란트 보상 API

src/components/layout/Sidebar.tsx   # "게임" 메뉴 항목 추가 (수정)
```

---

## 4. Data Model

### 4.1 Game Types (Client-side)

```typescript
// types.ts

// 벽돌 타입
type BrickType = 'normal' | 'strong' | 'quiz' | 'verse';

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  type: BrickType;
  hp: number;           // normal:1, strong:2, quiz:1, verse:1
  color: string;
  points: number;       // 파괴 시 획득 점수
  destroyed: boolean;
  quizId?: string;      // quiz 타입일 때 연결된 퀴즈 ID
  verseText?: string;   // verse 타입일 때 표시할 구절
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  dx: number;           // X 방향 속도
  dy: number;           // Y 방향 속도
  speed: number;        // 기본 속도
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  stage: number;        // 1~5
  score: number;
  lives: number;        // 기본 3
  bricks: Brick[];
  ball: Ball;
  paddle: Paddle;
  status: 'ready' | 'playing' | 'paused' | 'quiz' | 'stage-clear' | 'game-over' | 'all-clear';
  quizCorrect: number;  // 정답 맞힌 수
  quizTotal: number;    // 총 퀴즈 수
}

// 퀴즈 데이터 (API에서 미리 로드)
interface QuizData {
  id: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  category: string;
  reference?: string;
}

// 퀴즈 정답 (별도 저장, 채점용)
interface QuizAnswer {
  id: string;
  answer: number;  // 1~4
}
```

### 4.2 DB 모델 (기존 활용 - 변경 없음)

- **QuizQuestion**: 퀴즈 문제 조회 (getRandomQuizQuestions)
- **Student**: talentBalance 업데이트
- **Talent**: 보상 기록 생성 (createTalentRecord)

---

## 5. API Specification

### 5.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/quiz/start | 랜덤 퀴즈 조회 (기존) | Required |
| POST | /api/games/brick-breaker/reward | 게임 보상 지급 | Required |

### 5.2 POST /api/games/brick-breaker/reward

**Request:**
```json
{
  "studentId": "string",
  "score": 1500,
  "stageCleared": 3,
  "quizCorrect": 4,
  "quizTotal": 6
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "reward": {
    "talentEarned": 5,
    "breakdown": {
      "stageClear": 3,
      "quizBonus": 2
    }
  },
  "newBalance": 45
}
```

**Error Responses:**
- `400`: 잘못된 요청 (필수 필드 누락)
- `401`: 미인증
- `403`: 권한 없음 (admin/teacher만)
- `429`: 일일 보상 제한 초과 (하루 3회)

**보상 로직:**
```
if stageCleared >= 1: reward += 1
if stageCleared >= 3: reward += 2  (총 3)
if stageCleared >= 5: reward += 2  (총 5)
if quizCorrect == quizTotal && quizTotal > 0: reward += 2 (퀴즈 전문 정답)
```

**일일 제한 체크:**
```sql
-- 오늘 해당 학생의 brick-breaker 보상 횟수 조회
SELECT COUNT(*) FROM "Talent"
WHERE "studentId" = ? AND "type" = 'game' AND "reason" LIKE '%벽돌깨기%'
AND "createdAt" >= today_start
```

---

## 6. UI/UX Design

### 6.1 게임 목록 페이지 (`/games`)

```
┌────────────────────────────────────────────┐
│  🎮 게임                                    │
│  성경 내용을 재미있게 배워봐요!               │
│                                            │
│  ┌──────────────┐  ┌──────────────┐        │
│  │  🧱           │  │  ❓           │        │
│  │  벽돌깨기     │  │  Coming Soon │        │
│  │  성경 벽돌을  │  │  새 게임이   │        │
│  │  깨며 퀴즈를  │  │  곧 추가     │        │
│  │  풀어보세요!  │  │  됩니다!     │        │
│  │              │  │              │        │
│  │  [게임 시작] │  │  [준비 중]   │        │
│  └──────────────┘  └──────────────┘        │
└────────────────────────────────────────────┘
```

### 6.2 벽돌깨기 게임 화면

```
┌────────────────────────────────────┐
│  ← 뒤로   Stage 2   ❤️❤️❤️   ⏸️    │
│           Score: 1,500              │
├────────────────────────────────────┤
│  ┌────┬────┬────┬────┬────┬────┐  │
│  │보라│파랑│📖금│초록│보라│하늘│  │
│  ├────┼────┼────┼────┼────┼────┤  │
│  │주황│주황│초록│📖금│파랑│보라│  │
│  ├────┼────┼────┼────┼────┼────┤  │
│  │하늘│보라│파랑│초록│주황│📖금│  │
│  └────┴────┴────┴────┴────┴────┘  │
│                                    │
│               ●                    │
│                                    │
│          ═══════════               │
│                                    │
└────────────────────────────────────┘
```

### 6.3 퀴즈 모달

```
┌──────────────────────────────────────┐
│            📖 성경 퀴즈!              │
│                                      │
│  예수님이 태어나신 곳은?              │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  ① 나사렛                     │   │
│  ├──────────────────────────────┤   │
│  │  ② 예루살렘                   │   │
│  ├──────────────────────────────┤   │
│  │  ③ 베들레헴        ✅         │   │
│  ├──────────────────────────────┤   │
│  │  ④ 갈릴리                     │   │
│  └──────────────────────────────┘   │
│                                      │
│  참조: 마태복음 2:1                   │
│                                      │
│         [계속하기]                     │
└──────────────────────────────────────┘
```

### 6.4 게임 오버 / 올클리어 모달

```
┌──────────────────────────────────────┐
│           🎉 축하합니다!              │
│                                      │
│  Stage 5 클리어!                      │
│                                      │
│  📊 최종 점수: 3,500                  │
│  📖 퀴즈: 15/20 정답                  │
│  ⭐ 획득 달란트: 5 + 2 = 7            │
│                                      │
│  ┌─────────────┐ ┌─────────────┐    │
│  │  다시하기    │ │  목록으로    │    │
│  └─────────────┘ └─────────────┘    │
└──────────────────────────────────────┘
```

### 6.5 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| GamesPage | `games/page.tsx` | 게임 목록, 카드 UI |
| BrickBreakerPage | `games/brick-breaker/page.tsx` | 게임 래퍼, 퀴즈 데이터 로드 |
| BrickBreakerGame | `_components/BrickBreakerGame.tsx` | Canvas 게임 엔진, 입력 처리, 렌더링 |
| QuizModal | `_components/QuizModal.tsx` | 퀴즈 팝업, 선택지, 결과 표시 |
| GameOverModal | `_components/GameOverModal.tsx` | 결과, 보상, 다시하기 |

### 6.6 User Flow

```
사이드바 "게임" 클릭
  → /games (게임 목록)
    → "벽돌깨기" 카드 클릭
      → /games/brick-breaker
        → 퀴즈 데이터 로드 (GET /api/quiz/start?count=20)
        → "게임 시작" 버튼
          → Stage 1 시작 (Canvas 게임 루프)
            → 일반 벽돌 파괴 → 점수 +10/+30
            → 퀴즈 벽돌 파괴 → 게임 정지 → QuizModal
              → 정답 선택 → +150점 → 게임 재개
              → 오답 선택 → +50점 → 게임 재개
            → 모든 벽돌 파괴 → Stage Clear
              → 다음 스테이지 시작 (Stage 2~5)
            → 공 놓침 → 생명 -1
              → 생명 0 → Game Over
        → 게임 종료 (올클리어 or 게임오버)
          → GameOverModal 표시
          → POST /api/games/brick-breaker/reward
          → 보상 결과 표시
          → "다시하기" or "목록으로"
```

---

## 7. Game Engine Design

### 7.1 Canvas 설정

```typescript
// 캔버스 크기 (반응형)
const CANVAS_RATIO = 3/4;  // 세로:가로 비율
const MAX_WIDTH = 480;     // 최대 너비 (px)

// 실제 크기는 컨테이너에 맞춰 동적 계산
function getCanvasSize(containerWidth: number): { width: number; height: number } {
  const width = Math.min(containerWidth, MAX_WIDTH);
  const height = width * CANVAS_RATIO;
  return { width, height };
}
```

### 7.2 Game Loop

```typescript
function gameLoop(timestamp: number) {
  if (state.status !== 'playing') return;

  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // 1. Update
  updateBall(deltaTime);
  checkCollisions();

  // 2. Render
  clearCanvas();
  drawBricks();
  drawBall();
  drawPaddle();
  drawUI();

  // 3. Next frame
  requestAnimationFrame(gameLoop);
}
```

### 7.3 Collision Detection

```typescript
// 공 vs 벽돌 충돌 (AABB)
function checkBallBrickCollision(ball: Ball, brick: Brick): 'top' | 'bottom' | 'left' | 'right' | null {
  if (brick.destroyed) return null;

  const ballLeft = ball.x - ball.radius;
  const ballRight = ball.x + ball.radius;
  const ballTop = ball.y - ball.radius;
  const ballBottom = ball.y + ball.radius;

  if (ballRight < brick.x || ballLeft > brick.x + brick.width) return null;
  if (ballBottom < brick.y || ballTop > brick.y + brick.height) return null;

  // 충돌 방향 판단 → 공 반사 방향 결정
  // 상/하 충돌: dy 반전, 좌/우 충돌: dx 반전
}

// 공 vs 패들 충돌
function checkBallPaddleCollision(ball: Ball, paddle: Paddle): boolean {
  // 패들 어디 맞았느냐에 따라 반사 각도 변경
  // 패들 중앙: 수직, 가장자리: 급각도
}

// 공 vs 벽 충돌
function checkWallCollision(ball: Ball, canvasW: number, canvasH: number): void {
  // 좌/우 벽: dx 반전
  // 상단 벽: dy 반전
  // 하단 벽: 생명 감소 → 공 리셋
}
```

### 7.4 Input Handling

```typescript
// 키보드
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') paddle.x -= PADDLE_SPEED;
  if (e.key === 'ArrowRight') paddle.x += PADDLE_SPEED;
  if (e.key === ' ' || e.key === 'Escape') togglePause();
});

// 마우스
canvas.addEventListener('mousemove', (e) => {
  paddle.x = e.offsetX - paddle.width / 2;
});

// 터치 (모바일)
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  paddle.x = touch.clientX - rect.left - paddle.width / 2;
});
```

---

## 8. Stage Data Design

### 8.1 stages.ts

```typescript
interface StageConfig {
  stage: number;
  rows: number;
  cols: number;
  ballSpeed: number;       // 기본 속도 배수
  quizCount: number;       // 퀴즈 벽돌 수
  strongCount: number;     // 강화 벽돌 수
  verseCount: number;      // 성경구절 벽돌 수
  layout?: BrickType[][];  // 커스텀 배치 (없으면 자동 생성)
}

const STAGES: StageConfig[] = [
  { stage: 1, rows: 3, cols: 6, ballSpeed: 1.0, quizCount: 2, strongCount: 0, verseCount: 2 },
  { stage: 2, rows: 4, cols: 6, ballSpeed: 1.2, quizCount: 3, strongCount: 4, verseCount: 3 },
  { stage: 3, rows: 4, cols: 7, ballSpeed: 1.3, quizCount: 4, strongCount: 6, verseCount: 3 },
  { stage: 4, rows: 5, cols: 7, ballSpeed: 1.5, quizCount: 5, strongCount: 8, verseCount: 4 },
  { stage: 5, rows: 5, cols: 8, ballSpeed: 1.7, quizCount: 6, strongCount: 10, verseCount: 5 },
];
```

---

## 9. Sidebar Modification

### 9.1 변경 내용

```typescript
// Sidebar.tsx navItems 배열에서:
// 기존: { href: '/quiz', icon: <Gamepad2 size={20} />, label: '성경퀴즈', hideForParent: true },
// 변경: 성경퀴즈 유지 + 게임 메뉴 추가

// Trophy 아이콘 import 추가
import { ..., Trophy } from 'lucide-react';

// navItems에 추가 (성경퀴즈 아래):
{ href: '/games', icon: <Trophy size={20} />, label: '게임', hideForParent: true },
```

---

## 10. Security & Anti-Abuse

### 10.1 보상 어뷰징 방지

- 서버에서 일일 보상 횟수 확인 (Talent 테이블 조회)
- 하루 최대 3회 보상 (24시간 기준이 아닌 날짜 기준)
- 점수 검증: stageCleared는 1~5, quizCorrect <= quizTotal

### 10.2 입력 검증

```typescript
// POST /api/games/brick-breaker/reward
if (!studentId || typeof score !== 'number') → 400
if (stageCleared < 1 || stageCleared > 5) → 400
if (quizCorrect > quizTotal) → 400
```

---

## 11. Implementation Order

### 11.1 구현 순서

1. [ ] **타입 정의** (`_lib/types.ts`)
   - Brick, Ball, Paddle, GameState, QuizData 인터페이스

2. [ ] **스테이지 데이터** (`_lib/stages.ts`)
   - 5개 스테이지 구성, 벽돌 배치 생성 함수

3. [ ] **게임 엔진** (`_lib/gameEngine.ts`)
   - 게임 루프, 충돌 감지, 공/패들 물리, 렌더링

4. [ ] **게임 컴포넌트** (`_components/BrickBreakerGame.tsx`)
   - Canvas 초기화, 입력 처리, 게임 엔진 연결

5. [ ] **퀴즈 모달** (`_components/QuizModal.tsx`)
   - 4지선다 UI, 정답/오답 표시, 계속하기

6. [ ] **게임 오버 모달** (`_components/GameOverModal.tsx`)
   - 결과 표시, 보상 요청, 다시하기/목록으로

7. [ ] **게임 페이지** (`games/brick-breaker/page.tsx`)
   - 퀴즈 데이터 로드, BrickBreakerGame 렌더

8. [ ] **게임 목록 페이지** (`games/page.tsx`)
   - 게임 카드 UI, 벽돌깨기 + Coming Soon

9. [ ] **보상 API** (`api/games/brick-breaker/reward/route.ts`)
   - 보상 계산, 일일 제한, 달란트 지급

10. [ ] **사이드바 수정** (`Sidebar.tsx`)
    - "게임" 메뉴 항목 추가

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-16 | Initial draft | AI Assistant |
