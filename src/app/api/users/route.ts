import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { getAllUsers, createUser, getUserByLoginId } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getAllUsers();
    const nonParentUsers = users.filter(u => u.role !== 'parent');
    return NextResponse.json(nonParentUsers);
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { loginId, password, name, role, phone } = await request.json();

    if (!loginId || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // parent 역할은 /api/parents 엔드포인트를 통해서만 생성 가능
    if (role === 'parent') {
      return NextResponse.json({ error: '학부모 계정은 학부모 관리에서 추가하세요.' }, { status: 400 });
    }

    // 아이디 중복 확인
    const existing = await getUserByLoginId(loginId);
    if (existing) {
      return NextResponse.json({ error: '이미 존재하는 아이디입니다.' }, { status: 400 });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    const id = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await createUser({
      id,
      loginId,
      password: hashedPassword,
      name,
      role: role || 'teacher',
      phone,
    });

    return NextResponse.json({ id, loginId, name, role });
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
