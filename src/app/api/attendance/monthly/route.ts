import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMonthlyAttendanceSummary } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const classId = searchParams.get('classId') || 'all';

    const summary = await getMonthlyAttendanceSummary(year, month, classId);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Monthly attendance summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
