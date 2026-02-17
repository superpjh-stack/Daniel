import type {
  GameState, Crowd, Disciple, DiscipleId, StageConfig,
  ServingAnimation, Particle, FoodType,
} from './types';

// Canvas
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 700;

// HUD
export const HUD_HEIGHT = 60;
export const GAUGE_HEIGHT = 20;

// Crowd area
export const CROWD_AREA_TOP = HUD_HEIGHT + GAUGE_HEIGHT + 10;
export const CROWD_AREA_BOTTOM = 450;
export const LANE_HEIGHT = 70;

// Crowd
export const CROWD_WIDTH = 44;
export const CROWD_HEIGHT = 50;
export const CROWD_EMOJIS = ['\u{1F60A}', '\u{1F603}', '\u{1F642}', '\u{1F604}', '\u{1F917}'];
export const CHILD_EMOJIS = ['\u{1F467}', '\u{1F466}', '\u{1F9D2}'];

// Basket
export const BASKET_WIDTH = 120;
export const BASKET_HEIGHT = 60;
export const BASKET_Y = CANVAS_HEIGHT - 120;

// Serving animation
export const SERVING_DURATION = 400;
export const SERVING_ARC_HEIGHT = 80;

// Miracle
export const MIRACLE_MAX = 100;
export const MIRACLE_PER_SERVE = 5;
export const MIRACLE_PER_COMBO = 2;
export const MIRACLE_ACTIVE_DURATION = 5000;
export const MIRACLE_AUTO_INTERVAL = 500;

// Score
export const SCORE_SERVE = 100;
export const SCORE_CHILD = 150;
export const SCORE_COMBO_MULT = 10;
export const SCORE_MIRACLE_MULT = 2;

// Particles
export const MAX_PARTICLES = 50;
export const PARTICLE_COLORS = ['#FFD700', '#FFA500', '#FFE4B5', '#FFFACD'];

// Disciple defaults
export const DISCIPLE_DEFAULTS: Disciple[] = [
  {
    id: 'peter',
    name: '\uBCA0\uB4DC\uB85C',
    emoji: '\u{1F9D4}',
    level: 0,
    description: '\uC11C\uBE59 \uBC94\uC704 \uC99D\uAC00 (+10px/\uB808\uBCA8)',
    cost: [2, 3, 5],
  },
  {
    id: 'andrew',
    name: '\uC548\uB4DC\uB808',
    emoji: '\u{1F468}',
    level: 0,
    description: '\uAD70\uC911 \uC778\uB0B4\uC2EC +1.5\uCD08/\uB808\uBCA8',
    cost: [2, 3, 5],
  },
  {
    id: 'james',
    name: '\uC57C\uACE0\uBCF4',
    emoji: '\u{1F471}',
    level: 0,
    description: '\uAE30\uC801 \uAC8C\uC774\uC9C0 \uCDA9\uC804 +20%/\uB808\uBCA8',
    cost: [2, 4, 6],
  },
  {
    id: 'john',
    name: '\uC694\uD55C',
    emoji: '\u{1F466}',
    level: 0,
    description: '\uAE30\uC801 \uD0C0\uC784 +1.5\uCD08/\uB808\uBCA8',
    cost: [3, 4, 6],
  },
  {
    id: 'philip',
    name: '\uBE4C\uB9BD',
    emoji: '\u{1F9D1}',
    level: 0,
    description: '\uC790\uB3D9 \uC11C\uBE59 (4\uCD08\u21923\uCD08\u21922\uCD08)',
    cost: [3, 5, 7],
  },
];

export function createInitialState(stageNum: number, disciples?: Disciple[]): GameState {
  return {
    crowds: [],
    basket: {
      x: CANVAS_WIDTH / 2 - BASKET_WIDTH / 2,
      y: BASKET_Y,
      width: BASKET_WIDTH,
      height: BASKET_HEIGHT,
    },
    servingAnims: [],
    particles: [],
    miracleGauge: { value: 0, isActive: false, activeTimer: 0 },
    disciples: disciples ? disciples.map(d => ({ ...d })) : DISCIPLE_DEFAULTS.map(d => ({ ...d, cost: [...d.cost] })),
    hp: 3,
    maxHp: 3,
    stage: stageNum,
    score: 0,
    servedCount: 0,
    totalBread: 0,
    totalFish: 0,
    comboCount: 0,
    upgradePoints: 0,
    status: 'ready',
    crowdSpawnTimer: 0,
    quizCorrect: 0,
    quizTotal: 0,
    pendingEvents: [],
    nextCrowdId: 1,
    nextAnimId: 1,
    philipTimer: 0,
    miracleAutoTimer: 0,
    basketPulse: 0,
  };
}

export function advanceStage(state: GameState, config: StageConfig): void {
  state.stage++;
  state.crowds = [];
  state.servingAnims = [];
  state.particles = [];
  state.servedCount = 0;
  state.comboCount = 0;
  state.crowdSpawnTimer = 0;
  state.philipTimer = 0;
  state.miracleAutoTimer = 0;
  state.pendingEvents = [];
  state.upgradePoints += config.upgradeReward;
  state.status = 'playing';
}

function getLaneY(lane: number): number {
  return CROWD_AREA_TOP + 30 + lane * LANE_HEIGHT;
}

export function spawnCrowd(state: GameState, config: StageConfig): Crowd {
  const lane = Math.floor(Math.random() * config.lanes);
  const direction: 1 | -1 = lane % 2 === 0 ? 1 : -1;
  const startX = direction === 1 ? -CROWD_WIDTH : CANVAS_WIDTH + CROWD_WIDTH;

  let wantFood: FoodType = 'bread';
  if (config.hasFish) {
    wantFood = Math.random() < 0.5 ? 'bread' : 'fish';
  }

  const isChild = config.hasChild && Math.random() < 0.2;
  const emojis = isChild ? CHILD_EMOJIS : CROWD_EMOJIS;
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  // Andrew upgrade: +1500ms patience per level
  const andrewLevel = state.disciples.find(d => d.id === 'andrew')?.level ?? 0;
  const patience = config.patience + andrewLevel * 1500;

  const crowd: Crowd = {
    id: state.nextCrowdId++,
    x: startX,
    y: getLaneY(lane),
    lane,
    direction,
    speed: config.crowdSpeed,
    wantFood,
    patience,
    maxPatience: patience,
    width: CROWD_WIDTH,
    height: CROWD_HEIGHT,
    isChild,
    served: false,
    leaving: false,
    emoji,
  };

  return crowd;
}

export function findClickedCrowd(state: GameState, clickX: number, clickY: number): Crowd | null {
  const peterLevel = state.disciples.find(d => d.id === 'peter')?.level ?? 0;
  const extraHit = peterLevel * 10;

  const candidates = state.crowds.filter(c => !c.served && !c.leaving);

  // Sort by lowest patience first (most urgent)
  candidates.sort((a, b) => a.patience - b.patience);

  for (const crowd of candidates) {
    const hw = (crowd.width + extraHit) / 2;
    const hh = (crowd.height + extraHit) / 2;
    if (
      clickX >= crowd.x - hw && clickX <= crowd.x + hw &&
      clickY >= crowd.y - hh && clickY <= crowd.y + hh
    ) {
      return crowd;
    }
  }
  return null;
}

export function serveCrowd(state: GameState, crowd: Crowd): void {
  crowd.served = true;

  // Create serving animation
  const basketCenterX = state.basket.x + state.basket.width / 2;
  const basketCenterY = state.basket.y;
  const anim: ServingAnimation = {
    id: state.nextAnimId++,
    foodType: crowd.wantFood,
    startX: basketCenterX,
    startY: basketCenterY,
    targetX: crowd.x,
    targetY: crowd.y,
    progress: 0,
    active: true,
  };
  state.servingAnims.push(anim);

  // Score
  const isMiracle = state.miracleGauge.isActive;
  let points = crowd.isChild ? SCORE_CHILD : SCORE_SERVE;
  points += state.comboCount * SCORE_COMBO_MULT;
  if (isMiracle) points *= SCORE_MIRACLE_MULT;
  state.score += points;

  // Combo
  state.comboCount++;
  if (state.comboCount > 1) {
    state.pendingEvents.push({ type: 'combo', count: state.comboCount });
  }

  // Miracle gauge
  const jamesLevel = state.disciples.find(d => d.id === 'james')?.level ?? 0;
  const gaugeAmount = MIRACLE_PER_SERVE * (1 + jamesLevel * 0.2) + state.comboCount * MIRACLE_PER_COMBO;
  state.miracleGauge.value = Math.min(MIRACLE_MAX, state.miracleGauge.value + gaugeAmount);

  // Basket particles (miracle effect)
  spawnBasketParticles(state, 3);
  state.basketPulse = 300; // 300ms pulse

  // Counters
  if (crowd.wantFood === 'bread') {
    state.totalBread++;
  } else {
    state.totalFish++;
  }
  state.servedCount++;

  state.pendingEvents.push({ type: 'serve-success', isChild: crowd.isChild });
  state.pendingEvents.push({ type: 'basket-multiply' });
}

function spawnBasketParticles(state: GameState, count: number): void {
  const bx = state.basket.x + state.basket.width / 2;
  const by = state.basket.y;

  for (let i = 0; i < count; i++) {
    if (state.particles.length >= MAX_PARTICLES) break;
    state.particles.push({
      x: bx + (Math.random() - 0.5) * 40,
      y: by,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 3 - 1,
      life: 1,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: 3 + Math.random() * 4,
    });
  }
}

export function activateMiracle(state: GameState): void {
  const johnLevel = state.disciples.find(d => d.id === 'john')?.level ?? 0;
  state.miracleGauge.isActive = true;
  state.miracleGauge.activeTimer = MIRACLE_ACTIVE_DURATION + johnLevel * 1500;
  state.miracleAutoTimer = 0;
  state.pendingEvents.push({ type: 'miracle-activate' });
}

function autoServeOne(state: GameState): void {
  // Find most urgent unserved crowd
  const target = state.crowds
    .filter(c => !c.served && !c.leaving)
    .sort((a, b) => a.patience - b.patience)[0];

  if (target) {
    serveCrowd(state, target);
  }
}

function getPhilipInterval(level: number): number {
  if (level <= 0) return 0;
  const intervals = [4000, 3000, 2000];
  return intervals[level - 1] ?? 2000;
}

export function buyUpgrade(state: GameState, discipleId: DiscipleId): boolean {
  const disciple = state.disciples.find(d => d.id === discipleId);
  if (!disciple) return false;
  if (disciple.level >= 3) return false;

  const cost = disciple.cost[disciple.level];
  if (state.upgradePoints < cost) return false;

  state.upgradePoints -= cost;
  disciple.level++;
  state.pendingEvents.push({ type: 'upgrade-buy', disciple: discipleId });
  return true;
}

export function updateFrame(state: GameState, deltaTime: number, config: StageConfig): void {
  if (state.status !== 'playing') return;

  const dt = deltaTime;

  // Basket pulse decay
  if (state.basketPulse > 0) {
    state.basketPulse = Math.max(0, state.basketPulse - dt);
  }

  // Miracle gauge activation check
  if (state.miracleGauge.value >= MIRACLE_MAX && !state.miracleGauge.isActive) {
    activateMiracle(state);
  }

  // Miracle active timer
  if (state.miracleGauge.isActive) {
    state.miracleGauge.activeTimer -= dt;

    // Auto serve during miracle time
    state.miracleAutoTimer += dt;
    if (state.miracleAutoTimer >= MIRACLE_AUTO_INTERVAL) {
      state.miracleAutoTimer -= MIRACLE_AUTO_INTERVAL;
      autoServeOne(state);
    }

    // Spawn extra particles during miracle
    if (Math.random() < 0.3) {
      spawnBasketParticles(state, 1);
    }

    if (state.miracleGauge.activeTimer <= 0) {
      state.miracleGauge.isActive = false;
      state.miracleGauge.value = 0;
      state.pendingEvents.push({ type: 'miracle-deactivate' });
    }
  }

  // Philip auto-serve
  const philipLevel = state.disciples.find(d => d.id === 'philip')?.level ?? 0;
  if (philipLevel > 0 && !state.miracleGauge.isActive) {
    const interval = getPhilipInterval(philipLevel);
    state.philipTimer += dt;
    if (state.philipTimer >= interval) {
      state.philipTimer -= interval;
      autoServeOne(state);
    }
  }

  // Crowd spawn
  state.crowdSpawnTimer += dt;
  if (state.crowdSpawnTimer >= config.spawnInterval) {
    state.crowdSpawnTimer -= config.spawnInterval;
    const newCrowd = spawnCrowd(state, config);
    state.crowds.push(newCrowd);
  }

  // Move crowds
  for (const crowd of state.crowds) {
    if (crowd.served) {
      // Fade out served crowd (move off screen)
      crowd.x += crowd.direction * crowd.speed * 3;
      continue;
    }

    if (crowd.leaving) {
      crowd.x -= crowd.direction * crowd.speed * 2;
      continue;
    }

    // Normal movement
    crowd.x += crowd.direction * crowd.speed;

    // Patience decrease
    crowd.patience -= dt;
    if (crowd.patience <= 0) {
      crowd.leaving = true;
      state.hp--;
      state.comboCount = 0;
      state.pendingEvents.push({ type: 'crowd-timeout' });

      if (state.hp <= 0) {
        state.status = 'game-over';
        return;
      }
    }
  }

  // Clean up off-screen crowds
  state.crowds = state.crowds.filter(c => {
    if (c.served && (c.x < -100 || c.x > CANVAS_WIDTH + 100)) return false;
    if (c.leaving && (c.x < -100 || c.x > CANVAS_WIDTH + 100)) return false;
    return true;
  });

  // Update serving animations
  for (const anim of state.servingAnims) {
    if (!anim.active) continue;
    anim.progress += dt / SERVING_DURATION;
    if (anim.progress >= 1) {
      anim.active = false;
    }
  }
  state.servingAnims = state.servingAnims.filter(a => a.active);

  // Update particles
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // gravity
    p.life -= dt / 1000;
  }
  state.particles = state.particles.filter(p => p.life > 0);

  // Stage clear check
  if (state.servedCount >= config.targetCount) {
    if (state.stage >= 5) {
      state.status = 'all-clear';
    } else {
      state.status = 'stage-clear';
    }
  }
}
