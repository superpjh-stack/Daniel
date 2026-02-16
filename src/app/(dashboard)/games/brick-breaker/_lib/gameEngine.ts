import type { Ball, Paddle, Brick, GameState } from './types';

const BASE_BALL_SPEED = 3;
const PADDLE_SPEED = 8;

export function createBall(canvasW: number, canvasH: number, speedMultiplier: number): Ball {
  const speed = BASE_BALL_SPEED * speedMultiplier;
  return {
    x: canvasW / 2,
    y: canvasH - 50,
    radius: 6,
    dx: speed * (Math.random() > 0.5 ? 1 : -1),
    dy: -speed,
    speed,
  };
}

export function createPaddle(canvasW: number, canvasH: number): Paddle {
  const width = 80;
  return {
    x: canvasW / 2 - width / 2,
    y: canvasH - 30,
    width,
    height: 12,
  };
}

export function movePaddleLeft(paddle: Paddle): void {
  paddle.x = Math.max(0, paddle.x - PADDLE_SPEED);
}

export function movePaddleRight(paddle: Paddle, canvasW: number): void {
  paddle.x = Math.min(canvasW - paddle.width, paddle.x + PADDLE_SPEED);
}

export function setPaddleX(paddle: Paddle, x: number, canvasW: number): void {
  paddle.x = Math.max(0, Math.min(canvasW - paddle.width, x - paddle.width / 2));
}

/**
 * 공 업데이트 + 충돌 감지. 퀴즈 벽돌 히트 시 quizIndex 반환.
 * 공을 놓치면 false 반환.
 */
export interface BallUpdateResult {
  lost: boolean;
  quizTriggered: number | null;
  verseTriggered: string | null;
  wallBounce: boolean;
  paddleHit: boolean;
  brickHit: { type: string; destroyed: boolean } | null;
}

export function updateBall(
  state: GameState,
  canvasW: number,
  canvasH: number
): BallUpdateResult {
  const { ball, paddle, bricks } = state;
  let quizTriggered: number | null = null;
  let verseTriggered: string | null = null;
  let wallBounce = false;
  let paddleHit = false;
  let brickHit: { type: string; destroyed: boolean } | null = null;

  ball.x += ball.dx;
  ball.y += ball.dy;

  // 좌/우 벽
  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.dx = Math.abs(ball.dx);
    wallBounce = true;
  }
  if (ball.x + ball.radius >= canvasW) {
    ball.x = canvasW - ball.radius;
    ball.dx = -Math.abs(ball.dx);
    wallBounce = true;
  }

  // 상단 벽
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy);
    wallBounce = true;
  }

  // 하단 — 공 놓침
  if (ball.y + ball.radius >= canvasH) {
    return { lost: true, quizTriggered: null, verseTriggered: null, wallBounce: false, paddleHit: false, brickHit: null };
  }

  // 패들 충돌
  if (
    ball.dy > 0 &&
    ball.y + ball.radius >= paddle.y &&
    ball.y + ball.radius <= paddle.y + paddle.height + 4 &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width
  ) {
    ball.dy = -Math.abs(ball.dy);
    // 패들 어디 맞았느냐에 따라 반사각 조절
    const hitPos = (ball.x - paddle.x) / paddle.width; // 0~1
    const angle = (hitPos - 0.5) * 1.2; // -0.6 ~ +0.6
    ball.dx = ball.speed * Math.sin(angle * Math.PI);
    ball.dy = -ball.speed * Math.cos(angle * Math.PI);
    paddleHit = true;
  }

  // 벽돌 충돌
  for (const brick of bricks) {
    if (brick.destroyed) continue;

    if (
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.width &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.height
    ) {
      // 충돌 방향 판별
      const overlapLeft = ball.x + ball.radius - brick.x;
      const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
      const overlapTop = ball.y + ball.radius - brick.y;
      const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapTop || minOverlap === overlapBottom) {
        ball.dy = -ball.dy;
      } else {
        ball.dx = -ball.dx;
      }

      brick.hp--;
      const destroyed = brick.hp <= 0;
      brickHit = { type: brick.type, destroyed };

      if (destroyed) {
        brick.destroyed = true;
        state.score += brick.points;

        if (brick.type === 'quiz' && brick.quizIndex !== undefined) {
          quizTriggered = brick.quizIndex;
        }
        if (brick.type === 'verse' && brick.verseText) {
          verseTriggered = brick.verseText;
        }
      } else {
        // 강화 벽돌: 색상 변경 (hp 1 남으면 더 밝게)
        brick.color = '#fb923c';
      }

      break; // 한 프레임에 하나만 처리
    }
  }

  return { lost: false, quizTriggered, verseTriggered, wallBounce, paddleHit, brickHit };
}

export function allBricksDestroyed(bricks: Brick[]): boolean {
  return bricks.every(b => b.destroyed);
}

// === 렌더링 ===

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number): void {
  // 배경
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 벽돌
  for (const brick of state.bricks) {
    if (brick.destroyed) continue;
    drawBrick(ctx, brick);
  }

  // 공
  drawBall(ctx, state.ball);

  // 패들
  drawPaddle(ctx, state.paddle);

  // HUD
  drawHUD(ctx, state, canvasW);
}

function drawBrick(ctx: CanvasRenderingContext2D, brick: Brick): void {
  const r = 4;
  ctx.beginPath();
  ctx.roundRect(brick.x, brick.y, brick.width, brick.height, r);
  ctx.fillStyle = brick.color;
  ctx.fill();

  // 퀴즈 벽돌 아이콘
  if (brick.type === 'quiz') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Q', brick.x + brick.width / 2, brick.y + brick.height / 2);
  }

  // 성경구절 벽돌
  if (brick.type === 'verse' && brick.verseText) {
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(brick.verseText, brick.x + brick.width / 2, brick.y + brick.height / 2);
  }

  // 강화 벽돌 HP 표시
  if (brick.type === 'strong' && brick.hp > 1) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${brick.hp}`, brick.x + brick.width / 2, brick.y + brick.height / 2);
  }
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle): void {
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
  gradient.addColorStop(0, '#8b5cf6');
  gradient.addColorStop(1, '#6366f1');

  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number): void {
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Stage ${state.stage}`, 10, 20);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`${state.score.toLocaleString()}`, canvasW / 2, 20);

  ctx.textAlign = 'right';
  ctx.fillText('❤️'.repeat(state.lives), canvasW - 10, 20);
}

export function drawReadyScreen(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, stage: number): void {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Stage ${stage}`, canvasW / 2, canvasH / 2 - 30);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px sans-serif';
  ctx.fillText('클릭하여 시작', canvasW / 2, canvasH / 2 + 20);
}

export function drawPausedOverlay(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('일시정지', canvasW / 2, canvasH / 2 - 10);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.fillText('클릭하여 계속', canvasW / 2, canvasH / 2 + 20);
}
