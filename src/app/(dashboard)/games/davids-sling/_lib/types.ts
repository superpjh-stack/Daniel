export type GameStatus =
  | 'ready'
  | 'playing'
  | 'paused'
  | 'quiz'
  | 'stage-clear'
  | 'game-over'
  | 'all-clear';

export interface David {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  invincible: boolean;
  invincibleTimer: number;
}

export interface Sling {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface WeakPoint {
  id: 'forehead' | 'left-arm' | 'right-arm';
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  isOpen: boolean;
  openTimer: number;
  openDuration: number;
  closeDuration: number;
  damage: number;
  label: string;
}

export interface Goliath {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  weakPoints: WeakPoint[];
  attackTimer: number;
  attackPattern: number;
}

export type ObstacleType = 'rock' | 'spear' | 'tracking-rock';

export interface Obstacle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: ObstacleType;
  active: boolean;
  lifetime: number;
}

export interface PrayerItem {
  x: number;
  y: number;
  vy: number;
  radius: number;
  active: boolean;
}

export interface FaithGauge {
  value: number;
  isActive: boolean;
  activeTimer: number;
}

export type GameEvent =
  | { type: 'weakpoint-hit'; subtype: 'forehead' | 'arm' }
  | { type: 'body-bounce' }
  | { type: 'david-damage' }
  | { type: 'goliath-attack' }
  | { type: 'prayer-pickup' }
  | { type: 'faith-activate' }
  | { type: 'faith-deactivate' };

export interface GameState {
  david: David;
  goliath: Goliath;
  slings: Sling[];
  obstacles: Obstacle[];
  prayerItems: PrayerItem[];
  faithGauge: FaithGauge;
  dragState: DragState;
  stage: number;
  score: number;
  status: GameStatus;
  slingCooldown: number;
  quizCorrect: number;
  quizTotal: number;
  slowMotion: boolean;
  prayerSpawnTimer: number;
  pendingEvents: GameEvent[];
}

export interface StageConfig {
  stage: number;
  goliathHp: number;
  attackInterval: number;
  attackPatterns: number[];
  obstacleSpeed: number;
  weakPointOpenDuration: number;
  weakPointCloseDuration: number;
  prayerInterval: number;
  verse: string;
  verseRef: string;
}

export interface DavidQuiz {
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
