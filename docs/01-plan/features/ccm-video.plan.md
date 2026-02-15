# ccm-video Planning Document

> **Summary**: 초등부 추천 CCM 동영상 - 사이드바 새 메뉴로 교사가 추천하는 CCM 동영상을 학생/학부모가 시청
>
> **Project**: 다니엘 (동은교회 초등부 출석/달란트 관리)
> **Author**: Claude
> **Date**: 2026-02-15
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

사이드바에 "추천 CCM" 메뉴를 추가하여, 교사/관리자가 초등부 학생에게 추천할 CCM(Contemporary Christian Music) 동영상을 등록하고, 학생 및 학부모가 앱 내에서 직접 시청할 수 있도록 한다.

### 1.2 Background

현재 "다니엘" 앱은 출석, 달란트, 성경퀴즈 등 학습 및 관리 기능을 제공하지만, 예배 찬양이나 CCM 관련 콘텐츠가 없다. 초등부 예배에서 부르는 찬양이나 추천 CCM을 앱에서 바로 들을 수 있으면 학생들이 주중에도 찬양을 연습하고, 학부모도 함께 참여할 수 있다.

### 1.3 Related Documents

- CLAUDE.md (프로젝트 아키텍처 참조)
- prisma/schema.prisma (기존 모델 참조)
- Sidebar.tsx (메뉴 구조 참조)

---

## 2. Scope

### 2.1 In Scope

- [ ] 사이드바에 "추천 CCM" 메뉴 추가 (모든 사용자 접근 가능)
- [ ] CCM 동영상 데이터 모델 (CcmVideo)
- [ ] YouTube 동영상 임베드 재생
- [ ] 카테고리 분류 (찬양/워십/율동/특송)
- [ ] 관리자/교사용 동영상 관리 CRUD (YouTube URL 등록)
- [ ] 동영상 목록 페이지 (카드형 썸네일 + 제목)
- [ ] 동영상 재생 페이지 (YouTube 임베드 + 정보)
- [ ] 추천/인기 표시 기능 (고정 핀)
- [ ] 시드 데이터 (초등부 인기 CCM 10곡)

### 2.2 Out of Scope

- 동영상 직접 업로드 (YouTube 링크만 지원)
- 음악 스트리밍/MP3 재생
- 가사 싱크 (자막)
- 좋아요/댓글 기능 (1차 버전)
- 재생 목록(플레이리스트) 자동 연속 재생

---

## 3. Functional Requirements

### FR-01: 사이드바 메뉴 추가
- 사이드바에 "추천 CCM" 메뉴 항목 추가
- 아이콘: `Music` (lucide-react)
- 위치: "성경퀴즈" 다음
- 모든 역할(admin, teacher, parent) 접근 가능

### FR-02: CCM 동영상 데이터 모델
- CcmVideo 모델: id, title, youtubeUrl, youtubeId, thumbnailUrl, category, description, isPinned, isActive, createdAt, updatedAt
- 카테고리: praise(찬양), worship(워십), action(율동), special(특송)
- YouTube URL에서 videoId 자동 추출

### FR-03: 동영상 목록 페이지 (/ccm)
- 카테고리별 필터링 (전체/찬양/워십/율동/특송)
- 카드형 레이아웃 (썸네일 + 제목 + 카테고리 배지)
- 고정된(pinned) 영상은 상단에 표시
- 반응형: 모바일 1열, 태블릿 2열, 데스크톱 3열

### FR-04: 동영상 재생 페이지 (/ccm/[id])
- YouTube iframe 임베드 (16:9 비율, 반응형)
- 동영상 제목, 카테고리, 설명 표시
- "목록으로 돌아가기" 버튼

### FR-05: 동영상 관리 페이지 (/ccm/manage)
- 관리자/교사용 CRUD
- YouTube URL 입력 시 자동으로 videoId, 썸네일 URL 추출
- 카테고리, 제목, 설명 입력
- 고정(pin)/숨기기(비활성화) 토글
- 목록에서 수정/삭제

### FR-06: YouTube URL 파싱
- 지원 형식: `youtube.com/watch?v=xxx`, `youtu.be/xxx`, `youtube.com/embed/xxx`
- videoId 추출하여 저장
- 썸네일: `https://img.youtube.com/vi/{videoId}/mqdefault.jpg` 자동 생성

### FR-07: 시드 데이터
- 초등부 인기 CCM 10곡 기본 등록
- 예: "주님은 좋은 분", "예수님이 좋은 걸", "하나님은 너를 지키시는 분" 등

---

## 4. Non-Functional Requirements

### NFR-01: 성능
- YouTube iframe lazy loading으로 초기 로딩 최적화
- 썸네일 이미지는 YouTube CDN 직접 사용 (별도 저장 불필요)

### NFR-02: 보안
- 동영상 관리 API는 admin/teacher만 접근
- 동영상 조회 API는 인증된 모든 사용자 접근 가능

### NFR-03: 접근성
- 모바일 우선 반응형 디자인
- 큰 터치 영역 (초등학생 대상)

### NFR-04: 호환성
- YouTube iframe API 사용 (별도 라이브러리 불필요)
- CSP(Content Security Policy) 설정 시 youtube.com 허용 필요

---

## 5. Technical Approach

### 5.1 데이터 모델

```prisma
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

### 5.2 API 구조

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/ccm | 동영상 목록 (카테고리 필터) | all |
| POST | /api/ccm | 동영상 등록 | admin/teacher |
| GET | /api/ccm/[id] | 동영상 상세 | all |
| PUT | /api/ccm/[id] | 동영상 수정 | admin/teacher |
| DELETE | /api/ccm/[id] | 동영상 삭제 (비활성화) | admin/teacher |

### 5.3 UI 페이지

| Page | Path | Description |
|------|------|-------------|
| CCM 목록 | /ccm | 카테고리별 동영상 카드 목록 |
| CCM 재생 | /ccm/[id] | YouTube 임베드 재생 |
| CCM 관리 | /ccm/manage | 교사용 CRUD |

### 5.4 구현 순서

1. Prisma 스키마 추가 + 마이그레이션
2. db.ts에 CCM 관련 함수 추가
3. 시드 데이터 10곡 추가
4. API 라우트 구현
5. 사이드바 메뉴 추가
6. CCM 목록 페이지
7. CCM 재생 페이지
8. CCM 관리 페이지

---

## 6. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube 동영상 삭제/비공개 전환 | 재생 불가 | 썸네일 로딩 실패 시 fallback UI |
| YouTube iframe CSP 차단 | 임베드 불가 | next.config.js에 CSP 설정 |
| YouTube URL 형식 다양 | 파싱 실패 | 정규식으로 다양한 형식 지원 |

---

## 7. Success Criteria

- [ ] 사이드바에서 "추천 CCM" 메뉴 접근 가능
- [ ] YouTube 동영상이 앱 내에서 정상 재생
- [ ] 교사가 YouTube URL로 동영상 추가/수정/삭제 가능
- [ ] 카테고리별 필터링 동작
- [ ] 모바일에서 반응형 레이아웃 정상 표시
- [ ] 10곡 이상 시드 데이터 포함

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial draft | Claude |
