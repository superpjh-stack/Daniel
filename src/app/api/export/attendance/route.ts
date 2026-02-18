import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAttendanceByPeriod, getAllClasses } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const monthParam = searchParams.get('month');
    const month = monthParam ? parseInt(monthParam) : undefined;
    const classId = searchParams.get('classId') || undefined;
    const format = searchParams.get('format') || 'json';

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: '유효하지 않은 연도입니다.' }, { status: 400 });
    }

    const [records, classes] = await Promise.all([
      getAttendanceByPeriod(year, month, classId),
      getAllClasses(),
    ]);

    if (format === 'csv') {
      const header = '날짜,학생이름,학년,반,출석상태,메모';
      const statusMap: Record<string, string> = { present: '출석', late: '지각', absent: '결석' };
      const rows = records.map(r =>
        [r.date, r.studentName, `${r.grade}학년`, r.className || '', statusMap[r.status] || r.status, r.memo || ''].join(',')
      );
      const csv = [header, ...rows].join('\n');
      const bom = '\uFEFF';
      return new NextResponse(bom + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendance_${year}${month ? `_${month}` : ''}.csv"`,
        },
      });
    }

    return NextResponse.json({ records, classes });
  } catch (error) {
    console.error('Export attendance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
