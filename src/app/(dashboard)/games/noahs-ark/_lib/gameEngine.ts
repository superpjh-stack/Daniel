import type { ActiveBlock, BoardCell, BlockType, GameState, Rotation } from './types';
import { BLOCK_SHAPES, ANIMALS, createBag } from './blocks';
import { BOARD_ROWS, BOARD_COLS, calculateTilt } from './balance';

export { BOARD_ROWS, BOARD_COLS };

export function createBoard(): (BoardCell | null)[][] {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

export function getShape(type: BlockType, rotation: Rotation): number[][] {
  return BLOCK_SHAPES[type][rotation];
}

/** 블록이 해당 위치에 놓일 수 있는지 확인 */
export function isValidPosition(
  board: (BoardCell | null)[][],
  type: BlockType,
  rotation: Rotation,
  row: number,
  col: number
): boolean {
  const shape = getShape(type, rotation);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const br = row + r;
      const bc = col + c;
      if (br < 0 || br >= BOARD_ROWS || bc < 0 || bc >= BOARD_COLS) return false;
      if (board[br][bc] !== null) return false;
    }
  }
  return true;
}

/** 블록을 보드에 고정 */
export function lockBlock(board: (BoardCell | null)[][], block: ActiveBlock): void {
  const shape = getShape(block.type, block.rotation);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const br = block.row + r;
      const bc = block.col + c;
      if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
        board[br][bc] = { animal: block.animal, isQuiz: block.isQuiz };
      }
    }
  }
}

/** 완성된 줄 제거, 제거된 줄 수 반환 */
export function clearLines(board: (BoardCell | null)[][]): number {
  let cleared = 0;
  for (let r = BOARD_ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(Array(BOARD_COLS).fill(null));
      cleared++;
      r++; // 다시 검사
    }
  }
  return cleared;
}

/** 줄 제거 점수 */
export function getLineScore(lines: number): number {
  if (lines === 1) return 100;
  if (lines === 2) return 300;
  if (lines === 3) return 500;
  if (lines >= 4) return 800;
  return 0;
}

/** 꼭대기 도달 체크 (상단 2줄에 블록 있으면 위험) */
export function isTopReached(board: (BoardCell | null)[][]): boolean {
  return board[0].some(cell => cell !== null);
}

/** 새 블록 생성 */
export function spawnBlock(type: BlockType, isQuiz: boolean): ActiveBlock {
  return {
    type,
    rotation: 0,
    row: 0,
    col: 3,
    animal: ANIMALS[type],
    isQuiz,
  };
}

/** 고스트 블록 (착지 미리보기) 행 계산 */
export function getGhostRow(
  board: (BoardCell | null)[][],
  block: ActiveBlock
): number {
  let ghostRow = block.row;
  while (isValidPosition(board, block.type, block.rotation, ghostRow + 1, block.col)) {
    ghostRow++;
  }
  return ghostRow;
}

// 7-bag 시스템 관리
let bag: BlockType[] = [];

export function getNextType(): BlockType {
  if (bag.length === 0) bag = createBag();
  return bag.pop()!;
}

export function resetBag(): void {
  bag = [];
}

/** 게임 초기 상태 생성 */
export function createInitialState(stageNum: number): GameState {
  resetBag();
  const firstType = getNextType();
  const nextType = getNextType();
  return {
    board: createBoard(),
    activeBlock: spawnBlock(firstType, false),
    nextBlockType: nextType,
    stage: stageNum,
    score: 0,
    linesCleared: 0,
    totalLines: 0,
    status: 'ready',
    tilt: 0,
    quizCorrect: 0,
    quizTotal: 0,
    dropTimer: 0,
    quizQueue: [],
    blockCount: 0,
  };
}

/** 블록 이동 시도 */
export function tryMove(
  board: (BoardCell | null)[][],
  block: ActiveBlock,
  dRow: number,
  dCol: number
): boolean {
  if (isValidPosition(board, block.type, block.rotation, block.row + dRow, block.col + dCol)) {
    block.row += dRow;
    block.col += dCol;
    return true;
  }
  return false;
}

/** 블록 회전 시도 (벽 킥 포함) */
export function tryRotate(
  board: (BoardCell | null)[][],
  block: ActiveBlock
): boolean {
  const newRot = ((block.rotation + 1) % 4) as Rotation;
  // 기본 위치
  if (isValidPosition(board, block.type, newRot, block.row, block.col)) {
    block.rotation = newRot;
    return true;
  }
  // 벽 킥: 좌/우 1칸, 좌/우 2칸
  for (const kick of [1, -1, 2, -2]) {
    if (isValidPosition(board, block.type, newRot, block.row, block.col + kick)) {
      block.rotation = newRot;
      block.col += kick;
      return true;
    }
  }
  return false;
}

/** 하드 드롭: 즉시 착지, 점수 반환 */
export function hardDrop(
  board: (BoardCell | null)[][],
  block: ActiveBlock
): number {
  let distance = 0;
  while (isValidPosition(board, block.type, block.rotation, block.row + 1, block.col)) {
    block.row++;
    distance++;
  }
  return distance * 2;
}

/** 블록 착지 처리: 보드 고정 → 줄 제거 → 균형 계산 → 다음 블록.
 *  퀴즈 트리거 여부와 제거된 줄 수, 점수 반환 */
export function processLanding(state: GameState): {
  linesRemoved: number;
  scoreGained: number;
  quizTriggered: boolean;
  balanceTilt: number;
} {
  const block = state.activeBlock!;
  lockBlock(state.board, block);

  const wasQuiz = block.isQuiz;
  const linesRemoved = clearLines(state.board);
  const lineScore = getLineScore(linesRemoved);

  // 균형 보너스
  const tilt = calculateTilt(state.board);
  const balanceBonus = linesRemoved > 0 && Math.abs(tilt) < 0.5 ? 50 : 0;

  const scoreGained = lineScore + balanceBonus;

  state.score += scoreGained;
  state.linesCleared += linesRemoved;
  state.totalLines += linesRemoved;
  state.tilt = tilt;
  state.blockCount++;

  // 다음 블록
  const isNextQuiz = state.quizQueue.includes(state.blockCount);
  state.activeBlock = spawnBlock(state.nextBlockType, isNextQuiz);
  state.nextBlockType = getNextType();

  return {
    linesRemoved,
    scoreGained,
    quizTriggered: wasQuiz,
    balanceTilt: tilt,
  };
}

/** 스테이지 시작 시 퀴즈 블록 등장 타이밍 생성 */
export function generateQuizSchedule(quizCount: number, totalBlocksEstimate: number): number[] {
  const schedule: number[] = [];
  if (quizCount <= 0) return schedule;
  const interval = Math.floor(totalBlocksEstimate / (quizCount + 1));
  for (let i = 1; i <= quizCount; i++) {
    schedule.push(interval * i + Math.floor(Math.random() * 5) - 2);
  }
  return schedule;
}
