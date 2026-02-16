import type {
  GameState, David, Goliath, Sling, Obstacle, PrayerItem,
  WeakPoint, FaithGauge, DragState, StageConfig,
} from './types';

// Canvas 크기
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

// HUD
export const HUD_HEIGHT = 50;
export const GAUGE_HEIGHT = 20;

// 다윗
export const DAVID_WIDTH = 30;
export const DAVID_HEIGHT = 40;
export const DAVID_SPEED = 4;
export const DAVID_Y = CANVAS_HEIGHT - 80;
export const INVINCIBLE_DURATION = 1500;

// 골리앗
export const GOLIATH_WIDTH = 120;
export const GOLIATH_HEIGHT = 100;
export const GOLIATH_Y = HUD_HEIGHT + GAUGE_HEIGHT + 50;

// 물맷돌
export const SLING_RADIUS = 6;
export const SLING_SPEED = 8;
export const SLING_COOLDOWN = 1000;
export const MAX_DRAG_DISTANCE = 120;

// 장애물
export const ROCK_RADIUS = 8;
export const SPEAR_RADIUS = 5;
export const TRACKING_ROCK_RADIUS = 10;
export const TRACKING_SPEED = 1.5;
export const TRACKING_LIFETIME = 5000;

// 기도 아이템
export const PRAYER_RADIUS = 12;
export const PRAYER_FALL_SPEED = 1.5;
export const PRAYER_FAITH_AMOUNT = 30;

// 믿음 게이지
export const FAITH_DODGE_AMOUNT = 2;
export const FAITH_HIT_AMOUNT = 5;
export const FAITH_MAX = 100;
export const FAITH_ACTIVE_DURATION = 3000;
export const SLOW_MOTION_FACTOR = 0.3;

function createWeakPoints(config: StageConfig): WeakPoint[] {
  return [
    {
      id: 'forehead',
      offsetX: 0,
      offsetY: -30,
      width: 28,
      height: 22,
      isOpen: false,
      openTimer: 0,
      openDuration: config.weakPointOpenDuration,
      closeDuration: config.weakPointCloseDuration,
      damage: 2,
      label: '이마',
    },
    {
      id: 'left-arm',
      offsetX: -45,
      offsetY: 10,
      width: 22,
      height: 28,
      isOpen: false,
      openTimer: config.weakPointCloseDuration * 0.3,
      openDuration: config.weakPointOpenDuration,
      closeDuration: config.weakPointCloseDuration,
      damage: 1,
      label: '왼팔',
    },
    {
      id: 'right-arm',
      offsetX: 45,
      offsetY: 10,
      width: 22,
      height: 28,
      isOpen: false,
      openTimer: config.weakPointCloseDuration * 0.6,
      openDuration: config.weakPointOpenDuration,
      closeDuration: config.weakPointCloseDuration,
      damage: 1,
      label: '오른팔',
    },
  ];
}

export function createInitialState(stageNum: number, config: StageConfig): GameState {
  return {
    david: {
      x: CANVAS_WIDTH / 2,
      y: DAVID_Y,
      width: DAVID_WIDTH,
      height: DAVID_HEIGHT,
      hp: 3,
      maxHp: 3,
      invincible: false,
      invincibleTimer: 0,
    },
    goliath: {
      x: CANVAS_WIDTH / 2,
      y: GOLIATH_Y,
      width: GOLIATH_WIDTH,
      height: GOLIATH_HEIGHT,
      hp: config.goliathHp,
      maxHp: config.goliathHp,
      weakPoints: createWeakPoints(config),
      attackTimer: 0,
      attackPattern: 0,
    },
    slings: [],
    obstacles: [],
    prayerItems: [],
    faithGauge: { value: 0, isActive: false, activeTimer: 0 },
    dragState: { isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 },
    stage: stageNum,
    score: 0,
    status: 'ready',
    slingCooldown: 0,
    quizCorrect: 0,
    quizTotal: 0,
    slowMotion: false,
    prayerSpawnTimer: 0,
    pendingEvents: [],
  };
}

/** 다음 스테이지로 이동 (HP 유지) */
export function advanceStage(state: GameState, config: StageConfig): void {
  state.stage++;
  state.goliath.hp = config.goliathHp;
  state.goliath.maxHp = config.goliathHp;
  state.goliath.weakPoints = createWeakPoints(config);
  state.goliath.attackTimer = 0;
  state.slings = [];
  state.obstacles = [];
  state.prayerItems = [];
  state.slingCooldown = 0;
  state.prayerSpawnTimer = 0;
  state.pendingEvents = [];
  state.status = 'playing';
}

export function moveDavid(david: David, direction: number): void {
  david.x += direction * DAVID_SPEED;
  david.x = Math.max(david.width / 2, Math.min(CANVAS_WIDTH - david.width / 2, david.x));
}

export function calculateSlingVector(drag: DragState): { vx: number; vy: number; power: number } {
  const dx = drag.startX - drag.currentX;
  const dy = drag.startY - drag.currentY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const power = Math.min(dist / MAX_DRAG_DISTANCE, 1);

  if (dist < 5) return { vx: 0, vy: 0, power: 0 };

  const nx = dx / dist;
  const ny = dy / dist;
  const speed = SLING_SPEED + power * 4;

  return { vx: nx * speed, vy: ny * speed, power };
}

export function fireSling(state: GameState): Sling | null {
  if (state.slingCooldown > 0) return null;

  const { vx, vy, power } = calculateSlingVector(state.dragState);
  if (power < 0.1) return null;

  const sling: Sling = {
    x: state.david.x,
    y: state.david.y - state.david.height / 2,
    vx,
    vy,
    radius: SLING_RADIUS,
    active: true,
  };

  state.slings.push(sling);
  state.slingCooldown = SLING_COOLDOWN;
  return sling;
}

export function executeGoliathAttack(
  goliath: Goliath,
  config: StageConfig,
  davidX: number,
): Obstacle[] {
  const patterns = config.attackPatterns;
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const obstacles: Obstacle[] = [];

  const dx = davidX - goliath.x;
  const dy = DAVID_Y - goliath.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / dist;
  const ny = dy / dist;

  if (pattern === 1) {
    // 직선 돌
    obstacles.push({
      x: goliath.x,
      y: goliath.y + goliath.height / 2,
      vx: nx * config.obstacleSpeed,
      vy: ny * config.obstacleSpeed,
      radius: ROCK_RADIUS,
      type: 'rock',
      active: true,
      lifetime: 0,
    });
  } else if (pattern === 2) {
    // 부채꼴 창 (3방향)
    const angles = [-0.35, 0, 0.35];
    for (const angle of angles) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rvx = nx * cos - ny * sin;
      const rvy = nx * sin + ny * cos;
      obstacles.push({
        x: goliath.x,
        y: goliath.y + goliath.height / 2,
        vx: rvx * config.obstacleSpeed * 1.2,
        vy: rvy * config.obstacleSpeed * 1.2,
        radius: SPEAR_RADIUS,
        type: 'spear',
        active: true,
        lifetime: 0,
      });
    }
  } else if (pattern === 3) {
    // 추적 돌
    obstacles.push({
      x: goliath.x,
      y: goliath.y + goliath.height / 2,
      vx: nx * config.obstacleSpeed * 0.6,
      vy: ny * config.obstacleSpeed * 0.6,
      radius: TRACKING_ROCK_RADIUS,
      type: 'tracking-rock',
      active: true,
      lifetime: 0,
    });
  }

  return obstacles;
}

function circleRectCollision(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (cr * cr);
}

export function checkSlingWeakPointCollision(sling: Sling, goliath: Goliath): WeakPoint | null {
  for (const wp of goliath.weakPoints) {
    if (!wp.isOpen) continue;
    const wpX = goliath.x + wp.offsetX - wp.width / 2;
    const wpY = goliath.y + wp.offsetY - wp.height / 2;
    if (circleRectCollision(sling.x, sling.y, sling.radius, wpX, wpY, wp.width, wp.height)) {
      return wp;
    }
  }
  return null;
}

/** 물맷돌이 골리앗 본체에 맞았는지 (약점 아닌 곳 - 튕겨남) */
export function checkSlingGoliathBodyCollision(sling: Sling, goliath: Goliath): boolean {
  const gx = goliath.x - goliath.width / 2;
  const gy = goliath.y - goliath.height / 2;
  return circleRectCollision(sling.x, sling.y, sling.radius, gx, gy, goliath.width, goliath.height);
}

export function checkObstacleDavidCollision(obstacle: Obstacle, david: David): boolean {
  if (david.invincible) return false;
  const dx = david.x - david.width / 2;
  const dy = david.y - david.height / 2;
  return circleRectCollision(obstacle.x, obstacle.y, obstacle.radius, dx, dy, david.width, david.height);
}

export function checkPrayerDavidCollision(prayer: PrayerItem, david: David): boolean {
  const dx = david.x - david.width / 2;
  const dy = david.y - david.height / 2;
  return circleRectCollision(prayer.x, prayer.y, prayer.radius, dx, dy, david.width, david.height);
}

export function updateWeakPoints(goliath: Goliath, deltaTime: number, faithActive: boolean): void {
  for (const wp of goliath.weakPoints) {
    if (faithActive) {
      wp.isOpen = true;
      continue;
    }

    wp.openTimer += deltaTime;
    const cycleDuration = wp.isOpen ? wp.openDuration : wp.closeDuration;

    if (wp.openTimer >= cycleDuration) {
      wp.isOpen = !wp.isOpen;
      wp.openTimer = 0;
    }
  }
}

export function spawnPrayerItem(): PrayerItem {
  return {
    x: 30 + Math.random() * (CANVAS_WIDTH - 60),
    y: HUD_HEIGHT + GAUGE_HEIGHT,
    vy: PRAYER_FALL_SPEED,
    radius: PRAYER_RADIUS,
    active: true,
  };
}

export function updateFrame(state: GameState, deltaTime: number, config: StageConfig): void {
  if (state.status !== 'playing') return;

  const dt = deltaTime;

  // 쿨다운 감소
  if (state.slingCooldown > 0) {
    state.slingCooldown = Math.max(0, state.slingCooldown - dt);
  }

  // 무적 타이머
  if (state.david.invincible) {
    state.david.invincibleTimer -= dt;
    if (state.david.invincibleTimer <= 0) {
      state.david.invincible = false;
    }
  }

  // 믿음 게이지 활성 타이머
  if (state.faithGauge.isActive) {
    state.faithGauge.activeTimer -= dt;
    state.slowMotion = true;
    if (state.faithGauge.activeTimer <= 0) {
      state.faithGauge.isActive = false;
      state.faithGauge.value = 0;
      state.slowMotion = false;
      state.pendingEvents.push({ type: 'faith-deactivate' });
    }
  }

  // 약점 개폐
  updateWeakPoints(state.goliath, dt, state.faithGauge.isActive);

  // 골리앗 공격 타이머
  state.goliath.attackTimer += dt;
  if (state.goliath.attackTimer >= config.attackInterval) {
    state.goliath.attackTimer = 0;
    const newObstacles = executeGoliathAttack(state.goliath, config, state.david.x);
    state.obstacles.push(...newObstacles);
    state.pendingEvents.push({ type: 'goliath-attack' });
  }

  // 기도 아이템 스폰
  state.prayerSpawnTimer += dt;
  if (state.prayerSpawnTimer >= config.prayerInterval) {
    state.prayerSpawnTimer = 0;
    state.prayerItems.push(spawnPrayerItem());
  }

  // 물맷돌 이동
  for (const sling of state.slings) {
    if (!sling.active) continue;
    sling.x += sling.vx;
    sling.y += sling.vy;

    // 화면 밖
    if (sling.x < -10 || sling.x > CANVAS_WIDTH + 10 || sling.y < -10 || sling.y > CANVAS_HEIGHT + 10) {
      sling.active = false;
      continue;
    }

    // 약점 충돌
    const hitWp = checkSlingWeakPointCollision(sling, state.goliath);
    if (hitWp) {
      state.goliath.hp -= hitWp.damage;
      state.score += hitWp.id === 'forehead' ? 200 : 100;
      state.faithGauge.value = Math.min(FAITH_MAX, state.faithGauge.value + FAITH_HIT_AMOUNT);
      sling.active = false;
      state.pendingEvents.push({ type: 'weakpoint-hit', subtype: hitWp.id === 'forehead' ? 'forehead' : 'arm' });
      continue;
    }

    // 골리앗 본체 충돌 (튕겨남)
    if (checkSlingGoliathBodyCollision(sling, state.goliath)) {
      sling.active = false;
      state.pendingEvents.push({ type: 'body-bounce' });
    }
  }

  // 장애물 이동
  for (const obs of state.obstacles) {
    if (!obs.active) continue;

    if (obs.type === 'tracking-rock') {
      // 추적: 다윗 방향으로 천천히 회전
      obs.lifetime += dt;
      if (obs.lifetime > TRACKING_LIFETIME) {
        obs.active = false;
        continue;
      }
      const dx = state.david.x - obs.x;
      const dy = state.david.y - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        obs.vx += nx * TRACKING_SPEED * 0.05;
        obs.vy += ny * TRACKING_SPEED * 0.05;
        const speed = Math.sqrt(obs.vx * obs.vx + obs.vy * obs.vy);
        const maxSpeed = config.obstacleSpeed * 0.8;
        if (speed > maxSpeed) {
          obs.vx = (obs.vx / speed) * maxSpeed;
          obs.vy = (obs.vy / speed) * maxSpeed;
        }
      }
    }

    obs.x += obs.vx;
    obs.y += obs.vy;

    // 화면 밖
    if (obs.x < -20 || obs.x > CANVAS_WIDTH + 20 || obs.y > CANVAS_HEIGHT + 20) {
      obs.active = false;
      state.faithGauge.value = Math.min(FAITH_MAX, state.faithGauge.value + FAITH_DODGE_AMOUNT);
      continue;
    }

    // 다윗 충돌
    if (checkObstacleDavidCollision(obs, state.david)) {
      state.david.hp--;
      state.david.invincible = true;
      state.david.invincibleTimer = INVINCIBLE_DURATION;
      obs.active = false;
      state.pendingEvents.push({ type: 'david-damage' });

      if (state.david.hp <= 0) {
        state.status = 'game-over';
        return;
      }
    }
  }

  // 기도 아이템 이동
  for (const prayer of state.prayerItems) {
    if (!prayer.active) continue;
    prayer.y += prayer.vy;

    if (prayer.y > CANVAS_HEIGHT + 20) {
      prayer.active = false;
      continue;
    }

    if (checkPrayerDavidCollision(prayer, state.david)) {
      state.faithGauge.value = Math.min(FAITH_MAX, state.faithGauge.value + PRAYER_FAITH_AMOUNT);
      state.score += 50;
      prayer.active = false;
      state.pendingEvents.push({ type: 'prayer-pickup' });
    }
  }

  // 비활성 오브젝트 정리
  state.slings = state.slings.filter(s => s.active);
  state.obstacles = state.obstacles.filter(o => o.active);
  state.prayerItems = state.prayerItems.filter(p => p.active);

  // 믿음 게이지 활성화 체크
  if (state.faithGauge.value >= FAITH_MAX && !state.faithGauge.isActive) {
    state.faithGauge.isActive = true;
    state.faithGauge.activeTimer = FAITH_ACTIVE_DURATION;
    state.pendingEvents.push({ type: 'faith-activate' });
  }

  // 골리앗 HP 체크 → 스테이지 클리어
  if (state.goliath.hp <= 0) {
    state.score += 500;
    if (state.stage >= 5) {
      state.status = 'all-clear';
    } else {
      state.status = 'stage-clear';
    }
  }
}
