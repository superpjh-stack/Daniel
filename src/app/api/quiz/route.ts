import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllQuizQuestions, createQuizQuestion } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const difficulty = searchParams.get('difficulty') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const result = await getAllQuizQuestions(category, difficulty, page, limit);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { question, option1, option2, option3, option4, answer, category, difficulty, reference } = body;

  if (!question || !option1 || !option2 || !option3 || !option4 || !answer || !category) {
    return NextResponse.json({ error: '필수 필드를 모두 입력해주세요.' }, { status: 400 });
  }

  if (answer < 1 || answer > 4) {
    return NextResponse.json({ error: '정답은 1~4 사이여야 합니다.' }, { status: 400 });
  }

  const id = await createQuizQuestion({ question, option1, option2, option3, option4, answer, category, difficulty, reference });
  return NextResponse.json({ id, question });
}
