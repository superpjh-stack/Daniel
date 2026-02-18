import type { SheepQuiz } from './types';

export const SHEEP_QUIZZES: SheepQuiz[] = [
  {
    id: 1,
    question: '잃은 양 비유에서 목자는 양 몇 마리를 두고 잃은 양을 찾으러 갔나요?',
    options: ['50마리', '99마리', '100마리', '999마리'],
    answer: 2,
    reference: '누가복음 15:4',
  },
  {
    id: 2,
    question: '잃은 양을 찾은 목자는 양을 어떻게 했나요?',
    options: ['끌고 왔다', '어깨에 메었다', '등에 태웠다', '안아서 왔다'],
    answer: 2,
    reference: '누가복음 15:5',
  },
  {
    id: 3,
    question: '잃은 양 비유는 누가복음 몇 장에 나오나요?',
    options: ['10장', '12장', '15장', '20장'],
    answer: 3,
    reference: '누가복음 15:3-7',
  },
  {
    id: 4,
    question: '예수님은 스스로를 무엇이라고 하셨나요?',
    options: ['좋은 목자', '큰 목자', '힘센 목자', '거룩한 목자'],
    answer: 1,
    reference: '요한복음 10:11',
  },
  {
    id: 5,
    question: '하늘에서는 죄인 한 사람이 무엇하면 기뻐한다고 했나요?',
    options: ['기도하면', '회개하면', '헌금하면', '찬양하면'],
    answer: 2,
    reference: '누가복음 15:7',
  },
  {
    id: 6,
    question: '시편 23편에서 여호와를 무엇이라고 했나요?',
    options: ['나의 왕', '나의 목자', '나의 아버지', '나의 구원자'],
    answer: 2,
    reference: '시편 23:1',
  },
  {
    id: 7,
    question: '좋은 목자는 양들을 위해 무엇을 버린다고 했나요?',
    options: ['재산', '목숨', '시간', '집'],
    answer: 2,
    reference: '요한복음 10:11',
  },
  {
    id: 8,
    question: '잃은 양을 찾은 목자는 이웃을 불러 무엇을 했나요?',
    options: ['식사했다', '기뻐했다', '춤을 췄다', '노래했다'],
    answer: 2,
    reference: '누가복음 15:6',
  },
];

export function getRandomQuiz(usedIds: number[]): SheepQuiz {
  const available = SHEEP_QUIZZES.filter(q => !usedIds.includes(q.id));
  if (available.length === 0) {
    return SHEEP_QUIZZES[Math.floor(Math.random() * SHEEP_QUIZZES.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
