# Five Loaves & Two Fish Design Document

> **Summary**: 오병이어의 기적: 타이쿤 서빙 게임 상세 기술 설계
>
> **Project**: 다니엘 - 동은교회 초등부 출석부
> **Author**: AI Assistant
> **Date**: 2026-02-17
> **Status**: Draft
> **Planning Doc**: [five-loaves-two-fish.plan.md](../../01-plan/features/five-loaves-two-fish.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- HTML5 Canvas 기반 60fps 타이쿤(서빙) 게임 엔진
- 터치/클릭 기반 고속 서빙 메커니즘 (군중에게 올바른 음식 전달)
- 제자 업그레이드 시스템 (5제자, 각 3단계)
- 기적 효과 시각화 (파티클, 증식 애니메이션, 기적 타임)
- 5단계 스테이지 + 성경 말씀/퀴즈 연동
- 달란트 보상 시스템 통합 (기존 패턴 동일)
- 모바일 세로 화면 최적화 (400 x 700px)

### 1.2 Design Principles

- Client-side 게임 로직 (Canvas + React hooks) — 기존 davids-sling 패턴 동일
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
│  │  Games List  │  │  Five Loaves Game               │   │
│  │  /games      │  │  /games/five-loaves             │   │
│  │  page.tsx    │  │  ┌──────────────────────────┐   │   │
│  └──────────────┘  │  │  FiveLoavesGame.tsx       │   │   │
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
│  POST /api/games/five-loaves/    │
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
   User → /games → "오병이어의 기적" 클릭 → /games/five-loaves
   → page.tsx (서버): 학생 목록 로드
   → FiveLoavesWrapper: 학생 선택 UI
   → FiveLoavesGame: Canvas 초기화, Stage 1 시작

2. 게임 플레이 (프레임마다)
   Game Loop (requestAnimationFrame):
   a. Input 처리: 클릭/터치 위치 확인
   b. Update:
      - 군중 이동 (줄별 좌→우/우→좌)
      - 군중 타임아웃 체크 (기다리다 떠남)
      - 서빙 애니메이션 업데이트
      - 기적 게이지 업데이트
      - 기적 타임 처리 (자동 서빙)
      - 파티클 업데이트
      - 스테이지 목표 달성 체크
   c. Render: Canvas에 모든 오브젝트 그리기

3. 서빙 처리
   플레이어 클릭 군중 → 군중의 요청 음식 확인
   → 바구니에서 음식 날아가는 애니메이션
   → 성공: 점수 + 기적 게이지 + 바구니 증식 이펙트
   → 실패(타임아웃): HP -1

4. 스테이지 클리어
   목표 인원 달성 → status='stage-clear'
   → StageClearModal (성경 말씀 + 업그레이드 선택)
   → Stage 3,5일 때: QuizModal 먼저 표시
   → 다음 스테이지 / Stage 5 클리어 시 status='all-clear'

5. 보상 지급
   POST /api/games/five-loaves/reward
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

// 음식 종류
export type FoodType = 'bread' | 'fish';

// 군중 (NPC)
export interface Crowd {
  id: number;
  x: number;           // 현재 X 위치
  y: number;           // 줄 Y 위치
  lane: number;        // 줄 번호 (0~2)
  direction: 1 | -1;   // 이동 방향 (1=우, -1=좌)
  speed: number;        // 이동 속도
  wantFood: FoodType;   // 원하는 음식
  patience: number;     // 남은 인내심 (ms)
  maxPatience: number;  // 최대 인내심
  width: number;        // 히트박스 크기 (44px)
  height: number;
  isChild: boolean;     // 아이 (보너스 점수)
  served: boolean;      // 서빙 완료 여부
  leaving: boolean;     // 떠나는 중
  emoji: string;        // 표시 이모지
}

// 바구니
export interface Basket {
  x: number;
  y: number;
  width: number;        // 120px
  height: number;       // 60px
}

// 서빙 애니메이션
export interface ServingAnimation {
  id: number;
  foodType: FoodType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;     // 0~1
  active: boolean;
}

// 파티클 (기적 이펙트)
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;         // 0~1
  color: string;
  size: number;
}

// 제자 ID
export type DiscipleId = 'peter' | 'andrew' | 'james' | 'john' | 'philip';

// 제자 업그레이드
export interface Disciple {
  id: DiscipleId;
  name: string;         // 한글 이름
  emoji: string;
  level: number;        // 0~3
  description: string;  // 효과 설명
  cost: number[];       // 레벨별 업그레이드 비용 [1→2, 2→3]
}

// 기적 게이지
export interface MiracleGauge {
  value: number;          // 0~100
  isActive: boolean;      // 기적 타임 활성화 중
  activeTimer: number;    // 남은 시간 (ms)
}

// 게임 이벤트 (사운드 연동)
export type GameEvent =
  | { type: 'serve-success'; isChild: boolean }
  | { type: 'serve-miss' }
  | { type: 'crowd-timeout' }
  | { type: 'miracle-activate' }
  | { type: 'miracle-deactivate' }
  | { type: 'upgrade-buy'; disciple: DiscipleId }
  | { type: 'basket-multiply' };

// 메인 게임 상태
export interface GameState {
  crowds: Crowd[];
  basket: Basket;
  servingAnims: ServingAnimation[];
  particles: Particle[];
  miracleGauge: MiracleGauge;
  disciples: Disciple[];
  hp: number;
  maxHp: number;          // 3
  stage: number;          // 1~5
  score: number;
  servedCount: number;    // 현재 스테이지 서빙 완료 수
  totalBread: number;     // 총 나눈 빵 수
  totalFish: number;      // 총 나눈 물고기 수
  comboCount: number;     // 연속 서빙 성공 수
  upgradePoints: number;  // 업그레이드 포인트
  status: GameStatus;
  crowdSpawnTimer: number;
  quizCorrect: number;
  quizTotal: number;
  pendingEvents: GameEvent[];
}

// 스테이지 설정
export interface StageConfig {
  stage: number;
  targetCount: number;     // 목표 서빙 인원
  lanes: number;           // 줄 개수 (1~3)
  crowdSpeed: number;      // 군중 이동 속도
  spawnInterval: number;   // 군중 생성 간격 (ms)
  patience: number;        // 군중 인내심 (ms)
  hasFish: boolean;        // 물고기 요청 포함 여부
  hasChild: boolean;       // 아이 군중 등장 여부
  hasComboRequest: boolean;// 빵+물고기 동시 요청
  verse: string;
  verseRef: string;
  upgradeReward: number;   // 클리어 시 업그레이드 포인트
}

// 퀴즈
export interface FishQuiz {
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
    targetCount: 15,
    lanes: 1,
    crowdSpeed: 0.5,
    spawnInterval: 2000,
    patience: 8000,
    hasFish: false,
    hasChild: false,
    hasComboRequest: false,
    verse: '예수께서 떡 다섯 개와 물고기 두 마리를 가지사 하늘을 우러러 축사하시고',
    verseRef: '마태복음 14:19',
    upgradeReward: 2,
  },
  {
    stage: 2,
    targetCount: 25,
    lanes: 1,
    crowdSpeed: 0.7,
    spawnInterval: 1800,
    patience: 7000,
    hasFish: true,
    hasChild: false,
    hasComboRequest: false,
    verse: '떼어 제자들에게 주시매 제자들이 무리에게 주니',
    verseRef: '마태복음 14:19',
    upgradeReward: 2,
  },
  {
    stage: 3,
    targetCount: 40,
    lanes: 2,
    crowdSpeed: 0.9,
    spawnInterval: 1500,
    patience: 6000,
    hasFish: true,
    hasChild: true,
    hasComboRequest: false,
    verse: '다 배불리 먹고 남은 조각을 열두 바구니에 차게 거두었으며',
    verseRef: '마태복음 14:20',
    upgradeReward: 3,
  },
  {
    stage: 4,
    targetCount: 60,
    lanes: 2,
    crowdSpeed: 1.1,
    spawnInterval: 1200,
    patience: 5500,
    hasFish: true,
    hasChild: true,
    hasComboRequest: true,
    verse: '먹은 사람은 여자와 아이 외에 오천 명이나 되었더라',
    verseRef: '마태복음 14:21',
    upgradeReward: 3,
  },
  {
    stage: 5,
    targetCount: 80,
    lanes: 3,
    crowdSpeed: 1.3,
    spawnInterval: 1000,
    patience: 5000,
    hasFish: true,
    hasChild: true,
    hasComboRequest: true,
    verse: '예수께서 이르시되 내가 곧 생명의 떡이니 내게 오는 자는 결코 주리지 아니할 것이요',
    verseRef: '요한복음 6:35',
    upgradeReward: 4,
  },
];
```

### 3.3 Quiz Data (`_lib/quizData.ts`)

```typescript
export const FISH_QUIZZES: FishQuiz[] = [
  {
    id: 1,
    question: '오병이어에서 빵과 물고기를 가져온 사람은 누구인가요?',
    options: ['베드로', '한 아이', '안드레', '빌립'],
    answer: 2,
    reference: '요한복음 6:9',
  },
  {
    id: 2,
    question: '예수님이 먹이신 사람은 몇 명이었나요?',
    options: ['3,000명', '5,000명', '7,000명', '10,000명'],
    answer: 2,
    reference: '마태복음 14:21',
  },
  {
    id: 3,
    question: '남은 음식을 담은 바구니는 몇 개였나요?',
    options: ['5개', '7개', '12개', '3개'],
    answer: 3,
    reference: '마태복음 14:20',
  },
  {
    id: 4,
    question: '오병이어의 기적이 일어난 곳은 어디인가요?',
    options: ['예루살렘', '빈 들', '바다 위', '성전 안'],
    answer: 2,
    reference: '마태복음 14:13',
  },
  {
    id: 5,
    question: '빵의 개수는 몇 개였나요?',
    options: ['3개', '5개', '7개', '12개'],
    answer: 2,
    reference: '마태복음 14:17',
  },
  {
    id: 6,
    question: '예수님은 음식을 나누기 전에 무엇을 하셨나요?',
    options: ['기도하셨다', '춤을 추셨다', '물을 마셨다', '잠을 주무셨다'],
    answer: 1,
    reference: '마태복음 14:19',
  },
  {
    id: 7,
    question: '물고기의 개수는 몇 마리였나요?',
    options: ['1마리', '2마리', '5마리', '7마리'],
    answer: 2,
    reference: '마태복음 14:17',
  },
  {
    id: 8,
    question: '예수님이 스스로를 무엇이라고 하셨나요?',
    options: ['생명의 물', '생명의 떡', '세상의 빛', '좋은 목자'],
    answer: 2,
    reference: '요한복음 6:35',
  },
];

export function getRandomQuiz(usedIds: number[]): FishQuiz {
  const available = FISH_QUIZZES.filter(q => !usedIds.includes(q.id));
  if (available.length === 0) {
    return FISH_QUIZZES[Math.floor(Math.random() * FISH_QUIZZES.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
```

### 3.4 Game Engine (`_lib/gameEngine.ts`)

#### 3.4.1 Constants

```typescript
// Canvas 크기
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 700;

// HUD 영역
export const HUD_HEIGHT = 60;       // HP, Score, Stage, 나눈 개수
export const GAUGE_HEIGHT = 20;     // 기적 게이지

// 군중 영역
export const CROWD_AREA_TOP = HUD_HEIGHT + GAUGE_HEIGHT + 10;
export const CROWD_AREA_BOTTOM = 450;
export const LANE_HEIGHT = 70;      // 줄 간격

// 군중 설정
export const CROWD_WIDTH = 44;      // 터치 타겟 최소 크기
export const CROWD_HEIGHT = 50;
export const CROWD_EMOJIS = ['😊', '😃', '🙂', '😄', '🤗'];
export const CHILD_EMOJIS = ['👧', '👦', '🧒'];

// 바구니 설정
export const BASKET_WIDTH = 120;
export const BASKET_HEIGHT = 60;
export const BASKET_Y = CANVAS_HEIGHT - 120;

// 서빙 애니메이션
export const SERVING_DURATION = 400; // ms
export const SERVING_ARC_HEIGHT = 80; // 포물선 높이

// 기적 게이지
export const MIRACLE_MAX = 100;
export const MIRACLE_PER_SERVE = 5;      // 서빙 성공당 증가
export const MIRACLE_PER_COMBO = 2;      // 콤보 추가 보너스
export const MIRACLE_ACTIVE_DURATION = 5000; // 기적 타임 지속 (ms)

// 점수
export const SCORE_SERVE = 100;          // 일반 서빙
export const SCORE_CHILD = 150;          // 아이 서빙 보너스
export const SCORE_COMBO_MULT = 10;      // 콤보 보너스 (combo * 10)
export const SCORE_MIRACLE_MULT = 2;     // 기적 타임 점수 배율

// 파티클
export const MAX_PARTICLES = 50;
export const PARTICLE_COLORS = ['#FFD700', '#FFA500', '#FFE4B5', '#FFFACD'];

// 제자 업그레이드
export const DISCIPLE_DEFAULTS: Disciple[] = [
  {
    id: 'peter',
    name: '베드로',
    emoji: '🧔',
    level: 0,
    description: '서빙 범위 증가 (클릭 판정 +10px/레벨)',
    cost: [2, 3, 5],
  },
  {
    id: 'andrew',
    name: '안드레',
    emoji: '👨',
    level: 0,
    description: '군중 인내심 +1.5초/레벨',
    cost: [2, 3, 5],
  },
  {
    id: 'james',
    name: '야고보',
    emoji: '👱',
    level: 0,
    description: '기적 게이지 충전 +20%/레벨',
    cost: [2, 4, 6],
  },
  {
    id: 'john',
    name: '요한',
    emoji: '👦',
    level: 0,
    description: '기적 타임 +1.5초/레벨',
    cost: [3, 4, 6],
  },
  {
    id: 'philip',
    name: '빌립',
    emoji: '🧑',
    level: 0,
    description: '자동 서빙 (4초→3초→2초 간격)',
    cost: [3, 5, 7],
  },
];
```

#### 3.4.2 Core Functions

```typescript
/** 초기 게임 상태 생성 */
export function createInitialState(stageNum: number, disciples?: Disciple[]): GameState;

/** 군중 생성 */
export function spawnCrowd(stage: StageConfig, crowds: Crowd[], disciples: Disciple[]): Crowd;
// - 랜덤 줄(lane) 선택
// - 방향: 줄 번호에 따라 번갈아 (짝수=우, 홀수=좌)
// - 음식: hasFish이면 빵/물고기 랜덤, 아니면 빵만
// - 아이 확률: hasChild이면 20%
// - 안드레 업그레이드: patience += level * 1500

/** 서빙 처리 (군중 클릭 시) */
export function serveCrowd(state: GameState, crowdId: number): boolean;
// - 해당 군중의 wantFood 확인
// - served = true
// - 서빙 애니메이션 생성
// - 점수 계산 (기적 타임 시 2배)
// - 콤보 증가
// - 기적 게이지 증가 (야고보 업그레이드 반영)
// - 바구니 파티클 생성 (기적 이펙트)
// - 나눈 빵/물고기 카운터 증가

/** 군중 클릭 판정 */
export function findClickedCrowd(state: GameState, clickX: number, clickY: number): Crowd | null;
// - 베드로 업그레이드: 히트박스 += level * 10
// - served/leaving 제외
// - 가장 인내심 낮은 순으로 우선

/** 기적 게이지 활성화 */
export function activateMiracle(state: GameState): void;
// - isActive = true
// - activeTimer = MIRACLE_ACTIVE_DURATION + (요한 레벨 * 1500)
// - 자동 서빙 시작

/** 자동 서빙 (기적 타임 + 빌립 업그레이드) */
export function autoServe(state: GameState): void;
// - 기적 타임: 가장 급한 군중 자동 서빙
// - 빌립: level에 따라 주기적 자동 서빙 (4초/3초/2초)

/** 프레임 업데이트 (메인 틱) */
export function updateFrame(state: GameState, deltaTime: number, stageConfig: StageConfig): void;
// - 군중 이동
// - 군중 타임아웃 체크 → HP 감소, 콤보 리셋
// - 서빙 애니메이션 진행
// - 기적 게이지/타이머 업데이트
// - 빌립 자동 서빙 타이머
// - 파티클 업데이트
// - 군중 스폰 타이머
// - 스테이지 클리어 체크 (servedCount >= targetCount)
// - 게임오버 체크 (hp <= 0)

/** 제자 업그레이드 구매 */
export function buyUpgrade(state: GameState, discipleId: DiscipleId): boolean;
// - 비용 확인
// - upgradePoints 차감
// - level 증가
```

### 3.5 Renderer (`_lib/renderer.ts`)

#### 3.5.1 Render Order (뒤에서 앞으로)

```
1. drawBackground()        — 들판 배경 (하늘 + 풀밭)
2. drawLanes()             — 군중 이동 경로 (점선 표시)
3. drawCrowds()            — 군중 + 말풍선 (원하는 음식)
4. drawBasket()            — 바구니 + 음식 (빵/물고기 이모지)
5. drawServingAnims()      — 서빙 애니메이션 (음식 날아가기)
6. drawParticles()         — 기적 파티클 (황금빛)
7. drawHUD()               — HP, 점수, 스테이지, 콤보
8. drawCounters()          — 나눈 빵/물고기 카운터
9. drawMiracleGauge()      — 기적 게이지 바
10. drawDiscipleStatus()   — 활성 제자 표시 (소형)
11. drawMiracleOverlay()   — 기적 타임 오버레이 (황금빛)
12. drawComboText()        — 콤보 숫자 플로팅
```

#### 3.5.2 Visual Design

```
배경: 푸른 하늘 + 녹색 풀밭 그라데이션
군중: 이모지 캐릭터 (😊👧) + 말풍선 (🍞/🐟)
말풍선: 흰색 둥근 사각형 + 음식 이모지
인내심 바: 군중 아래 작은 바 (녹→노→빨)
바구니: 갈색 바구니 + 빵🍞/물고기🐟 이모지
기적 이펙트:
  - 서빙 시: 바구니에서 황금 파티클 상승
  - 증식: 바구니 음식 위에 ✨ + 크기 펄스
  - 기적 타임: 화면 테두리 금색 빛 + 배경 밝아짐
HP: 빨간 하트 ❤️ (최대 3개)
기적 게이지: 금색 바 (활성 시 빛남 + 펄스)
콤보: "x5 COMBO!" 텍스트 플로팅 (크기 펄스)
```

### 3.6 Main Game Component (`_components/FiveLoavesGame.tsx`)

```typescript
interface Props {
  studentId?: string;
}

export default function FiveLoavesGame({ studentId }: Props) {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(...);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // State (React)
  const [status, setStatus] = useState<GameStatus>('ready');
  const [currentQuiz, setCurrentQuiz] = useState<FishQuiz | null>(null);
  const [stageResult, setStageResult] = useState<{...} | null>(null);
  const [gameResult, setGameResult] = useState<{...} | null>(null);

  // 게임 루프
  useEffect(() => {
    const loop = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (stateRef.current.status === 'playing') {
        updateFrame(stateRef.current, deltaTime, currentStageConfig);
        // 이벤트 처리 → 사운드 재생
        processPendingEvents(stateRef.current);
        // 상태 변경 감지 → React state 동기화
      }

      drawGame(ctx, stateRef.current, currentStageConfig);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [stage]);

  // 이벤트 핸들러
  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    // 클릭 좌표 → Canvas 좌표 변환
    // findClickedCrowd() → serveCrowd()
  };

  return (
    <div className="relative" style={{ maxWidth: 400 }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={700}
        className="w-full border-2 border-slate-200 rounded-xl touch-none"
        style={{ maxWidth: 400 }}
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
      />

      {status === 'quiz' && currentQuiz && (
        <QuizModal quiz={currentQuiz} onAnswer={handleQuizAnswer} />
      )}
      {status === 'stage-clear' && stageResult && (
        <StageClearModal
          {...stageResult}
          disciples={stateRef.current.disciples}
          upgradePoints={stateRef.current.upgradePoints}
          onUpgrade={handleUpgrade}
          onNext={handleNextStage}
        />
      )}
      {(status === 'game-over' || status === 'all-clear') && gameResult && (
        <GameOverModal {...gameResult} studentId={studentId} onRestart={handleRestart} />
      )}
    </div>
  );
}
```

### 3.7 Serving Mechanism

```
터치/클릭 Flow:
┌──────────────────────────────────────────────┐
│                                              │
│  1. 플레이어가 군중을 터치/클릭               │
│     → findClickedCrowd(clickX, clickY)       │
│     → 베드로 레벨에 따라 판정 범위 확장       │
│                                              │
│  2. 군중 발견 시                               │
│     → serveCrowd(state, crowd.id)            │
│     → crowd.served = true                    │
│     → 서빙 애니메이션 생성 (바구니→군중)       │
│     → 포물선 경로 (베지어 곡선)               │
│                                              │
│  3. 애니메이션 완료                            │
│     → 점수 추가 (기적 타임 시 x2)             │
│     → 콤보 카운터 증가                        │
│     → 기적 게이지 증가                        │
│     → 바구니 기적 파티클 생성                 │
│     → servedCount++                          │
│     → totalBread++ 또는 totalFish++          │
│                                              │
│  4. 군중 미서빙 타임아웃                       │
│     → patience <= 0                          │
│     → 군중 실망 이모지 (😢) + 떠남 애니메이션  │
│     → HP -= 1                                │
│     → 콤보 리셋 (0)                           │
│                                              │
└──────────────────────────────────────────────┘
```

### 3.8 Miracle System

```
기적 게이지 증가:
- 서빙 성공: +5 (야고보 Lv1: +6, Lv2: +7, Lv3: +8)
- 콤보 보너스: +(combo * 2)
- 퀴즈 정답: +15

기적 타임 (gauge >= 100):
1. miracleGauge.isActive = true
2. 5초 지속 (요한 Lv1: 6.5초, Lv2: 8초, Lv3: 9.5초)
3. 효과:
   - 자동 서빙 (0.5초 간격으로 가장 급한 군중 자동 처리)
   - 점수 2배
   - 화면 황금빛 오버레이
   - 바구니에서 대형 파티클 분출
4. 종료 후 게이지 0으로 리셋

기적 시각 효과:
- 바구니: 황금빛 파티클 상승 (서빙마다)
- 증식: 바구니 음식 크기 펄스 (1.0→1.3→1.0, 0.3초)
- 기적 타임: 화면 테두리 금색 glow, 배경 밝기 +30%
- 카운터: "나눈 빵: 127개" 숫자 올라갈 때 크기 펄스
```

### 3.9 Disciple Upgrade System

```
업그레이드 포인트 획득:
- 스테이지 1 클리어: +2
- 스테이지 2 클리어: +2
- 스테이지 3 클리어: +3
- 스테이지 4 클리어: +3
- 스테이지 5 클리어: +4
- 퀴즈 정답: +1 보너스

업그레이드 효과:
┌──────────┬──────────────────────────────────────────┐
│ 제자     │ Lv0 → Lv1 → Lv2 → Lv3                   │
├──────────┼──────────────────────────────────────────┤
│ 베드로   │ - → 판정+10px → +20px → +30px           │
│ 안드레   │ - → 인내심+1.5s → +3s → +4.5s           │
│ 야고보   │ - → 게이지+20% → +40% → +60%            │
│ 요한     │ - → 기적+1.5s → +3s → +4.5s             │
│ 빌립     │ - → 자동4초 → 자동3초 → 자동2초          │
└──────────┴──────────────────────────────────────────┘

StageClearModal에서 업그레이드 선택 UI:
- 5제자 카드 표시 (이모지 + 이름 + 레벨 + 효과)
- 구매 가능한 제자만 활성화
- 포인트 부족 시 비활성
- "다음 스테이지 →" 버튼
```

---

## 4. API Design

### 4.1 Reward API (`/api/games/five-loaves/reward`)

```typescript
// POST /api/games/five-loaves/reward
// 기존 davids-sling/reward와 동일한 패턴

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
    talentEarned: number,  // 최대 7
    breakdown: {
      stageClear: number,   // Stage1: +1, Stage3: +2, Stage5: +2 = 최대 5
      quizBonus: number,    // 퀴즈 전부 정답: +2
    }
  },
  newBalance: number
}

Response (401): { error: 'Unauthorized' }
Response (403): { error: 'Forbidden' }
Response (404): { error: '학생을 찾을 수 없습니다.' }
Response (429): { error: '오늘 보상 횟수를 초과했습니다. (하루 3회)' }

보상 계산:
- stageCleared >= 1: +1
- stageCleared >= 3: +2
- stageCleared >= 5: +2
- quizCorrect === quizTotal && quizTotal > 0: +2

일일 제한:
- Talent 테이블에서 오늘 '오병이어' reason 카운트
- 3회 이상이면 429 반환
```

---

## 5. Component Specs

### 5.1 FiveLoavesWrapper.tsx

```
Props: { students: StudentOption[] }
State: selectedStudent (string)

구조: 기존 DavidsSlingWrapper 동일
- 학생 선택 드롭다운
- FiveLoavesGame 컴포넌트 렌더
```

### 5.2 QuizModal.tsx

```
Props: { quiz: FishQuiz; onAnswer: (correct: boolean) => void }

구조: 기존 davids-sling QuizModal 동일 패턴
- 제목: "🍞 오병이어 퀴즈!"
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
  servedCount: number;
  disciples: Disciple[];
  upgradePoints: number;
  onUpgrade: (discipleId: DiscipleId) => void;
  onNext: () => void;
}

구조:
- 제목: "Stage N 클리어!"
- 성경 말씀 카드
- 점수, 서빙 인원 수 표시
- 제자 업그레이드 UI (5개 카드)
  - 이모지 + 이름 + 레벨 표시
  - 효과 설명
  - 비용 + 구매 버튼
- "다음 스테이지 →" 버튼
- Stage 5일 때: "5000명이 배불리 먹었습니다!" 특별 메시지
```

### 5.4 GameOverModal.tsx

```
Props: {
  score: number;
  stageCleared: number;
  quizCorrect: number;
  quizTotal: number;
  totalBread: number;
  totalFish: number;
  isAllClear: boolean;
  studentId?: string;
  onRestart: () => void;
}

구조: 기존 davids-sling GameOverModal 패턴
- 나눈 빵/물고기 총 개수 표시
- 보상 받기 버튼 (studentId 있을 때)
- API 호출: POST /api/games/five-loaves/reward
- 보상 결과 표시
- 다시하기 / 목록으로 버튼
```

### 5.5 page.tsx (서버 컴포넌트)

```
기존 davids-sling/page.tsx 패턴 동일:
- prisma.student.findMany() → 학생 목록 로드
- FiveLoavesWrapper에 전달
```

---

## 6. Sound Design (soundEngine 확장)

```typescript
// === Five Loaves ===

playServeSuccess(isChild: boolean)
// 일반: 짧은 "띵" (C5 0.08s triangle)
// 아이: 높은 "띵띵" (E5→G5 0.06s each)

playServeMiss()
// 실망 효과: 하강 sweep (400→200 0.15s sine)

playCrowdTimeout()
// 슬픔: 저음 "뚜뚜" (200Hz 0.1s sawtooth x2)

playMiracleActivate()
// 신비로운 상승: sweep 400→1200 0.4s sine + 하모닉
// + 차임벨 효과 (고음 triangle)

playMiracleDeactivate()
// 페이드아웃: sweep 800→300 0.25s sine

playBasketMultiply()
// 증식 효과: 빠른 상승 아르페지오 (C5 E5 G5 0.04s each)

playUpgradeBuy()
// 레벨업: 상승 팡파레 (C5→E5→G5→C6 0.08s each, square)

playCombo(count: number)
// 콤보: 음 높이 = 400 + count * 50, 0.04s triangle
```

---

## 7. File Structure

```
src/app/(dashboard)/games/five-loaves/
  ├── page.tsx                       # 서버 컴포넌트 (§5.5)
  ├── _lib/
  │   ├── types.ts                   # 타입 정의 (§3.1)
  │   ├── stages.ts                  # 스테이지 설정 (§3.2)
  │   ├── quizData.ts                # 퀴즈 데이터 (§3.3)
  │   ├── gameEngine.ts              # 게임 로직 (§3.4)
  │   └── renderer.ts                # Canvas 렌더링 (§3.5)
  ├── _components/
  │   ├── FiveLoavesWrapper.tsx      # 클라이언트 래퍼 (§5.1)
  │   ├── FiveLoavesGame.tsx         # 메인 게임 컴포넌트 (§3.6)
  │   ├── QuizModal.tsx              # 퀴즈 모달 (§5.2)
  │   ├── StageClearModal.tsx        # 스테이지 클리어 + 업그레이드 (§5.3)
  │   └── GameOverModal.tsx          # 게임오버 모달 (§5.4)

src/app/api/games/five-loaves/
  └── reward/route.ts                # 달란트 보상 API (§4.1)

src/app/(dashboard)/games/
  ├── page.tsx                       # 게임 목록에 오병이어 추가
  └── _shared/
      └── soundEngine.ts             # 오병이어 효과음 추가 (§6)
```

---

## 8. Implementation Checklist

| # | Task | File | Dependencies |
|---|------|------|-------------|
| 1 | 타입 정의 | `_lib/types.ts` | - |
| 2 | 스테이지 설정 데이터 | `_lib/stages.ts` | types.ts |
| 3 | 퀴즈 데이터 | `_lib/quizData.ts` | types.ts |
| 4 | 게임 엔진 (상수, 군중생성, 서빙, 기적, 업그레이드) | `_lib/gameEngine.ts` | types.ts, stages.ts |
| 5 | Canvas 렌더러 (배경, 군중, 바구니, 파티클, HUD) | `_lib/renderer.ts` | types.ts, gameEngine.ts |
| 6 | 메인 게임 컴포넌트 (게임 루프, 클릭 처리, 상태 관리) | `_components/FiveLoavesGame.tsx` | gameEngine.ts, renderer.ts |
| 7 | 퀴즈 모달 | `_components/QuizModal.tsx` | types.ts |
| 8 | 스테이지 클리어 + 업그레이드 모달 | `_components/StageClearModal.tsx` | types.ts |
| 9 | 게임오버 모달 | `_components/GameOverModal.tsx` | types.ts |
| 10 | 클라이언트 래퍼 (학생 선택) | `_components/FiveLoavesWrapper.tsx` | FiveLoavesGame.tsx |
| 11 | 서버 페이지 (학생 로드) | `page.tsx` | FiveLoavesWrapper.tsx |
| 12 | 보상 API | `api/games/five-loaves/reward/route.ts` | prisma |
| 13 | 효과음 추가 | `_shared/soundEngine.ts` (수정) | - |
| 14 | 게임 목록 페이지에 추가 | `games/page.tsx` (수정) | - |
| 15 | 빌드 확인 | - | 전체 |

---

## 9. Out of Scope

- 멀티플레이어
- 커스텀 캐릭터/스킨
- 랭킹 시스템
- 12제자 전체 (5명만 구현)
- 가로 모드 지원
- 물리 엔진 라이브러리

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-17 | Initial design | AI Assistant |
