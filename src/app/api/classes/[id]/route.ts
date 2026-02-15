import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateClass, deleteClass } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, grade, teacherId } = await request.json();

    await updateClass(id, {
      ...(name !== undefined && { name }),
      ...(grade !== undefined && { grade }),
      ...(teacherId !== undefined && { teacherId: teacherId || null }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Class PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteClass(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Class DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
