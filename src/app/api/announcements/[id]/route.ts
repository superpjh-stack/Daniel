import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAnnouncementById, updateAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from '@/lib/db';

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
    const announcement = await getAnnouncementById(id);
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Announcement GET error:', error);
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

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자만 공지를 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { title, content, category, isPinned } = await request.json();

    await updateAnnouncement(id, { title, content, category, isPinned });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Announcement PUT error:', error);
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

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자만 공지를 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await deleteAnnouncement(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Announcement DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자만 공지를 고정할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { isPinned } = await request.json();

    await toggleAnnouncementPin(id, isPinned);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Announcement PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
