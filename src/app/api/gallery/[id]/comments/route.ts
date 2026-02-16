import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createPhotoComment } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '댓글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    const commentId = await createPhotoComment({
      postId,
      authorId: session.id,
      content: content.trim(),
    });

    return NextResponse.json({
      id: commentId,
      content: content.trim(),
      authorId: session.id,
      authorName: session.name,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Gallery comment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
