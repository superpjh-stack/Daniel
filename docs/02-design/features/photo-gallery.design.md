# Photo Gallery Design

> **Feature**: photo-gallery
> **Date**: 2026-02-16
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/photo-gallery.plan.md`

---

## 1. Data Model (Prisma Schema)

### 1.1 PhotoPost

```prisma
model PhotoPost {
  id          String   @id @default(cuid())
  title       String
  description String?
  category    String   @default("daily")  // worship, event, camp, daily, etc
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  author    User   @relation(fields: [authorId], references: [id])
  authorId  String

  photos    Photo[]
  comments  PhotoComment[]
}
```

### 1.2 Photo

```prisma
model Photo {
  id           String   @id @default(cuid())
  imageUrl     String
  thumbnailUrl String
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())

  post    PhotoPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId  String
}
```

### 1.3 PhotoComment

```prisma
model PhotoComment {
  id        String   @id @default(cuid())
  content   String
  createdAt DateTime @default(now())

  post      PhotoPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String

  author    User   @relation(fields: [authorId], references: [id])
  authorId  String
}
```

### 1.4 User 모델 관계 추가

```prisma
model User {
  // 기존 필드 유지
  photoPosts    PhotoPost[]
  photoComments PhotoComment[]
}
```

---

## 2. DB Functions (`src/lib/db.ts`)

### 2.1 PhotoPost 함수

```typescript
// 게시글 목록 (페이지네이션, 카테고리 필터)
export async function getPhotoPosts(
  category?: string,
  page?: number,
  limit?: number
): Promise<{ posts: PhotoPostSummary[]; total: number }>

// 게시글 상세 (사진 + 댓글 포함)
export async function getPhotoPostById(
  id: string
): Promise<PhotoPostDetail | undefined>

// 게시글 생성
export async function createPhotoPost(data: {
  title: string;
  description?: string;
  category: string;
  authorId: string;
  photos: { imageUrl: string; thumbnailUrl: string; sortOrder: number }[];
}): Promise<string>

// 게시글 수정
export async function updatePhotoPost(
  id: string,
  data: { title?: string; description?: string; category?: string }
): Promise<void>

// 게시글 삭제
export async function deletePhotoPost(id: string): Promise<void>
```

### 2.2 PhotoComment 함수

```typescript
// 댓글 추가
export async function createPhotoComment(data: {
  postId: string;
  authorId: string;
  content: string;
}): Promise<string>

// 댓글 삭제
export async function deletePhotoComment(id: string): Promise<void>

// 댓글 작성자 확인
export async function getPhotoCommentById(
  id: string
): Promise<{ id: string; authorId: string } | undefined>
```

### 2.3 인터페이스

```typescript
export interface PhotoPostSummary {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string;      // 첫 번째 사진 썸네일
  photoCount: number;
  commentCount: number;
  authorName: string;
  createdAt: string;
}

export interface PhotoPostDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  photos: {
    id: string;
    imageUrl: string;
    thumbnailUrl: string;
    sortOrder: number;
  }[];
  comments: {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string;
  }[];
}
```

---

## 3. API Routes

### 3.1 GET `/api/gallery`

게시글 목록 조회.

**Query Parameters**:
- `category`: string (optional) - 필터
- `page`: number (default: 1)
- `limit`: number (default: 12)

**Response**: `{ posts: PhotoPostSummary[], total: number }`

**Auth**: Required (any role)

### 3.2 GET `/api/gallery/[id]`

게시글 상세 조회 (사진 + 댓글 포함).

**Response**: `PhotoPostDetail`

**Auth**: Required (any role)

### 3.3 POST `/api/gallery`

게시글 생성.

**Body**:
```json
{
  "title": "여름캠프 첫째날",
  "description": "아이들이 즐겁게 뛰어놀았어요!",
  "category": "camp",
  "photos": [
    { "imageUrl": "https://...", "thumbnailUrl": "https://...", "sortOrder": 0 }
  ]
}
```

**Auth**: Required (admin/teacher only)

### 3.4 PUT `/api/gallery/[id]`

게시글 수정 (제목, 설명, 카테고리만).

**Body**: `{ title?, description?, category? }`

**Auth**: Required (admin/teacher only)

### 3.5 DELETE `/api/gallery/[id]`

게시글 삭제 (사진 + 댓글 cascade 삭제).

**Auth**: Required (admin/teacher only)

### 3.6 POST `/api/gallery/[id]/comments`

댓글 추가.

**Body**: `{ content: string }`

**Auth**: Required (any role)

### 3.7 DELETE `/api/gallery/comments/[commentId]`

댓글 삭제.

**Auth**: Required (본인 또는 admin)

### 3.8 POST `/api/gallery/upload`

S3 Presigned URL 발급.

**Body**: `{ fileName: string, fileType: string }`

**Response**:
```json
{
  "uploadUrl": "https://s3...presigned...",
  "imageUrl": "https://daniel-church-photos.s3.ap-northeast-2.amazonaws.com/photos/2026/02/xxx.jpg",
  "key": "photos/2026/02/xxx.jpg"
}
```

**Auth**: Required (admin/teacher only)

---

## 4. Page Components

### 4.1 사진첩 목록 — `/gallery`

**파일**: `src/app/(dashboard)/gallery/page.tsx`

**Server Component** (SSR):
- `getPhotoPosts()` 호출하여 초기 데이터 로드
- 카테고리 필터 탭 (전체/예배/행사/캠프/일상)
- admin/teacher인 경우 "+ 업로드" 버튼 표시

**Client Component** — `GalleryGrid`:
- 카드 그리드 (모바일 2열, 데스크탑 3열)
- 각 카드: 썸네일 + 제목 + 날짜 + 사진 수 + 댓글 수
- 카테고리 탭 클릭 시 API 재호출
- "더보기" 버튼 (페이지네이션)

### 4.2 사진 상세 — `/gallery/[id]`

**파일**: `src/app/(dashboard)/gallery/[id]/page.tsx`

**Server Component** (SSR):
- `getPhotoPostById(id)` 호출
- 404 처리

**Client Components**:

#### PhotoViewer (`src/components/gallery/PhotoViewer.tsx`)
- 현재 사진 인덱스 state
- 좌/우 화살표 네비게이션
- 인디케이터 도트
- 스와이프 지원 (touch events)
- 이미지 클릭 시 원본 크기로 확대 (모달 또는 새 탭)

#### CommentSection (`src/components/gallery/CommentSection.tsx`)
- 댓글 목록 (authorName + content + createdAt)
- 댓글 입력 폼 (textarea + 등록 버튼)
- 댓글 삭제 버튼 (본인/admin만 표시)
- 낙관적 업데이트 (optimistic UI)

#### GalleryShareButtons (`src/components/gallery/GalleryShareButtons.tsx`)
- 기존 `ShareButtons` 패턴 재활용
- 카카오톡 공유 + URL 복사

### 4.3 사진 업로드 — `/gallery/upload`

**파일**: `src/app/(dashboard)/gallery/upload/page.tsx`

**Client Component** — `PhotoUploadForm`:
1. 제목 입력 (필수)
2. 설명 입력 (선택)
3. 카테고리 선택 (드롭다운)
4. 사진 선택 (파일 input, multiple, 최대 10장)
5. 사진 미리보기 (썸네일 그리드, 드래그 순서 변경 또는 X 삭제)
6. "업로드" 버튼 → 프로세스:
   - 각 이미지를 canvas로 리사이징 (원본 1920px, 썸네일 400px)
   - `/api/gallery/upload`로 presigned URL 2개 발급 (원본 + 썸네일)
   - S3에 직접 PUT 업로드
   - 모든 업로드 완료 후 `/api/gallery` POST로 게시글 생성
   - 성공 시 `/gallery` 로 이동
7. 진행률 표시 (프로그레스 바)

---

## 5. S3 Integration

### 5.1 S3 유틸 (`src/lib/s3.ts`)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5분
}

export function getPublicUrl(key: string): string {
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${key}`;
}
```

### 5.2 환경 변수

```env
AWS_S3_BUCKET=daniel-church-photos
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### 5.3 S3 버킷 설정

- CORS: `AllowedOrigins: ["*"]`, `AllowedMethods: ["PUT"]`, `AllowedHeaders: ["*"]`
- Public Read: 버킷 정책으로 `photos/*` 경로 공개 읽기 허용
- 키 패턴: `photos/{YYYY}/{MM}/{cuid}.jpg`, `photos/{YYYY}/{MM}/{cuid}_thumb.jpg`

---

## 6. Client Image Processing

### 6.1 이미지 리사이징 유틸 (`src/lib/image-utils.ts`)

```typescript
export async function resizeImage(
  file: File,
  maxWidth: number,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}
```

### 6.2 업로드 플로우

```
파일 선택 → 미리보기 → 업로드 클릭
  ↓
각 파일마다:
  1. resizeImage(file, 1920) → 원본 Blob
  2. resizeImage(file, 400)  → 썸네일 Blob
  3. POST /api/gallery/upload → { uploadUrl, thumbUploadUrl, imageUrl, thumbnailUrl }
  4. PUT uploadUrl (원본 Blob)
  5. PUT thumbUploadUrl (썸네일 Blob)
  ↓
모든 업로드 완료:
  POST /api/gallery { title, description, category, photos }
  ↓
/gallery로 redirect
```

---

## 7. Sidebar Menu

`src/components/layout/Sidebar.tsx`에 추가:

```typescript
{ href: '/gallery', icon: <Camera size={20} />, label: '사진첩' }
```

위치: CCM 메뉴 바로 다음, 게임 메뉴 바로 앞.

---

## 8. Implementation Order (Checklist)

| # | Task | Files | FR |
|---|------|-------|----|
| 1 | Prisma schema 추가 + 마이그레이션 | `prisma/schema.prisma`, migration | - |
| 2 | DB 함수 추가 | `src/lib/db.ts` | - |
| 3 | S3 유틸 생성 | `src/lib/s3.ts` | - |
| 4 | 이미지 리사이징 유틸 | `src/lib/image-utils.ts` | FR-01 |
| 5 | S3 Presigned URL API | `src/app/api/gallery/upload/route.ts` | FR-01 |
| 6 | 게시글 CRUD API | `src/app/api/gallery/route.ts`, `[id]/route.ts` | FR-01,02,06 |
| 7 | 댓글 API | `src/app/api/gallery/[id]/comments/route.ts`, `comments/[commentId]/route.ts` | FR-04 |
| 8 | 사진첩 목록 페이지 | `src/app/(dashboard)/gallery/page.tsx` | FR-02 |
| 9 | 사진 상세 페이지 | `src/app/(dashboard)/gallery/[id]/page.tsx` | FR-03 |
| 10 | PhotoViewer 컴포넌트 | `src/components/gallery/PhotoViewer.tsx` | FR-03 |
| 11 | CommentSection 컴포넌트 | `src/components/gallery/CommentSection.tsx` | FR-04 |
| 12 | 사진 업로드 페이지 | `src/app/(dashboard)/gallery/upload/page.tsx` | FR-01 |
| 13 | PhotoUploadForm 컴포넌트 | `src/components/gallery/PhotoUploadForm.tsx` | FR-01 |
| 14 | GalleryShareButtons | `src/components/gallery/GalleryShareButtons.tsx` | FR-05 |
| 15 | 사이드바 메뉴 추가 | `src/components/layout/Sidebar.tsx` | - |

### 의존성 설치

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## 9. Category 정의

| Key | Label | Description |
|-----|-------|-------------|
| `worship` | 예배 | 주일 예배, 수요예배 등 |
| `event` | 행사 | 특별행사, 학부모참여 |
| `camp` | 캠프 | 여름/겨울캠프, 수련회 |
| `daily` | 일상 | 일상 활동, 공과 시간 |
| `etc` | 기타 | 기타 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-16 | Initial draft | AI Assistant |
