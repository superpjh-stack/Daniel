import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPhotoCommentById, deletePhotoComment } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = await params;
    const comment = await getPhotoCommentById(commentId);

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.authorId !== session.id && session.role !== 'admin') {
      return NextResponse.json(
        { error: '본인 댓글 또는 관리자만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    await deletePhotoComment(commentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gallery comment DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
