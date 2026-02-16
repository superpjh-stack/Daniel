import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPhotoPostById, updatePhotoPost, deletePhotoPost } from '@/lib/db';

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
    const post = await getPhotoPostById(id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Gallery detail GET error:', error);
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

    if (session.role !== 'admin' && session.role !== 'teacher') {
      return NextResponse.json(
        { error: '관리자/교사만 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { title, description, category } = await request.json();

    await updatePhotoPost(id, { title, description, category });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gallery PUT error:', error);
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

    if (session.role !== 'admin' && session.role !== 'teacher') {
      return NextResponse.json(
        { error: '관리자/교사만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await deletePhotoPost(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gallery DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
