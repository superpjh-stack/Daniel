import type { StageConfig, TileType, Position } from './types';

// W=wall, P=path, C=cliff, B=bush, R=rock, S=star, H=water(checkpoint), E=sheep, N=pen(start)
type TileChar = 'W' | 'P' | 'C' | 'B' | 'R' | 'S' | 'H' | 'E' | 'N';

const TILE_MAP: Record<TileChar, TileType> = {
  W: 'wall', P: 'path', C: 'cliff', B: 'bush',
  R: 'rock', S: 'star', H: 'water', E: 'sheep', N: 'pen',
};

function parseMaze(rows: string[]): TileType[][] {
  return rows.map(row => {
    const tiles: TileType[] = [];
    for (let i = 0; i < row.length; i++) {
      tiles.push(TILE_MAP[row[i] as TileChar] ?? 'wall');
    }
    return tiles;
  });
}

function findPos(maze: TileType[][], type: TileType): Position {
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze[r].length; c++) {
      if (maze[r][c] === type) return { row: r, col: c };
    }
  }
  return { row: 0, col: 0 };
}

function findAll(maze: TileType[][], type: TileType): Position[] {
  const res: Position[] = [];
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze[r].length; c++) {
      if (maze[r][c] === type) res.push({ row: r, col: c });
    }
  }
  return res;
}

// Stage 1: Green Meadow (13x17) - Simple, no wolves, tutorial
const MAZE_1_RAW = [
  'WWWWWWWWWWWWW',
  'WNPPPPPPPWWWW',
  'WWWWWWWPWWWWW',
  'WWWPPPPPPPWWW',
  'WWWPWWWWWPWWW',
  'WWWPWWWWWPWWW',
  'WPPPPWWSPPPWW',
  'WPWWWWWWWWPWW',
  'WPWWSPPPPWPWW',
  'WPWWWWWWPWPWW',
  'WPPPPPWWPPPWW',
  'WWWWWPWWWWPWW',
  'WWWWWPPPSPWWW',
  'WWWWWWWWPPWWW',
  'WWWWWWWWPWWWW',
  'WWWWWWSHPWWWW',
  'WWWWWWWEPWWWW',
];

// Stage 2: Forest (13x17) - Bushes, 1 wolf
const MAZE_2_RAW = [
  'WWWWWWWWWWWWW',
  'WNPPPWWWWWWWW',
  'WWWWPWWPPPWWW',
  'WPPPPBPPWPWWW',
  'WPWWWWWWWPWWW',
  'WPWBPPPPWPSWW',
  'WPWWWWWPWPPWW',
  'WPPPSPWPPWPWW',
  'WWWWWPWWWWPWW',
  'WPPBPPBPPPPWW',
  'WPWWWWWWWWWWW',
  'WPPPPPWPPPWWW',
  'WWWWWPWPWWWWW',
  'WPPPPPPPPSWWW',
  'WPWWWWWWWWWWW',
  'WHPPPPPPPPWWW',
  'WWWWWWWWEPWWW',
];

// Stage 3: Cliff (13x17) - Cliffs + rock puzzles, 2 wolves
const MAZE_3_RAW = [
  'WWWWWWWWWWWWW',
  'WNPPPWWPPPWWW',
  'WWWWPWWPWWWWW',
  'WPPPPPPPSPWWW',
  'WPWWCWWWWPWWW',
  'WPWWPWPPPPPWW',
  'WPPPPWPWWWPWW',
  'WWWPWWPWWWPWW',
  'WHPPPPPPWSPWW',
  'WWWWWWWPWWPWW',
  'WPPPPSWPCPPWW',
  'WPWWWWWWWWPWW',
  'WPPPPPPPPPPWW',
  'WWWWWWWWWWPWW',
  'WPPPSPPPWWPWW',
  'WPWWWWWPHPPWW',
  'WPPPPPPWWEWWW',
];

// Stage 4: Valley of Shadow (13x17) - Dark, 2 fast wolves
const MAZE_4_RAW = [
  'WWWWWWWWWWWWW',
  'WNPPPPWPPPWWW',
  'WWWWWPWPWPWWW',
  'WPPPPPBPWPSWW',
  'WPWWWWWWWPPWW',
  'WPPPPSPWWWPWW',
  'WWWWWWWPWWPWW',
  'WHPPPPPPPPPWW',
  'WWPWWWWWWWWWW',
  'WWPPPBPPPPPWW',
  'WWWWWWWWWWPWW',
  'WPPPPPSWPPPWW',
  'WPWWWWWWWWWWW',
  'WPPPPPPBPPPWW',
  'WWWWWWWWWWPWW',
  'WHPPPPPPPPEWW',
  'WWWWWWWWWWWWW',
];

// Stage 5: Wilderness (13x17) - All elements, 3 wolves
const MAZE_5_RAW = [
  'WWWWWWWWWWWWW',
  'WNPPPPWPSPWWW',
  'WWWWWPWPWWPWW',
  'WPPPPPPPPWPWW',
  'WPWWCWWWWPPWW',
  'WPWWPWSPPPWWW',
  'WBPPPPWWWPWWW',
  'WWWPWWPPPPPWW',
  'WHPPBWPWWWPWW',
  'WWWWWWPWSWPWW',
  'WPPPPPPPWWPWW',
  'WPWWWCWWWPPWW',
  'WPPPPPPBPWPWW',
  'WWWWWWWWPPPWW',
  'WPPSPPPWWWPWW',
  'WPWWWWWHPPPWW',
  'WPPPPPPWWEWWW',
];

export const MAZES_RAW = [MAZE_1_RAW, MAZE_2_RAW, MAZE_3_RAW, MAZE_4_RAW, MAZE_5_RAW];

export function getMaze(stageIndex: number) {
  const raw = MAZES_RAW[stageIndex] ?? MAZES_RAW[0];
  const maze = parseMaze(raw);
  const sheepPos = findPos(maze, 'sheep');
  const penPos = findPos(maze, 'pen');
  const stars = findAll(maze, 'star');
  const checkpoints = findAll(maze, 'water');
  return { maze, sheepPos, penPos, stars, checkpoints };
}

// Wolf patrol paths per stage
export const WOLF_PATROLS: Position[][][] = [
  // Stage 1: no wolves
  [],
  // Stage 2: 1 wolf
  [
    [{ row: 5, col: 4 }, { row: 5, col: 7 }, { row: 9, col: 7 }, { row: 9, col: 4 }],
  ],
  // Stage 3: 2 wolves
  [
    [{ row: 3, col: 3 }, { row: 3, col: 7 }, { row: 6, col: 7 }, { row: 6, col: 3 }],
    [{ row: 10, col: 1 }, { row: 10, col: 5 }, { row: 14, col: 5 }, { row: 14, col: 1 }],
  ],
  // Stage 4: 2 wolves (faster)
  [
    [{ row: 3, col: 1 }, { row: 3, col: 5 }, { row: 7, col: 5 }, { row: 7, col: 1 }],
    [{ row: 9, col: 3 }, { row: 9, col: 8 }, { row: 13, col: 8 }, { row: 13, col: 3 }],
  ],
  // Stage 5: 3 wolves
  [
    [{ row: 3, col: 1 }, { row: 3, col: 6 }, { row: 6, col: 6 }, { row: 6, col: 1 }],
    [{ row: 8, col: 4 }, { row: 8, col: 9 }, { row: 12, col: 9 }, { row: 12, col: 4 }],
    [{ row: 13, col: 1 }, { row: 13, col: 7 }, { row: 15, col: 7 }, { row: 15, col: 1 }],
  ],
];

export const STAGES: StageConfig[] = [
  {
    stage: 1,
    name: '초원 미로',
    mazeIndex: 0,
    timeLimit: 90,
    wolfCount: 0,
    wolfSpeed: 0,
    wolfSightRange: 0,
    hasBush: false,
    hasCliff: false,
    hasRock: false,
    isDark: false,
    torchRadius: 99,
    verse: '여호와는 나의 목자시니 내게 부족함이 없으리로다',
    verseRef: '시편 23:1',
  },
  {
    stage: 2,
    name: '숲속 미로',
    mazeIndex: 1,
    timeLimit: 90,
    wolfCount: 1,
    wolfSpeed: 0.8,
    wolfSightRange: 3,
    hasBush: true,
    hasCliff: false,
    hasRock: false,
    isDark: false,
    torchRadius: 99,
    verse: '내가 푸른 풀밭에 누이시며 쉴 만한 물가으로 인도하시는도다',
    verseRef: '시편 23:2',
  },
  {
    stage: 3,
    name: '절벽 미로',
    mazeIndex: 2,
    timeLimit: 100,
    wolfCount: 2,
    wolfSpeed: 0.9,
    wolfSightRange: 3,
    hasBush: true,
    hasCliff: true,
    hasRock: true,
    isDark: false,
    torchRadius: 99,
    verse: '내 영혼을 소생시키시고 자기 이름을 위하여 의의 길로 인도하시는도다',
    verseRef: '시편 23:3',
  },
  {
    stage: 4,
    name: '어둠의 골짜기',
    mazeIndex: 3,
    timeLimit: 110,
    wolfCount: 2,
    wolfSpeed: 1.1,
    wolfSightRange: 4,
    hasBush: true,
    hasCliff: false,
    hasRock: false,
    isDark: true,
    torchRadius: 3,
    verse: '내가 사망의 음침한 골짜기로 다닐지라도 해를 두려워하지 않을 것은 주께서 나와 함께 하심이라',
    verseRef: '시편 23:4',
  },
  {
    stage: 5,
    name: '험난한 광야',
    mazeIndex: 4,
    timeLimit: 120,
    wolfCount: 3,
    wolfSpeed: 1.2,
    wolfSightRange: 4,
    hasBush: true,
    hasCliff: true,
    hasRock: false,
    isDark: false,
    torchRadius: 99,
    verse: '너희 중에 어떤 사람이 양 백 마리가 있는데 그 중의 하나를 잃으면 아흔아홉 마리를 들에 두고 그 잃은 것을 찾아다니지 아니하겠느냐',
    verseRef: '누가복음 15:4',
  },
];
