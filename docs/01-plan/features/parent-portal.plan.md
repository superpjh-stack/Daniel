# parent-portal Planning Document

> **Summary**: 학부모 전용 포털 - 자녀 출석/달란트 조회 및 공지 열람
>
> **Project**: 다니엘 (동은교회 초등부 출석/달란트 관리)
> **Author**: Claude
> **Date**: 2026-02-13
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

학부모가 자녀의 출석 현황, 달란트 잔액/내역, 공지사항을 앱에서 직접 확인할 수 있는 학부모 전용 포털을 구현한다. 학부모는 읽기 전용 접근 권한을 가지며, 관리자가 학부모 계정을 생성하고 자녀를 연결한다.

### 1.2 Background

현재 "다니엘" 앱은 관리자(admin)와 교사(teacher) 역할만 지원한다. 학부모가 자녀의 교회 활동 현황을 확인하려면 교사에게 직접 문의해야 하는 불편이 있다. 학부모 전용 포털을 추가하여 자녀 정보를 실시간으로 조회할 수 있게 한다.

### 1.3 Related Documents

- CLAUDE.md (프로젝트 아키텍처 참조)
- prisma/schema.prisma (User, Student 모델 참조)
- notification-announcement 설계서 (공지 기능 참조)

---

## 2. Scope

### 2.1 In Scope

- [x] User 모델에 'parent' 역할 추가
- [x] ParentStudent 연결 테이블 (학부모-자녀 다대다 관계)
- [x] 학부모 계정 관리 API (관리자가 생성/연결)
- [x] 학부모 전용 대시보드 페이지 (자녀 정보 요약)
- [x] 자녀 출석 내역 조회 페이지
- [x] 자녀 달란트 잔액/내역 조회 페이지
- [x] 공지사항 조회 (기존 /announcements 재활용)
- [x] 학부모용 사이드바 네비게이션 (제한된 메뉴)
- [x] 설정 페이지에서 학부모 계정 관리 탭 추가

### 2.2 Out of Scope

- 학부모 자체 회원가입 (관리자가 생성)
- 학부모-교사 채팅/메시지 기능
- 학부모 푸시 알림
- 학부모 앱 별도 분리 (동일 앱 내 역할 분리)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | User 모델에 'parent' role 지원 + ParentStudent 연결 테이블 | High | Pending |
| FR-02 | 학부모 계정 생성 API (관리자 전용, 자녀 연결 포함) | High | Pending |
| FR-03 | 학부모 계정 목록/수정/삭제 API (관리자 전용) | High | Pending |
| FR-04 | 학부모 로그인 (기존 로그인 페이지 공유, role=parent) | High | Pending |
| FR-05 | 학부모 전용 대시보드 (/parent) — 자녀 출석/달란트 요약 | High | Pending |
| FR-06 | 자녀 출석 내역 조회 페이지 (/parent/attendance) | High | Pending |
| FR-07 | 자녀 달란트 잔액/내역 조회 페이지 (/parent/talent) | High | Pending |
| FR-08 | 학부모용 사이드바 (대시보드, 출석, 달란트, 공지사항만) | High | Pending |
| FR-09 | 로그인 후 role별 리다이렉트 (parent → /parent, others → /dashboard) | Medium | Pending |
| FR-10 | 설정 페이지에 학부모 계정 관리 탭 추가 | Medium | Pending |
| FR-11 | 자녀가 복수인 경우 자녀 선택/전환 UI | Medium | Pending |
| FR-12 | 학부모 API에서 자신의 자녀 데이터만 접근 가능하도록 보안 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 학부모 대시보드 로딩 < 100ms | better-sqlite3 동기 쿼리 |
| UX | 모바일 우선 반응형 (학부모는 폰 사용 비율 높음) | 수동 테스트 |
| Security | 학부모는 자신의 자녀 데이터만 조회 가능 | API 레벨 검증 |
| Security | 학부모는 데이터 수정/삭제 불가 (읽기 전용) | role 체크 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Prisma 스키마에 ParentStudent 모델 추가 및 마이그레이션
- [ ] db.ts에 학부모 관련 함수 구현
- [ ] 학부모 계정 관리 API 구현
- [ ] 학부모 전용 페이지 UI 구현 (대시보드, 출석, 달란트)
- [ ] 사이드바 role별 분기 처리
- [ ] 로그인 후 role별 리다이렉트
- [ ] 설정 페이지 학부모 탭
- [ ] 빌드 성공 (npm run build)

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] 모바일/데스크톱 반응형 확인
- [ ] 학부모는 자녀 데이터만 접근 가능 확인
- [ ] 학부모가 관리 기능에 접근 불가 확인

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 기존 역할 체크 로직 수정 필요 | Medium | High | isAdmin 외에 isParent 분기 추가, 기존 로직 영향 최소화 |
| 학부모 계정 대량 생성 부담 | Medium | Medium | 관리자 UI에서 학생 선택 → 빠른 계정 생성 지원 |
| 사이드바 role별 분기 복잡도 | Low | Medium | navItems 필터링 로직에 parentOnly 속성 추가 |
| 자녀 데이터 접근 보안 | High | Low | 모든 parent API에서 ParentStudent 관계 검증 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | - |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | Selected |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | - |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 학부모 인증 방식 | 별도 인증 vs 기존 User 공유 | 기존 User 공유 (role=parent) | 코드 중복 최소화, 기존 패턴 유지 |
| 학부모-자녀 관계 | Student에 parentUserId vs 별도 테이블 | 별도 ParentStudent 테이블 | 다대다 관계 (복수 자녀, 복수 보호자) 지원 |
| 학부모 페이지 라우팅 | /dashboard 내 분기 vs /parent 별도 | /parent 별도 라우트 그룹 | 명확한 분리, 사이드바 레이아웃 차이 |
| 사이드바 분기 | 별도 ParentSidebar vs 기존 Sidebar 확장 | 기존 Sidebar 확장 (role 기반 필터) | 컴포넌트 중복 방지 |

### 6.3 데이터 모델 추가

```prisma
// 학부모-자녀 연결 (다대다)
model ParentStudent {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  parent    User     @relation(fields: [parentId], references: [id])
  parentId  String

  student   Student  @relation(fields: [studentId], references: [id])
  studentId String

  @@unique([parentId, studentId])
}
```

### 6.4 파일 구조

```
수정 파일:
  prisma/schema.prisma            -- ParentStudent 모델 + User/Student relation 추가
  src/lib/db.ts                   -- 학부모 관련 함수 추가
  src/lib/auth.ts                 -- (변경 없음, role='parent' 자연 지원)
  src/app/(dashboard)/layout.tsx  -- role별 리다이렉트 추가
  src/components/layout/Sidebar.tsx -- role별 메뉴 필터링
  src/app/api/auth/login/route.ts -- role별 리다이렉트 응답
  src/app/(dashboard)/settings/page.tsx -- 학부모 관리 탭

신규 파일:
  src/app/api/parents/route.ts          -- GET (목록), POST (생성)
  src/app/api/parents/[id]/route.ts     -- GET, PUT, DELETE
  src/app/api/parent/dashboard/route.ts -- 학부모 대시보드 데이터
  src/app/api/parent/attendance/route.ts -- 자녀 출석 내역
  src/app/api/parent/talent/route.ts     -- 자녀 달란트 내역
  src/app/(dashboard)/parent/page.tsx           -- 학부모 대시보드
  src/app/(dashboard)/parent/attendance/page.tsx -- 출석 내역
  src/app/(dashboard)/parent/talent/page.tsx     -- 달란트 내역
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
| 학부모 체크 | `session.role !== 'parent'` → 403 (신규) |
| 자녀 접근 검증 | ParentStudent 관계 확인 후 데이터 반환 (신규) |
| UI 스타일 | Card, Badge, Button 컴포넌트 + gradient + Framer Motion |
| 사이드바 | `navItems` 배열 필터링 + `parentOnly` 속성 추가 |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`/pdca design parent-portal`)
2. [ ] 구현 시작 (`/pdca do parent-portal`)
3. [ ] Gap 분석 (`/pdca analyze parent-portal`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Claude |
