import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { studentId, score, stageCleared, quizCorrect, quizTotal } = body;

  if (!studentId || typeof score !== 'number') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  if (typeof stageCleared !== 'number' || stageCleared < 1 || stageCleared > 5) {
    return NextResponse.json({ error: '잘못된 스테이지 값입니다.' }, { status: 400 });
  }
  if (typeof quizCorrect !== 'number' || typeof quizTotal !== 'number' || quizCorrect > quizTotal) {
    return NextResponse.json({ error: '잘못된 퀴즈 데이터입니다.' }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
  }

  // Daily reward limit (3 per day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayRewardCount = await prisma.talent.count({
    where: {
      studentId,
      type: 'game',
      reason: { contains: '잃은양' },
      createdAt: { gte: today, lt: tomorrow },
    },
  });

  if (todayRewardCount >= 3) {
    return NextResponse.json({ error: '오늘 보상 횟수를 초과했습니다. (하루 3회)' }, { status: 429 });
  }

  // Reward calculation
  let stageClear = 0;
  if (stageCleared >= 1) stageClear += 1;
  if (stageCleared >= 3) stageClear += 2;
  if (stageCleared >= 5) stageClear += 2;

  let quizBonus = 0;
  if (quizCorrect === quizTotal && quizTotal > 0) {
    quizBonus = 2;
  }

  const talentEarned = stageClear + quizBonus;

  const result = await prisma.$transaction(async (tx) => {
    await tx.talent.create({
      data: {
        studentId,
        amount: talentEarned,
        reason: `잃은양 Stage ${stageCleared} (점수: ${score})`,
        type: 'game',
      },
    });

    const updated = await tx.student.update({
      where: { id: studentId },
      data: { talentBalance: { increment: talentEarned } },
    });

    return updated.talentBalance;
  });

  return NextResponse.json({
    success: true,
    reward: {
      talentEarned,
      breakdown: { stageClear, quizBonus },
    },
    newBalance: result,
  });
}
