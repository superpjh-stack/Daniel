// 블록 종류 (테트로미노 7종 + 퀴즈 특수)
export type BlockType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J' | 'Q';

export interface AnimalInfo {
  name: string;
  emoji: string;
  weight: number;
  color: string;
}

export type Rotation = 0 | 1 | 2 | 3;

export interface ActiveBlock {
  type: BlockType;
  rotation: Rotation;
  row: number;
  col: number;
  animal: AnimalInfo;
  isQuiz: boolean;
}

export interface BoardCell {
  animal: AnimalInfo;
  isQuiz: boolean;
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'quiz'
  | 'stage-clear' | 'game-over' | 'all-clear';

export interface GameState {
  board: (BoardCell | null)[][];
  activeBlock: ActiveBlock | null;
  nextBlockType: BlockType;
  stage: number;
  score: number;
  linesCleared: number;
  totalLines: number;
  status: GameStatus;
  tilt: number;
  quizCorrect: number;
  quizTotal: number;
  dropTimer: number;
  quizQueue: number[];
  blockCount: number;
}

export interface StageConfig {
  stage: number;
  targetLines: number;
  dropInterval: number;
  warningThreshold: number;
  gameoverThreshold: number;
  quizBlockCount: number;
  verse: string;
  verseRef: string;
  rainIntensity: number;
}

export interface NoahQuiz {
  id: number;
  question: string;
  options: [string, string, string, string];
  answer: number;
  reference: string;
}

export interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
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
