import type { GameState, StageConfig, TileType } from './types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, HUD_HEIGHT, DPAD_HEIGHT,
  getDPadAreas,
} from './gameEngine';

const MAZE_VIEW_HEIGHT = CANVAS_HEIGHT - HUD_HEIGHT - DPAD_HEIGHT;

// Colors
const COLORS: Record<TileType, string> = {
  wall: '#5D4E37',
  path: '#8FBC8F',
  cliff: '#C9A96E',
  bush: '#2E7D32',
  rock: '#9E9E9E',
  water: '#4FC3F7',
  star: '#8FBC8F',
  sheep: '#8FBC8F',
  pen: '#A1887F',
};

const DARK_OVERLAY = 'rgba(0,0,0,0.92)';

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState, config: StageConfig): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background
  ctx.fillStyle = '#2E2E2E';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw maze area
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HUD_HEIGHT, CANVAS_WIDTH, MAZE_VIEW_HEIGHT);
  ctx.clip();
  ctx.translate(-state.cameraX, -state.cameraY + HUD_HEIGHT);

  drawMaze(ctx, state, config);
  drawReturnPath(ctx, state);
  drawStars(ctx, state);
  drawWolves(ctx, state, config);
  drawSheep(ctx, state);
  drawShepherd(ctx, state);
  drawParticles(ctx, state);

  // Darkness overlay for dark stages
  if (config.isDark && state.status !== 'returning') {
    drawDarkness(ctx, state, config);
  }

  // Return brightening effect
  if (state.status === 'returning') {
    drawReturnBrightness(ctx, state);
  }

  ctx.restore();

  // HUD
  drawHUD(ctx, state, config);

  // D-pad
  drawDPad(ctx, state);

  // Ready screen
  if (state.status === 'ready') {
    drawReadyScreen(ctx, state, config);
  }

  // Rescue animation overlay
  if (state.status === 'rescue') {
    drawRescueOverlay(ctx, state);
  }

  // Paused overlay
  if (state.status === 'paused') {
    drawPausedOverlay(ctx);
  }
}

function drawMaze(ctx: CanvasRenderingContext2D, state: GameState, config: StageConfig): void {
  const { maze, cameraX, cameraY } = state;
  const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
  const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
  const endCol = Math.min(maze[0].length, startCol + Math.ceil(CANVAS_WIDTH / TILE_SIZE) + 3);
  const endRow = Math.min(maze.length, startRow + Math.ceil(MAZE_VIEW_HEIGHT / TILE_SIZE) + 3);

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const tile = maze[r]?.[c];
      if (!tile) continue;

      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;

      // Base tile
      ctx.fillStyle = COLORS[tile] ?? COLORS.path;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      // Decorations
      if (tile === 'wall') {
        ctx.fillStyle = '#4A3D2B';
        ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        // Brick pattern
        ctx.strokeStyle = '#5D4E37';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 2);
        ctx.strokeRect(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 2);
      } else if (tile === 'bush') {
        // Draw bush look
        ctx.fillStyle = '#1B5E20';
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 3, y + TILE_SIZE / 3, TILE_SIZE / 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 'cliff') {
        // Cliff with wind indicator
        ctx.fillStyle = '#B8956A';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        if (state.cliffWindActive) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          const windOffset = (Date.now() % 500) / 500 * TILE_SIZE;
          ctx.fillRect(x, y + windOffset, TILE_SIZE, 3);
          ctx.fillRect(x, y + windOffset - TILE_SIZE / 2, TILE_SIZE, 2);
        }
        // Edge lines
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (tile === 'water') {
        // Water with shimmer
        ctx.fillStyle = '#29B6F6';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        const shimmer = Math.sin(Date.now() / 500 + c + r) * 3;
        ctx.fillRect(x + 6 + shimmer, y + 6, 8, 3);
      } else if (tile === 'pen') {
        // Pen (sheep fold)
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        // Fence lines
        ctx.beginPath();
        ctx.moveTo(x + 4, y + TILE_SIZE / 3);
        ctx.lineTo(x + TILE_SIZE - 4, y + TILE_SIZE / 3);
        ctx.moveTo(x + 4, y + TILE_SIZE * 2 / 3);
        ctx.lineTo(x + TILE_SIZE - 4, y + TILE_SIZE * 2 / 3);
        ctx.stroke();
      } else if (tile === 'path') {
        // Subtle grass pattern
        if ((r + c) % 3 === 0) {
          ctx.fillStyle = '#7EB07E';
          ctx.fillRect(x + 8, y + 12, 2, 4);
          ctx.fillRect(x + 18, y + 6, 2, 4);
        }
      }
    }
  }
}

function drawStars(ctx: CanvasRenderingContext2D, state: GameState): void {
  const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
  for (const star of state.stars) {
    const x = star.col * TILE_SIZE + TILE_SIZE / 2;
    const y = star.row * TILE_SIZE + TILE_SIZE / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2B50', 0, 0);
    ctx.restore();
  }
}

function drawSheep(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.shepherd.carrySheep) return; // Already on shepherd
  if (state.status === 'returning' || state.status === 'stage-clear' || state.status === 'all-clear') return;

  const { sheepPos } = state;
  const x = sheepPos.col * TILE_SIZE + TILE_SIZE / 2;
  const y = sheepPos.row * TILE_SIZE + TILE_SIZE / 2;

  // Trembling effect
  const tremble = Math.sin(Date.now() / 150) * 2;

  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\uD83D\uDC11', x + tremble, y);

  // "Help!" indicator
  const bobY = Math.sin(Date.now() / 500) * 3;
  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = '#FF5722';
  ctx.fillText('\uBA54\uC5D0\uC5D0~', x, y - 16 + bobY);
}

function drawShepherd(ctx: CanvasRenderingContext2D, state: GameState): void {
  const s = state.shepherd;
  const x = s.x + TILE_SIZE / 2;
  const y = s.y + TILE_SIZE / 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shepherd emoji
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (s.carrySheep) {
    // Draw sheep on shoulder
    ctx.font = '13px serif';
    ctx.fillText('\uD83D\uDC11', x + 8, y - 10);
    ctx.font = '22px serif';
  }

  // Direction indicator
  const dirEmoji = '\uD83E\uDDD1\u200D\uD83C\uDF3E'; // farmer emoji
  ctx.fillText(dirEmoji, x, y);

  // Staff cooldown indicator
  if (s.staffCooldown > 0) {
    const pct = s.staffCooldown / s.staffMaxCooldown;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - pct));
    ctx.lineTo(x, y);
    ctx.fill();
  }
}

function drawWolves(ctx: CanvasRenderingContext2D, state: GameState, config: StageConfig): void {
  for (const wolf of state.wolves) {
    const x = wolf.x + TILE_SIZE / 2;
    const y = wolf.y + TILE_SIZE / 2;

    // Sight range (red overlay) - only in patrol/chase
    if (wolf.state !== 'retreat') {
      ctx.fillStyle = 'rgba(255,0,0,0.08)';
      const range = wolf.sightRange * TILE_SIZE;
      ctx.beginPath();
      ctx.arc(x, y, range, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wolf emoji
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83D\uDC3A', x, y);

    // Chase indicator
    if (wolf.state === 'chase') {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#FF0000';
      const bounce = Math.sin(Date.now() / 100) * 3;
      ctx.fillText('!', x + 12, y - 12 + bounce);
    }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawReturnPath(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.status !== 'returning' || state.returnPath.length === 0) return;

  const t = Date.now() / 500;
  ctx.strokeStyle = 'rgba(255,215,0,0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -t * 10;

  ctx.beginPath();
  const start = state.shepherd;
  ctx.moveTo(start.x + TILE_SIZE / 2, start.y + TILE_SIZE / 2);

  for (const p of state.returnPath) {
    ctx.lineTo(p.col * TILE_SIZE + TILE_SIZE / 2, p.row * TILE_SIZE + TILE_SIZE / 2);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDarkness(ctx: CanvasRenderingContext2D, state: GameState, config: StageConfig): void {
  const s = state.shepherd;
  const cx = s.x + TILE_SIZE / 2;
  const cy = s.y + TILE_SIZE / 2;
  const radius = config.torchRadius * TILE_SIZE;

  // Create radial gradient for torch effect
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.7)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.92)');

  // Fill entire maze with darkness, then cut out torch area
  ctx.fillStyle = DARK_OVERLAY;
  ctx.fillRect(0, 0, state.mazeWidth * TILE_SIZE, state.mazeHeight * TILE_SIZE);

  ctx.globalCompositeOperation = 'destination-out';
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  innerGrad.addColorStop(0, 'rgba(0,0,0,1)');
  innerGrad.addColorStop(0.6, 'rgba(0,0,0,0.8)');
  innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Torch flicker
  const flicker = Math.sin(Date.now() / 80) * 0.05 + 0.95;
  ctx.fillStyle = `rgba(255,180,50,${0.08 * flicker})`;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawReturnBrightness(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.returnBrightness <= 0) return;
  ctx.fillStyle = `rgba(255,250,200,${state.returnBrightness * 0.15})`;
  ctx.fillRect(0, 0, state.mazeWidth * TILE_SIZE, state.mazeHeight * TILE_SIZE);
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, config: StageConfig): void {
  // HUD background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

  // HP hearts
  ctx.font = '14px serif';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < state.maxHp; i++) {
    ctx.fillText(i < state.hp ? '\u2764\uFE0F' : '\uD83E\uDD0D', 8 + i * 20, 16);
  }

  // Time
  const secs = Math.ceil(state.timeLeft / 1000);
  const timeColor = secs <= 15 ? '#FF5252' : secs <= 30 ? '#FFC107' : '#FFFFFF';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = timeColor;
  ctx.textAlign = 'center';
  ctx.fillText(`\u23F1\uFE0F ${secs}s`, CANVAS_WIDTH / 2, 16);

  // Stars
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`\u2B50 ${state.starsCollected}/${state.totalStars}`, CANVAS_WIDTH - 10, 16);

  // Stage + staff cooldown
  ctx.textAlign = 'left';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText(`Stage ${state.stage}: ${config.name}`, 8, 38);

  // Staff cooldown bar
  const staffReady = state.shepherd.staffCooldown <= 0;
  ctx.textAlign = 'right';
  ctx.fillStyle = staffReady ? '#4CAF50' : '#757575';
  ctx.font = '10px sans-serif';
  if (staffReady) {
    ctx.fillText('\uD83E\uDE84 \uC900\uBE44\uB428', CANVAS_WIDTH - 10, 38);
  } else {
    const cd = Math.ceil(state.shepherd.staffCooldown / 1000);
    ctx.fillText(`\uD83E\uDE84 ${cd}s`, CANVAS_WIDTH - 10, 38);
  }

  // Carrying sheep indicator
  if (state.shepherd.carrySheep) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('\uD83D\uDC11 \uC591\uC744 \uB370\uB9AC\uACE0 \uC6B0\uB9AC\uB85C \uB3CC\uC544\uAC00\uC138\uC694!', CANVAS_WIDTH / 2, 38);
  }

  ctx.textAlign = 'left';
}

function drawDPad(ctx: CanvasRenderingContext2D, state: GameState): void {
  const dpadY = CANVAS_HEIGHT - DPAD_HEIGHT;

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, dpadY, CANVAS_WIDTH, DPAD_HEIGHT);

  const areas = getDPadAreas();

  // Draw d-pad buttons
  const buttons = [
    { area: areas.up, label: '\u25B2' },
    { area: areas.down, label: '\u25BC' },
    { area: areas.left, label: '\u25C0' },
    { area: areas.right, label: '\u25B6' },
  ];

  for (const btn of buttons) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(btn.area.x, btn.area.y, btn.area.w, btn.area.h, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.area.x + btn.area.w / 2, btn.area.y + btn.area.h / 2);
  }

  // Staff button
  const staffReady = state.shepherd.staffCooldown <= 0;
  ctx.fillStyle = staffReady ? 'rgba(76,175,80,0.3)' : 'rgba(100,100,100,0.2)';
  ctx.beginPath();
  ctx.roundRect(areas.staff.x, areas.staff.y, areas.staff.w, areas.staff.h, 12);
  ctx.fill();

  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = staffReady ? 1 : 0.4;
  ctx.fillText('\uD83E\uDE84', areas.staff.x + areas.staff.w / 2, areas.staff.y + areas.staff.h / 2);
  ctx.globalAlpha = 1;

  if (!staffReady) {
    const cd = Math.ceil(state.shepherd.staffCooldown / 1000);
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#FF9800';
    ctx.fillText(`${cd}s`, areas.staff.x + areas.staff.w / 2, areas.staff.y + areas.staff.h / 2 + 22);
  }

  // Score at bottom right
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`${state.score.toLocaleString()}`, CANVAS_WIDTH - 15, dpadY + DPAD_HEIGHT - 15);

  ctx.textAlign = 'left';
}

export function drawReadyScreen(ctx: CanvasRenderingContext2D, state: GameState, config: StageConfig): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('\uC78E\uC740 \uC591 \uCC3E\uAE30', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

  // Stage info
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`Stage ${state.stage}: ${config.name}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 45);

  // Sheep emoji
  ctx.font = '48px serif';
  ctx.fillText('\uD83D\uDC11', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

  // Instruction
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#BBBBBB';
  if (state.stage === 1) {
    ctx.fillText('\uBC29\uD5A5 \uBC84\uD2BC\uC73C\uB85C \uBAA9\uC790\uB97C \uC774\uB3D9\uD558\uC138\uC694', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    ctx.fillText('\uAE38\uC744 \uC78E\uC740 \uC591\uC744 \uCC3E\uC544 \uB370\uB824\uC624\uC138\uC694!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
  } else {
    ctx.fillText(`\uB291\uB300 ${config.wolfCount}\uB9C8\uB9AC\uB97C \uD53C\uD574 \uC591\uC744 \uCC3E\uC73C\uC138\uC694!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    ctx.fillText(`\uC81C\uD55C\uC2DC\uAC04: ${config.timeLimit}\uCD08`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
  }

  // Start prompt
  const blink = Math.sin(Date.now() / 400) > 0;
  if (blink) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('\uD130\uCE58\uD558\uC5EC \uC2DC\uC791', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
  }

  ctx.textAlign = 'left';
}

function drawRescueOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  const progress = 1 - state.rescueTimer / 2500;

  // Golden overlay
  ctx.fillStyle = `rgba(255,215,0,${0.3 * progress})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Rescue text
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 20;
  ctx.fillText('\uC591\uC744 \uCC3E\uC558\uC2B5\uB2C8\uB2E4!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

  // Shepherd + sheep animation
  ctx.font = '40px serif';
  const liftY = -30 * Math.min(1, progress * 2); // Lifting animation
  ctx.fillText('\uD83E\uDDD1\u200D\uD83C\uDF3E', CANVAS_WIDTH / 2 - 15, CANVAS_HEIGHT / 2 + 30);
  ctx.font = '28px serif';
  ctx.fillText('\uD83D\uDC11', CANVAS_WIDTH / 2 + 18, CANVAS_HEIGHT / 2 + 15 + liftY);

  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

export function drawPausedOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('\uC77C\uC2DC\uC815\uC9C0', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#BBBBBB';
  ctx.fillText('\uD130\uCE58\uD558\uC5EC \uACC4\uC18D', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

  ctx.textAlign = 'left';
}
