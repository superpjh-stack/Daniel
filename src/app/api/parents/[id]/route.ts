import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { getParentById, updateUser, deleteParentAccount, unlinkAllParentStudents, linkParentStudent } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const parent = await getParentById(id);
  if (!parent) {
    return NextResponse.json({ error: '학부모를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(parent);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const parent = await getParentById(id);
  if (!parent) {
    return NextResponse.json({ error: '학부모를 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    const { name, phone, password, studentIds } = await request.json();

    // 유저 정보 업데이트
    const updateData: { name?: string; phone?: string; password?: string } = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length > 0) {
      await updateUser(id, updateData);
    }

    // 자녀 연결 재설정
    if (studentIds && Array.isArray(studentIds)) {
      await unlinkAllParentStudents(id);
      for (const studentId of studentIds) {
        await linkParentStudent(id, studentId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Parent update error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const parent = await getParentById(id);
  if (!parent) {
    return NextResponse.json({ error: '학부모를 찾을 수 없습니다.' }, { status: 404 });
  }

  await deleteParentAccount(id);
  return NextResponse.json({ success: true });
}
