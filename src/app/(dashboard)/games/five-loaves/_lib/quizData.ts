import type { FishQuiz } from './types';

export const FISH_QUIZZES: FishQuiz[] = [
  {
    id: 1,
    question: '오병이어에서 빵과 물고기를 가져온 사람은 누구인가요?',
    options: ['베드로', '한 아이', '안드레', '빌립'],
    answer: 2,
    reference: '요한복음 6:9',
  },
  {
    id: 2,
    question: '예수님이 먹이신 사람은 몇 명이었나요?',
    options: ['3,000명', '5,000명', '7,000명', '10,000명'],
    answer: 2,
    reference: '마태복음 14:21',
  },
  {
    id: 3,
    question: '남은 음식을 담은 바구니는 몇 개였나요?',
    options: ['5개', '7개', '12개', '3개'],
    answer: 3,
    reference: '마태복음 14:20',
  },
  {
    id: 4,
    question: '오병이어의 기적이 일어난 곳은 어디인가요?',
    options: ['예루살렘', '빈 들', '바다 위', '성전 안'],
    answer: 2,
    reference: '마태복음 14:13',
  },
  {
    id: 5,
    question: '빵의 개수는 몇 개였나요?',
    options: ['3개', '5개', '7개', '12개'],
    answer: 2,
    reference: '마태복음 14:17',
  },
  {
    id: 6,
    question: '예수님은 음식을 나누기 전에 무엇을 하셨나요?',
    options: ['기도하셨다', '춤을 추셨다', '물을 마셨다', '잠을 주무셨다'],
    answer: 1,
    reference: '마태복음 14:19',
  },
  {
    id: 7,
    question: '물고기의 개수는 몇 마리였나요?',
    options: ['1마리', '2마리', '5마리', '7마리'],
    answer: 2,
    reference: '마태복음 14:17',
  },
  {
    id: 8,
    question: '예수님이 스스로를 무엇이라고 하셨나요?',
    options: ['생명의 물', '생명의 떡', '세상의 빛', '좋은 목자'],
    answer: 2,
    reference: '요한복음 6:35',
  },
];

export function getRandomQuiz(usedIds: number[]): FishQuiz {
  const available = FISH_QUIZZES.filter(q => !usedIds.includes(q.id));
  if (available.length === 0) {
    return FISH_QUIZZES[Math.floor(Math.random() * FISH_QUIZZES.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
