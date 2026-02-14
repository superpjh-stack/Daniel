import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getAllStudents,
  getAttendanceByDate,
  upsertAttendance,
  updateStudentTalentBalance,
  createTalentRecord,
  getSettingValue,
  getStudentAttendanceStreak,
  getAttendanceSummaryByDate,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const classId = searchParams.get('classId') || undefined;

    const [students, attendances, summary] = await Promise.all([
      getAllStudents(classId),
      getAttendanceByDate(date, classId),
      getAttendanceSummaryByDate(date, classId),
    ]);

    const attendanceMap = new Map(attendances.map(a => [a.studentId, a]));

    const result = await Promise.all(students.map(async (student) => ({
      id: student.id,
      name: student.name,
      grade: student.grade,
      className: student.className,
      attendance: attendanceMap.get(student.id) || { status: null, memo: '' },
      streak: await getStudentAttendanceStreak(student.id),
    })));

    return NextResponse.json({ students: result, summary });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, attendance } = await request.json();

    // FR-05: 미래 날짜 검증
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      return NextResponse.json({ error: '미래 날짜에는 출석을 기록할 수 없습니다.' }, { status: 400 });
    }

    // FR-02: 설정값에서 달란트 포인트 조회
    const [talentPointsStr, streakThresholdStr, streakBonusPointsStr] = await Promise.all([
      getSettingValue('attendance_talent_points', '5'),
      getSettingValue('streak_bonus_threshold', '4'),
      getSettingValue('streak_bonus_points', '10'),
    ]);
    const talentPoints = parseInt(talentPointsStr, 10);
    const streakThreshold = parseInt(streakThresholdStr, 10);
    const streakBonusPoints = parseInt(streakBonusPointsStr, 10);

    const streakBonuses: { studentId: string; studentName: string; streak: number; bonus: number }[] = [];

    for (const [studentId, data] of Object.entries(attendance)) {
      const { status, memo } = data as { status: string; memo: string };

      // 기존 출석 상태 확인
      const existingAttendances = await getAttendanceByDate(date);
      const existing = existingAttendances.find(a => a.studentId === studentId);

      // 출석 기록 저장
      await upsertAttendance(studentId, date, status, memo);

      // 달란트 처리
      if (!existing && (status === 'present' || status === 'late')) {
        // 새로운 출석 - 달란트 지급
        await updateStudentTalentBalance(studentId, talentPoints);
        await createTalentRecord({
          id: `talent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          studentId,
          amount: talentPoints,
          reason: '주일 출석',
          type: 'attendance',
        });

        // FR-04: 연속 출석 보너스 체크
        if (streakThreshold > 0) {
          const streak = await getStudentAttendanceStreak(studentId);
          if (streak >= streakThreshold && streak % streakThreshold === 0) {
            await updateStudentTalentBalance(studentId, streakBonusPoints);
            await createTalentRecord({
              id: `talent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              studentId,
              amount: streakBonusPoints,
              reason: `연속 출석 ${streak}회 보너스`,
              type: 'bonus',
            });
            const students = await getAllStudents();
            const student = students.find(s => s.id === studentId);
            streakBonuses.push({
              studentId,
              studentName: student?.name || '',
              streak,
              bonus: streakBonusPoints,
            });
          }
        }
      } else if (existing) {
        const wasPresent = existing.status === 'present' || existing.status === 'late';
        const isNowPresent = status === 'present' || status === 'late';

        if (!wasPresent && isNowPresent) {
          // 결석 -> 출석 변경 - 달란트 지급
          await updateStudentTalentBalance(studentId, talentPoints);
          await createTalentRecord({
            id: `talent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            studentId,
            amount: talentPoints,
            reason: '주일 출석',
            type: 'attendance',
          });

          // FR-04: 연속 출석 보너스 체크
          if (streakThreshold > 0) {
            const streak = await getStudentAttendanceStreak(studentId);
            if (streak >= streakThreshold && streak % streakThreshold === 0) {
              await updateStudentTalentBalance(studentId, streakBonusPoints);
              await createTalentRecord({
                id: `talent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                studentId,
                amount: streakBonusPoints,
                reason: `연속 출석 ${streak}회 보너스`,
                type: 'bonus',
              });
              const students = await getAllStudents();
              const student = students.find(s => s.id === studentId);
              streakBonuses.push({
                studentId,
                studentName: student?.name || '',
                streak,
                bonus: streakBonusPoints,
              });
            }
          }
        } else if (wasPresent && !isNowPresent) {
          // 출석 -> 결석 변경 - 달란트 차감
          await updateStudentTalentBalance(studentId, -talentPoints);
          await createTalentRecord({
            id: `talent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            studentId,
            amount: -talentPoints,
            reason: '출석 취소',
            type: 'attendance',
          });
        }
      }
    }

    return NextResponse.json({ success: true, streakBonuses });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
