# David's Sling Design Document

> **Summary**: 다윗의 물맷돌 액션 슈팅 게임 상세 기술 설계
>
> **Project**: 다니엘 - 동은교회 초등부 출석부
> **Author**: AI Assistant
> **Date**: 2026-02-16
> **Status**: Draft
> **Planning Doc**: [davids-sling.plan.md](../../01-plan/features/davids-sling.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- HTML5 Canvas 기반 60fps 액션 슈팅 게임 엔진
- 마우스/터치 드래그 기반 물맷돌 발사 메커니즘 (새총 방식)
- 골리앗 보스 AI (약점 시스템 + 4종 공격 패턴)
- 믿음 게이지 시스템 (슬로우 모션 특수 모드)
- 5단계 스테이지 + 성경 말씀/퀴즈 연동
- 달란트 보상 시스템 통합 (기존 패턴 동일)
- 모바일 세로 화면 최적화 (400 x 600px)

### 1.2 Design Principles

- Client-side 게임 로직 (Canvas + React hooks) — 기존 noahs-ark 패턴 동일
- Server-side 보상 처리 (교사/관리자 인증, 일일 제한)
- 외부 게임 라이브러리 미사용 (순수 Canvas API)
- 기존 `_lib/` + `_components/` 폴더 구조 유지

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Client)                                       │
│  ┌──────────────┐  ┌────────────────────────────────┐   │
│  │  Games List  │  │  David's Sling Game             │   │
│  │  /games      │  │  /games/davids-sling            │   │
│  │  page.tsx    │  │  ┌──────────────────────────┐   │   │
│  └──────────────┘  │  │  DavidsSlingGame.tsx      │   │   │
│                    │  │  (Canvas + Game Loop)      │   │   │
│                    │  ├──────────────────────────┤   │   │
│                    │  │  QuizModal.tsx             │   │   │
│                    │  │  StageClearModal.tsx        │   │   │
│                    │  │  GameOverModal.tsx          │   │   │
│                    │  └──────────────────────────┘   │   │
│                    └────────────────────────────────┘   │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  POST /api/games/davids-sling/   │
│       reward                     │
│  (달란트 보상 지급)                │
└──────────────┬───────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────┐
│  PostgreSQL (RDS)                                      │
│  - Student (talentBalance)                             │
│  - Talent (거래 기록, type: 'game')                     │
└───────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. 게임 시작
   User → /games → "다윗의 물맷돌" 클릭 → /games/davids-sling
   → page.tsx (서버): 학생 목록 로드
   → DavidsSlingWrapper: 학생 선택 UI
   → DavidsSlingGame: Canvas 초기화, Stage 1 시작

2. 게임 플레이 (프레임마다)
   Game Loop (requestAnimationFrame):
   a. Input 처리: 드래그 상태 업데이트, 다윗 이동
   b. Update:
      - 골리앗 공격 패턴 실행 (장애물 생성)
      - 장애물 이동
      - 물맷돌 이동
      - 기도 아이템 이동
      - 충돌 감지 (다윗↔장애물, 물맷돌↔골리앗약점, 다윗↔기도아이템)
      - 믿음 게이지 업데이트
      - 골리앗 약점 개폐 주기 업데이트
   c. Render: Canvas에 모든 오브젝트 그리기

3. 스테이지 클리어
   골리앗 HP → 0 → status='stage-clear'
   → StageClearModal (성경 말씀 표시)
   → Stage 3,5일 때: QuizModal 먼저 표시
   → 다음 스테이지 시작 / Stage 5 클리어 시 status='all-clear'

4. 게임 오버
   다윗 HP → 0 → status='game-over'
   → GameOverModal (점수, 스테이지, 퀴즈 결과)
   → 학생 선택 시: 보상 받기 버튼 → POST /api/games/davids-sling/reward

5. 보상 지급
   POST /api/games/davids-sling/reward
   → 교사/관리자 인증 확인
   → 학생 존재 확인
   → 일일 3회 제한 확인
   → 보상 계산 (스테이지 + 퀴즈 보너스)
   → Talent 생성 + Student.talentBalance 증가 (트랜잭션)
```

---

## 3. Detailed Design

### 3.1 Type Definitions (`_lib/types.ts`)

```typescript
// 게임 상태
export type GameStatus =
  | 'ready'        // 시작 대기
  | 'playing'      // 플레이 중
  | 'paused'       // 일시정지
  | 'quiz'         // 퀴즈 모달
  | 'stage-clear'  // 스테이지 클리어
  | 'game-over'    // 게임 오버
  | 'all-clear';   // 전체 클리어

// 다윗 (플레이어)
export interface David {
  x: number;       // 중심 X (캔버스 좌표)
  y: number;       // 중심 Y (고정, 하단)
  width: number;   // 30px
  height: number;  // 40px
  hp: number;      // 0~3
  maxHp: number;   // 3
  invincible: boolean;    // 피격 후 무적 (1.5초)
  invincibleTimer: number;
}

// 물맷돌 (발사체)
export interface Sling {
  x: number;
  y: number;
  vx: number;      // X 속도
  vy: number;      // Y 속도
  radius: number;  // 6px
  active: boolean;
}

// 드래그 상태
export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// 골리앗 (보스)
export interface Goliath {
  x: number;       // 중심 X
  y: number;       // 중심 Y (상단)
  width: number;   // 120px
  height: number;  // 100px
  hp: number;
  maxHp: number;
  weakPoints: WeakPoint[];
  attackTimer: number;
  attackPattern: number;  // 현재 패턴 인덱스
}

// 약점 부위
export interface WeakPoint {
  id: 'forehead' | 'left-arm' | 'right-arm';
  offsetX: number;  // 골리앗 중심으로부터의 오프셋
  offsetY: number;
  width: number;    // 히트박스 크기
  height: number;
  isOpen: boolean;  // 현재 열려있는지
  openTimer: number;
  openDuration: number;   // 열려있는 시간 (ms)
  closeDuration: number;  // 닫혀있는 시간 (ms)
  damage: number;   // 맞았을 때 데미지 (이마=2, 팔=1)
  label: string;    // '이마', '왼팔', '오른팔'
}

// 장애물 (골리앗이 던지는 것)
export type ObstacleType = 'rock' | 'spear' | 'tracking-rock';

export interface Obstacle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;  // rock: 8, spear: 5, tracking: 10
  type: ObstacleType;
  active: boolean;
}

// 기도 아이템
export interface PrayerItem {
  x: number;
  y: number;
  vy: number;      // 낙하 속도
  radius: number;  // 12px
  active: boolean;
}

// 믿음 게이지
export interface FaithGauge {
  value: number;     // 0~100
  isActive: boolean; // "정확한 조준" 모드 활성화 중
  activeTimer: number; // 활성 남은 시간 (3초)
}

// 메인 게임 상태
export interface GameState {
  david: David;
  goliath: Goliath;
  slings: Sling[];
  obstacles: Obstacle[];
  prayerItems: PrayerItem[];
  faithGauge: FaithGauge;
  dragState: DragState;
  stage: number;          // 1~5
  score: number;
  status: GameStatus;
  slingCooldown: number;  // 발사 쿨다운 (ms)
  quizCorrect: number;
  quizTotal: number;
  slowMotion: boolean;    // 슬로우 모션 중
  prayerSpawnTimer: number; // 기도 아이템 생성 타이머
}

// 스테이지 설정
export interface StageConfig {
  stage: number;
  goliathHp: number;
  attackInterval: number;     // 공격 간격 (ms)
  attackPatterns: number[];   // 사용 가능한 패턴 (1,2,3)
  obstacleSpeed: number;      // 장애물 기본 속도
  weakPointOpenDuration: number;   // 약점 열림 시간 (ms)
  weakPointCloseDuration: number;  // 약점 닫힘 시간 (ms)
  prayerInterval: number;    // 기도 아이템 생성 간격 (ms)
  verse: string;
  verseRef: string;
}

// 퀴즈
export interface DavidQuiz {
  id: number;
  question: string;
  options: [string, string, string, string];
  answer: number;   // 1~4
  reference: string;
}

// 보상 결과
export interface RewardResult {
  success: boolean;
  reward: {
    talentEarned: number;
    breakdown: {
      stageClear: number;
      quizBonus: number;
    };
  };
  newBalance: number;
}
```

### 3.2 Stage Configuration (`_lib/stages.ts`)

```typescript
export const STAGES: StageConfig[] = [
  {
    stage: 1,
    goliathHp: 6,
    attackInterval: 2500,
    attackPatterns: [1],           // 직선 돌만
    obstacleSpeed: 2,
    weakPointOpenDuration: 3000,
    weakPointCloseDuration: 2000,
    prayerInterval: 8000,
    verse: '여호와는 나의 목자시니 내게 부족함이 없으리로다',
    verseRef: '시편 23:1',
  },
  {
    stage: 2,
    goliathHp: 10,
    attackInterval: 2000,
    attackPatterns: [1, 2],        // 직선 돌 + 부채꼴 창
    obstacleSpeed: 2.5,
    weakPointOpenDuration: 2500,
    weakPointCloseDuration: 2500,
    prayerInterval: 10000,
    verse: '네가 칼과 창과 단창으로 내게 나아오거니와 나는 만군의 여호와의 이름으로 네게 나아가노라',
    verseRef: '사무엘상 17:45',
  },
  {
    stage: 3,
    goliathHp: 14,
    attackInterval: 1800,
    attackPatterns: [1, 2, 3],     // + 추적 돌
    obstacleSpeed: 3,
    weakPointOpenDuration: 2000,
    weakPointCloseDuration: 3000,
    prayerInterval: 12000,
    verse: '다윗이 블레셋 사람에게 이르되 너는 칼과 창과 단창으로 내게 나아오거니와',
    verseRef: '사무엘상 17:45',
  },
  {
    stage: 4,
    goliathHp: 18,
    attackInterval: 1500,
    attackPatterns: [1, 2, 3],     // 복합 패턴
    obstacleSpeed: 3.5,
    weakPointOpenDuration: 1800,
    weakPointCloseDuration: 3500,
    prayerInterval: 14000,
    verse: '전쟁의 승패는 여호와께 있으므로 그가 너희를 우리 손에 넘기시리라',
    verseRef: '사무엘상 17:47',
  },
  {
    stage: 5,
    goliathHp: 24,
    attackInterval: 1200,
    attackPatterns: [1, 2, 3],     // 최종 (빠른 복합)
    obstacleSpeed: 4,
    weakPointOpenDuration: 1500,
    weakPointCloseDuration: 4000,
    prayerInterval: 16000,
    verse: '다윗이 블레셋 사람을 이기니라. 다윗의 손에는 칼이 없었으나 물맷돌로 블레셋 사람을 쳐서 이기니라',
    verseRef: '사무엘상 17:50',
  },
];
```

### 3.3 Quiz Data (`_lib/quizData.ts`)

```typescript
export const DAVID_QUIZZES: DavidQuiz[] = [
  {
    id: 1,
    question: '다윗은 골리앗을 무엇으로 쓰러뜨렸나요?',
    options: ['칼', '물맷돌', '활', '창'],
    answer: 2,
    reference: '사무엘상 17:49',
  },
  {
    id: 2,
    question: '다윗의 아버지 이름은 무엇인가요?',
    options: ['야곱', '이새', '다니엘', '모세'],
    answer: 2,
    reference: '사무엘상 17:12',
  },
  {
    id: 3,
    question: '골리앗은 어느 나라 사람인가요?',
    options: ['이스라엘', '이집트', '블레셋', '바벨론'],
    answer: 3,
    reference: '사무엘상 17:4',
  },
  {
    id: 4,
    question: '다윗이 골리앗과 싸우기 전에 무엇을 돌보았나요?',
    options: ['양', '소', '말', '닭'],
    answer: 1,
    reference: '사무엘상 17:15',
  },
  {
    id: 5,
    question: '골리앗의 키는 대략 몇 규빗이었나요?',
    options: ['3규빗', '4규빗', '6규빗', '10규빗'],
    answer: 3,
    reference: '사무엘상 17:4',
  },
  {
    id: 6,
    question: '다윗은 시냇가에서 돌을 몇 개 골랐나요?',
    options: ['3개', '5개', '7개', '12개'],
    answer: 2,
    reference: '사무엘상 17:40',
  },
  {
    id: 7,
    question: '당시 이스라엘의 왕은 누구였나요?',
    options: ['사울', '솔로몬', '다윗', '아합'],
    answer: 1,
    reference: '사무엘상 17:31',
  },
  {
    id: 8,
    question: '다윗이 신뢰한 것은 무엇이었나요?',
    options: ['자신의 힘', '좋은 무기', '하나님', '군대의 수'],
    answer: 3,
    reference: '사무엘상 17:45',
  },
  // 퀴즈 2개 (Stage 3, 5 클리어 시 사용)
  // 나머지는 랜덤으로 선택
];
```

### 3.4 Game Engine (`_lib/gameEngine.ts`)

#### 3.4.1 Constants

```typescript
// Canvas 크기
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

// HUD 영역
export const HUD_HEIGHT = 50;      // HP, Score, Stage 표시
export const GAUGE_HEIGHT = 20;     // 믿음 게이지

// 다윗 설정
export const DAVID_WIDTH = 30;
export const DAVID_HEIGHT = 40;
export const DAVID_SPEED = 4;       // 이동 속도 (px/frame)
export const DAVID_Y = CANVAS_HEIGHT - 80; // 고정 Y 위치
export const INVINCIBLE_DURATION = 1500; // 피격 후 무적 시간 (ms)

// 골리앗 설정
export const GOLIATH_WIDTH = 120;
export const GOLIATH_HEIGHT = 100;
export const GOLIATH_Y = HUD_HEIGHT + GAUGE_HEIGHT + 30;

// 물맷돌 설정
export const SLING_RADIUS = 6;
export const SLING_SPEED = 8;       // 기본 발사 속도
export const SLING_MAX_SPEED = 12;  // 최대 속도
export const SLING_COOLDOWN = 1000; // 발사 쿨다운 (ms)
export const MAX_DRAG_DISTANCE = 120; // 최대 드래그 거리

// 장애물 설정
export const ROCK_RADIUS = 8;
export const SPEAR_RADIUS = 5;
export const TRACKING_ROCK_RADIUS = 10;
export const TRACKING_SPEED = 1.5;  // 추적 속도

// 기도 아이템
export const PRAYER_RADIUS = 12;
export const PRAYER_FALL_SPEED = 1.5;
export const PRAYER_FAITH_AMOUNT = 30; // 획득 시 믿음 게이지 증가량

// 믿음 게이지
export const FAITH_DODGE_AMOUNT = 2;    // 장애물 회피 시 증가량
export const FAITH_MAX = 100;
export const FAITH_ACTIVE_DURATION = 3000; // "정확한 조준" 지속 시간 (ms)
export const SLOW_MOTION_FACTOR = 0.3;    // 슬로우 모션 배율
```

#### 3.4.2 Core Functions

```typescript
/** 초기 게임 상태 생성 */
export function createInitialState(stageNum: number): GameState;

/** 다윗 이동 (터치/키보드 입력 기반) */
export function moveDavid(david: David, direction: number): void;
// direction: -1 (왼쪽), 0 (정지), 1 (오른쪽)
// 화면 경계 클램핑 포함

/** 물맷돌 발사 (드래그 release 시) */
export function fireSling(state: GameState): Sling | null;
// dragState에서 방향/세기 계산
// 반대 방향으로 발사 (새총 방식)
// 쿨다운 체크

/** 드래그로부터 발사 벡터 계산 */
export function calculateSlingVector(drag: DragState): { vx: number; vy: number; power: number };
// power = clamp(distance / MAX_DRAG_DISTANCE, 0, 1)
// direction = -(drag.current - drag.start) 정규화 * power * SLING_SPEED

/** 골리앗 공격 실행 */
export function executeGoliathAttack(goliath: Goliath, stage: StageConfig, davidX: number): Obstacle[];
// 패턴 1 (직선 돌): goliath 위치에서 david 방향으로 직선 발사
// 패턴 2 (부채꼴 창): 3방향 동시 발사 (-20도, 0도, +20도)
// 패턴 3 (추적 돌): david를 느리게 따라가는 돌

/** 물맷돌-약점 충돌 감지 */
export function checkSlingWeakPointCollision(sling: Sling, goliath: Goliath): WeakPoint | null;
// 원형(물맷돌) vs 사각형(약점) 충돌
// 약점이 open 상태일 때만 히트

/** 장애물-다윗 충돌 감지 */
export function checkObstacleDavidCollision(obstacle: Obstacle, david: David): boolean;
// 원형(장애물) vs 사각형(다윗) 충돌
// 무적 상태일 때는 false

/** 기도 아이템-다윗 충돌 감지 */
export function checkPrayerDavidCollision(prayer: PrayerItem, david: David): boolean;

/** 약점 개폐 주기 업데이트 */
export function updateWeakPoints(goliath: Goliath, deltaTime: number, faithActive: boolean): void;
// faithActive일 때 모든 약점 항상 open

/** 기도 아이템 생성 */
export function spawnPrayerItem(): PrayerItem;
// 랜덤 X 위치, 화면 상단에서 시작

/** 믿음 게이지 활성화 체크 */
export function activateFaithMode(gauge: FaithGauge): void;
// value >= 100이면 isActive = true, activeTimer 시작

/** 프레임 업데이트 (메인 틱) */
export function updateFrame(state: GameState, deltaTime: number, stageConfig: StageConfig): void;
// 모든 오브젝트 위치 업데이트
// 충돌 감지 및 처리
// 화면 밖 오브젝트 제거
// 골리앗 공격 타이머
// 기도 아이템 스폰 타이머
// 스테이지 클리어/게임오버 체크
```

### 3.5 Renderer (`_lib/renderer.ts`)

#### 3.5.1 Layout

```typescript
export interface Layout {
  canvasW: number;  // 400
  canvasH: number;  // 600
}

/** 메인 렌더 함수 */
export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  stageConfig: StageConfig,
): void;
```

#### 3.5.2 Render Order (뒤에서 앞으로)

```
1. drawBackground()        — 전장 배경 (하늘 + 땅)
2. drawGoliath()           — 골리앗 본체 + HP 바
3. drawWeakPoints()        — 약점 부위 (열림/닫힘 + 빛남 효과)
4. drawObstacles()         — 장애물 (돌/창/추적돌)
5. drawPrayerItems()       — 기도 아이템 (빛나는 효과)
6. drawSlings()            — 물맷돌 (궤적 포함)
7. drawDavid()             — 다윗 (무적 시 깜빡임)
8. drawDragGuide()         — 드래그 중 궤적 가이드라인 (점선)
9. drawHUD()               — HP 하트, 점수, 스테이지
10. drawFaithGauge()       — 믿음 게이지 바
11. drawCooldownIndicator() — 발사 쿨다운 표시
```

#### 3.5.3 Visual Design

```
배경: 이스라엘 들판 (하늘색 → 연녹색 그라데이션)
골리앗: 진한 갈색 갑옷, 화난 표정 (이모지 + Canvas 도형)
다윗: 파란색 옷, 물맷돌 들고 있는 모습
약점 (open): 노란색 빛남 효과 (stroke + glow)
약점 (closed): 회색 갑옷 표시
물맷돌: 회색 원형 + 궤적 잔상
장애물 (돌): 갈색 원
장애물 (창): 빨간 긴 삼각형
장애물 (추적돌): 보라색 원 + 빛남
기도 아이템: 금색 빛 + 십자가 표시
HP: 빨간 하트 ❤️ (최대 3개)
믿음 게이지: 노란색 바 (활성 시 금색 빛남)
```

### 3.6 Main Game Component (`_components/DavidsSlingGame.tsx`)

```typescript
interface Props {
  studentId?: string;
}

// React 컴포넌트 구조 (기존 NoahsArkGame.tsx 패턴)
export default function DavidsSlingGame({ studentId }: Props) {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(...);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // State (React)
  const [status, setStatus] = useState<GameStatus>('ready');
  const [currentQuiz, setCurrentQuiz] = useState<DavidQuiz | null>(null);
  const [stageResult, setStageResult] = useState<{...} | null>(null);
  const [gameResult, setGameResult] = useState<{...} | null>(null);

  // 게임 루프
  useEffect(() => {
    const loop = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (stateRef.current.status === 'playing') {
        const effectiveDelta = stateRef.current.slowMotion
          ? deltaTime * SLOW_MOTION_FACTOR
          : deltaTime;
        updateFrame(stateRef.current, effectiveDelta, currentStageConfig);
        // 상태 변경 감지 → React state 동기화
      }

      drawGame(ctx, stateRef.current, currentStageConfig);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [stage]);

  // 이벤트 핸들러
  // - onMouseDown / onTouchStart: 드래그 시작
  // - onMouseMove / onTouchMove: 드래그 업데이트
  // - onMouseUp / onTouchEnd: 물맷돌 발사
  // - onKeyDown: 좌/우 이동, P: 일시정지

  return (
    <div className="relative" style={{ maxWidth: 400 }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        className="w-full border-2 border-slate-200 rounded-xl touch-none"
        style={{ maxWidth: 400 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 모달들 */}
      {status === 'quiz' && currentQuiz && (
        <QuizModal quiz={currentQuiz} onAnswer={handleQuizAnswer} />
      )}
      {status === 'stage-clear' && stageResult && (
        <StageClearModal {...stageResult} onNext={handleNextStage} />
      )}
      {(status === 'game-over' || status === 'all-clear') && gameResult && (
        <GameOverModal {...gameResult} studentId={studentId} onRestart={handleRestart} />
      )}
    </div>
  );
}
```

### 3.7 Input Handling (드래그 발사 메커니즘)

```
Mouse/Touch Flow:
┌──────────────────────────────────────────────┐
│                                              │
│  1. pointerdown (다윗 근처)                   │
│     → dragState.isDragging = true             │
│     → dragState.startX/Y = pointer 위치       │
│                                              │
│  2. pointermove                               │
│     → dragState.currentX/Y = pointer 위치     │
│     → 궤적 가이드라인 실시간 렌더              │
│     → 드래그 방향 반대 = 발사 방향              │
│     → 드래그 거리 = 발사 세기                  │
│                                              │
│  3. pointerup                                │
│     → fireSling() 호출                        │
│     → 쿨다운 시작 (1초)                        │
│     → dragState 리셋                          │
│                                              │
└──────────────────────────────────────────────┘

가이드라인 렌더:
- 다윗 위치에서 발사 방향으로 점선 5개
- 드래그 세기에 따라 점선 길이 변화
- 색상: 세기 약 → 흰색, 강 → 노란색
```

### 3.8 Collision Detection

```
충돌 유형:

1. 물맷돌 ↔ 골리앗 약점 (원 vs 사각형)
   - 약점이 open 상태일 때만 히트
   - 이마 히트: 데미지 2, 점수 200
   - 팔 히트: 데미지 1, 점수 100
   - 약점 closed: 물맷돌 소멸 (튕겨남 효과)

2. 장애물 ↔ 다윗 (원 vs 사각형)
   - 무적 상태 아닐 때: HP -1, 무적 1.5초
   - 믿음 게이지 리셋 없음 (피격 패널티는 HP만)

3. 기도 아이템 ↔ 다윗 (원 vs 사각형)
   - 믿음 게이지 +30
   - 아이템 소멸

4. 물맷돌 ↔ 장애물 (원 vs 원) [선택 구현]
   - 물맷돌이 장애물 파괴 가능 (점수 50)
```

### 3.9 Goliath Attack Patterns

```
패턴 1: 직선 돌 던지기
- 골리앗 위치에서 다윗 방향으로 1개 발사
- 속도: obstacleSpeed × 1.0
- 예측 가능 (직선)

패턴 2: 부채꼴 창 던지기
- 다윗 방향 기준 -20°, 0°, +20° 3개 발사
- 속도: obstacleSpeed × 1.2
- 창 모양 (긴 삼각형)

패턴 3: 추적 돌
- 골리앗 위치에서 1개 발사
- 매 프레임 다윗 방향으로 약간 회전 (TRACKING_SPEED)
- 속도: obstacleSpeed × 0.6 (느림)
- 5초 후 소멸

공격 주기:
- attackTimer가 attackInterval 도달 시 패턴 선택
- 사용 가능한 패턴 중 랜덤 선택
- Stage 4,5에서는 연속 공격 (2개 패턴 빠르게)
```

### 3.10 Faith Gauge System

```
게이지 증가:
- 장애물이 화면 밖으로 나감 (다윗이 피함): +2
- 기도 아이템 획득: +30
- 약점 명중: +5

"정확한 조준" 모드 (value >= 100):
1. faithGauge.isActive = true
2. 3초간 슬로우 모션 (모든 오브젝트 0.3배속)
3. 골리앗 약점 전부 open 유지
4. 드래그 가이드라인이 더 길고 정확하게 표시
5. 3초 후 게이지 0으로 리셋

시각 효과:
- 게이지 바: 일반 시 노란색, 활성 시 금색 빛남
- 슬로우 모션 중: 화면 주변 금색 빛 효과
```

---

## 4. API Design

### 4.1 Reward API (`/api/games/davids-sling/reward`)

```typescript
// POST /api/games/davids-sling/reward
// 기존 noahs-ark/reward와 동일한 패턴

Request Body:
{
  studentId: string;
  score: number;
  stageCleared: number;  // 1~5
  quizCorrect: number;
  quizTotal: number;
}

Response (200):
{
  success: true,
  reward: {
    talentEarned: number,  // 최대 7 (스테이지 5 + 퀴즈 2)
    breakdown: {
      stageClear: number,   // Stage1: +1, Stage3: +2, Stage5: +2 = 최대 5
      quizBonus: number,    // 퀴즈 전부 정답: +2
    }
  },
  newBalance: number
}

Response (401): { error: 'Unauthorized' }
Response (403): { error: 'Forbidden' }  // 학생 역할
Response (404): { error: '학생을 찾을 수 없습니다.' }
Response (429): { error: '오늘 보상 횟수를 초과했습니다. (하루 3회)' }

보상 계산 로직:
- stageCleared >= 1: +1
- stageCleared >= 3: +2
- stageCleared >= 5: +2
- quizCorrect === quizTotal && quizTotal > 0: +2

일일 제한:
- Talent 테이블에서 오늘 '다윗의 물맷돌' reason 카운트
- 3회 이상이면 429 반환
```

---

## 5. Component Specs

### 5.1 DavidsSlingWrapper.tsx

```
Props: { students: StudentOption[] }
State: selectedStudent (string)

구조:
- 학생 선택 드롭다운 (기존 NoahsArkWrapper 동일)
- DavidsSlingGame 컴포넌트 렌더
```

### 5.2 QuizModal.tsx

```
Props: { quiz: DavidQuiz; onAnswer: (correct: boolean) => void }

구조: 기존 noahs-ark QuizModal과 동일한 패턴
- 제목: "⚔️ 다윗과 골리앗 퀴즈!"
- 4지선다 버튼
- 정답 확인 후 계속하기 버튼
- 참조 성경 구절 표시
```

### 5.3 StageClearModal.tsx

```
Props: {
  stage: number;
  verse: string;
  verseRef: string;
  score: number;
  goliathHitsCount: number;
  onNext: () => void;
}

구조: 기존 noahs-ark StageClearModal 패턴
- 제목: "Stage N 클리어!"
- 성경 말씀 카드
- 점수, 명중 횟수 표시
- "다음 스테이지 →" 버튼
- Stage 5일 때: "골리앗을 무찔렀습니다!" 특별 메시지
```

### 5.4 GameOverModal.tsx

```
Props: {
  score: number;
  stageCleared: number;
  quizCorrect: number;
  quizTotal: number;
  isAllClear: boolean;
  studentId?: string;
  onRestart: () => void;
}

구조: 기존 noahs-ark GameOverModal 패턴
- 보상 받기 버튼 (studentId 있을 때)
- API 호출: POST /api/games/davids-sling/reward
- 보상 결과 표시
- 다시하기 / 목록으로 버튼
```

### 5.5 page.tsx (서버 컴포넌트)

```
기존 noahs-ark/page.tsx 패턴 동일:
- prisma.student.findMany() → 학생 목록 로드
- DavidsSlingWrapper에 전달
```

---

## 6. File Structure

```
src/app/(dashboard)/games/davids-sling/
  ├── page.tsx                    # 서버 컴포넌트
  ├── _lib/
  │   ├── types.ts               # 타입 정의 (§3.1)
  │   ├── stages.ts              # 스테이지 설정 (§3.2)
  │   ├── quizData.ts            # 퀴즈 데이터 (§3.3)
  │   ├── gameEngine.ts          # 게임 로직 (§3.4)
  │   └── renderer.ts            # Canvas 렌더링 (§3.5)
  ├── _components/
  │   ├── DavidsSlingWrapper.tsx  # 클라이언트 래퍼 (§5.1)
  │   ├── DavidsSlingGame.tsx     # 메인 게임 컴포넌트 (§3.6)
  │   ├── QuizModal.tsx          # 퀴즈 모달 (§5.2)
  │   ├── StageClearModal.tsx    # 스테이지 클리어 모달 (§5.3)
  │   └── GameOverModal.tsx      # 게임오버 모달 (§5.4)

src/app/api/games/davids-sling/
  └── reward/route.ts            # 달란트 보상 API (§4.1)

src/app/(dashboard)/games/
  └── page.tsx                   # 게임 목록에 다윗의 물맷돌 추가
```

---

## 7. Implementation Checklist

| # | Task | File | Dependencies |
|---|------|------|-------------|
| 1 | 타입 정의 | `_lib/types.ts` | - |
| 2 | 스테이지 설정 데이터 | `_lib/stages.ts` | types.ts |
| 3 | 퀴즈 데이터 | `_lib/quizData.ts` | types.ts |
| 4 | 게임 엔진 (상수, 초기화, 이동, 충돌, 공격 패턴) | `_lib/gameEngine.ts` | types.ts, stages.ts |
| 5 | Canvas 렌더러 (배경, 캐릭터, HUD, 게이지) | `_lib/renderer.ts` | types.ts, gameEngine.ts |
| 6 | 메인 게임 컴포넌트 (게임 루프, 입력 처리, 상태 관리) | `_components/DavidsSlingGame.tsx` | gameEngine.ts, renderer.ts |
| 7 | 퀴즈 모달 | `_components/QuizModal.tsx` | types.ts |
| 8 | 스테이지 클리어 모달 | `_components/StageClearModal.tsx` | - |
| 9 | 게임오버 모달 | `_components/GameOverModal.tsx` | types.ts |
| 10 | 클라이언트 래퍼 (학생 선택) | `_components/DavidsSlingWrapper.tsx` | DavidsSlingGame.tsx |
| 11 | 서버 페이지 (학생 로드) | `page.tsx` | DavidsSlingWrapper.tsx |
| 12 | 보상 API | `api/games/davids-sling/reward/route.ts` | prisma |
| 13 | 게임 목록 페이지에 추가 | `games/page.tsx` (수정) | - |
| 14 | 빌드 확인 | - | 전체 |

---

## 8. Out of Scope

- 멀티플레이어
- 커스텀 캐릭터/스킨
- 랭킹 시스템
- BGM/효과음
- 골리앗 이외의 추가 보스
- 물리 엔진 라이브러리

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-16 | Initial design | AI Assistant |
