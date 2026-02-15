// 벽돌 타입
export type BrickType = 'normal' | 'strong' | 'quiz' | 'verse';

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  type: BrickType;
  hp: number;
  color: string;
  points: number;
  destroyed: boolean;
  quizIndex?: number;   // quiz 타입: quizzes 배열 인덱스
  verseText?: string;   // verse 타입: 표시할 구절
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
  speed: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'quiz' | 'stage-clear' | 'game-over' | 'all-clear';

export interface GameState {
  stage: number;
  score: number;
  lives: number;
  bricks: Brick[];
  ball: Ball;
  paddle: Paddle;
  status: GameStatus;
  quizCorrect: number;
  quizTotal: number;
}

export interface QuizData {
  id: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  category: string;
  reference?: string | null;
}

export interface QuizAnswer {
  id: string;
  answer: number;
}

export interface StageConfig {
  stage: number;
  rows: number;
  cols: number;
  ballSpeed: number;
  quizCount: number;
  strongCount: number;
  verseCount: number;
}

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
