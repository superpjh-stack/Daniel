import { prisma } from '@/lib/db';
import DavidsSlingWrapper from './_components/DavidsSlingWrapper';

export const metadata = {
  title: '다윗의 물맷돌 - 다니엘',
};

export default async function DavidsSlingPage() {
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
      <DavidsSlingWrapper students={students} />
    </div>
  );
}
