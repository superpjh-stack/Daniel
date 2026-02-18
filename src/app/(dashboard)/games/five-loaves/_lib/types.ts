export type GameStatus =
  | 'ready'
  | 'playing'
  | 'paused'
  | 'quiz'
  | 'stage-clear'
  | 'game-over'
  | 'all-clear';

export type FoodType = 'bread' | 'fish';

export interface Crowd {
  id: number;
  x: number;
  y: number;
  lane: number;
  direction: 1 | -1;
  speed: number;
  wantFood: FoodType;
  isCombo: boolean;
  comboRemaining: number; // 2 = both needed, 1 = one delivered, 0 = done
  patience: number;
  maxPatience: number;
  width: number;
  height: number;
  isChild: boolean;
  served: boolean;
  leaving: boolean;
  emoji: string;
}

export interface Basket {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ServingAnimation {
  id: number;
  foodType: FoodType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  active: boolean;
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

export type DiscipleId = 'peter' | 'andrew' | 'james' | 'john' | 'philip';

export interface Disciple {
  id: DiscipleId;
  name: string;
  emoji: string;
  level: number;
  description: string;
  cost: number[];
}

export interface MiracleGauge {
  value: number;
  isActive: boolean;
  activeTimer: number;
}

export type GameEvent =
  | { type: 'serve-success'; isChild: boolean }
  | { type: 'serve-miss' }
  | { type: 'crowd-timeout' }
  | { type: 'miracle-activate' }
  | { type: 'miracle-deactivate' }
  | { type: 'upgrade-buy'; disciple: DiscipleId }
  | { type: 'basket-multiply' }
  | { type: 'combo'; count: number };

export interface GameState {
  crowds: Crowd[];
  basket: Basket;
  servingAnims: ServingAnimation[];
  particles: Particle[];
  miracleGauge: MiracleGauge;
  disciples: Disciple[];
  hp: number;
  maxHp: number;
  stage: number;
  score: number;
  servedCount: number;
  totalBread: number;
  totalFish: number;
  comboCount: number;
  upgradePoints: number;
  status: GameStatus;
  crowdSpawnTimer: number;
  quizCorrect: number;
  quizTotal: number;
  pendingEvents: GameEvent[];
  nextCrowdId: number;
  nextAnimId: number;
  philipTimer: number;
  miracleAutoTimer: number;
  basketPulse: number;
}

export interface StageConfig {
  stage: number;
  targetCount: number;
  lanes: number;
  crowdSpeed: number;
  spawnInterval: number;
  patience: number;
  hasFish: boolean;
  hasChild: boolean;
  hasComboRequest: boolean;
  verse: string;
  verseRef: string;
  upgradeReward: number;
}

export interface FishQuiz {
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
