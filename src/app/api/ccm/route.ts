import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllCcmVideos, createCcmVideo } from '@/lib/db';

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';

  const result = await getAllCcmVideos(category);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { title, youtubeUrl, category, description } = await request.json();

    if (!title || !youtubeUrl || !category) {
      return NextResponse.json({ error: '제목, YouTube URL, 카테고리는 필수입니다.' }, { status: 400 });
    }

    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      return NextResponse.json({ error: '유효하지 않은 YouTube URL입니다.' }, { status: 400 });
    }

    const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

    const id = await createCcmVideo({
      title,
      youtubeUrl,
      youtubeId,
      thumbnailUrl,
      category,
      description,
    });

    return NextResponse.json({ id, title });
  } catch (error) {
    console.error('CCM create error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
