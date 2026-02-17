import { NextRequest, NextResponse } from 'next/server';
import { saveQuizResult } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { playerName, answers } = body;

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  }
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: '답안 데이터가 없습니다.' }, { status: 400 });
  }

  for (const a of answers) {
    if (!a.questionId || typeof a.selected !== 'number') {
      return NextResponse.json({ error: '답안 형식이 올바르지 않습니다.' }, { status: 400 });
    }
  }

  const trimmedName = playerName.trim().slice(0, 20);
  const result = await saveQuizResult(trimmedName, answers);
  return NextResponse.json(result);
}
