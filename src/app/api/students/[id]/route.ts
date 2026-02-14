import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStudentById, getStudentDetail, updateStudent, deleteStudent } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeDetail = searchParams.get('detail') === 'true';

    if (includeDetail) {
      const detail = await getStudentDetail(id);
      if (!detail) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    const student = await getStudentById(id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Student GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, grade, birthday, parentPhone, parentName, note, classId, profileImage } = await request.json();

    await updateStudent(id, { name, grade, birthday, parentPhone, parentName, note, classId, profileImage });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Student PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자만 삭제 가능
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자만 학생을 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await deleteStudent(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Student DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
