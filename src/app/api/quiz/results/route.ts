import { NextRequest, NextResponse } from 'next/server';
import { getQuizResults, getQuizRanking } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'recent';
  const limit = parseInt(searchParams.get('limit') || '10');

  if (type === 'ranking') {
    const ranking = await getQuizRanking(limit);
    return NextResponse.json({ ranking });
  }

  const results = await getQuizResults(limit);
  return NextResponse.json({ results });
}
