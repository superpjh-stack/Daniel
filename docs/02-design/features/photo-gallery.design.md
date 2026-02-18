# Photo Gallery — Design Document

> **Feature**: photo-gallery
> **Plan Ref**: `docs/01-plan/features/photo-gallery.plan.md`
> **Date**: 2026-02-18
> **Status**: Updated (v0.2 — 동영상 파일/링크 추가)

---

## 1. Current State Analysis

기존 갤러리(`/gallery`)는 **사진만** 지원하는 상태로 이미 구현되어 있습니다.

### 1.1 기존 구현 파일 목록

| 파일 | 역할 | 변경 여부 |
|------|------|-----------|
| `prisma/schema.prisma` → `Photo` | imageUrl, thumbnailUrl만 있음 | **수정 필요** |
| `src/app/api/gallery/upload/route.ts` | 이미지 전용 업로드 | **수정 필요** |
| `src/app/api/gallery/route.ts` | POST에서 photos 배열 처리 | **수정 필요** |
| `src/lib/db.ts` | createPhotoPost, getPhotoPosts | **수정 필요** |
| `src/components/gallery/PhotoViewer.tsx` | `<img>` 만 렌더링 | **수정 필요** |
| `src/components/gallery/PhotoUploadForm.tsx` | 이미지 파일만 선택 가능 | **수정 필요** |
| `src/app/(dashboard)/gallery/page.tsx` | 목록 — 동영상 아이콘 없음 | **수정 필요** |
| `src/app/(dashboard)/gallery/upload/page.tsx` | 제목 "사진 업로드" | **소폭 수정** |
| `src/app/(dashboard)/gallery/[id]/page.tsx` | generateMetadata imageUrl 처리 | **소폭 수정** |
| `src/components/gallery/CommentSection.tsx` | 댓글 기능 | 유지 |
| `src/components/gallery/GalleryShareButtons.tsx` | SNS 공유 | 유지 |

---

## 2. Database Schema Changes

### 2.1 `Photo` 모델 수정 (기존 → 변경)

**기존:**
```prisma
model Photo {
  id           String   @id @default(cuid())
  imageUrl     String           // 필수
  thumbnailUrl String           // 필수
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())
  post    PhotoPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId  String
}
```

**변경 후:**
```prisma
model Photo {
  id           String    @id @default(cuid())
  type         String    @default("image")  // "image" | "video" | "video_link"
  imageUrl     String?   // S3 이미지 원본 URL (type=image)
  thumbnailUrl String?   // 썸네일 URL (image/video: S3, video_link: YouTube thumb)
  videoUrl     String?   // S3 동영상 파일 URL (type=video)
  videoLink    String?   // 외부 동영상 원본 URL (type=video_link)
  embedUrl     String?   // iframe embed URL (type=video_link, 파싱된 URL)
  sortOrder    Int       @default(0)
  createdAt    DateTime  @default(now())

  post    PhotoPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId  String
}
```

### 2.2 마이그레이션

```bash
npx prisma migrate dev --name add-video-support-to-photo
```

생성되는 SQL:
```sql
ALTER TABLE "Photo" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'image';
ALTER TABLE "Photo" ALTER COLUMN "imageUrl" DROP NOT NULL;
ALTER TABLE "Photo" ALTER COLUMN "thumbnailUrl" DROP NOT NULL;
ALTER TABLE "Photo" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Photo" ADD COLUMN "videoLink" TEXT;
ALTER TABLE "Photo" ADD COLUMN "embedUrl" TEXT;
```

### 2.3 기존 데이터 호환

기존 `Photo` 레코드는 `type='image'` default로 모두 유지됨. 하위 호환 완벽.

---

## 3. New Library: `src/lib/videoParser.ts`

비디오 URL을 파싱하여 embed URL과 썸네일 URL을 반환.

```typescript
export interface ParsedVideo {
  embedUrl: string;
  thumbnailUrl: string;
  platform: 'youtube' | 'vimeo' | 'unknown';
}

export function parseVideoUrl(url: string): ParsedVideo | null {
  const trimmed = url.trim();

  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      platform: 'youtube',
    };
  }

  // Vimeo: vimeo.com/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    return {
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: '',  // Vimeo thumbnail은 별도 API 필요 → 빈 값
      platform: 'vimeo',
    };
  }

  return null;
}
```

---

## 4. DB Functions (`src/lib/db.ts`) 수정

### 4.1 인터페이스 변경

```typescript
// 미디어 항목 (Photo 모델 대응)
export interface MediaItem {
  id: string;
  type: string;           // "image" | "video" | "video_link"
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  videoLink?: string | null;
  embedUrl?: string | null;
  sortOrder: number;
}

// getPhotoPosts 반환 타입
export interface PhotoPostSummary {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string;   // 첫 번째 미디어 썸네일
  mediaType: string;      // 신규: 첫 번째 미디어 type ("image"|"video"|"video_link")
  photoCount: number;
  commentCount: number;
  authorName: string;
  createdAt: string;
}

// getPhotoPostById 반환 타입
export interface PhotoPostDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  photos: MediaItem[];    // 기존 필드명 유지 (하위호환)
  comments: { id: string; content: string; authorId: string; authorName: string; createdAt: string; }[];
}
```

### 4.2 `createPhotoPost` 함수 변경

```typescript
// 기존 파라미터
photos: { imageUrl: string; thumbnailUrl: string; sortOrder: number }[]

// 변경 후 파라미터
media: {
  type: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  videoLink?: string;
  embedUrl?: string;
  sortOrder: number;
}[]
```

내부 Prisma 호출:
```typescript
await prisma.photo.createMany({
  data: media.map(item => ({
    postId: post.id,
    type: item.type,
    imageUrl: item.imageUrl ?? null,
    thumbnailUrl: item.thumbnailUrl ?? null,
    videoUrl: item.videoUrl ?? null,
    videoLink: item.videoLink ?? null,
    embedUrl: item.embedUrl ?? null,
    sortOrder: item.sortOrder,
  })),
});
```

### 4.3 `getPhotoPosts` 함수 — `mediaType` 추가

```typescript
// 첫 번째 Photo의 type을 반환
const firstPhoto = post.photos[0];
thumbnailUrl: firstPhoto?.thumbnailUrl || firstPhoto?.imageUrl || '',
mediaType: firstPhoto?.type || 'image',
```

---

## 5. API Changes

### 5.1 `POST /api/gallery/upload` — 동영상 파일 지원

**변경:** `fileType`이 `video/*`이면 `videos/` 경로로 분기

```typescript
const isVideo = fileType?.startsWith('video/');

if (isVideo) {
  const ext = fileName.split('.').pop() || 'mp4';
  const videoKey = `videos/${year}/${month}/${uniqueId}.${ext}`;
  const uploadUrl = await getPresignedUploadUrl(videoKey, fileType);
  return NextResponse.json({
    uploadUrl,
    videoUrl: getPublicUrl(videoKey),
    key: videoKey,
  });
} else {
  // 기존 이미지 처리 (변경 없음)
  const imageKey = `photos/${year}/${month}/${uniqueId}.jpg`;
  const thumbKey = `photos/${year}/${month}/${uniqueId}_thumb.jpg`;
  const [uploadUrl, thumbUploadUrl] = await Promise.all([
    getPresignedUploadUrl(imageKey, fileType),
    getPresignedUploadUrl(thumbKey, fileType),
  ]);
  return NextResponse.json({ uploadUrl, thumbUploadUrl, imageUrl: getPublicUrl(imageKey), thumbnailUrl: getPublicUrl(thumbKey), key: imageKey });
}
```

**Multipart 모드 (proxy) 동영상 지원 추가:**
```typescript
const videoFile = formData.get('video') as File | null;
if (videoFile) {
  const videoKey = `videos/${year}/${month}/${uniqueId}.mp4`;
  const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
  await uploadToS3(videoKey, videoBuffer, videoFile.type || 'video/mp4');
  return NextResponse.json({ videoUrl: getPublicUrl(videoKey) });
}
```

### 5.2 `POST /api/gallery` — `media` 배열 수용

```typescript
// 기존
const { title, description, category, photos } = await request.json();

// 변경 후 (하위호환 유지)
const { title, description, category, photos, media } = await request.json();
const mediaItems = media || photos;  // media 우선, photos fallback

if (!title || !mediaItems || mediaItems.length === 0) {
  return NextResponse.json({ error: '제목과 미디어는 필수입니다.' }, { status: 400 });
}

const id = await createPhotoPost({
  title, description, category: category || 'daily', authorId: session.id,
  media: mediaItems,
});
```

---

## 6. Component Changes

### 6.1 `PhotoViewer.tsx` — 미디어 뷰어로 확장

**변경 전 Photo 인터페이스:**
```typescript
interface Photo { id: string; imageUrl: string; thumbnailUrl: string; sortOrder: number; }
```

**변경 후:**
```typescript
interface Photo {
  id: string;
  type?: string;           // "image" | "video" | "video_link" (undefined → "image" 처리)
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  videoLink?: string | null;
  embedUrl?: string | null;
  sortOrder: number;
}
```

**렌더링 분기 (주요 변경 부분):**
```typescript
function renderCurrentMedia(item: Photo) {
  const type = item.type || 'image';

  if (type === 'image') {
    return (
      <img
        src={item.imageUrl!}
        alt={`Photo ${currentIndex + 1}`}
        className="w-full h-full object-contain"
      />
    );
  }

  if (type === 'video') {
    return (
      <video
        key={item.id}
        controls
        className="w-full h-full object-contain"
        preload="metadata"
      >
        <source src={item.videoUrl!} />
        브라우저가 동영상을 지원하지 않습니다.
      </video>
    );
  }

  if (type === 'video_link') {
    return (
      <iframe
        key={item.id}
        src={item.embedUrl!}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        title="동영상"
      />
    );
  }
}
```

**풀스크린:** `type === 'image'`일 때만 클릭으로 풀스크린 진입 가능
(`video`, `video_link`는 플레이어 내부 컨트롤 사용)

**슬라이드 dot 아이콘:** 미디어 타입별로 다른 아이콘 표시
```
● (image) : 흰색 원
▶ (video/video_link) : 흰색 삼각형 아이콘
```

### 6.2 `PhotoUploadForm.tsx` — 탭형 미디어 업로드 폼

**탭 구조:**
```
[📷 사진]  [🎬 동영상 파일]  [🔗 동영상 링크]
```

각 탭에서 미디어를 추가하면 하단 **통합 미디어 목록**에 추가되어 순서를 확인.

**동영상 파일 탭 핵심 로직:**

```typescript
// 첫 프레임 썸네일 캡처
async function captureVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.preload = 'metadata';
    video.addEventListener('loadeddata', () => {
      video.currentTime = 1;
    });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 400);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
    });
    video.onerror = () => resolve(null);
  });
}

// 동영상 업로드 플로우
async function uploadVideoFile(file: File) {
  // 1. Presigned URL 발급
  const urlRes = await fetch('/api/gallery/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  const { uploadUrl, videoUrl } = await urlRes.json();

  // 2. S3에 동영상 직접 업로드
  await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

  // 3. 썸네일 캡처 후 S3 업로드
  const thumbBlob = await captureVideoThumbnail(file);
  let thumbnailUrl = '';
  if (thumbBlob) {
    const thumbRes = await fetch('/api/gallery/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'thumb.jpg', fileType: 'image/jpeg' }),
    });
    // 썸네일은 이미지로 업로드 (presigned URL 재사용)
    const { uploadUrl: thumbUploadUrl, imageUrl: tUrl } = await thumbRes.json();
    await fetch(thumbUploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: thumbBlob });
    thumbnailUrl = tUrl;
  }

  return { type: 'video', videoUrl, thumbnailUrl };
}
```

**동영상 링크 탭 UI:**

```
URL 입력: [https://youtube.com/watch?v=...]
           [미리보기 확인]

─ 미리보기 ─────────────────
┌──────────────────────────┐
│  [YouTube iframe 미리보기]│
└──────────────────────────┘
플랫폼: YouTube ✅  [추가하기]
```

```typescript
// URL 입력 시 실시간 파싱
const parsed = parseVideoUrl(videoLinkUrl);
if (parsed) {
  // iframe 미리보기 표시
  // "추가하기" 버튼 활성화
}

// 추가 시
mediaList.push({
  type: 'video_link',
  videoLink: videoLinkUrl,
  embedUrl: parsed.embedUrl,
  thumbnailUrl: parsed.thumbnailUrl,
});
```

**최종 POST body:**
```typescript
const allMedia = [
  ...imageItems.map((item, i) => ({ type: 'image', ...item, sortOrder: i })),
  ...videoItems.map((item, i) => ({ ...item, sortOrder: imageItems.length + i })),
  ...linkItems.map((item, i) => ({ ...item, sortOrder: imageItems.length + videoItems.length + i })),
];

await fetch('/api/gallery', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title, description, category, media: allMedia }),
});
```

### 6.3 갤러리 목록 (`gallery/page.tsx`) — 동영상 배지 추가

**`PhotoPostSummary` 타입 확장:**
```typescript
interface PhotoPostSummary {
  // 기존 필드 유지
  mediaType: string;  // 신규
}
```

**카드 썸네일 위 배지:**
```typescript
{post.mediaType === 'video' && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
      <Play className="text-white ml-1" size={22} fill="white" />
    </div>
  </div>
)}
{post.mediaType === 'video_link' && (
  <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
    YT
  </div>
)}
```

### 6.4 업로드 페이지 텍스트 변경

```typescript
// gallery/upload/page.tsx
// 기존
<h1>사진 업로드</h1>
<p>활동 사진을 공유해주세요</p>

// 변경
<h1>미디어 업로드</h1>
<p>사진과 동영상을 공유해주세요</p>
```

아이콘도 `Camera` → `Camera` 유지 (혹은 `Film`)

### 6.5 갤러리 상세 `generateMetadata` 수정

```typescript
// gallery/[id]/page.tsx
// 기존 (imageUrl이 null인 경우 오류 가능)
const imageUrl = post.photos[0]?.imageUrl || post.photos[0]?.thumbnailUrl || '';

// 변경 (thumbnailUrl 우선, null-safe)
const firstMedia = post.photos[0];
const imageUrl = firstMedia?.thumbnailUrl || firstMedia?.imageUrl || '';
```

---

## 7. S3 Integration (기존 유지)

### 7.1 S3 경로 구조

```
S3 버킷: daniel-church-photos (ap-northeast-2)

photos/{YYYY}/{MM}/{cuid}.jpg           → 이미지 원본
photos/{YYYY}/{MM}/{cuid}_thumb.jpg     → 이미지 썸네일
videos/{YYYY}/{MM}/{cuid}.{ext}         → 동영상 파일 (신규)
photos/{YYYY}/{MM}/{cuid}_thumb.jpg     → 동영상 첫 프레임 썸네일 (신규, photos 경로 공유)
```

### 7.2 환경 변수

```env
AWS_S3_BUCKET=daniel-church-photos
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### 7.3 S3 CORS 설정 (동영상 추가)

기존 설정에 `videos/*` 경로 접근 허용이 포함되어야 함.
(버킷 정책: `photos/*`, `videos/*` 공개 읽기)

---

## 8. Implementation Order

> 기존 구현을 최소 변경으로 확장하는 전략. 총 10개 파일 변경.

| # | Task | 파일 | 비고 |
|---|------|------|------|
| 1 | Prisma schema 수정 + 마이그레이션 | `prisma/schema.prisma` | `type`, `videoUrl`, `videoLink`, `embedUrl` 추가 |
| 2 | videoParser 유틸 생성 | `src/lib/videoParser.ts` | **신규** |
| 3 | DB 함수 수정 | `src/lib/db.ts` | `createPhotoPost`, `getPhotoPosts`, 인터페이스 |
| 4 | Upload API 수정 | `src/app/api/gallery/upload/route.ts` | 동영상 presigned URL 분기 |
| 5 | Gallery POST API 수정 | `src/app/api/gallery/route.ts` | `media` 배열 수용 |
| 6 | PhotoViewer 수정 | `src/components/gallery/PhotoViewer.tsx` | video/video_link 렌더링 분기 |
| 7 | PhotoUploadForm 수정 | `src/components/gallery/PhotoUploadForm.tsx` | 탭 UI + 동영상 업로드/링크 |
| 8 | Gallery 목록 페이지 수정 | `src/app/(dashboard)/gallery/page.tsx` | `mediaType` 배지 |
| 9 | Upload 페이지 텍스트 수정 | `src/app/(dashboard)/gallery/upload/page.tsx` | 제목 변경 |
| 10 | Detail 페이지 metadata 수정 | `src/app/(dashboard)/gallery/[id]/page.tsx` | thumbnailUrl null-safe |

---

## 9. Key Design Decisions

| 결정 | 이유 |
|------|------|
| `Photo` 모델 확장 (테이블 교체 X) | 기존 데이터 유지, 마이그레이션 안전 |
| `imageUrl`/`thumbnailUrl` → nullable | `video_link`는 S3 URL 없음 |
| `PhotoViewer.tsx` 파일명 유지 | import 경로 변경 없이 내부 로직만 확장 |
| `photos` 필드 하위호환 유지 | `media || photos` fallback으로 기존 클라이언트 안전 |
| 탭 방식 업로드 UI | UX 명확성, 각 미디어 타입 별도 처리 흐름 |
| iframe `sandbox` 속성 | XSS 방지, 외부 동영상 보안 |
| 동영상 썸네일 → photos/ 경로 | 기존 S3 공개 정책 활용, 별도 경로 불필요 |
| `video_link` thumbnailUrl 빈값 허용 | Vimeo API 불필요, thumbnailUrl nullable |

---

## 10. Category 정의 (기존 유지)

| Key | Label |
|-----|-------|
| `worship` | 예배 |
| `event` | 행사 |
| `camp` | 캠프 |
| `daily` | 일상 |
| `etc` | 기타 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-16 | Initial draft (사진만) | AI Assistant |
| 0.2 | 2026-02-18 | 동영상 파일(FR-02)/링크(FR-03) 추가; Photo 모델 5필드 추가; videoParser.ts 신규; API/컴포넌트 변경 상세화 | AI Assistant |
