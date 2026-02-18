# Photo Gallery Plan

> **Feature**: photo-gallery
> **Date**: 2026-02-18
> **Status**: Updated
> **Priority**: High

---

## 1. Overview

### 1.1 Background
동은교회 초등부 활동 사진과 동영상을 공유하고, 학부모/교사/관리자가 댓글을 남기며 소통할 수 있는 사진첩 기능이 필요합니다. 현재는 사진/동영상 공유 기능이 없어 카카오톡 등 외부 채널에 의존하고 있습니다.

### 1.2 Goal
사진 업로드, 동영상 파일 업로드, 동영상 링크(YouTube/Vimeo 등) 추가, 댓글, SNS 공유가 가능한 사진첩 메뉴를 추가합니다. 관리자/교사가 미디어를 올리고, 모든 사용자가 댓글을 달고, 카카오톡/URL 복사로 외부 공유할 수 있습니다.

### 1.3 Target Users
- **관리자/교사**: 사진/동영상 업로드 및 관리
- **학부모**: 미디어 조회, 댓글 작성, SNS 공유
- **모든 로그인 사용자**: 미디어 열람 및 소통

---

## 2. Requirements

### 2.1 Functional Requirements

#### FR-01: 사진 업로드
- 관리자/교사만 사진 업로드 가능
- 이미지 파일 직접 업로드 (AWS S3 Presigned URL 방식)
- 여러 장 동시 업로드 지원 (최대 10장)
- 제목, 설명 입력
- 카테고리 선택: 예배, 행사, 캠프, 일상, 기타
- 이미지 리사이징: 원본 + 썸네일(400px) 자동 생성
- 지원 형식: jpg, jpeg, png, webp, gif

#### FR-02: 동영상 파일 업로드 (신규)
- 관리자/교사만 동영상 파일 업로드 가능
- 동영상 파일 직접 업로드 (AWS S3 Presigned URL 방식)
- 게시글당 동영상 1개 (사진과 혼합 가능)
- 지원 형식: mp4, mov, avi, webm
- 최대 파일 크기: 500MB
- 업로드 진행률 표시 (대용량 파일 고려)
- 자동 썸네일: 동영상 첫 프레임 캡처 (클라이언트 `canvas` 활용)
- S3 경로: `videos/{year}/{month}/{cuid}.{ext}`

#### FR-03: 동영상 링크 추가 (신규)
- 관리자/교사가 YouTube/Vimeo 등 외부 동영상 URL 입력
- URL 입력 시 자동으로 embed 미리보기 표시 (oEmbed 또는 URL 파싱)
- 지원 플랫폼:
  - **YouTube**: `https://www.youtube.com/watch?v=...` → `youtube.com/embed/{id}`
  - **YouTube Shorts**: `https://www.youtube.com/shorts/...`
  - **Vimeo**: `https://vimeo.com/{id}` → `player.vimeo.com/video/{id}`
  - **기타 직접 링크**: 그대로 표시 (iframe)
- 썸네일: YouTube thumbnail API (`img.youtube.com/vi/{id}/hqdefault.jpg`)
- 파일 업로드 없이 링크만으로 동영상 추가 가능

#### FR-04: 미디어 목록 (기존 FR-02)
- 카드 그리드 레이아웃 (2열 모바일, 3열 데스크탑)
- 썸네일 + 제목 + 날짜 + 댓글 수 + 미디어 타입 아이콘(📷/🎬) 표시
- 카테고리 필터 탭
- 무한 스크롤 또는 페이지네이션
- 최신순 정렬 (기본)

#### FR-05: 미디어 상세 보기 (기존 FR-03 확장)
- **사진**: 풀스크린 이미지 뷰어 (스와이프/좌우 네비게이션, 핀치 줌)
- **동영상 파일**: HTML5 `<video>` 플레이어 (controls 포함)
- **동영상 링크**: iframe embed 플레이어 (YouTube/Vimeo)
- 같은 게시글의 여러 미디어 슬라이드 (사진 + 동영상 혼합)
- 제목, 설명, 작성자, 날짜 표시

#### FR-06: 댓글 기능 (기존 FR-04)
- 게시글별 댓글 목록
- 댓글 작성 (로그인 사용자)
- 댓글 삭제 (본인 댓글 또는 관리자)
- 작성자 이름 + 시간 표시
- 최신순 정렬

#### FR-07: SNS 공유 (기존 FR-05)
- **카카오톡 공유**: Kakao SDK `Kakao.Share.sendDefault` (썸네일 + 제목)
- **URL 복사**: 클립보드 복사 + "복사됨!" 토스트
- 공유 시 해당 게시글의 대표 미디어 썸네일과 제목 포함

#### FR-08: 미디어 관리 (기존 FR-06)
- 게시글 수정 (제목, 설명, 카테고리)
- 게시글 삭제 (미디어 + 댓글 모두 삭제, S3 파일도 삭제)
- 개별 미디어 삭제

---

## 3. Data Model

### 3.1 새 모델: PhotoPost (미디어 게시글)

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

### 3.2 새 모델: Photo (개별 미디어 항목)

```prisma
model Photo {
  id           String    @id @default(cuid())
  type         String    @default("image")  // "image" | "video" | "video_link"
  imageUrl     String?   // S3 이미지 원본 URL (type=image)
  thumbnailUrl String?   // S3 썸네일 URL (image/video 공통)
  videoUrl     String?   // S3 동영상 URL (type=video)
  videoLink    String?   // 외부 동영상 URL (type=video_link, YouTube/Vimeo 원본 URL)
  embedUrl     String?   // iframe embed URL (type=video_link, 변환된 embed URL)
  sortOrder    Int       @default(0)
  createdAt    DateTime  @default(now())

  post    PhotoPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId  String
}
```

### 3.3 새 모델: PhotoComment (댓글)

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

### 3.4 User 모델 수정

```prisma
model User {
  // ... 기존 필드
  photoPosts    PhotoPost[]
  photoComments PhotoComment[]
}
```

---


## 4. Page & API Design

### 4.1 Pages

| Page | Route | Type | Description |
|------|-------|------|-------------|
| 미디어 목록 | `/gallery` | Server + Client | 카드 그리드, 필터, 페이지네이션 |
| 미디어 상세 | `/gallery/[id]` | Server + Client | 미디어 뷰어 + 댓글 |
| 미디어 업로드 | `/gallery/upload` | Client (dashboard) | 업로드 폼 (admin/teacher) |

### 4.2 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/gallery` | 게시글 목록 (페이지네이션, 카테고리 필터) |
| GET | `/api/gallery/[id]` | 게시글 상세 (미디어 + 댓글) |
| POST | `/api/gallery` | 게시글 생성 (admin/teacher) |
| PUT | `/api/gallery/[id]` | 게시글 수정 (admin/teacher) |
| DELETE | `/api/gallery/[id]` | 게시글 삭제 (admin/teacher) |
| POST | `/api/gallery/[id]/comments` | 댓글 추가 |
| DELETE | `/api/gallery/comments/[id]` | 댓글 삭제 |
| POST | `/api/gallery/upload` | S3 Presigned URL 발급 (이미지/동영상) |

### 4.3 Components

| Component | Location | Description |
|-----------|----------|-------------|
| GalleryGrid | `src/app/(dashboard)/gallery/page.tsx` | 미디어 카드 그리드 |
| GalleryDetail | `src/app/(dashboard)/gallery/[id]/page.tsx` | 상세 뷰어 + 댓글 |
| MediaViewer | `src/components/gallery/MediaViewer.tsx` | 사진/동영상 통합 뷰어 |
| VideoPlayer | `src/components/gallery/VideoPlayer.tsx` | HTML5 + iframe 동영상 플레이어 |
| CommentSection | `src/components/gallery/CommentSection.tsx` | 댓글 목록 + 입력 |
| MediaUploadForm | `src/components/gallery/MediaUploadForm.tsx` | 사진/동영상 업로드 폼 |
| VideoLinkInput | `src/components/gallery/VideoLinkInput.tsx` | 동영상 링크 입력 + 미리보기 |
| GalleryShareButtons | `src/components/gallery/GalleryShareButtons.tsx` | SNS 공유 버튼 |

---

## 5. UI/UX Wireframe

```
┌─────────────────────────────────────────────────────┐
│  사진첩                                [+ 업로드]    │
│                                                     │
│  [전체] [예배] [행사] [캠프] [일상]                    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  📷      │  │  🎬 ▶    │  │  🎬 🔗   │          │
│  │          │  │  동영상  │  │ YouTube  │          │
│  │ 여름캠프  │  │ 주일설교  │  │ 달란트   │          │
│  │ 2/15     │  │ 2/9      │  │ 시장     │          │
│  │ 💬 5     │  │ 💬 3     │  │ 💬 8     │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌── 업로드 폼 ───────────────────────────────┐    │
│  │  제목: [________________________]           │    │
│  │  설명: [________________________]           │    │
│  │  카테고리: [예배▼]                          │    │
│  │                                            │    │
│  │  ┌─ 미디어 추가 ────────────────────────┐  │    │
│  │  │  [📷 사진 파일 선택]                 │  │    │
│  │  │  [🎬 동영상 파일 선택]               │  │    │
│  │  │  [🔗 동영상 링크 입력]               │  │    │
│  │  │    https://youtube.com/...           │  │    │
│  │  │    [미리보기 표시됨]                 │  │    │
│  │  └─────────────────────────────────────┘  │    │
│  │                           [취소] [업로드]  │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  ┌── 미디어 상세 ─────────────────────────────┐    │
│  │  ┌─────────────────────────────────────┐  │    │
│  │  │      🎬 YouTube/동영상 플레이어      │  │    │
│  │  │      [  ▶  재생  버튼  ]            │  │    │
│  │  └─────────────────────────────────────┘  │    │
│  │  ● ○ ○ ○  (사진+동영상 혼합 슬라이드)      │    │
│  │                                            │    │
│  │  여름캠프 첫째날 🎉                         │    │
│  │  관리자 · 2/15 · [공유] [URL복사]          │    │
│  │  ── 댓글 ──────────────────────────────   │    │
│  │  [댓글 입력...]                [등록]      │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 6. Technical Considerations

### 6.1 이미지 저장소 (AWS S3)
- S3 버킷: `daniel-church-photos` (ap-northeast-2)
- Presigned URL 방식: 클라이언트에서 직접 S3에 업로드 (서버 부담 최소화)
- 이미지 경로: `photos/{year}/{month}/{cuid}.{ext}`
- 이미지 썸네일: `photos/{year}/{month}/{cuid}_thumb.{ext}`
- 동영상 경로: `videos/{year}/{month}/{cuid}.{ext}`
- 환경 변수: `AWS_S3_BUCKET`, `AWS_REGION` (기존 AWS 인프라 활용)

### 6.2 이미지 최적화
- 원본: 최대 1920px 리사이징 (클라이언트)
- 썸네일: 400px 리사이징 (클라이언트)
- 포맷: JPEG (quality 85%)
- 최대 파일 크기: 5MB/장

### 6.3 동영상 파일 업로드
- 최대 파일 크기: 500MB
- S3 Multipart Upload 고려 (100MB 초과 시)
- 업로드 진행률: `XMLHttpRequest` or `fetch` + `onprogress` 이벤트
- 썸네일 자동 생성: 클라이언트에서 `<video>` + `<canvas>`로 첫 프레임 캡처

### 6.4 동영상 링크 파싱
```typescript
// URL → embed URL 변환 유틸리티
function parseVideoUrl(url: string): { embedUrl: string; thumbnailUrl: string } {
  // YouTube: watch?v=ID → embed/ID
  // YouTube Shorts: shorts/ID → embed/ID
  // Vimeo: vimeo.com/ID → player.vimeo.com/video/ID
}
```

### 6.5 카카오톡 공유
- 기존 ShareButtons 컴포넌트 재활용 가능
- 공유 시 대표 미디어 썸네일 + 게시글 제목 포함
- OG 태그: 미디어 상세 페이지에 동적 OG 이미지 설정

### 6.6 보안
- 업로드: 관리자/교사만 가능 (API 레벨 인증)
- 댓글: 로그인 사용자만 가능
- 댓글 삭제: 본인 또는 관리자만 가능
- S3: Presigned URL 발급 시 서버에서 인증 확인
- 동영상 링크: iframe sandbox 속성으로 보안 강화

---

## 7. Implementation Order

1. DB 스키마 (`PhotoPost`, `Photo`, `PhotoComment` 모델 추가 — `type`, `videoUrl`, `videoLink`, `embedUrl` 필드 포함, 마이그레이션)
2. S3 Presigned URL 발급 API (`/api/gallery/upload`) — 이미지/동영상 공통
3. 동영상 URL 파싱 유틸리티 (`src/lib/videoParser.ts`)
4. 미디어 게시글 CRUD API (`/api/gallery`)
5. 댓글 API (`/api/gallery/[id]/comments`, `/api/gallery/comments/[id]`)
6. 미디어 목록 페이지 (`/gallery`)
7. 미디어 상세 + 통합 뷰어 (`/gallery/[id]`) — 사진/동영상/링크 모두 처리
8. 미디어 업로드 폼 (`/gallery/upload`) — 탭: 사진 | 동영상 파일 | 동영상 링크
9. 댓글 컴포넌트
10. SNS 공유 기능
11. 사이드바 메뉴 추가

---

## 8. Out of Scope

- 사진 좋아요/하트 기능 (향후 추가 가능)
- 사진 태그 (학생 이름 태그)
- 앨범 기능 (여러 게시글 그룹핑)
- 사진 편집/필터
- 비공개 미디어 (모든 미디어는 로그인 사용자에게 공개)
- 동영상 자동 변환/트랜스코딩 (서버 사이드)
- 실시간 스트리밍

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-16 | Initial draft (사진만) | AI Assistant |
| 0.2 | 2026-02-18 | 동영상 파일 업로드(FR-02), 동영상 링크(FR-03) 추가; Photo 모델에 type/videoUrl/videoLink/embedUrl 필드 추가; 구현 순서 업데이트 | AI Assistant |
