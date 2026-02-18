import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPresignedUploadUrl, getPublicUrl, uploadToS3 } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin' && session.role !== 'teacher') {
      return NextResponse.json(
        { error: '관리자/교사만 업로드할 수 있습니다.' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // Server-side proxy upload (multipart form data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const imageFile = formData.get('image') as File | null;
      const thumbFile = formData.get('thumbnail') as File | null;
      const videoFile = formData.get('video') as File | null;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // 동영상 파일 프록시 업로드
      if (videoFile) {
        const ext = videoFile.name.split('.').pop() || 'mp4';
        const videoKey = `videos/${year}/${month}/${uniqueId}.${ext}`;
        const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
        await uploadToS3(videoKey, videoBuffer, videoFile.type || 'video/mp4');
        return NextResponse.json({ videoUrl: getPublicUrl(videoKey) });
      }

      if (!imageFile) {
        return NextResponse.json({ error: 'image or video file is required' }, { status: 400 });
      }

      const imageKey = `photos/${year}/${month}/${uniqueId}.jpg`;
      const thumbKey = `photos/${year}/${month}/${uniqueId}_thumb.jpg`;

      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      await uploadToS3(imageKey, imageBuffer, 'image/jpeg');

      if (thumbFile) {
        const thumbBuffer = Buffer.from(await thumbFile.arrayBuffer());
        await uploadToS3(thumbKey, thumbBuffer, 'image/jpeg');
      }

      return NextResponse.json({
        imageUrl: getPublicUrl(imageKey),
        thumbnailUrl: getPublicUrl(thumbFile ? thumbKey : imageKey),
      });
    }

    // Presigned URL mode (JSON request)
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const isVideo = fileType.startsWith('video/');

    if (isVideo) {
      const ext = fileName.split('.').pop() || 'mp4';
      const videoKey = `videos/${year}/${month}/${uniqueId}.${ext}`;
      const uploadUrl = await getPresignedUploadUrl(videoKey, fileType);
      return NextResponse.json({
        uploadUrl,
        videoUrl: getPublicUrl(videoKey),
        key: videoKey,
      });
    }

    const imageKey = `photos/${year}/${month}/${uniqueId}.jpg`;
    const thumbKey = `photos/${year}/${month}/${uniqueId}_thumb.jpg`;

    const [uploadUrl, thumbUploadUrl] = await Promise.all([
      getPresignedUploadUrl(imageKey, fileType),
      getPresignedUploadUrl(thumbKey, fileType),
    ]);

    return NextResponse.json({
      uploadUrl,
      thumbUploadUrl,
      imageUrl: getPublicUrl(imageKey),
      thumbnailUrl: getPublicUrl(thumbKey),
      key: imageKey,
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
