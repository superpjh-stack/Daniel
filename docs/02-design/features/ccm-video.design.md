# ccm-video Design Document

> **Summary**: 초등부 추천 CCM 동영상 - 사이드바 새 메뉴로 교사가 추천하는 CCM 동영상을 학생/학부모가 시청
>
> **Project**: 다니엘 (동은교회 초등부 출석/달란트 관리)
> **Author**: Claude
> **Date**: 2026-02-15
> **Status**: Draft
> **Planning Doc**: [ccm-video.plan.md](../../01-plan/features/ccm-video.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 사이드바에 "추천 CCM" 메뉴를 추가하여 모든 사용자(admin, teacher, parent)가 접근 가능
- YouTube 동영상 임베드를 통한 앱 내 재생 (별도 앱 이동 불필요)
- 카테고리별 필터링 (찬양/워십/율동/특송)으로 원하는 장르 탐색
- 관리자/교사가 YouTube URL만 입력하면 자동으로 videoId, 썸네일 추출
- 고정(pin) 기능으로 추천 영상 상단 노출

### 1.2 Design Principles

- 기존 아키텍처 패턴 100% 준수 (Prisma Client 싱글톤, async 함수, db.ts 단일 데이터 접근 계층)
- YouTube iframe 표준 사용 (별도 라이브러리 불필요)
- 모바일 우선 반응형 디자인 (초등부 학생/학부모 대상 큰 썸네일, 직관적 UI)
- 삭제 시 soft delete (isActive: false) — 실수 방지

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  CCM 목록 (/ccm)         │────>│  /api/ccm (GET)           │────>│  PostgreSQL   │
│  CCM 재생 (/ccm/[id])    │     │  /api/ccm (POST)          │     │  (Prisma)     │
│  CCM 관리 (/ccm/manage)  │     │  /api/ccm/[id] (GET/PUT/  │     │              │
│                          │     │              DELETE)       │     │              │
└──────────────────────────┘     └──────────────────────────┘     └──────────────┘
```

### 2.2 Data Flow

```
[조회] 모든 사용자 → /ccm → /api/ccm (GET) → 카테고리별 목록 표시
                   → /ccm/[id] → /api/ccm/[id] (GET) → YouTube iframe 재생

[관리] 교사/관리자 → /ccm/manage → YouTube URL 입력 → videoId/썸네일 자동 추출
                   → /api/ccm (POST) → DB 저장
                   → /api/ccm/[id] (PUT/DELETE) → 수정/비활성화
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| CCM Pages | /api/ccm/* | 동영상 데이터 CRUD |
| CCM API | db.ts, auth.ts | 데이터 접근, 인증 |
| Sidebar | navItems 배열 | 메뉴 추가 |
| YouTube CDN | img.youtube.com | 썸네일 이미지 |
| YouTube Embed | youtube.com/embed | iframe 재생 |

---

## 3. Data Model

### 3.1 CcmVideo Interface (db.ts)

```typescript
export interface CcmVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId: string;       // YouTube videoId (파싱하여 저장)
  thumbnailUrl: string;    // YouTube 썸네일 URL
  category: string;        // praise, worship, action, special
  description: string | null;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Entity Relationships

```
[CcmVideo] — 독립 모델 (다른 모델과 relation 없음)
```

### 3.3 Prisma Schema 추가

```prisma
// CCM 동영상
model CcmVideo {
  id           String   @id @default(cuid())
  title        String
  youtubeUrl   String
  youtubeId    String   // YouTube videoId (파싱하여 저장)
  thumbnailUrl String   // YouTube 썸네일 URL
  category     String   @default("praise") // praise, worship, action, special
  description  String?
  isPinned     Boolean  @default(false)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 4. API Specification

### 4.1 CCM 동영상 조회 API (모든 인증 사용자)

| Method | Path | Description | Auth | Role |
|--------|------|-------------|:----:|:----:|
| GET | /api/ccm | 동영상 목록 (카테고리 필터) | Yes | all |
| GET | /api/ccm/[id] | 동영상 상세 | Yes | all |

### 4.2 CCM 동영상 관리 API (관리자/교사)

| Method | Path | Description | Auth | Role |
|--------|------|-------------|:----:|:----:|
| POST | /api/ccm | 동영상 등록 | Yes | admin/teacher |
| PUT | /api/ccm/[id] | 동영상 수정 | Yes | admin/teacher |
| DELETE | /api/ccm/[id] | 동영상 삭제 (비활성화) | Yes | admin/teacher |

### 4.3 Detailed Specification

#### `GET /api/ccm` (동영상 목록)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| category | string | all | 카테고리 필터 (praise/worship/action/special) |

**Response (200 OK):**
```json
{
  "videos": [
    {
      "id": "cuid...",
      "title": "주님은 좋은 분",
      "youtubeUrl": "https://www.youtube.com/watch?v=abc123",
      "youtubeId": "abc123",
      "thumbnailUrl": "https://img.youtube.com/vi/abc123/mqdefault.jpg",
      "category": "praise",
      "description": "초등부 인기 찬양",
      "isPinned": true,
      "isActive": true,
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z"
    }
  ],
  "total": 10
}
```

**정렬:** 고정(pinned) 영상 먼저, 이후 최신순

#### `GET /api/ccm/[id]` (동영상 상세)

**Response (200 OK):**
```json
{
  "id": "cuid...",
  "title": "주님은 좋은 분",
  "youtubeUrl": "https://www.youtube.com/watch?v=abc123",
  "youtubeId": "abc123",
  "thumbnailUrl": "https://img.youtube.com/vi/abc123/mqdefault.jpg",
  "category": "praise",
  "description": "초등부 인기 찬양",
  "isPinned": true,
  "isActive": true,
  "createdAt": "2026-02-15T10:00:00Z",
  "updatedAt": "2026-02-15T10:00:00Z"
}
```

**Error Responses:**
- `401`: 미인증
- `404`: 동영상 없음 또는 비활성

#### `POST /api/ccm` (동영상 등록)

**Request:**
```json
{
  "title": "주님은 좋은 분",
  "youtubeUrl": "https://www.youtube.com/watch?v=abc123",
  "category": "praise",
  "description": "초등부 인기 찬양"
}
```

**서버 처리:**
1. youtubeUrl에서 youtubeId 파싱
2. thumbnailUrl 자동 생성: `https://img.youtube.com/vi/{youtubeId}/mqdefault.jpg`
3. DB 저장

**Response (200 OK):**
```json
{ "id": "cuid...", "title": "주님은 좋은 분" }
```

**Error Responses:**
- `400`: 필수 필드 누락 (title, youtubeUrl, category)
- `400`: YouTube URL 파싱 실패
- `401`: 미인증
- `403`: 권한 없음 (admin/teacher 아닌 경우)

#### `PUT /api/ccm/[id]` (동영상 수정)

**Request:**
```json
{
  "title": "주님은 좋은 분 (수정)",
  "youtubeUrl": "https://www.youtube.com/watch?v=xyz789",
  "category": "worship",
  "description": "수정된 설명",
  "isPinned": true,
  "isActive": true
}
```

**서버 처리:**
- youtubeUrl 변경 시 youtubeId, thumbnailUrl 재파싱
- 부분 업데이트 지원

**Response (200 OK):**
```json
{ "success": true }
```

**Error Responses:**
- `400`: YouTube URL 파싱 실패
- `401`: 미인증
- `403`: 권한 없음
- `404`: 동영상 없음

#### `DELETE /api/ccm/[id]` (동영상 비활성화)

**Response (200 OK):**
```json
{ "success": true }
```

**처리:** `isActive: false`로 soft delete (실제 삭제 아님)

**Error Responses:**
- `401`: 미인증
- `403`: 권한 없음
- `404`: 동영상 없음

---

## 5. DB Functions (db.ts)

### 5.1 함수 목록

| Function | Parameters | Return | Description |
|----------|-----------|--------|-------------|
| `getAllCcmVideos` | category? | `{ videos: CcmVideo[], total: number }` | 동영상 목록 (pinned 우선, 최신순) |
| `getCcmVideoById` | id | `CcmVideo \| undefined` | 동영상 상세 |
| `createCcmVideo` | { title, youtubeUrl, youtubeId, thumbnailUrl, category, description? } | `string` (id) | 동영상 등록 |
| `updateCcmVideo` | id, data | `void` | 동영상 수정 |
| `deactivateCcmVideo` | id | `void` | 동영상 비활성화 (soft delete) |

### 5.2 주요 함수 상세

```typescript
// 동영상 목록 (pinned 우선, 최신순, isActive만)
export async function getAllCcmVideos(
  category?: string
): Promise<{ videos: CcmVideo[]; total: number }> {
  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== 'all') where.category = category;

  const [total, videos] = await Promise.all([
    prisma.ccmVideo.count({ where }),
    prisma.ccmVideo.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  return {
    videos: videos.map(v => ({
      ...v,
      description: v.description ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    total,
  };
}

// 동영상 상세
export async function getCcmVideoById(id: string): Promise<CcmVideo | undefined> {
  const v = await prisma.ccmVideo.findFirst({
    where: { id, isActive: true },
  });
  if (!v) return undefined;
  return {
    ...v,
    description: v.description ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

// 동영상 등록
export async function createCcmVideo(data: {
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  thumbnailUrl: string;
  category: string;
  description?: string;
}): Promise<string> {
  const v = await prisma.ccmVideo.create({
    data: {
      title: data.title,
      youtubeUrl: data.youtubeUrl,
      youtubeId: data.youtubeId,
      thumbnailUrl: data.thumbnailUrl,
      category: data.category,
      description: data.description || null,
    },
  });
  return v.id;
}

// 동영상 수정
export async function updateCcmVideo(id: string, data: {
  title?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  category?: string;
  description?: string;
  isPinned?: boolean;
  isActive?: boolean;
}): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.youtubeUrl !== undefined) updateData.youtubeUrl = data.youtubeUrl;
  if (data.youtubeId !== undefined) updateData.youtubeId = data.youtubeId;
  if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  await prisma.ccmVideo.update({ where: { id }, data: updateData });
}

// 동영상 비활성화 (soft delete)
export async function deactivateCcmVideo(id: string): Promise<void> {
  await prisma.ccmVideo.update({ where: { id }, data: { isActive: false } });
}
```

---

## 6. YouTube URL Parsing

### 6.1 유틸리티 함수

API 라우트에서 사용할 YouTube URL 파싱 함수 (인라인 구현):

```typescript
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

function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
```

### 6.2 지원 URL 형식

| Format | Example |
|--------|---------|
| Standard | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| Short | `https://youtu.be/dQw4w9WgXcQ` |
| Embed | `https://www.youtube.com/embed/dQw4w9WgXcQ` |
| With params | `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxx` |

---

## 7. UI/UX Design

### 7.1 CCM 목록 페이지 (`/ccm`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "추천 CCM"    subtitle: "찬양으로 하나님을 만나요!"│
│                                     [관리] (교사만)  │
├─────────────────────────────────────────────────────┤
│  카테고리 필터                                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────┐│
│  │🎵 전체 │ │🙏 찬양 │ │✨ 워십 │ │💃 율동 │ │🎤 특송││
│  └────────┘ └────────┘ └────────┘ └────────┘ └─────┘│
├─────────────────────────────────────────────────────┤
│  📌 고정된 CCM                                      │
│  ┌──────────────────┐ ┌──────────────────┐          │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │          │
│  │ │  YouTube     │ │ │ │  YouTube     │ │          │
│  │ │  Thumbnail   │ │ │ │  Thumbnail   │ │          │
│  │ │  (mqdefault) │ │ │ │  (mqdefault) │ │          │
│  │ └──────────────┘ │ │ └──────────────┘ │          │
│  │ 📌 주님은 좋은 분 │ │ 📌 예수님이 좋은걸│          │
│  │ 🙏 찬양           │ │ 🙏 찬양           │          │
│  └──────────────────┘ └──────────────────┘          │
│                                                     │
│  전체 CCM (8개)                                     │
│  ┌──────────────────┐ ┌──────────────────┐          │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │          │
│  │ │  YouTube     │ │ │ │  YouTube     │ │          │
│  │ │  Thumbnail   │ │ │ │  Thumbnail   │ │          │
│  │ └──────────────┘ │ │ └──────────────┘ │          │
│  │ 하나님은 너를     │ │ 내 주를 가까이   │          │
│  │ 지키시는 분       │ │                  │          │
│  │ 💃 율동           │ │ ✨ 워십           │          │
│  └──────────────────┘ └──────────────────┘          │
│  ... 더 많은 카드                                    │
└─────────────────────────────────────────────────────┘
```

**반응형 그리드:**
- 모바일 (<640px): 1열
- 태블릿 (640-1023px): 2열
- 데스크톱 (1024px+): 3열

### 7.2 CCM 재생 페이지 (`/ccm/[id]`)

```
┌─────────────────────────────────────────────────────┐
│  [← 목록으로]                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │                                             │    │
│  │          YouTube iframe                     │    │
│  │          (16:9 ratio, responsive)           │    │
│  │                                             │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  주님은 좋은 분                                      │
│  🙏 찬양                                            │
│                                                     │
│  초등부 예배에서 자주 부르는 찬양입니다.               │
│  집에서도 따라 불러보세요!                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**YouTube iframe:**
```html
<iframe
  src="https://www.youtube.com/embed/{youtubeId}"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
  className="w-full aspect-video rounded-xl"
/>
```

### 7.3 CCM 관리 페이지 (`/ccm/manage`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "CCM 관리"                    [+ 동영상 추가]│
├─────────────────────────────────────────────────────┤
│  카테고리: [전체 ▼]                                   │
│  총 10개 동영상                                      │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │ 📌 주님은 좋은 분                            │   │
│  │ 🙏 찬양                                     │   │
│  │ 📌 고정됨 · ✅ 활성                          │   │
│  │                                [수정] [삭제]  │   │
│  ├──────────────────────────────────────────────┤   │
│  │ 예수님이 좋은 걸                              │   │
│  │ 🙏 찬양                                     │   │
│  │ ✅ 활성                                      │   │
│  │                                [수정] [삭제]  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 7.4 동영상 추가/수정 모달

```
┌─────────────────────────────────────┐
│  동영상 추가                   [X]   │
├─────────────────────────────────────┤
│  제목 *                             │
│  [________________________]         │
│                                     │
│  YouTube URL *                      │
│  [________________________]         │
│  → 입력 시 자동으로 썸네일 미리보기   │
│  ┌──────────────┐                   │
│  │  Thumbnail   │                   │
│  │  Preview     │                   │
│  └──────────────┘                   │
│                                     │
│  카테고리 *                         │
│  [찬양 ▼]                           │
│                                     │
│  설명                               │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  □ 상단 고정 (추천)                 │
│                                     │
│  [취소]  [저장하기]                  │
└─────────────────────────────────────┘
```

### 7.5 사이드바 메뉴 추가

```typescript
// Sidebar.tsx navItems에 추가
import { Music } from 'lucide-react';

// "성경퀴즈" 다음에 추가
{ href: '/ccm', icon: <Music size={20} />, label: '추천 CCM' },
```

위치: "성경퀴즈" 다음
접근: 모든 사용자 (adminOnly, hideForParent 모두 없음)

### 7.6 Category 표시

| Category | Label | Emoji |
|----------|-------|-------|
| all | 전체 | 🎵 |
| praise | 찬양 | 🙏 |
| worship | 워십 | ✨ |
| action | 율동 | 💃 |
| special | 특송 | 🎤 |

### 7.7 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| CcmList | /ccm/page.tsx | 카테고리 필터, 카드형 목록 |
| CcmPlayer | /ccm/[id]/page.tsx | YouTube 임베드 재생, 정보 표시 |
| CcmManage | /ccm/manage/page.tsx | 관리자 동영상 CRUD |

---

## 8. Seed Data

### 8.1 시드 데이터 (10곡)

`prisma/seed.ts`에 초등부 인기 CCM 10곡 추가:

| # | Title | Category | YouTubeId (예시) |
|---|-------|----------|-----------------|
| 1 | 주님은 좋은 분 | praise | 예시ID-1 |
| 2 | 예수님이 좋은 걸 | praise | 예시ID-2 |
| 3 | 하나님은 너를 지키시는 분 | praise | 예시ID-3 |
| 4 | 내 주를 가까이 하게 함은 | worship | 예시ID-4 |
| 5 | 주님의 사랑이 나를 감싸네 | worship | 예시ID-5 |
| 6 | 할렐루야 (율동) | action | 예시ID-6 |
| 7 | 하나님의 세계 (율동) | action | 예시ID-7 |
| 8 | 나 같은 죄인 살리신 | worship | 예시ID-8 |
| 9 | 전능하신 하나님 | special | 예시ID-9 |
| 10 | 주 하나님 지으신 모든 세계 | special | 예시ID-10 |

카테고리별 분포:
| Category | Count |
|----------|-------|
| praise | 3 |
| worship | 3 |
| action | 2 |
| special | 2 |

실제 시드 데이터는 YouTube에서 "초등부 CCM", "어린이 찬양" 검색 결과에서 실제 videoId를 사용하여 구성.

---

## 9. Security Considerations

- [x] 모든 CCM API에서 `getSession()` → 401 (미인증 차단)
- [x] 동영상 관리 API (POST/PUT/DELETE)에서 admin/teacher role 체크 → 403
- [x] 동영상 조회 API (GET)는 인증된 모든 사용자 접근 가능
- [x] YouTube URL 파싱 검증 — 유효하지 않은 URL 거부 (400)
- [x] DELETE는 soft delete (isActive: false) — 실수 방지
- [x] YouTube iframe: `sandbox` 속성 불필요 (YouTube 자체 보안)

---

## 10. Error Handling

| Code | Situation | Response | UI Handling |
|------|-----------|----------|-------------|
| 400 | 필수 필드 누락 | `{ error: "제목, YouTube URL, 카테고리는 필수입니다." }` | alert 표시 |
| 400 | YouTube URL 파싱 실패 | `{ error: "유효하지 않은 YouTube URL입니다." }` | alert 표시 |
| 401 | 미인증 | `{ error: "인증이 필요합니다." }` | 로그인 리다이렉트 |
| 403 | 권한 없음 | `{ error: "권한이 없습니다." }` | alert 표시 |
| 404 | 동영상 없음 | `{ error: "동영상을 찾을 수 없습니다." }` | 목록 리다이렉트 |
| 500 | 서버 오류 | `{ error: "서버 오류가 발생했습니다." }` | alert 표시 |

---

## 11. Implementation Order

1. [ ] **Schema**: Prisma 스키마에 CcmVideo 모델 추가 + 마이그레이션
2. [ ] **DB Functions**: db.ts에 CCM 관련 함수 5개 추가
3. [ ] **Seed Data**: prisma/seed.ts에 CCM 10곡 추가
4. [ ] **API Routes**: /api/ccm (GET/POST), /api/ccm/[id] (GET/PUT/DELETE)
5. [ ] **Sidebar**: "추천 CCM" 메뉴 항목 추가 (Music 아이콘)
6. [ ] **UI - CCM 목록**: /ccm/page.tsx (카테고리 필터 + 카드 목록)
7. [ ] **UI - CCM 재생**: /ccm/[id]/page.tsx (YouTube 임베드)
8. [ ] **UI - CCM 관리**: /ccm/manage/page.tsx (교사 CRUD)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial draft | Claude |
