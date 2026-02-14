import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getChildrenByParentId } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'parent') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const children = await getChildrenByParentId(session.id);
  return NextResponse.json(children);
}
