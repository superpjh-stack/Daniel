import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { submitQuizAndAwardTalent } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { studentId, answers } = body;

  if (!studentId || !answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: '학생 ID와 답안을 입력해주세요.' }, { status: 400 });
  }

  for (const a of answers) {
    if (!a.questionId || typeof a.selected !== 'number') {
      return NextResponse.json({ error: '답안 형식이 올바르지 않습니다.' }, { status: 400 });
    }
  }

  const result = await submitQuizAndAwardTalent(studentId, answers);
  return NextResponse.json(result);
}
