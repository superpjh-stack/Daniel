import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getParentDashboardData, getChildrenByParentId, isParentOfStudent, getRecentAnnouncements } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'parent') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') || undefined;

  // 자녀 관계 검증
  if (studentId && !(await isParentOfStudent(session.id, studentId))) {
    return NextResponse.json({ error: '해당 학생의 정보를 조회할 권한이 없습니다.' }, { status: 403 });
  }

  const children = await getChildrenByParentId(session.id);
  const dashboardData = await getParentDashboardData(session.id, studentId);

  if (!dashboardData) {
    return NextResponse.json({ error: '연결된 자녀가 없습니다.' }, { status: 404 });
  }

  const announcements = await getRecentAnnouncements(3);

  return NextResponse.json({
    children,
    ...dashboardData,
    announcements,
  });
}
