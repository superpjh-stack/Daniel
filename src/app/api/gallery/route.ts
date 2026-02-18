import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPhotoPosts, createPhotoPost } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    const { posts, total } = await getPhotoPosts(category, page, limit);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ posts, total, page, totalPages });
  } catch (error) {
    console.error('Gallery GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin' && session.role !== 'teacher') {
      return NextResponse.json(
        { error: '관리자/교사만 사진을 업로드할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { title, description, category, photos, media } = await request.json();
    const mediaItems = media || photos;

    if (!title || !mediaItems || mediaItems.length === 0) {
      return NextResponse.json(
        { error: '제목과 미디어는 필수입니다.' },
        { status: 400 }
      );
    }

    const id = await createPhotoPost({
      title,
      description,
      category: category || 'daily',
      authorId: session.id,
      media: mediaItems,
    });

    return NextResponse.json({ id, title });
  } catch (error) {
    console.error('Gallery POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
