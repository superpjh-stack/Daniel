import { NextRequest, NextResponse } from 'next/server';
import { updateHeroMedia, deleteHeroMedia } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, subtitle, mediaType, mediaUrl, sortOrder, isActive } = body;

    let youtubeId: string | undefined;
    let thumbnailUrl: string | undefined;

    if (mediaType === 'youtube' && mediaUrl) {
      const extracted = extractYoutubeId(mediaUrl);
      if (extracted) {
        youtubeId = extracted;
        thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      }
    } else if (mediaType === 'image' && mediaUrl) {
      thumbnailUrl = mediaUrl;
    }

    await updateHeroMedia(id, {
      title,
      subtitle,
      mediaType,
      mediaUrl,
      youtubeId,
      thumbnailUrl,
      sortOrder,
      isActive,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '미디어 수정 실패' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const { id } = await params;
    await deleteHeroMedia(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '미디어 삭제 실패' }, { status: 500 });
  }
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
