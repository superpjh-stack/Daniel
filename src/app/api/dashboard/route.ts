import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getStudentCount,
  getTodayAttendanceCount,
  getTotalTalent,
  getRecentAttendance,
  getTopStudentsByTalent,
  getThisWeekBirthdays,
  getRecentAnnouncements,
} from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [totalStudents, todayAttendance, totalTalent, recentAttendance, topStudents, birthdays, announcements] = await Promise.all([
      getStudentCount(),
      getTodayAttendanceCount(),
      getTotalTalent(),
      getRecentAttendance(5),
      getTopStudentsByTalent(5),
      getThisWeekBirthdays(),
      getRecentAnnouncements(3),
    ]);

    // 평균 출석률 (간단히 계산)
    const averageAttendance = totalStudents > 0 ? Math.round((todayAttendance / totalStudents) * 100) : 0;

    return NextResponse.json({
      stats: {
        totalStudents,
        todayAttendance,
        totalTalent,
        averageAttendance,
      },
      recentAttendance,
      topStudents,
      birthdays,
      announcements,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
