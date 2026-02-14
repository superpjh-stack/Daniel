import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isParentOfStudent, getChildrenByParentId, getTalentHistory, getStudentById } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'parent') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  let studentId = searchParams.get('studentId');
  const limit = parseInt(searchParams.get('limit') || '20');

  // studentId가 없으면 첫 번째 자녀
  if (!studentId) {
    const children = await getChildrenByParentId(session.id);
    if (children.length === 0) {
      return NextResponse.json({ error: '연결된 자녀가 없습니다.' }, { status: 404 });
    }
    studentId = children[0].id;
  }

  // 자녀 관계 검증
  if (!(await isParentOfStudent(session.id, studentId))) {
    return NextResponse.json({ error: '해당 학생의 정보를 조회할 권한이 없습니다.' }, { status: 403 });
  }

  const children = await getChildrenByParentId(session.id);
  const student = await getStudentById(studentId);
  const transactions = await getTalentHistory(limit, studentId);

  return NextResponse.json({
    children,
    student: student ? {
      id: student.id,
      name: student.name,
      grade: student.grade,
      talentBalance: student.talentBalance,
    } : null,
    transactions,
  });
}
