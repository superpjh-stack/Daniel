# Photo Gallery Plan

> **Feature**: photo-gallery
> **Date**: 2026-02-16
> **Status**: Draft
> **Priority**: High

---

## 1. Overview

### 1.1 Background
동은교회 초등부 활동 사진을 공유하고, 학부모/교사/관리자가 댓글을 남기며 소통할 수 있는 사진첩 기능이 필요합니다. 현재는 사진 공유 기능이 없어 카카오톡 등 외부 채널에 의존하고 있습니다.

### 1.2 Goal
사진 업로드, 댓글, SNS 공유가 가능한 사진첩 메뉴를 추가합니다. 관리자/교사가 사진을 올리고, 모든 사용자가 댓글을 달고, 카카오톡/URL 복사로 외부 공유할 수 있습니다.

### 1.3 Target Users
- **관리자/교사**: 활동 사진 업로드 및 관리
- **학부모**: 사진 조회, 댓글 작성, SNS 공유
- **모든 로그인 사용자**: 사진 열람 및 소통

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

#### FR-02: 사진첩 목록
- 카드 그리드 레이아웃 (2열 모바일, 3열 데스크탑)
- 썸네일 + 제목 + 날짜 + 댓글 수 표시
- 카테고리 필터 탭
- 무한 스크롤 또는 페이지네이션
- 최신순 정렬 (기본)

#### FR-03: 사진 상세 보기
- 풀스크린 이미지 뷰어 (스와이프/좌우 네비게이션)
- 같은 게시글의 여러 사진 슬라이드
- 핀치 줌 (모바일)
- 제목, 설명, 작성자, 날짜 표시

#### FR-04: 댓글 기능
- 사진 게시글별 댓글 목록
- 댓글 작성 (로그인 사용자)
- 댓글 삭제 (본인 댓글 또는 관리자)
- 작성자 이름 + 시간 표시
- 최신순 정렬

#### FR-05: SNS 공유
- **카카오톡 공유**: Kakao SDK `Kakao.Share.sendDefault` (썸네일 + 제목)
- **URL 복사**: 클립보드 복사 + "복사됨!" 토스트
- 공유 시 해당 사진 게시글의 대표 이미지와 제목 포함

#### FR-06: 사진 관리 (관리자/교사)
- 게시글 수정 (제목, 설명, 카테고리)
- 게시글 삭제 (사진 + 댓글 모두 삭제)
- 개별 사진 삭제

---

## 3. Data Model

### 3.1 새 모델: PhotoPost (사진 게시글)

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

### 3.2 새 모델: Photo (개별 사진)

```prisma
model Photo {
  id           String   @id @default(cuid())
  imageUrl     String           // S3 원본 이미지 URL
  thumbnailUrl String           // S3 썸네일 URL
  sortOrder    Int     @default(0)
  createdAt    DateTime @default(now())

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
| 사진첩 목록 | `/gallery` | Server + Client | 카드 그리드, 필터, 페이지네이션 |
| 사진 상세 | `/gallery/[id]` | Server + Client | 이미지 뷰어 + 댓글 |
| 사진 업로드 | `/gallery/upload` | Client (dashboard) | 사진 업로드 폼 (admin/teacher) |

### 4.2 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/gallery` | 게시글 목록 (페이지네이션, 카테고리 필터) |
| GET | `/api/gallery/[id]` | 게시글 상세 (사진 + 댓글) |
| POST | `/api/gallery` | 게시글 생성 (admin/teacher) |
| PUT | `/api/gallery/[id]` | 게시글 수정 (admin/teacher) |
| DELETE | `/api/gallery/[id]` | 게시글 삭제 (admin/teacher) |
| POST | `/api/gallery/[id]/comments` | 댓글 추가 |
| DELETE | `/api/gallery/comments/[id]` | 댓글 삭제 |
| POST | `/api/gallery/upload` | S3 Presigned URL 발급 |

### 4.3 Components

| Component | Location | Description |
|-----------|----------|-------------|
| GalleryGrid | `src/app/(dashboard)/gallery/page.tsx` | 사진 카드 그리드 목록 |
| GalleryDetail | `src/app/(dashboard)/gallery/[id]/page.tsx` | 상세 뷰어 + 댓글 |
| PhotoViewer | `src/components/gallery/PhotoViewer.tsx` | 풀스크린 이미지 뷰어 |
| CommentSection | `src/components/gallery/CommentSection.tsx` | 댓글 목록 + 입력 |
| PhotoUploadForm | `src/components/gallery/PhotoUploadForm.tsx` | 사진 업로드 폼 |
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
│  │  📷      │  │  📷      │  │  📷      │          │
│  │          │  │          │  │          │          │
│  │ 여름캠프  │  │ 주일예배  │  │ 달란트   │          │
│  │ 2/15     │  │ 2/9      │  │ 시장     │          │
│  │ 💬 5     │  │ 💬 3     │  │ 💬 8     │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌── 사진 상세 ────────────────────────────────┐    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │         🖼️ 사진 뷰어                │    │    │
│  │  │    [←]              [→]             │    │    │
│  │  │         ● ○ ○ ○                     │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  │                                             │    │
│  │  여름캠프 첫째날 🎉                          │    │
│  │  아이들이 즐겁게 뛰어놀았어요!                │    │
│  │  관리자 · 2/15 · [공유] [카카오] [URL복사]   │    │
│  │                                             │    │
│  │  ── 댓글 5개 ──────────────────────────     │    │
│  │  김부모: 아이들이 너무 즐거워 보여요! 😊      │    │
│  │  이교사: 좋은 추억이 되었네요~               │    │
│  │                                             │    │
│  │  [댓글 입력...]              [등록]          │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 6. Technical Considerations

### 6.1 이미지 저장소 (AWS S3)
- S3 버킷: `daniel-church-photos` (ap-northeast-2)
- Presigned URL 방식: 클라이언트에서 직접 S3에 업로드 (서버 부담 최소화)
- 폴더 구조: `photos/{year}/{month}/{cuid}.{ext}`
- 썸네일: `photos/{year}/{month}/{cuid}_thumb.{ext}`
- 클라이언트에서 `canvas`를 이용한 리사이징 후 썸네일도 별도 업로드
- 환경 변수: `AWS_S3_BUCKET`, `AWS_REGION` (기존 AWS 인프라 활용)

### 6.2 이미지 최적화
- 원본: 최대 1920px 리사이징 (클라이언트)
- 썸네일: 400px 리사이징 (클라이언트)
- 포맷: JPEG (quality 85%)
- 최대 파일 크기: 5MB/장

### 6.3 카카오톡 공유
- 기존 ShareButtons 컴포넌트 재활용 가능
- 공유 시 대표 사진 썸네일 + 게시글 제목 포함
- OG 태그: 사진 상세 페이지에 동적 OG 이미지 설정

### 6.4 보안
- 업로드: 관리자/교사만 가능 (API 레벨 인증)
- 댓글: 로그인 사용자만 가능
- 댓글 삭제: 본인 또는 관리자만 가능
- S3: Presigned URL 발급 시 서버에서 인증 확인

---

## 7. Implementation Order

1. DB 스키마 (`PhotoPost`, `Photo`, `PhotoComment` 모델 추가, 마이그레이션)
2. S3 Presigned URL 발급 API (`/api/gallery/upload`)
3. 사진 게시글 CRUD API (`/api/gallery`)
4. 댓글 API (`/api/gallery/[id]/comments`, `/api/gallery/comments/[id]`)
5. 사진첩 목록 페이지 (`/gallery`)
6. 사진 상세 + 이미지 뷰어 (`/gallery/[id]`)
7. 사진 업로드 폼 (`/gallery/upload`)
8. 댓글 컴포넌트
9. SNS 공유 기능
10. 사이드바 메뉴 추가

---

## 8. Out of Scope

- 사진 좋아요/하트 기능 (향후 추가 가능)
- 사진 태그 (학생 이름 태그)
- 앨범 기능 (여러 게시글 그룹핑)
- 동영상 업로드 (사진만 지원)
- 사진 편집/필터
- 비공개 사진 (모든 사진은 로그인 사용자에게 공개)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-16 | Initial draft | AI Assistant |
