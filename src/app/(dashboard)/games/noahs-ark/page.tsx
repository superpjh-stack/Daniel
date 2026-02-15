import { prisma } from '@/lib/db';
import NoahsArkWrapper from './_components/NoahsArkWrapper';

export const metadata = {
  title: '노아의 방주 - 다니엘',
};

export default async function NoahsArkPage() {
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
      <NoahsArkWrapper students={students} />
    </div>
  );
}
