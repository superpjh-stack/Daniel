import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllStudentsWithAttendance, createStudent, checkDuplicateStudent, getStudentStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') || undefined;
    const includeStats = searchParams.get('stats') === 'true';

    const students = await getAllStudentsWithAttendance(classId);

    if (includeStats) {
      const stats = await getStudentStats();
      return NextResponse.json({ students, stats });
    }

    return NextResponse.json(students);
  } catch (error) {
    console.error('Students GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, grade, birthday, parentPhone, parentName, note, classId, profileImage } = await request.json();

    if (!name || !grade) {
      return NextResponse.json({ error: 'Name and grade are required' }, { status: 400 });
    }

    // 중복 체크
    const duplicate = await checkDuplicateStudent(name, grade);

    const id = `student-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await createStudent({ id, name, grade, birthday, parentPhone, parentName, note, classId, profileImage });

    const response: { id: string; name: string; grade: number; duplicateWarning?: string } = { id, name, grade };
    if (duplicate.exists) {
      response.duplicateWarning = `같은 ${grade}학년에 '${name}' 학생이 이미 ${duplicate.count}명 있습니다.`;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Students POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
