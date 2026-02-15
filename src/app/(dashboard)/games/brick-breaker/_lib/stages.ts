import type { StageConfig, Brick, BrickType } from './types';

export const STAGES: StageConfig[] = [
  { stage: 1, rows: 3, cols: 6, ballSpeed: 1.0, quizCount: 2, strongCount: 0, verseCount: 2 },
  { stage: 2, rows: 4, cols: 6, ballSpeed: 1.2, quizCount: 3, strongCount: 4, verseCount: 3 },
  { stage: 3, rows: 4, cols: 7, ballSpeed: 1.3, quizCount: 4, strongCount: 6, verseCount: 3 },
  { stage: 4, rows: 5, cols: 7, ballSpeed: 1.5, quizCount: 5, strongCount: 8, verseCount: 4 },
  { stage: 5, rows: 5, cols: 8, ballSpeed: 1.7, quizCount: 6, strongCount: 10, verseCount: 5 },
];

const BRICK_COLORS: Record<BrickType, string[]> = {
  normal: ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#ec4899'],
  strong: ['#f97316'],
  quiz: ['#eab308'],
  verse: ['#38bdf8'],
};

const BIBLE_VERSES = [
  '창 1:1', '창 1:27', '시 23:1', '시 119:105', '잠 3:5',
  '사 40:31', '렘 29:11', '요 3:16', '요 14:6', '롬 8:28',
  '롬 12:2', '빌 4:13', '히 11:1', '약 1:5', '벧전 5:7',
  '요일 4:8', '마 28:20', '막 10:27', '눅 6:31', '고전 13:4',
];

export function generateBricks(
  stageConfig: StageConfig,
  canvasWidth: number,
  topOffset: number = 60
): Brick[] {
  const { rows, cols, quizCount, strongCount, verseCount } = stageConfig;
  const padding = 4;
  const brickWidth = (canvasWidth - padding * (cols + 1)) / cols;
  const brickHeight = 24;

  // 총 벽돌 수
  const total = rows * cols;
  const specialCount = quizCount + strongCount + verseCount;
  const normalCount = total - specialCount;

  // 타입 배열 생성 후 셔플
  const types: BrickType[] = [
    ...Array(Math.max(0, normalCount)).fill('normal'),
    ...Array(quizCount).fill('quiz'),
    ...Array(strongCount).fill('strong'),
    ...Array(verseCount).fill('verse'),
  ];

  // Fisher-Yates shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  let quizIdx = 0;
  let verseIdx = Math.floor(Math.random() * BIBLE_VERSES.length);

  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const type = types[idx] || 'normal';
      const x = padding + c * (brickWidth + padding);
      const y = topOffset + r * (brickHeight + padding);

      const brick: Brick = {
        x, y,
        width: brickWidth,
        height: brickHeight,
        type,
        hp: type === 'strong' ? 2 : 1,
        color: type === 'normal'
          ? BRICK_COLORS.normal[(r + c) % BRICK_COLORS.normal.length]
          : BRICK_COLORS[type][0],
        points: type === 'quiz' ? 50 : type === 'strong' ? 30 : type === 'verse' ? 20 : 10,
        destroyed: false,
      };

      if (type === 'quiz') {
        brick.quizIndex = quizIdx++;
      }
      if (type === 'verse') {
        brick.verseText = BIBLE_VERSES[verseIdx % BIBLE_VERSES.length];
        verseIdx++;
      }

      bricks.push(brick);
    }
  }

  return bricks;
}
