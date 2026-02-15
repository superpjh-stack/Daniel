import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByLoginId } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const isHttps = request.headers.get('x-forwarded-proto') === 'https';
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 찾기
    const user = await getUserByLoginId(loginId);

    if (!user) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = await signToken({
      id: user.id,
      loginId: user.loginId,
      name: user.name,
      role: user.role,
    });

    // 응답에 모든 쿠키를 직접 설정
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set('user_role', user.role, {
      httpOnly: false,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set('user_name', user.name, {
      httpOnly: false,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
