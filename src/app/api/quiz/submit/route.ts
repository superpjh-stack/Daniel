import { NextRequest, NextResponse } from 'next/server';
import { scoreQuizAnswers } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { answers } = body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: '답안을 입력해주세요.' }, { status: 400 });
  }

  for (const a of answers) {
    if (!a.questionId || typeof a.selected !== 'number') {
      return NextResponse.json({ error: '답안 형식이 올바르지 않습니다.' }, { status: 400 });
    }
  }

  const result = await scoreQuizAnswers(answers);
  return NextResponse.json(result);
}
