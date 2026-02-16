import type { DavidQuiz } from './types';

export const DAVID_QUIZZES: DavidQuiz[] = [
  {
    id: 1,
    question: '다윗은 골리앗을 무엇으로 쓰러뜨렸나요?',
    options: ['칼', '물맷돌', '활', '창'],
    answer: 2,
    reference: '사무엘상 17:49',
  },
  {
    id: 2,
    question: '다윗의 아버지 이름은 무엇인가요?',
    options: ['야곱', '이새', '다니엘', '모세'],
    answer: 2,
    reference: '사무엘상 17:12',
  },
  {
    id: 3,
    question: '골리앗은 어느 나라 사람인가요?',
    options: ['이스라엘', '이집트', '블레셋', '바벨론'],
    answer: 3,
    reference: '사무엘상 17:4',
  },
  {
    id: 4,
    question: '다윗이 골리앗과 싸우기 전에 무엇을 돌보았나요?',
    options: ['양', '소', '말', '닭'],
    answer: 1,
    reference: '사무엘상 17:15',
  },
  {
    id: 5,
    question: '골리앗의 키는 대략 몇 규빗이었나요?',
    options: ['3규빗', '4규빗', '6규빗', '10규빗'],
    answer: 3,
    reference: '사무엘상 17:4',
  },
  {
    id: 6,
    question: '다윗은 시냇가에서 돌을 몇 개 골랐나요?',
    options: ['3개', '5개', '7개', '12개'],
    answer: 2,
    reference: '사무엘상 17:40',
  },
  {
    id: 7,
    question: '당시 이스라엘의 왕은 누구였나요?',
    options: ['사울', '솔로몬', '다윗', '아합'],
    answer: 1,
    reference: '사무엘상 17:31',
  },
  {
    id: 8,
    question: '다윗이 신뢰한 것은 무엇이었나요?',
    options: ['자신의 힘', '좋은 무기', '하나님', '군대의 수'],
    answer: 3,
    reference: '사무엘상 17:45',
  },
];

/** Stage 3, 5 클리어 시 퀴즈 1문제 랜덤 선택 */
export function getRandomQuiz(usedIds: number[]): DavidQuiz {
  const available = DAVID_QUIZZES.filter(q => !usedIds.includes(q.id));
  if (available.length === 0) {
    // 모든 퀴즈 사용 시 리셋
    return DAVID_QUIZZES[Math.floor(Math.random() * DAVID_QUIZZES.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
