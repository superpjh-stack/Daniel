import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { getParentList, createUser, getUserByLoginId, linkParentStudent } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const parents = await getParentList();
  return NextResponse.json(parents);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { loginId, password, name, phone, studentIds } = await request.json();

    if (!loginId || !password || !name) {
      return NextResponse.json({ error: '아이디, 비밀번호, 이름은 필수입니다.' }, { status: 400 });
    }

    if (!studentIds || studentIds.length === 0) {
      return NextResponse.json({ error: '자녀를 1명 이상 선택해주세요.' }, { status: 400 });
    }

    // 중복 체크
    const existing = await getUserByLoginId(loginId);
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 생성
    const id = `parent-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await createUser({ id, loginId, password: hashedPassword, name, role: 'parent', phone });

    // 자녀 연결
    for (const studentId of studentIds) {
      await linkParentStudent(id, studentId);
    }

    return NextResponse.json({ id, name });
  } catch (error) {
    console.error('Parent creation error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
