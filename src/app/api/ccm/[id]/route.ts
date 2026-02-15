import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCcmVideoById, updateCcmVideo, deactivateCcmVideo } from '@/lib/db';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;
  const video = await getCcmVideoById(id);
  if (!video) {
    return NextResponse.json({ error: '동영상을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(video);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const video = await getCcmVideoById(id);
  if (!video) {
    return NextResponse.json({ error: '동영상을 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (body.youtubeUrl !== undefined) {
      const youtubeId = extractYoutubeId(body.youtubeUrl);
      if (!youtubeId) {
        return NextResponse.json({ error: '유효하지 않은 YouTube URL입니다.' }, { status: 400 });
      }
      updateData.youtubeUrl = body.youtubeUrl;
      updateData.youtubeId = youtubeId;
      updateData.thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    }

    await updateCcmVideo(id, updateData as Parameters<typeof updateCcmVideo>[1]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CCM update error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const video = await getCcmVideoById(id);
  if (!video) {
    return NextResponse.json({ error: '동영상을 찾을 수 없습니다.' }, { status: 404 });
  }

  await deactivateCcmVideo(id);
  return NextResponse.json({ success: true });
}
