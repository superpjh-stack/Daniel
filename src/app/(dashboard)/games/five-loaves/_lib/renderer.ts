import type { GameState, StageConfig, Crowd, ServingAnimation } from './types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, HUD_HEIGHT, GAUGE_HEIGHT,
  CROWD_AREA_TOP, LANE_HEIGHT, BASKET_WIDTH,
  MIRACLE_MAX, SERVING_ARC_HEIGHT,
} from './gameEngine';

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  config: StageConfig,
): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground(ctx, state.miracleGauge.isActive);
  drawLanes(ctx, config.lanes);
  drawCrowds(ctx, state);
  drawBasket(ctx, state);
  drawServingAnims(ctx, state);
  drawParticles(ctx, state);
  drawHUD(ctx, state);
  drawCounters(ctx, state);
  drawMiracleGauge(ctx, state);
  drawDiscipleStatus(ctx, state);
  if (state.miracleGauge.isActive) drawMiracleOverlay(ctx);
  drawComboText(ctx, state);
}

function drawBackground(ctx: CanvasRenderingContext2D, isMiracle: boolean) {
  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.65);
  skyGrad.addColorStop(0, isMiracle ? '#fef3c7' : '#87CEEB');
  skyGrad.addColorStop(1, isMiracle ? '#fde68a' : '#E0F0FF');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.65);

  // Ground (grassland)
  const groundGrad = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.65, 0, CANVAS_HEIGHT);
  groundGrad.addColorStop(0, '#90B77D');
  groundGrad.addColorStop(1, '#6B8E5A');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, CANVAS_HEIGHT * 0.65, CANVAS_WIDTH, CANVAS_HEIGHT * 0.35);
}

function drawLanes(ctx: CanvasRenderingContext2D, laneCount: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  for (let i = 0; i < laneCount; i++) {
    const y = CROWD_AREA_TOP + 30 + i * LANE_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCrowds(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const crowd of state.crowds) {
    drawSingleCrowd(ctx, crowd);
  }
}

function drawSingleCrowd(ctx: CanvasRenderingContext2D, crowd: Crowd) {
  if (crowd.x < -60 || crowd.x > CANVAS_WIDTH + 60) return;

  const alpha = crowd.leaving ? 0.5 : crowd.served ? 0.3 : 1;
  ctx.globalAlpha = alpha;

  // Character emoji
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(crowd.emoji, crowd.x, crowd.y);

  if (!crowd.served && !crowd.leaving) {
    // Speech bubble with wanted food
    const bubbleX = crowd.x;
    const bubbleY = crowd.y - 30;
    const bubbleW = 28;
    const bubbleH = 24;

    // Bubble background
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.roundRect(bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bubble pointer
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(bubbleX - 4, bubbleY + bubbleH / 2);
    ctx.lineTo(bubbleX, bubbleY + bubbleH / 2 + 6);
    ctx.lineTo(bubbleX + 4, bubbleY + bubbleH / 2);
    ctx.fill();

    // Food emoji
    const foodEmoji = crowd.wantFood === 'bread' ? '\u{1F35E}' : '\u{1F41F}';
    ctx.font = '14px sans-serif';
    ctx.fillText(foodEmoji, bubbleX, bubbleY);

    // Patience bar
    const pRatio = Math.max(0, crowd.patience / crowd.maxPatience);
    const barW = 30;
    const barH = 4;
    const barX = crowd.x - barW / 2;
    const barY = crowd.y + 18;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(barX, barY, barW, barH);

    const color = pRatio > 0.5 ? '#22c55e' : pRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barW * pRatio, barH);
  }

  // Served sparkle
  if (crowd.served) {
    ctx.font = '16px sans-serif';
    ctx.fillText('\u2728', crowd.x + 12, crowd.y - 12);
  }

  ctx.globalAlpha = 1;
}

function drawBasket(ctx: CanvasRenderingContext2D, state: GameState) {
  const b = state.basket;
  const pulse = state.basketPulse > 0 ? 1 + (state.basketPulse / 300) * 0.15 : 1;

  ctx.save();
  if (pulse > 1) {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.translate(-cx, -cy);
  }

  // Basket body
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.width, b.height, 12);
  ctx.fill();

  // Inner basket color
  ctx.fillStyle = '#A0522D';
  ctx.beginPath();
  ctx.roundRect(b.x + 6, b.y + 6, b.width - 12, b.height - 12, 8);
  ctx.fill();

  // Weave lines
  ctx.strokeStyle = 'rgba(139,69,19,0.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const ly = b.y + (b.height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(b.x + 8, ly);
    ctx.lineTo(b.x + b.width - 8, ly);
    ctx.stroke();
  }

  // Food inside basket
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  ctx.fillText('\u{1F35E}', cx - 20, cy - 5);
  ctx.fillText('\u{1F41F}', cx + 5, cy - 5);
  ctx.fillText('\u{1F35E}', cx - 8, cy + 12);
  ctx.fillText('\u{1F41F}', cx + 20, cy + 5);
  ctx.fillText('\u{1F35E}', cx - 25, cy + 10);

  // Miracle glow on basket
  if (state.miracleGauge.isActive || state.basketPulse > 0) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4, 14);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sparkle
    ctx.font = '14px sans-serif';
    ctx.fillText('\u2728', b.x + b.width - 4, b.y - 4);
  }

  ctx.restore();

  // Serving buttons (below basket)
  const btnY = b.y + b.height + 12;
  const btnW = 80;
  const btnH = 40;
  const gap = 16;
  const totalW = btnW * 2 + gap;
  const startX = (CANVAS_WIDTH - totalW) / 2;

  // Bread button
  drawButton(ctx, startX, btnY, btnW, btnH, '\u{1F35E}', '#F59E0B');
  // Fish button
  drawButton(ctx, startX + btnW + gap, btnY, btnW, btnH, '\u{1F41F}', '#3B82F6');
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  emoji: string, color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, h / 2, [8, 8, 0, 0]);
  ctx.fill();

  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x + w / 2, y + h / 2);
}

function drawServingAnims(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const anim of state.servingAnims) {
    if (!anim.active) continue;
    drawServingAnim(ctx, anim);
  }
}

function drawServingAnim(ctx: CanvasRenderingContext2D, anim: ServingAnimation) {
  const t = anim.progress;
  // Bezier curve path (parabolic arc)
  const midX = (anim.startX + anim.targetX) / 2;
  const midY = Math.min(anim.startY, anim.targetY) - SERVING_ARC_HEIGHT;

  const x = (1 - t) * (1 - t) * anim.startX + 2 * (1 - t) * t * midX + t * t * anim.targetX;
  const y = (1 - t) * (1 - t) * anim.startY + 2 * (1 - t) * t * midY + t * t * anim.targetY;

  const emoji = anim.foodType === 'bread' ? '\u{1F35E}' : '\u{1F41F}';
  const size = 16 + (1 - Math.abs(t - 0.5) * 2) * 4; // Larger at peak

  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  // HUD background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

  const y1 = 20;
  const y2 = 42;

  // HP (hearts)
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let hpText = '';
  for (let i = 0; i < state.maxHp; i++) {
    hpText += i < state.hp ? '\u2764\uFE0F' : '\u{1FA76}';
  }
  ctx.fillText(hpText, 8, y1);

  // Score
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.score.toLocaleString()}`, CANVAS_WIDTH / 2, y1);

  // Stage
  ctx.textAlign = 'right';
  ctx.fillStyle = '#93C5FD';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`Stage ${state.stage}/5`, CANVAS_WIDTH - 8, y1);

  // Bread & Fish counters
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FCD34D';
  ctx.fillText(`\u{1F35E} ${state.totalBread}`, 8, y2);
  ctx.fillText(`\u{1F41F} ${state.totalFish}`, 70, y2);

  // Served / target
  ctx.textAlign = 'right';
  ctx.fillStyle = '#86EFAC';
  ctx.font = '11px sans-serif';
  const target = state.stage <= 5
    ? [15, 25, 40, 60, 80][state.stage - 1]
    : 80;
  ctx.fillText(`${state.servedCount}/${target}\uBA85`, CANVAS_WIDTH - 8, y2);
}

function drawCounters(_ctx: CanvasRenderingContext2D, _state: GameState) {
  // Counters are already drawn in HUD
}

function drawMiracleGauge(ctx: CanvasRenderingContext2D, state: GameState) {
  const barY = HUD_HEIGHT;
  const barH = GAUGE_HEIGHT - 6;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, GAUGE_HEIGHT);

  // Label
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2728', 4, barY + GAUGE_HEIGHT / 2);

  // Bar
  const innerX = 20;
  const innerW = CANVAS_WIDTH - 28;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(innerX, barY + 3, innerW, barH);

  const ratio = state.miracleGauge.value / MIRACLE_MAX;
  if (state.miracleGauge.isActive) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFD700';
  } else {
    ctx.fillStyle = ratio > 0.8 ? '#F59E0B' : '#EAB308';
  }
  ctx.fillRect(innerX, barY + 3, innerW * ratio, barH);
  ctx.shadowBlur = 0;

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'right';
  if (state.miracleGauge.isActive) {
    const secs = Math.ceil(state.miracleGauge.activeTimer / 1000);
    ctx.fillText(`\uAE30\uC801 ${secs}s`, innerX + innerW - 2, barY + GAUGE_HEIGHT / 2);
  } else {
    ctx.fillText(`${Math.floor(state.miracleGauge.value)}%`, innerX + innerW - 2, barY + GAUGE_HEIGHT / 2);
  }
}

function drawDiscipleStatus(ctx: CanvasRenderingContext2D, state: GameState) {
  const activeDisciples = state.disciples.filter(d => d.level > 0);
  if (activeDisciples.length === 0) return;

  const startY = CANVAS_HEIGHT - 180;
  const startX = 8;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.roundRect(startX, startY, 90, 12 + activeDisciples.length * 14, 6);
  ctx.fill();

  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  activeDisciples.forEach((d, i) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${d.emoji} ${d.name} Lv.${d.level}`, startX + 6, startY + 10 + i * 14);
  });
}

function drawMiracleOverlay(ctx: CanvasRenderingContext2D) {
  // Golden border glow
  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.4)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);

  // Light overlay
  ctx.fillStyle = 'rgba(255,215,0,0.06)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}

function drawComboText(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.comboCount < 3) return;

  const text = `x${state.comboCount} COMBO!`;
  const size = Math.min(24, 16 + state.comboCount);

  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeText(text, CANVAS_WIDTH / 2, CROWD_AREA_TOP - 10);

  // Fill
  ctx.fillStyle = '#FFD700';
  ctx.fillText(text, CANVAS_WIDTH / 2, CROWD_AREA_TOP - 10);
  ctx.restore();
}

// Button hit areas for touch (bread / fish buttons below basket)
export function getButtonHitAreas(state: GameState): { bread: { x: number; y: number; w: number; h: number }; fish: { x: number; y: number; w: number; h: number } } {
  const b = state.basket;
  const btnY = b.y + b.height + 12;
  const btnW = 80;
  const btnH = 40;
  const gap = 16;
  const totalW = btnW * 2 + gap;
  const startX = (CANVAS_WIDTH - totalW) / 2;

  return {
    bread: { x: startX, y: btnY, w: btnW, h: btnH },
    fish: { x: startX + btnW + gap, y: btnY, w: btnW, h: btnH },
  };
}

export function drawReadyScreen(ctx: CanvasRenderingContext2D, stage: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u{1F35E} \uC624\uBCD1\uC774\uC5B4\uC758 \uAE30\uC801', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#FCD34D';
  ctx.fillText(`Stage ${stage}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('\uAD70\uC911\uC744 \uD130\uCE58\uD558\uC5EC \uC74C\uC2DD\uC744 \uB098\uB220\uC8FC\uC138\uC694!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);
  ctx.fillText('\uD130\uCE58\uD558\uAC70\uB098 \uC544\uBB34 \uD0A4\uB97C \uB20C\uB7EC \uC2DC\uC791', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);

  // Instructions
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('\u{1F35E} \u{1F41F} \uBC84\uD2BC\uC744 \uB204\uB974\uAC70\uB098 \uAD70\uC911\uC744 \uC9C1\uC811 \uD130\uCE58!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
}

export function drawPausedOverlay(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u23F8 \uC77C\uC2DC\uC815\uC9C0', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('\uD130\uCE58\uD558\uAC70\uB098 P\uD0A4\uB85C \uC7AC\uAC1C', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}
