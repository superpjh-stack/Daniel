import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getStudentAttendanceHistory,
  getStudentAttendanceStreak,
  getStudentAttendanceStats,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!studentId) {
      return NextResponse.json({ error: 'studentId가 필요합니다.' }, { status: 400 });
    }

    const [history, streak, stats] = await Promise.all([
      getStudentAttendanceHistory(studentId, limit),
      getStudentAttendanceStreak(studentId),
      getStudentAttendanceStats(studentId),
    ]);

    return NextResponse.json({
      history,
      streak,
      ...stats,
    });
  } catch (error) {
    console.error('Attendance history GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
