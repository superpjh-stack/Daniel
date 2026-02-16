import type { GameState, StageConfig } from './types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, HUD_HEIGHT, GAUGE_HEIGHT,
  FAITH_MAX, SLING_COOLDOWN,
} from './gameEngine';

/** 메인 렌더 */
export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  config: StageConfig,
): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground(ctx, state.slowMotion);
  drawGoliath(ctx, state);
  drawWeakPoints(ctx, state);
  drawObstacles(ctx, state);
  drawPrayerItems(ctx, state);
  drawSlings(ctx, state);
  drawDavid(ctx, state);
  drawDragGuide(ctx, state);
  drawHUD(ctx, state);
  drawFaithGauge(ctx, state);
  drawCooldownIndicator(ctx, state);
  drawGoliathHpBar(ctx, state);
}

function drawBackground(ctx: CanvasRenderingContext2D, slowMotion: boolean) {
  // 하늘
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.7);
  skyGrad.addColorStop(0, slowMotion ? '#fef3c7' : '#87CEEB');
  skyGrad.addColorStop(1, slowMotion ? '#fde68a' : '#E0F0FF');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.7);

  // 땅
  const groundGrad = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.7, 0, CANVAS_HEIGHT);
  groundGrad.addColorStop(0, '#90B77D');
  groundGrad.addColorStop(1, '#6B8E5A');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, CANVAS_HEIGHT * 0.7, CANVAS_WIDTH, CANVAS_HEIGHT * 0.3);

  // 슬로우 모션 효과
  if (slowMotion) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

function drawGoliath(ctx: CanvasRenderingContext2D, state: GameState) {
  const g = state.goliath;

  // 몸체
  ctx.fillStyle = '#5C4033';
  ctx.fillRect(g.x - g.width / 2, g.y - g.height / 2, g.width, g.height);

  // 갑옷
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(g.x - g.width / 2 + 10, g.y - g.height / 2 + 10, g.width - 20, g.height - 20);

  // 얼굴
  ctx.fillStyle = '#D2691E';
  ctx.fillRect(g.x - 20, g.y - g.height / 2 - 10, 40, 35);

  // 눈 (화난 표정)
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(g.x - 12, g.y - g.height / 2 + 2, 8, 6);
  ctx.fillRect(g.x + 4, g.y - g.height / 2 + 2, 8, 6);

  // 입
  ctx.fillStyle = '#8B0000';
  ctx.fillRect(g.x - 8, g.y - g.height / 2 + 15, 16, 5);

  // 투구
  ctx.fillStyle = '#696969';
  ctx.fillRect(g.x - 25, g.y - g.height / 2 - 15, 50, 10);
}

function drawWeakPoints(ctx: CanvasRenderingContext2D, state: GameState) {
  const g = state.goliath;

  for (const wp of g.weakPoints) {
    const x = g.x + wp.offsetX - wp.width / 2;
    const y = g.y + wp.offsetY - wp.height / 2;

    if (wp.isOpen) {
      // 빛나는 효과
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x, y, wp.width, wp.height);
      ctx.shadowBlur = 0;

      // 테두리
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, wp.width, wp.height);
    } else {
      // 닫힌 갑옷
      ctx.fillStyle = '#808080';
      ctx.fillRect(x, y, wp.width, wp.height);
      ctx.strokeStyle = '#606060';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, wp.width, wp.height);
    }
  }
}

function drawGoliathHpBar(ctx: CanvasRenderingContext2D, state: GameState) {
  const g = state.goliath;
  const barW = g.width;
  const barH = 8;
  const barX = g.x - barW / 2;
  const barY = g.y + g.height / 2 + 6;

  // 배경
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(barX, barY, barW, barH);

  // HP
  const ratio = Math.max(0, g.hp / g.maxHp);
  const hpColor = ratio > 0.5 ? '#ef4444' : ratio > 0.25 ? '#f97316' : '#dc2626';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * ratio, barH);

  // 테두리
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
}

function drawObstacles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const obs of state.obstacles) {
    if (!obs.active) continue;

    ctx.beginPath();

    if (obs.type === 'rock') {
      ctx.fillStyle = '#8B4513';
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (obs.type === 'spear') {
      // 창 (방향 따라 회전)
      const angle = Math.atan2(obs.vy, obs.vx);
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(angle);
      ctx.fillStyle = '#C0C0C0';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-14, -2, 10, 4);
      ctx.restore();
    } else if (obs.type === 'tracking-rock') {
      ctx.shadowColor = '#9333EA';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#7C3AED';
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#6D28D9';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

function drawPrayerItems(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.prayerItems) {
    if (!p.active) continue;

    // 빛나는 효과
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 십자가
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(p.x - 2, p.y - 6, 4, 12);
    ctx.fillRect(p.x - 5, p.y - 3, 10, 4);
  }
}

function drawSlings(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const s of state.slings) {
    if (!s.active) continue;

    // 잔상
    ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
    ctx.beginPath();
    ctx.arc(s.x - s.vx * 0.5, s.y - s.vy * 0.5, s.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // 물맷돌
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawDavid(ctx: CanvasRenderingContext2D, state: GameState) {
  const d = state.david;

  // 무적 시 깜빡임
  if (d.invincible && Math.floor(d.invincibleTimer / 100) % 2 === 0) return;

  const x = d.x - d.width / 2;
  const y = d.y - d.height / 2;

  // 몸체
  ctx.fillStyle = '#4169E1';
  ctx.fillRect(x + 5, y + 12, d.width - 10, d.height - 12);

  // 머리
  ctx.fillStyle = '#FDBCB4';
  ctx.beginPath();
  ctx.arc(d.x, y + 8, 10, 0, Math.PI * 2);
  ctx.fill();

  // 머리카락
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(d.x, y + 5, 10, Math.PI, Math.PI * 2);
  ctx.fill();

  // 물맷돌 (손에)
  if (state.slingCooldown <= 0) {
    ctx.fillStyle = '#A0A0A0';
    ctx.beginPath();
    ctx.arc(d.x + 12, y + 16, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDragGuide(ctx: CanvasRenderingContext2D, state: GameState) {
  const drag = state.dragState;
  if (!drag.isDragging) return;

  const dx = drag.startX - drag.currentX;
  const dy = drag.startY - drag.currentY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const power = Math.min(dist / 120, 1);

  // 점선 가이드라인
  const dots = 5;
  const spacing = 15 + power * 10;

  for (let i = 1; i <= dots; i++) {
    const px = state.david.x + nx * spacing * i;
    const py = (state.david.y - state.david.height / 2) + ny * spacing * i;

    const alpha = 0.8 - (i / dots) * 0.5;
    const r = 3 - (i / dots) * 1.5;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = power > 0.7 ? '#FFD700' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 드래그 원점 표시
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(drag.currentX, drag.currentY, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  // HUD 배경
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

  const y = HUD_HEIGHT / 2;

  // HP (하트)
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let hpText = '';
  for (let i = 0; i < state.david.maxHp; i++) {
    hpText += i < state.david.hp ? '\u2764\uFE0F' : '\uD83E\uDE76';
  }
  ctx.fillText(hpText, 8, y);

  // 점수
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.score.toLocaleString()}`, CANVAS_WIDTH / 2, y);

  // 스테이지
  ctx.textAlign = 'right';
  ctx.fillStyle = '#93C5FD';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`Stage ${state.stage}/5`, CANVAS_WIDTH - 8, y);
}

function drawFaithGauge(ctx: CanvasRenderingContext2D, state: GameState) {
  const barY = HUD_HEIGHT;
  const barW = CANVAS_WIDTH - 16;
  const barH = GAUGE_HEIGHT - 6;
  const barX = 8;

  // 라벨
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, GAUGE_HEIGHT);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2728', barX - 4, barY + GAUGE_HEIGHT / 2);

  // 바 배경
  const innerX = barX + 16;
  const innerW = barW - 16;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(innerX, barY + 3, innerW, barH);

  // 바 채우기
  const ratio = state.faithGauge.value / FAITH_MAX;
  if (state.faithGauge.isActive) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFD700';
  } else {
    ctx.fillStyle = '#EAB308';
  }
  ctx.fillRect(innerX, barY + 3, innerW * ratio, barH);
  ctx.shadowBlur = 0;

  // 퍼센트 텍스트
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(state.faithGauge.value)}%`, innerX + innerW - 2, barY + GAUGE_HEIGHT / 2);
}

function drawCooldownIndicator(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.slingCooldown <= 0) return;

  const ratio = state.slingCooldown / SLING_COOLDOWN;
  const d = state.david;

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(d.x, d.y + d.height / 2 + 10, 8, -Math.PI / 2, -Math.PI / 2 + (1 - ratio) * Math.PI * 2);
  ctx.stroke();
}

/** Ready 화면 */
export function drawReadyScreen(ctx: CanvasRenderingContext2D, stage: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2694\uFE0F \uB2E4\uC717\uC758 \uBB3C\uB9F7\uB3CC', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#93C5FD';
  ctx.fillText(`Stage ${stage}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('\uB4DC\uB798\uADF8\uD558\uC5EC \uBB3C\uB9F7\uB3CC\uC744 \uBC1C\uC0AC\uD558\uC138\uC694!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
  ctx.fillText('\uD130\uCE58\uD558\uAC70\uB098 \uC544\uBB34 \uD0A4\uB97C \uB20C\uB7EC \uC2DC\uC791', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);
}

/** 일시정지 오버레이 */
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
