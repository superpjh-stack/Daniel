import { NextRequest, NextResponse } from 'next/server';
import { getActiveHeroMedia, getAllHeroMedia, createHeroMedia } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');

    // all=true는 관리자용 (비활성 포함)
    if (all === 'true') {
      const session = await getSession();
      if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      }
      const media = await getAllHeroMedia();
      return NextResponse.json(media);
    }

    const media = await getActiveHeroMedia();
    return NextResponse.json(media);
  } catch {
    return NextResponse.json({ error: '미디어 목록 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const body = await request.json();
    const { title, subtitle, mediaType, mediaUrl, sortOrder } = body;

    if (!title || !mediaType || !mediaUrl) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 });
    }

    if (!['image', 'youtube'].includes(mediaType)) {
      return NextResponse.json({ error: '미디어 타입이 올바르지 않습니다' }, { status: 400 });
    }

    // YouTube URL에서 ID 추출
    let youtubeId: string | undefined;
    let thumbnailUrl: string | undefined;

    if (mediaType === 'youtube') {
      const extracted = extractYoutubeId(mediaUrl);
      if (!extracted) {
        return NextResponse.json({ error: '유효한 YouTube URL이 아닙니다' }, { status: 400 });
      }
      youtubeId = extracted;
      thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    } else {
      thumbnailUrl = mediaUrl;
    }

    const id = await createHeroMedia({
      title,
      subtitle,
      mediaType,
      mediaUrl,
      youtubeId,
      thumbnailUrl,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '미디어 추가 실패' }, { status: 500 });
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
