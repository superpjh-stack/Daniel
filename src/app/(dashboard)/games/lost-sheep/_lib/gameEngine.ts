import type {
  GameState, Shepherd, Wolf, Position, Direction,
  TileType, StageConfig,
} from './types';
import { getMaze, WOLF_PATROLS } from './stages';

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 700;
export const TILE_SIZE = 28;
export const HUD_HEIGHT = 50;
export const DPAD_HEIGHT = 140;
export const VIEWPORT_COLS = Math.floor(CANVAS_WIDTH / TILE_SIZE);  // 14
export const VIEWPORT_ROWS = Math.floor((CANVAS_HEIGHT - HUD_HEIGHT - DPAD_HEIGHT) / TILE_SIZE); // ~18

export const STAFF_COOLDOWN = 10000; // 10s
export const WOLF_CHASE_DURATION = 5000;
export const CLIFF_WIND_CYCLE = 3000;
export const CLIFF_WIND_ACTIVE = 1000;
export const RESCUE_DURATION = 2500;
export const MOVE_SPEED = 4; // tiles per second (shepherd)

const MAX_PARTICLES = 40;
const PARTICLE_COLORS_GOLD = ['#FFD700', '#FFA500', '#FFFACD', '#FFE4B5'];
const PARTICLE_COLORS_STAR = ['#FFD700', '#FFFF00', '#FFF8DC'];

// Direction offsets
const DIR_OFFSET: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

export function createInitialState(stageNum: number, config: StageConfig): GameState {
  const { maze, sheepPos, penPos, stars, checkpoints } = getMaze(config.mazeIndex);
  const h = maze.length;
  const w = maze[0].length;

  const shepherd: Shepherd = {
    col: penPos.col,
    row: penPos.row,
    x: penPos.col * TILE_SIZE,
    y: penPos.row * TILE_SIZE,
    direction: 'down',
    isMoving: false,
    moveProgress: 0,
    carrySheep: false,
    staffCooldown: 0,
    staffMaxCooldown: STAFF_COOLDOWN,
  };

  // Create wolves
  const patrols = WOLF_PATROLS[config.mazeIndex] ?? [];
  const wolves: Wolf[] = [];
  for (let i = 0; i < Math.min(config.wolfCount, patrols.length); i++) {
    const path = patrols[i];
    const start = path[0];
    wolves.push({
      id: i + 1,
      col: start.col,
      row: start.row,
      x: start.col * TILE_SIZE,
      y: start.row * TILE_SIZE,
      patrolPath: path,
      patrolIndex: 0,
      patrolForward: true,
      state: 'patrol',
      chaseTimer: 0,
      speed: config.wolfSpeed,
      sightRange: config.wolfSightRange,
      direction: 'down',
      moveProgress: 0,
    });
  }

  return {
    maze,
    mazeWidth: w,
    mazeHeight: h,
    shepherd,
    wolves,
    particles: [],
    stars: stars.map(s => ({ ...s })),
    starsCollected: 0,
    totalStars: stars.length,
    checkpoints: checkpoints.map(c => ({ ...c })),
    lastCheckpoint: { ...penPos },
    sheepPos: { ...sheepPos },
    penPos: { ...penPos },
    hp: 3,
    maxHp: 3,
    stage: stageNum,
    score: 0,
    timeLeft: config.timeLimit * 1000,
    maxTime: config.timeLimit * 1000,
    status: 'ready',
    rescueTimer: 0,
    returnBrightness: 0,
    quizCorrect: 0,
    quizTotal: 0,
    pendingEvents: [],
    cameraX: 0,
    cameraY: 0,
    cliffWindTimer: 0,
    cliffWindActive: false,
    torchRadius: config.torchRadius,
    returnPath: [],
  };
}

export function isWalkable(maze: TileType[][], row: number, col: number): boolean {
  if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return false;
  const tile = maze[row][col];
  return tile !== 'wall';
}

function canWalkCliff(state: GameState): boolean {
  // Can walk cliff when wind is NOT active
  return !state.cliffWindActive;
}

export function tryMoveShepherd(state: GameState, dir: Direction): boolean {
  const s = state.shepherd;
  if (s.isMoving) return false;

  const { dr, dc } = DIR_OFFSET[dir];
  const newRow = s.row + dr;
  const newCol = s.col + dc;

  s.direction = dir;

  if (!isWalkable(state.maze, newRow, newCol)) return false;

  const tile = state.maze[newRow][newCol];
  if (tile === 'cliff' && !canWalkCliff(state)) return false;

  s.isMoving = true;
  s.moveProgress = 0;
  // Target is set by row/col update after animation completes
  // We store the target temporarily
  (s as any)._targetRow = newRow;
  (s as any)._targetCol = newCol;

  return true;
}

export function useStaff(state: GameState): boolean {
  const s = state.shepherd;
  if (s.staffCooldown > 0) return false;

  s.staffCooldown = STAFF_COOLDOWN;
  state.pendingEvents.push({ type: 'staff-use' });

  // Push nearby wolves away
  const { dr, dc } = DIR_OFFSET[s.direction];
  for (const wolf of state.wolves) {
    const dist = Math.abs(wolf.row - s.row) + Math.abs(wolf.col - s.col);
    if (dist <= 2) {
      // Push wolf back 3 tiles or to wall
      let pushRow = wolf.row;
      let pushCol = wolf.col;
      for (let i = 0; i < 3; i++) {
        const nr = pushRow + dr;
        const nc = pushCol + dc;
        if (isWalkable(state.maze, nr, nc)) {
          pushRow = nr;
          pushCol = nc;
        } else break;
      }
      wolf.row = pushRow;
      wolf.col = pushCol;
      wolf.x = pushCol * TILE_SIZE;
      wolf.y = pushRow * TILE_SIZE;
      wolf.state = 'retreat';
      wolf.chaseTimer = 0;
      state.pendingEvents.push({ type: 'wolf-hit' });
    }
  }

  return true;
}

// BFS shortest path
export function findPath(maze: TileType[][], from: Position, to: Position): Position[] {
  const h = maze.length;
  const w = maze[0].length;
  const visited = Array.from({ length: h }, () => new Array(w).fill(false));
  const parent: (Position | null)[][] = Array.from({ length: h }, () => new Array(w).fill(null));

  const queue: Position[] = [from];
  visited[from.row][from.col] = true;

  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.row === to.row && cur.col === to.col) {
      // Reconstruct path
      const path: Position[] = [];
      let p: Position | null = to;
      while (p && (p.row !== from.row || p.col !== from.col)) {
        path.unshift(p);
        p = parent[p.row][p.col];
      }
      return path;
    }

    for (const [dr, dc] of dirs) {
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      if (nr >= 0 && nr < h && nc >= 0 && nc < w && !visited[nr][nc]) {
        const tile = maze[nr][nc];
        if (tile !== 'wall') {
          visited[nr][nc] = true;
          parent[nr][nc] = cur;
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }

  return [];
}

function wolfCanSeeShepherd(wolf: Wolf, shepherd: Shepherd, maze: TileType[][]): boolean {
  const dist = Math.abs(wolf.row - shepherd.row) + Math.abs(wolf.col - shepherd.col);
  if (dist > wolf.sightRange) return false;

  // Check if shepherd is in bush (hidden)
  const tile = maze[shepherd.row]?.[shepherd.col];
  if (tile === 'bush') return false;

  // Line of sight check (simple: just check manhattan distance)
  return true;
}

function moveWolfToward(wolf: Wolf, target: Position, maze: TileType[][], speed: number, dt: number): void {
  const dx = target.col - wolf.col;
  const dy = target.row - wolf.row;

  if (dx === 0 && dy === 0) return;

  // Pick primary direction
  let dir: Direction;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? 'right' : 'left';
  } else {
    dir = dy > 0 ? 'down' : 'up';
  }

  const { dr, dc } = DIR_OFFSET[dir];
  const nr = wolf.row + dr;
  const nc = wolf.col + dc;

  if (isWalkable(maze, nr, nc)) {
    wolf.direction = dir;
    wolf.moveProgress += speed * (dt / 1000);
    if (wolf.moveProgress >= 1) {
      wolf.moveProgress = 0;
      wolf.row = nr;
      wolf.col = nc;
    }
  } else {
    // Try perpendicular
    const altDirs: Direction[] = Math.abs(dx) > Math.abs(dy)
      ? (dy >= 0 ? ['down', 'up'] : ['up', 'down'])
      : (dx >= 0 ? ['right', 'left'] : ['left', 'right']);
    for (const altDir of altDirs) {
      const { dr: adr, dc: adc } = DIR_OFFSET[altDir];
      if (isWalkable(maze, wolf.row + adr, wolf.col + adc)) {
        wolf.direction = altDir;
        wolf.moveProgress += speed * (dt / 1000);
        if (wolf.moveProgress >= 1) {
          wolf.moveProgress = 0;
          wolf.row += adr;
          wolf.col += adc;
        }
        break;
      }
    }
  }

  wolf.x = wolf.col * TILE_SIZE;
  wolf.y = wolf.row * TILE_SIZE;
}

function spawnParticles(state: GameState, x: number, y: number, count: number, colors: string[]): void {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= MAX_PARTICLES) break;
    state.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 3 - 1,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
    });
  }
}

export function updateFrame(state: GameState, deltaTime: number, config: StageConfig): void {
  if (state.status !== 'playing' && state.status !== 'returning') return;

  const dt = deltaTime;

  // Time countdown
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.status = 'game-over';
    return;
  }

  // Staff cooldown
  if (state.shepherd.staffCooldown > 0) {
    state.shepherd.staffCooldown = Math.max(0, state.shepherd.staffCooldown - dt);
  }

  // Cliff wind cycle
  state.cliffWindTimer += dt;
  if (state.cliffWindTimer >= CLIFF_WIND_CYCLE) {
    state.cliffWindTimer -= CLIFF_WIND_CYCLE;
  }
  state.cliffWindActive = state.cliffWindTimer >= (CLIFF_WIND_CYCLE - CLIFF_WIND_ACTIVE);

  // Shepherd movement animation
  const s = state.shepherd;
  if (s.isMoving) {
    s.moveProgress += MOVE_SPEED * (dt / 1000);
    const targetRow = (s as any)._targetRow as number;
    const targetCol = (s as any)._targetCol as number;

    // Interpolate pixel position
    s.x = (s.col + (targetCol - s.col) * Math.min(s.moveProgress, 1)) * TILE_SIZE;
    s.y = (s.row + (targetRow - s.row) * Math.min(s.moveProgress, 1)) * TILE_SIZE;

    if (s.moveProgress >= 1) {
      s.isMoving = false;
      s.moveProgress = 0;
      s.row = targetRow;
      s.col = targetCol;
      s.x = s.col * TILE_SIZE;
      s.y = s.row * TILE_SIZE;

      state.pendingEvents.push({ type: 'step' });

      // Check tile interactions
      handleTileInteraction(state, config);
    }
  }

  // Update camera
  updateCamera(state);

  // Wolf AI (skip in returning phase - wolves retreat)
  if (state.status === 'returning') {
    state.returnBrightness = Math.min(1, state.returnBrightness + dt / 3000);
    // Wolves retreat
    for (const wolf of state.wolves) {
      wolf.state = 'retreat';
    }
    // Check if reached pen
    if (s.row === state.penPos.row && s.col === state.penPos.col) {
      state.pendingEvents.push({ type: 'stage-complete' });
      if (state.stage >= 5) {
        state.status = 'all-clear';
      } else {
        state.status = 'stage-clear';
      }
      return;
    }
  } else {
    // Normal wolf behavior
    for (const wolf of state.wolves) {
      updateWolf(wolf, state, config, dt);
    }
  }

  // Update particles
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= dt / 1000;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function handleTileInteraction(state: GameState, config: StageConfig): void {
  const s = state.shepherd;
  const tile = state.maze[s.row]?.[s.col];

  // Star collection
  const starIdx = state.stars.findIndex(st => st.row === s.row && st.col === s.col);
  if (starIdx !== -1) {
    state.stars.splice(starIdx, 1);
    state.starsCollected++;
    state.score += 200;
    spawnParticles(state, s.x + TILE_SIZE / 2, s.y + TILE_SIZE / 2, 5, PARTICLE_COLORS_STAR);
    state.pendingEvents.push({ type: 'star-collect' });
    // Replace tile with path
    state.maze[s.row][s.col] = 'path';
  }

  // Water checkpoint
  if (tile === 'water') {
    state.lastCheckpoint = { row: s.row, col: s.col };
    state.hp = Math.min(state.maxHp, state.hp + 1);
    state.score += 100;
    spawnParticles(state, s.x + TILE_SIZE / 2, s.y + TILE_SIZE / 2, 3, ['#87CEEB', '#4FC3F7', '#81D4FA']);
    state.pendingEvents.push({ type: 'water-checkpoint' });
  }

  // Sheep found
  if (tile === 'sheep' && !s.carrySheep && state.status === 'playing') {
    state.pendingEvents.push({ type: 'sheep-found' });
    state.status = 'rescue';
    state.rescueTimer = RESCUE_DURATION;
    state.score += 500;
  }

  // Pen reached while carrying sheep
  if (tile === 'pen' && s.carrySheep && state.status === 'returning') {
    state.pendingEvents.push({ type: 'stage-complete' });
    if (state.stage >= 5) {
      state.status = 'all-clear';
    } else {
      state.status = 'stage-clear';
    }
  }
}

function updateWolf(wolf: Wolf, state: GameState, config: StageConfig, dt: number): void {
  const s = state.shepherd;

  if (wolf.state === 'retreat') {
    // Move back to patrol start
    const startPos = wolf.patrolPath[0];
    if (wolf.row === startPos.row && wolf.col === startPos.col) {
      wolf.state = 'patrol';
      wolf.patrolIndex = 0;
    } else {
      moveWolfToward(wolf, startPos, state.maze, config.wolfSpeed * 0.6, dt);
    }
    return;
  }

  // Check if wolf can see shepherd
  const canSee = wolfCanSeeShepherd(wolf, s, state.maze);

  if (wolf.state === 'patrol') {
    if (canSee) {
      wolf.state = 'chase';
      wolf.chaseTimer = WOLF_CHASE_DURATION;
      state.pendingEvents.push({ type: 'wolf-chase' });
    } else {
      // Move along patrol path
      const target = wolf.patrolPath[wolf.patrolIndex];
      if (wolf.row === target.row && wolf.col === target.col) {
        // Advance patrol index
        if (wolf.patrolForward) {
          wolf.patrolIndex++;
          if (wolf.patrolIndex >= wolf.patrolPath.length) {
            wolf.patrolForward = false;
            wolf.patrolIndex = wolf.patrolPath.length - 2;
          }
        } else {
          wolf.patrolIndex--;
          if (wolf.patrolIndex < 0) {
            wolf.patrolForward = true;
            wolf.patrolIndex = 1;
          }
        }
        if (wolf.patrolIndex < 0) wolf.patrolIndex = 0;
        if (wolf.patrolIndex >= wolf.patrolPath.length) wolf.patrolIndex = wolf.patrolPath.length - 1;
      }
      moveWolfToward(wolf, wolf.patrolPath[wolf.patrolIndex], state.maze, config.wolfSpeed * 0.6, dt);
    }
  } else if (wolf.state === 'chase') {
    wolf.chaseTimer -= dt;
    if (wolf.chaseTimer <= 0 || !canSee) {
      wolf.state = 'patrol';
      wolf.chaseTimer = 0;
      return;
    }

    // Chase shepherd
    moveWolfToward(wolf, { row: s.row, col: s.col }, state.maze, config.wolfSpeed * 1.3, dt);

    // Check collision
    if (wolf.row === s.row && wolf.col === s.col) {
      // Caught!
      state.hp--;
      state.pendingEvents.push({ type: 'wolf-spotted' });
      wolf.state = 'retreat';

      if (state.hp <= 0) {
        state.status = 'game-over';
        return;
      }

      // Respawn at checkpoint
      s.row = state.lastCheckpoint.row;
      s.col = state.lastCheckpoint.col;
      s.x = s.col * TILE_SIZE;
      s.y = s.row * TILE_SIZE;
    }
  }
}

function updateCamera(state: GameState): void {
  const s = state.shepherd;
  const viewW = CANVAS_WIDTH;
  const viewH = CANVAS_HEIGHT - HUD_HEIGHT - DPAD_HEIGHT;

  const targetCamX = s.x - viewW / 2 + TILE_SIZE / 2;
  const targetCamY = s.y - viewH / 2 + TILE_SIZE / 2;

  const maxCamX = state.mazeWidth * TILE_SIZE - viewW;
  const maxCamY = state.mazeHeight * TILE_SIZE - viewH;

  state.cameraX += (Math.max(0, Math.min(maxCamX, targetCamX)) - state.cameraX) * 0.1;
  state.cameraY += (Math.max(0, Math.min(maxCamY, targetCamY)) - state.cameraY) * 0.1;
}

export function completeRescue(state: GameState): void {
  state.shepherd.carrySheep = true;
  state.status = 'returning';
  state.returnBrightness = 0;
  state.returnPath = findPath(state.maze, { row: state.shepherd.row, col: state.shepherd.col }, state.penPos);
  state.maze[state.sheepPos.row][state.sheepPos.col] = 'path';
  state.pendingEvents.push({ type: 'return-start' });
}

// D-pad hit areas
export interface DPadAreas {
  up: { x: number; y: number; w: number; h: number };
  down: { x: number; y: number; w: number; h: number };
  left: { x: number; y: number; w: number; h: number };
  right: { x: number; y: number; w: number; h: number };
  staff: { x: number; y: number; w: number; h: number };
}

export function getDPadAreas(): DPadAreas {
  const dpadCenterX = 100;
  const dpadCenterY = CANVAS_HEIGHT - DPAD_HEIGHT / 2 - 5;
  const btnSize = 48;
  const gap = 4;

  return {
    up: { x: dpadCenterX - btnSize / 2, y: dpadCenterY - btnSize - gap, w: btnSize, h: btnSize },
    down: { x: dpadCenterX - btnSize / 2, y: dpadCenterY + gap, w: btnSize, h: btnSize },
    left: { x: dpadCenterX - btnSize - gap, y: dpadCenterY - btnSize / 2, w: btnSize, h: btnSize },
    right: { x: dpadCenterX + gap, y: dpadCenterY - btnSize / 2, w: btnSize, h: btnSize },
    staff: { x: CANVAS_WIDTH - 80, y: dpadCenterY - 30, w: 60, h: 60 },
  };
}
