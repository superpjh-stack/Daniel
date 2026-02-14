# notification-announcement Planning Document

> **Summary**: 교회 초등부 공지사항 및 알림 시스템 추가
>
> **Project**: 다니엘 (동은교회 초등부 출석/달란트 관리)
> **Author**: Claude
> **Date**: 2026-02-13
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

관리자와 교사가 공지사항을 등록하고, 대시보드에서 최신 공지를 확인할 수 있는 기능을 구현한다. 예배 일정 변경, 특별 행사, 달란트 시장 오픈 등 중요한 정보를 효과적으로 전달한다.

### 1.2 Background

현재 "다니엘" 앱에는 공지사항/알림 기능이 없어, 교사 간 또는 학부모에게 전달할 중요 정보를 앱 내에서 공유할 수 없다. 대시보드에 공지 위젯을 추가하고, 별도 공지 관리 페이지를 만들어 정보 전달 체계를 구축한다.

### 1.3 Related Documents

- CLAUDE.md (프로젝트 아키텍처 참조)
- prisma/schema.prisma (데이터 모델 참조)

---

## 2. Scope

### 2.1 In Scope

- [x] Announcement 데이터 모델 (Prisma 스키마 + DB 함수)
- [x] 공지사항 CRUD API 엔드포인트
- [x] 공지사항 관리 페이지 (관리자 전용)
- [x] 대시보드 공지사항 위젯 (최신 공지 표시)
- [x] 사이드바에 공지사항 메뉴 추가
- [x] 공지 고정(핀) 기능
- [x] 공지 카테고리 분류 (일반/행사/긴급)

### 2.2 Out of Scope

- 푸시 알림 (PWA Push Notification) — 추후 별도 기능으로
- SMS/카카오톡 외부 알림 연동
- 댓글/반응 기능
- 파일 첨부 기능

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Announcement 모델 추가 (id, title, content, category, isPinned, authorId, createdAt, updatedAt) | High | Pending |
| FR-02 | 공지사항 목록 조회 API (GET /api/announcements) — 카테고리 필터, 페이지네이션 | High | Pending |
| FR-03 | 공지사항 상세 조회 API (GET /api/announcements/[id]) | High | Pending |
| FR-04 | 공지사항 생성 API (POST /api/announcements) — 관리자만 | High | Pending |
| FR-05 | 공지사항 수정 API (PUT /api/announcements/[id]) — 관리자만 | High | Pending |
| FR-06 | 공지사항 삭제 API (DELETE /api/announcements/[id]) — 관리자만 | High | Pending |
| FR-07 | 공지사항 관리 페이지 — 목록, 작성, 수정, 삭제 UI | High | Pending |
| FR-08 | 대시보드 공지 위젯 — 최신 공지 3개 + 고정 공지 표시 | High | Pending |
| FR-09 | 사이드바 공지 메뉴 추가 (모든 사용자 접근 가능) | Medium | Pending |
| FR-10 | 공지 고정/해제 토글 기능 (관리자) | Medium | Pending |
| FR-11 | 카테고리별 필터링 (일반/행사/긴급) | Medium | Pending |
| FR-12 | 긴급 공지 시각적 강조 (빨간 배지, 상단 고정) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 공지 목록 조회 < 100ms | better-sqlite3 동기 쿼리 |
| UX | 모바일 반응형 레이아웃 | 수동 테스트 |
| Security | 관리자만 CUD 가능, 조회는 인증 사용자 전체 | session.role 체크 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Prisma 스키마에 Announcement 모델 추가 및 마이그레이션
- [ ] db.ts에 공지 관련 함수 구현 (CRUD + 목록/필터)
- [ ] API 라우트 구현 (GET, POST, PUT, DELETE)
- [ ] 공지 관리 페이지 UI 구현
- [ ] 대시보드 공지 위젯 추가
- [ ] 사이드바 메뉴 항목 추가
- [ ] 빌드 성공 (npm run build)

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] 모바일/데스크톱 반응형 확인
- [ ] 관리자/교사 권한 분리 확인

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| DB 마이그레이션 시 기존 데이터 영향 | Medium | Low | 새 테이블 추가만 하므로 기존 데이터 영향 없음 |
| 대시보드 레이아웃 깨짐 | Medium | Medium | 기존 위젯 구조 유지, 공지 위젯을 최상단에 조건부 렌더링 |
| 권한 체크 누락 | High | Low | 모든 CUD API에 admin 체크 패턴 적용 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js 16 | Next.js 16 | 기존 프로젝트 스택 유지 |
| DB Access | better-sqlite3 직접 | better-sqlite3 | 기존 패턴 (db.ts) 유지 |
| 라우팅 | App Router | App Router | 기존 (dashboard) 그룹 활용 |
| UI | Tailwind + Framer Motion | Tailwind + Framer Motion | 기존 글래스모피즘 디자인 유지 |

### 6.3 데이터 모델

```sql
Announcement
  id          String   @id @default(cuid())
  title       String
  content     String
  category    String   @default("general")  -- general, event, urgent
  isPinned    Boolean  @default(false)
  authorId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  author      User     @relation(fields: [authorId], references: [id])
```

### 6.4 파일 구조

```
src/
  app/
    (dashboard)/
      announcements/
        page.tsx              -- 공지사항 목록/관리 페이지
    api/
      announcements/
        route.ts              -- GET (목록), POST (생성)
        [id]/
          route.ts            -- GET (상세), PUT (수정), DELETE (삭제)
      dashboard/
        route.ts              -- 기존 + 최신 공지 데이터 추가
  lib/
    db.ts                     -- 공지 관련 함수 추가
  components/
    layout/
      Sidebar.tsx             -- 공지 메뉴 항목 추가
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Tailwind CSS configuration

### 7.2 기존 패턴 준수

| Pattern | Description |
|---------|-------------|
| DB 함수 | `createDb()` → 쿼리 → `db.close()` per function (db.ts) |
| API 인증 | `getSession()` → null check → 401 |
| 관리자 체크 | `session.role !== 'admin'` → 403 |
| UI 스타일 | Card, Badge, Button 컴포넌트 + gradient + Framer Motion |
| 사이드바 | `navItems` 배열에 항목 추가, `adminOnly` 옵션 사용 |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`/pdca design notification-announcement`)
2. [ ] 구현 시작 (`/pdca do notification-announcement`)
3. [ ] Gap 분석 (`/pdca analyze notification-announcement`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Claude |
