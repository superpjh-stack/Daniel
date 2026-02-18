import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

function extractS3Key(url: string): string | null {
  try {
    const parsed = new URL(url);
    // https://bucket.s3.region.amazonaws.com/key
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  if (!url.includes('amazonaws.com')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
  }

  const key = extractS3Key(url);
  if (!key) {
    return NextResponse.json({ error: 'Invalid S3 URL' }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
    });

    const s3Response = await s3.send(command);
    const bytes = await s3Response.Body?.transformToByteArray();

    if (!bytes) {
      return NextResponse.json({ error: 'Empty response' }, { status: 502 });
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': s3Response.ContentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'S3 fetch error' }, { status: 500 });
  }
}
