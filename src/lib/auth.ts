import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'daniel-church-app-super-secret-key-2024'
);

export interface UserPayload {
  id: string;
  loginId: string;
  name: string;
  role: string;
}

interface JWTUserPayload extends JWTPayload {
  id: string;
  loginId: string;
  name: string;
  role: string;
}

export async function signToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload } as JWTUserPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      loginId: payload.loginId as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

// 인증 없이 기본 관리자로 동작 (로그인 불필요)
const DEFAULT_USER: UserPayload = {
  id: '1',
  loginId: 'admin@church.com',
  name: '초등부샘',
  role: 'admin',
};

export async function getSession(): Promise<UserPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return DEFAULT_USER;
  return (await verifyToken(token)) ?? DEFAULT_USER;
}

export async function setSession(payload: UserPayload): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}
