import type { BoardCell, StageConfig } from './types';

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;

/** 보드의 좌우 균형(토크)을 계산. 0 = 균형, 음수 = 왼쪽, 양수 = 오른쪽 */
export function calculateTilt(board: (BoardCell | null)[][]): number {
  const center = BOARD_COLS / 2; // 5.0
  let totalTorque = 0;
  let totalWeight = 0;

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = board[r][c];
      if (cell) {
        const distance = c - center + 0.5;
        totalTorque += cell.animal.weight * distance;
        totalWeight += cell.animal.weight;
      }
    }
  }

  if (totalWeight === 0) return 0;
  return totalTorque / totalWeight;
}

export function getBalanceStatus(
  tilt: number,
  stage: StageConfig
): 'safe' | 'warning' | 'danger' {
  const abs = Math.abs(tilt);
  if (abs >= stage.gameoverThreshold) return 'danger';
  if (abs >= stage.warningThreshold) return 'warning';
  return 'safe';
}
