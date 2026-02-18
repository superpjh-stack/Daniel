import { prisma } from '@/lib/db';
import LostSheepWrapper from './_components/LostSheepWrapper';

export const metadata = {
  title: '잃은 양 찾기 - 다니엘',
};

export default async function LostSheepPage() {
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
      <LostSheepWrapper students={students} />
    </div>
  );
}
