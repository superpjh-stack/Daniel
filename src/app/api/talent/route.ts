import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateStudentTalentBalance, createTalentRecord } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, amount, reason, type } = await request.json();

    if (!studentId || !amount || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 학생 잔액 업데이트
    await updateStudentTalentBalance(studentId, amount);

    // 달란트 기록 생성
    await createTalentRecord({
      id: `talent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      studentId,
      amount,
      reason,
      type: type || 'bonus',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Talent POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
