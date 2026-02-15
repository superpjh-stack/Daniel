# Brand Landing Page Plan

> **Feature**: brand-landing
> **Date**: 2026-02-16
> **Status**: Draft
> **Priority**: High

---

## 1. Overview

### 1.1 Background
현재 앱의 루트(`/`)는 `/attendance`로 바로 리다이렉트됩니다. 교회 초등부의 브랜드 아이덴티티를 보여줄 메인 페이지가 없는 상태입니다.

### 1.2 Goal
L'Oréal Korea 사이트(https://www.loreal.com/ko-kr/korea/)처럼 풀스크린 히어로 미디어(사진/동영상) + 소셜 공유 + 공지사항을 보여주는 브랜드 랜딩 페이지를 만듭니다. 관리자가 미디어를 관리할 수 있는 어드민 메뉴도 추가합니다.

### 1.3 Target Users
- **학부모/방문자**: 메인 페이지에서 초등부 분위기, 최신 활동 사진/동영상, 공지사항을 확인
- **관리자/교사**: 히어로 미디어(사진, YouTube 동영상)를 업로드/관리

---

## 2. Requirements

### 2.1 Functional Requirements

#### FR-01: 히어로 미디어 캐러셀
- 풀스크린 히어로 영역에 사진 및 YouTube 동영상 슬라이드
- 자동 슬라이드 (5초 간격) + 수동 좌/우 네비게이션
- 인디케이터 도트 표시
- 동영상인 경우 자동 재생 아님 → 재생 버튼 오버레이 표시
- 캐러셀 위에 제목 + 부제목 오버레이 텍스트 (반투명 배경)
- 모바일에서도 스와이프로 넘기기 가능

#### FR-02: 소셜 공유 버튼
- 각 미디어 슬라이드에 공유 버튼 표시
- 지원 채널:
  - **카카오톡** 공유 (Kakao JavaScript SDK `Kakao.Share.sendDefault`)
  - **인스타그램** (URL 복사 안내 — 인스타 직접 공유 API 없음)
  - **URL 복사** (클립보드 복사 후 "복사됨!" 토스트)
- 공유 시 현재 슬라이드의 이미지 썸네일 + 제목이 포함

#### FR-03: 공지사항 섹션
- 히어로 아래에 최신 공지사항 3~5개 표시
- 기존 Announcement 모델 활용
- 고정(pinned) 공지 우선 표시
- "더보기" 링크 → `/announcements` (기존 공지 목록)

#### FR-04: 통계 하이라이트 (선택)
- L'Oréal 스타일 숫자 카운트업 애니메이션
- 전체 학생 수, 출석률, 누적 달란트 등 주요 수치 2~4개

#### FR-05: 관리자 미디어 관리 메뉴
- 관리자 전용 페이지: `/settings/hero-media` 또는 `/hero-manage`
- CRUD 기능:
  - **추가**: 이미지 URL 또는 YouTube URL 입력, 제목, 부제목, 순서 지정
  - **수정**: 제목/부제목/순서/활성 여부 편집
  - **삭제**: 미디어 항목 삭제
  - **순서 변경**: 드래그 또는 순서 번호 수정
- 이미지 업로드: 외부 URL 방식 (직접 파일 업로드는 스토리지 필요하므로 URL 입력)
- YouTube 동영상: URL 입력 시 자동으로 youtubeId, thumbnailUrl 추출

#### FR-06: 랜딩 페이지 라우팅 변경
- 현재 `/` → `/attendance` 리다이렉트를 변경
- **비로그인**: `/` → 브랜드 랜딩 페이지 표시
- **로그인 후**: 사이드바의 "홈" 메뉴 → 대시보드 유지, 별도의 "메인 페이지 보기" 링크 제공
- 또는 대시보드 자체를 브랜드 랜딩으로 교체 (판단 필요)

### 2.2 Non-Functional Requirements

- **NFR-01**: 모바일 우선 반응형 (320px ~ 1920px)
- **NFR-02**: 히어로 이미지 lazy loading, YouTube iframe defer
- **NFR-03**: 60fps 캐러셀 애니메이션 (CSS transform 기반)
- **NFR-04**: 카카오 SDK는 클라이언트에서만 로드 (동적 스크립트)
- **NFR-05**: SSR 호환 — 랜딩 페이지는 서버 컴포넌트에서 데이터 로드

---

## 3. Data Model

### 3.1 새 모델: HeroMedia

```prisma
model HeroMedia {
  id           String   @id @default(cuid())
  title        String                     // 슬라이드 제목
  subtitle     String?                    // 부제목
  mediaType    String                     // "image" | "youtube"
  mediaUrl     String                     // 이미지 URL 또는 YouTube URL
  youtubeId    String?                    // YouTube 동영상 ID (자동 추출)
  thumbnailUrl String?                    // 썸네일 URL (YouTube는 자동, 이미지는 mediaUrl)
  sortOrder    Int      @default(0)       // 정렬 순서
  isActive     Boolean  @default(true)    // 활성 여부
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### 3.2 기존 모델 활용
- **Announcement**: 공지사항 섹션에서 최근 5개 조회
- **Student** (count), **Attendance** (율), **Talent** (합계): 통계 하이라이트

---

## 4. Page & API Design

### 4.1 Pages

| Page | Route | Type | Description |
|------|-------|------|-------------|
| 브랜드 랜딩 | `/` | Server + Client | 히어로 캐러셀 + 공지 + 통계 |
| 미디어 관리 | `/hero-manage` | Client (dashboard) | 관리자 CRUD |

### 4.2 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/hero-media` | 활성 미디어 목록 (sortOrder 순) |
| POST | `/api/hero-media` | 미디어 추가 (admin only) |
| PUT | `/api/hero-media/[id]` | 미디어 수정 (admin only) |
| DELETE | `/api/hero-media/[id]` | 미디어 삭제 (admin only) |

### 4.3 Components

| Component | Location | Description |
|-----------|----------|-------------|
| HeroCarousel | `src/components/landing/HeroCarousel.tsx` | 풀스크린 미디어 캐러셀 (client) |
| ShareButtons | `src/components/landing/ShareButtons.tsx` | 카카오/인스타/URL복사 버튼 |
| AnnouncementSection | `src/components/landing/AnnouncementSection.tsx` | 공지사항 목록 |
| StatsHighlight | `src/components/landing/StatsHighlight.tsx` | 숫자 카운트업 통계 |
| HeroMediaManage | `src/app/(dashboard)/hero-manage/page.tsx` | 관리자 미디어 CRUD |

---

## 5. UI/UX Wireframe

```
┌─────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │         🖼️  히어로 미디어 (풀스크린)            │  │
│  │                                               │  │
│  │     "동은교회 초등부에 오신 것을 환영합니다"      │  │
│  │     "함께 성장하는 믿음의 어린이들"              │  │
│  │                                               │  │
│  │  [←]                                   [→]    │  │
│  │                                               │  │
│  │    [카카오공유] [인스타] [URL복사]               │  │
│  │                                               │  │
│  │         ● ○ ○ ○ ○  (인디케이터)                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── 📊 주요 현황 ──────────────────────────────┐  │
│  │  👨‍👩‍👧‍👦 42명    📅 출석률 87%    ⭐ 2,340 달란트 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── 📢 공지사항 ────────────────────────────────┐  │
│  │  📌 [긴급] 이번 주 야외예배 안내               │  │
│  │  [행사] 여름캠프 참가 신청                     │  │
│  │  [일반] 3월 달란트 시장 오픈 안내              │  │
│  │                        [더보기 →]             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── 🏠 Footer ─────────────────────────────────┐  │
│  │  동은교회 초등부 | 서울시 ...                   │  │
│  │  [로그인]                                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 6. Technical Considerations

### 6.1 카카오톡 공유
- Kakao JavaScript SDK (`https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js`)
- `Kakao.init(APP_KEY)` 후 `Kakao.Share.sendDefault` 호출
- 카카오 개발자 앱 키 필요 (`.env`에 `NEXT_PUBLIC_KAKAO_APP_KEY`)
- 앱 키가 없으면 카카오 공유 버튼 숨김

### 6.2 이미지 처리
- 외부 URL 방식 (S3, 구글 포토, 직접 호스팅 등)
- `next/image`의 `remotePatterns`에 허용 도메인 추가 필요
- 또는 `<img>` 태그로 외부 이미지 직접 로드

### 6.3 YouTube 임베드
- `lite-youtube-embed` 패턴 사용 (초기 로드 시 썸네일만, 클릭 시 iframe)
- 또는 간단하게 썸네일 + 재생 버튼 오버레이 → 클릭 시 iframe 교체

### 6.4 라우팅 전략
- `/` (루트)를 브랜드 랜딩으로 변경
- 기존 `src/app/page.tsx`의 redirect 제거
- 로그인 상태에서도 `/` 접근 시 랜딩 표시 (대시보드는 `/dashboard`)
- 사이드바 "홈" 메뉴는 `/dashboard` 유지

---

## 7. Implementation Order

1. DB 스키마 (`HeroMedia` 모델 추가, 마이그레이션)
2. API 라우트 (`/api/hero-media` CRUD)
3. 랜딩 컴포넌트 (HeroCarousel, ShareButtons, AnnouncementSection, StatsHighlight)
4. 랜딩 페이지 (`/` — `src/app/page.tsx` 교체)
5. 관리자 미디어 관리 페이지 (`/hero-manage`)
6. 사이드바 메뉴 추가
7. 카카오 SDK 통합

---

## 8. Out of Scope

- 파일 업로드 스토리지 (S3 presigned URL 등) — URL 입력 방식으로 대체
- 댓글/좋아요 기능
- SEO 최적화 (OG 태그는 기존 설정 활용)
- 다국어 지원

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-16 | Initial draft | AI Assistant |
