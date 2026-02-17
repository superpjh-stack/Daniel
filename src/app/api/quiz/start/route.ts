import { NextRequest, NextResponse } from 'next/server';
import { getRandomQuizQuestions } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { category, difficulty } = body;

  const questions = await getRandomQuizQuestions(category, difficulty, 10);

  if (questions.length < 10) {
    return NextResponse.json({ error: '해당 조건의 문제가 부족합니다. (최소 10개 필요)' }, { status: 404 });
  }

  return NextResponse.json({ questions });
}
