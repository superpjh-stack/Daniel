import { prisma } from '@/lib/db';
import BrickBreakerWrapper from './_components/BrickBreakerWrapper';

export const metadata = {
  title: '벽돌깨기 - 다니엘',
};

export default async function BrickBreakerPage() {
  // 퀴즈 문제 20개 로드 (정답 포함)
  const questionsRaw = await prisma.quizQuestion.findMany({
    where: { isActive: true },
    select: {
      id: true,
      question: true,
      option1: true,
      option2: true,
      option3: true,
      option4: true,
      category: true,
      reference: true,
      answer: true,
    },
  });

  // 셔플
  for (let i = questionsRaw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questionsRaw[i], questionsRaw[j]] = [questionsRaw[j], questionsRaw[i]];
  }

  const selected = questionsRaw.slice(0, 20);

  const quizzes = selected.map(q => ({
    id: q.id,
    question: q.question,
    option1: q.option1,
    option2: q.option2,
    option3: q.option3,
    option4: q.option4,
    category: q.category,
    reference: q.reference,
  }));

  const answers = selected.map(q => ({
    id: q.id,
    answer: q.answer,
  }));

  // 학생 목록 로드 (보상 지급용)
  const studentsRaw = await prisma.student.findMany({
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, grade: true },
  });

  const students = studentsRaw.map(s => ({
    id: s.id,
    name: s.name,
    grade: s.grade,
  }));

  return (
    <div className="max-w-lg mx-auto py-4 px-2">
      <BrickBreakerWrapper quizzes={quizzes} answers={answers} students={students} />
    </div>
  );
}
