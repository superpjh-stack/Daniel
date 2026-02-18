export type GameStatus =
  | 'ready'
  | 'playing'
  | 'paused'
  | 'quiz'
  | 'stage-clear'
  | 'game-over'
  | 'all-clear'
  | 'rescue'       // sheep found animation
  | 'returning';   // carrying sheep back

export type TileType =
  | 'wall'
  | 'path'
  | 'cliff'
  | 'bush'
  | 'rock'
  | 'water'
  | 'star'
  | 'sheep'
  | 'pen';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  col: number;
  row: number;
}

export interface Wolf {
  id: number;
  col: number;
  row: number;
  x: number;  // pixel position for smooth movement
  y: number;
  patrolPath: Position[];
  patrolIndex: number;
  patrolForward: boolean;
  state: 'patrol' | 'chase' | 'retreat';
  chaseTimer: number;
  speed: number;
  sightRange: number;
  direction: Direction;
  moveProgress: number;
}

export interface Shepherd {
  col: number;
  row: number;
  x: number;  // pixel for smooth movement
  y: number;
  direction: Direction;
  isMoving: boolean;
  moveProgress: number;
  carrySheep: boolean;
  staffCooldown: number;
  staffMaxCooldown: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export type GameEvent =
  | { type: 'wolf-spotted' }
  | { type: 'wolf-chase' }
  | { type: 'wolf-hit' }
  | { type: 'staff-use' }
  | { type: 'star-collect' }
  | { type: 'water-checkpoint' }
  | { type: 'sheep-found' }
  | { type: 'return-start' }
  | { type: 'stage-complete' }
  | { type: 'step' };

export interface GameState {
  maze: TileType[][];
  mazeWidth: number;
  mazeHeight: number;
  shepherd: Shepherd;
  wolves: Wolf[];
  particles: Particle[];
  stars: Position[];
  starsCollected: number;
  totalStars: number;
  checkpoints: Position[];
  lastCheckpoint: Position;
  sheepPos: Position;
  penPos: Position;
  hp: number;
  maxHp: number;
  stage: number;
  score: number;
  timeLeft: number;    // ms
  maxTime: number;     // ms
  status: GameStatus;
  rescueTimer: number; // rescue animation ms
  returnBrightness: number; // 0~1 for brightening effect
  quizCorrect: number;
  quizTotal: number;
  pendingEvents: GameEvent[];
  cameraX: number;
  cameraY: number;
  // cliff wind
  cliffWindTimer: number;
  cliffWindActive: boolean;
  // darkness (stage 4+)
  torchRadius: number;
  // guide line for return
  returnPath: Position[];
}

export interface StageConfig {
  stage: number;
  name: string;
  mazeIndex: number;
  timeLimit: number;     // seconds
  wolfCount: number;
  wolfSpeed: number;
  wolfSightRange: number;
  hasBush: boolean;
  hasCliff: boolean;
  hasRock: boolean;
  isDark: boolean;
  torchRadius: number;   // tiles visible in dark
  verse: string;
  verseRef: string;
}

export interface SheepQuiz {
  id: number;
  question: string;
  options: [string, string, string, string];
  answer: number;
  reference: string;
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
