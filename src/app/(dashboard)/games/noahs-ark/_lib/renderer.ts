import type { GameState, ActiveBlock, BoardCell, RainDrop, StageConfig } from './types';
import { BOARD_ROWS, BOARD_COLS } from './balance';
import { getShape, getGhostRow } from './gameEngine';
import { ANIMALS, BLOCK_SHAPES } from './blocks';

// 레이아웃 상수
const HUD_HEIGHT = 44;
const GAUGE_HEIGHT = 32;
const TOUCH_HEIGHT = 64;
const NEXT_BLOCK_SIZE = 4;
const SIDE_PANEL_WIDTH = 80;

export interface Layout {
  cellSize: number;
  boardX: number;
  boardY: number;
  boardW: number;
  boardH: number;
  canvasW: number;
  canvasH: number;
}

export interface TouchAreas {
  left: { x: number; y: number; w: number; h: number };
  rotate: { x: number; y: number; w: number; h: number };
  right: { x: number; y: number; w: number; h: number };
  drop: { x: number; y: number; w: number; h: number };
}

/** 캔버스 크기에 따른 레이아웃 계산 */
export function calculateLayout(canvasW: number, canvasH: number): Layout {
  const availH = canvasH - HUD_HEIGHT - GAUGE_HEIGHT - TOUCH_HEIGHT;
  const availW = canvasW - SIDE_PANEL_WIDTH;
  const cellFromH = Math.floor(availH / BOARD_ROWS);
  const cellFromW = Math.floor(availW / BOARD_COLS);
  const cellSize = Math.min(cellFromH, cellFromW, 28);
  const boardW = cellSize * BOARD_COLS;
  const boardH = cellSize * BOARD_ROWS;
  const boardX = Math.floor((canvasW - SIDE_PANEL_WIDTH - boardW) / 2);
  const boardY = HUD_HEIGHT;

  return { cellSize, boardX, boardY, boardW, boardH, canvasW, canvasH };
}

/** 메인 렌더 */
export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  layout: Layout,
  stageConfig: StageConfig,
  rainDrops: RainDrop[],
): TouchAreas {
  const { canvasW, canvasH } = layout;
  ctx.clearRect(0, 0, canvasW, canvasH);

  // 배경 (어두운 하늘)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(1, '#334155');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 비 파티클
  drawRain(ctx, rainDrops);

  // HUD
  drawHUD(ctx, state, layout);

  // 보드
  drawBoard(ctx, state.board, layout);

  // 고스트 블록
  if (state.activeBlock && state.status === 'playing') {
    drawGhostBlock(ctx, state.board, state.activeBlock, layout);
  }

  // 현재 블록
  if (state.activeBlock && (state.status === 'playing' || state.status === 'ready')) {
    drawActiveBlock(ctx, state.activeBlock, layout);
  }

  // 다음 블록 미리보기
  drawNextBlock(ctx, state.nextBlockType, layout);

  // 균형 게이지
  drawBalanceGauge(ctx, state.tilt, stageConfig, layout);

  // 모바일 터치 버튼
  const touchAreas = drawTouchButtons(ctx, layout);

  return touchAreas;
}

/** HUD (Stage, Score, Lines) */
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, layout: Layout) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, layout.canvasW, HUD_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'middle';

  const y = HUD_HEIGHT / 2;
  ctx.textAlign = 'left';
  ctx.fillText(`Stage ${state.stage}`, 8, y);

  ctx.textAlign = 'center';
  ctx.fillText(`${state.score.toLocaleString()}점`, layout.canvasW / 2, y);

  ctx.textAlign = 'right';
  ctx.fillText(`${state.linesCleared}줄`, layout.canvasW - 8, y);
}

/** 보드 그리드 + 고정 블록 */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: (BoardCell | null)[][],
  layout: Layout,
) {
  const { boardX, boardY, cellSize, boardW, boardH } = layout;

  // 보드 배경
  ctx.fillStyle = 'rgba(15,23,42,0.7)';
  ctx.fillRect(boardX, boardY, boardW, boardH);

  // 그리드
  ctx.strokeStyle = 'rgba(148,163,184,0.15)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= BOARD_ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(boardX, boardY + r * cellSize);
    ctx.lineTo(boardX + boardW, boardY + r * cellSize);
    ctx.stroke();
  }
  for (let c = 0; c <= BOARD_COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(boardX + c * cellSize, boardY);
    ctx.lineTo(boardX + c * cellSize, boardY + boardH);
    ctx.stroke();
  }

  // 고정 블록
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = board[r][c];
      if (cell) {
        drawCell(ctx, boardX + c * cellSize, boardY + r * cellSize, cellSize, cell.animal.color, cell.animal.emoji, cell.isQuiz);
      }
    }
  }
}

/** 셀 하나 그리기 */
function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  color: string, emoji: string, isQuiz: boolean,
) {
  const gap = 1;
  ctx.fillStyle = color;
  ctx.fillRect(x + gap, y + gap, size - gap * 2, size - gap * 2);

  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + gap, y + gap, size - gap * 2, 2);

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + gap, y + size - gap - 2, size - gap * 2, 2);

  // 이모지
  if (size >= 18) {
    ctx.font = `${Math.floor(size * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + size / 2, y + size / 2 + 1);
  }

  // 퀴즈 블록 표시
  if (isQuiz) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + gap + 1, y + gap + 1, size - gap * 2 - 2, size - gap * 2 - 2);
  }
}

/** 현재 활성 블록 */
function drawActiveBlock(
  ctx: CanvasRenderingContext2D,
  block: ActiveBlock,
  layout: Layout,
) {
  const shape = getShape(block.type, block.rotation);
  const { boardX, boardY, cellSize } = layout;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const x = boardX + (block.col + c) * cellSize;
      const y = boardY + (block.row + r) * cellSize;
      drawCell(ctx, x, y, cellSize, block.animal.color, block.animal.emoji, block.isQuiz);
    }
  }
}

/** 고스트(착지 미리보기) 블록 */
function drawGhostBlock(
  ctx: CanvasRenderingContext2D,
  board: (BoardCell | null)[][],
  block: ActiveBlock,
  layout: Layout,
) {
  const ghostRow = getGhostRow(board, block);
  if (ghostRow === block.row) return;

  const shape = getShape(block.type, block.rotation);
  const { boardX, boardY, cellSize } = layout;

  ctx.globalAlpha = 0.25;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const x = boardX + (block.col + c) * cellSize;
      const y = boardY + (ghostRow + r) * cellSize;
      ctx.fillStyle = block.animal.color;
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    }
  }
  ctx.globalAlpha = 1;
}

/** 다음 블록 미리보기 */
function drawNextBlock(
  ctx: CanvasRenderingContext2D,
  blockType: string,
  layout: Layout,
) {
  const { boardX, boardY, boardW, cellSize } = layout;
  const panelX = boardX + boardW + 8;
  const panelY = boardY;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXT', panelX + 30, panelY);

  const animal = ANIMALS[blockType as keyof typeof ANIMALS];
  if (!animal) return;

  const miniSize = Math.min(cellSize * 0.7, 16);
  const shapes = BLOCK_SHAPES[blockType as keyof typeof BLOCK_SHAPES];
  if (!shapes) return;
  const shape = shapes[0]; // rotation 0

  const boxY = panelY + 16;
  for (let r = 0; r < NEXT_BLOCK_SIZE; r++) {
    for (let c = 0; c < NEXT_BLOCK_SIZE; c++) {
      if (!shape[r][c]) continue;
      const x = panelX + c * miniSize + 4;
      const y = boxY + r * miniSize;
      ctx.fillStyle = animal.color;
      ctx.fillRect(x, y, miniSize - 1, miniSize - 1);
    }
  }

  // 동물 이름
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${animal.emoji} ${animal.name}`, panelX + 30, boxY + NEXT_BLOCK_SIZE * miniSize + 4);
}

/** 균형 게이지 */
function drawBalanceGauge(
  ctx: CanvasRenderingContext2D,
  tilt: number,
  stageConfig: StageConfig,
  layout: Layout,
) {
  const { boardX, boardY, boardW, cellSize } = layout;
  const gaugeY = boardY + BOARD_ROWS * cellSize + 4;
  const gaugeW = boardW;
  const gaugeH = 20;
  const gaugeX = boardX;

  // 배경
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);

  // 경고/위험 영역 표시
  const maxTilt = stageConfig.gameoverThreshold * 1.2;
  const warnRatio = stageConfig.warningThreshold / maxTilt;
  const dangerRatio = stageConfig.gameoverThreshold / maxTilt;

  // 안전 구간 (녹색)
  const safeW = gaugeW * warnRatio;
  ctx.fillStyle = 'rgba(34,197,94,0.3)';
  ctx.fillRect(gaugeX + gaugeW / 2 - safeW / 2, gaugeY, safeW, gaugeH);

  // 경고 구간 (노란색)
  ctx.fillStyle = 'rgba(234,179,8,0.3)';
  const warnW = gaugeW * dangerRatio;
  ctx.fillRect(gaugeX + gaugeW / 2 - warnW / 2, gaugeY, (warnW - safeW) / 2, gaugeH);
  ctx.fillRect(gaugeX + gaugeW / 2 + safeW / 2, gaugeY, (warnW - safeW) / 2, gaugeH);

  // 인디케이터
  const clampedTilt = Math.max(-maxTilt, Math.min(maxTilt, tilt));
  const indicatorX = gaugeX + gaugeW / 2 + (clampedTilt / maxTilt) * (gaugeW / 2);
  const absTilt = Math.abs(tilt);

  let indColor = '#22c55e'; // safe
  if (absTilt >= stageConfig.gameoverThreshold) {
    indColor = '#ef4444'; // danger
  } else if (absTilt >= stageConfig.warningThreshold) {
    indColor = '#eab308'; // warning
  }

  // 중앙선
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gaugeX + gaugeW / 2, gaugeY);
  ctx.lineTo(gaugeX + gaugeW / 2, gaugeY + gaugeH);
  ctx.stroke();

  // 인디케이터 마커
  ctx.fillStyle = indColor;
  ctx.beginPath();
  ctx.arc(indicatorX, gaugeY + gaugeH / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 방주 아이콘
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('⚖️', gaugeX - 18, gaugeY + gaugeH / 2 + 4);
  ctx.textAlign = 'right';
  ctx.fillText('⚖️', gaugeX + gaugeW + 18, gaugeY + gaugeH / 2 + 4);
}

/** 비 파티클 업데이트 */
export function updateRain(
  particles: RainDrop[],
  intensity: number,
  canvasW: number,
  canvasH: number,
): void {
  const targetCount = intensity * 30;

  // 부족하면 생성
  while (particles.length < targetCount) {
    particles.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH * -0.5,
      speed: 3 + Math.random() * 4,
      length: 8 + Math.random() * 12,
      opacity: 0.2 + Math.random() * 0.4,
    });
  }

  // 초과하면 제거
  while (particles.length > targetCount) {
    particles.pop();
  }

  // 이동
  for (const drop of particles) {
    drop.y += drop.speed;
    if (drop.y > canvasH) {
      drop.y = -drop.length;
      drop.x = Math.random() * canvasW;
    }
  }
}

/** 비 파티클 렌더 */
function drawRain(ctx: CanvasRenderingContext2D, particles: RainDrop[]) {
  ctx.strokeStyle = 'rgba(147,197,253,0.5)';
  ctx.lineWidth = 1;
  for (const drop of particles) {
    ctx.globalAlpha = drop.opacity;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 1, drop.y + drop.length);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Ready 화면 */
export function drawReadyScreen(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  stage: number,
) {
  const { canvasW, canvasH } = layout;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚢 노아의 방주', canvasW / 2, canvasH / 2 - 40);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText(`Stage ${stage}`, canvasW / 2, canvasH / 2);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('터치하거나 아무 키를 눌러 시작', canvasW / 2, canvasH / 2 + 36);
}

/** 일시정지 오버레이 */
export function drawPausedOverlay(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
) {
  const { canvasW, canvasH } = layout;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⏸ 일시정지', canvasW / 2, canvasH / 2);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('터치하거나 P키로 재개', canvasW / 2, canvasH / 2 + 30);
}

/** 모바일 터치 버튼 */
function drawTouchButtons(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
): TouchAreas {
  const { canvasW, canvasH } = layout;
  const btnY = canvasH - TOUCH_HEIGHT;
  const btnW = Math.floor(canvasW / 4);
  const btnH = TOUCH_HEIGHT;

  const buttons = [
    { label: '←', key: 'left' },
    { label: '↻', key: 'rotate' },
    { label: '→', key: 'right' },
    { label: '▼', key: 'drop' },
  ];

  const areas: Record<string, { x: number; y: number; w: number; h: number }> = {};

  buttons.forEach((btn, i) => {
    const x = i * btnW;
    areas[btn.key] = { x, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 1, btnY + 1, btnW - 2, btnH - 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, btnY + 1, btnW - 2, btnH - 2);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, x + btnW / 2, btnY + btnH / 2);
  });

  return areas as unknown as TouchAreas;
}
