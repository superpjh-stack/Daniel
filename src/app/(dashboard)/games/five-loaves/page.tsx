import { prisma } from '@/lib/db';
import FiveLoavesWrapper from './_components/FiveLoavesWrapper';

export const metadata = {
  title: '오병이어의 기적 - 다니엘',
};

export default async function FiveLoavesPage() {
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
      <FiveLoavesWrapper students={students} />
    </div>
  );
}
