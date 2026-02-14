import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTalentHistory } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const studentId = searchParams.get('studentId') || undefined;

    const history = await getTalentHistory(limit, studentId);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Talent history GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
