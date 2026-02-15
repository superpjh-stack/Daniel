import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRandomQuizQuestions, getStudentTodayQuizCount } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { studentId, category, difficulty } = body;

  if (!studentId) {
    return NextResponse.json({ error: '학생을 선택해주세요.' }, { status: 400 });
  }

  const todayCount = await getStudentTodayQuizCount(studentId);
  const remainingAttempts = Math.max(0, 3 - todayCount);
  const canEarnTalent = todayCount < 3;

  const questions = await getRandomQuizQuestions(category, difficulty, 10);

  if (questions.length < 10) {
    return NextResponse.json({ error: '해당 조건의 문제가 부족합니다. (최소 10개 필요)' }, { status: 404 });
  }

  return NextResponse.json({ questions, remainingAttempts, canEarnTalent });
}
