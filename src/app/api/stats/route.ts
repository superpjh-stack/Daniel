import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllStudents, getTopStudentsByTalent, getWeeklyAttendanceStats, getAttendanceRanking } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [
      weeklyAttendance,
      attendanceRankingData,
      talentRanking,
      students,
    ] = await Promise.all([
      getWeeklyAttendanceStats(),
      getAttendanceRanking(10),
      getTopStudentsByTalent(10),
      getAllStudents(),
    ]);

    // 학년별 통계
    const gradeStats = [];
    for (let grade = 1; grade <= 6; grade++) {
      const gradeStudents = students.filter(s => s.grade === grade);
      const count = gradeStudents.length;

      if (count === 0) {
        gradeStats.push({ grade, count: 0, averageAttendance: 0, averageTalent: 0 });
        continue;
      }

      const totalTalent = gradeStudents.reduce((sum, s) => sum + s.talentBalance, 0);

      gradeStats.push({
        grade,
        count,
        averageAttendance: 85, // 임시값
        averageTalent: Math.round(totalTalent / count),
      });
    }

    return NextResponse.json({
      weeklyAttendance,
      attendanceRanking: attendanceRankingData,
      talentRanking,
      gradeStats,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
