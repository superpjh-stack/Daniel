import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { deleteUser, getUserById, updateUser } from '@/lib/db';

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
    const { loginId, password, name, role, phone } = await request.json();

    // 기존 사용자 확인
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // parent 역할 사용자는 이 엔드포인트로 수정 불가
    if (existingUser.role === 'parent') {
      return NextResponse.json({ error: '학부모 계정은 학부모 관리에서 수정하세요.' }, { status: 400 });
    }
    if (role === 'parent') {
      return NextResponse.json({ error: '역할을 학부모로 변경할 수 없습니다.' }, { status: 400 });
    }

    // 비밀번호 업데이트 여부 확인
    let hashedPassword: string | undefined;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await updateUser(id, {
      loginId: loginId || existingUser.loginId,
      password: hashedPassword ?? existingUser.password,
      name: name || existingUser.name,
      role: role || existingUser.role,
      phone: phone || existingUser.phone,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User PUT error:', error);
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

    // 자기 자신은 삭제 불가
    if (id === session.id) {
      return NextResponse.json({ error: '자신의 계정은 삭제할 수 없습니다.' }, { status: 400 });
    }

    // parent 역할 사용자는 이 엔드포인트로 삭제 불가
    const targetUser = await getUserById(id);
    if (targetUser?.role === 'parent') {
      return NextResponse.json({ error: '학부모 계정은 학부모 관리에서 삭제하세요.' }, { status: 400 });
    }

    await deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
