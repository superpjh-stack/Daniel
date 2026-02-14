import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllAnnouncements, createAnnouncement } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const { announcements, total } = await getAllAnnouncements(category, page, limit);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ announcements, total, page, totalPages });
  } catch (error) {
    console.error('Announcements GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자만 공지를 작성할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { title, content, category, isPinned } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const id = `announcement-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await createAnnouncement({
      id,
      title,
      content,
      category: category || 'general',
      isPinned: isPinned || false,
      authorId: session.id,
    });

    return NextResponse.json({ id, title });
  } catch (error) {
    console.error('Announcements POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
