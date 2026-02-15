import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getQuizResults, getQuizRanking } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'recent';
  const studentId = searchParams.get('studentId') || undefined;
  const classId = searchParams.get('classId') || undefined;
  const limit = parseInt(searchParams.get('limit') || '10');

  if (type === 'ranking') {
    const ranking = await getQuizRanking(classId, limit);
    return NextResponse.json({ ranking });
  }

  const results = await getQuizResults(studentId, classId, limit);
  return NextResponse.json({ results });
}
