# Student Management Improvement Planning Document

> **Summary**: 학생 관리 페이지 개선 - 반별 필터, 삭제 확인 다이얼로그, 학생 상세 정보, 프로필 이미지, 관리자 권한 체크
>
> **Project**: daniel (동은교회 초등부 출석/달란트 관리)
> **Version**: 1.0.0
> **Author**: Claude Code
> **Date**: 2026-02-13
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 학생 관리 페이지의 기능적 한계와 UX 문제를 개선하여, 교사와 관리자가 학생 정보를 더 효율적으로 관리하고 한눈에 파악할 수 있도록 한다.

### 1.2 Background

현재 학생 관리 시스템(`students/page.tsx`, 406줄)은 기본 CRUD 기능을 제공하지만, 다음과 같은 개선이 필요하다:

- **반별 필터링 부재**: 학년 필터만 존재하고, 반(Class)별 필터가 없어 특정 반의 학생을 빠르게 조회할 수 없음
- **삭제 UX 미흡**: 브라우저 기본 `confirm()` 대화상자를 사용하여 앱의 디자인 일관성이 깨짐
- **출석/달란트 미리보기 부족**: 학생 카드에 달란트 잔액만 표시되고, 최근 출석 상태나 출석률 정보가 없음
- **프로필 이미지 미지원**: Prisma 스키마에 `profileImage` 필드가 정의되어 있으나 UI에서 전혀 활용되지 않음
- **관리자 권한 부재**: DELETE API에 관리자 권한 체크가 없어 교사 역할도 학생 삭제 가능
- **학생 상세 보기 없음**: 학생의 출석 이력, 달란트 내역, 기본 정보를 한 화면에서 볼 수 없음
- **중복 등록 방지 없음**: 동일 이름+학년 학생의 중복 등록을 감지하지 않음
- **정렬 옵션 없음**: 이름순/달란트순/최근등록순 등 정렬 기능이 없음

### 1.3 Related Documents

- CLAUDE.md (프로젝트 아키텍처 참조)
- `prisma/schema.prisma` (Student 모델 - profileImage 필드 포함)
- `src/lib/db.ts` (Student 관련 함수: getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent 등)
- `src/app/(dashboard)/students/page.tsx` (현재 학생 관리 UI, 406줄)
- `src/app/api/students/route.ts` (GET + POST API)
- `src/app/api/students/[id]/route.ts` (GET, PUT, DELETE API)

---

## 2. Scope

### 2.1 In Scope

- [ ] 반(Class)별 필터 추가 (학년 필터 옆에 반 선택 드롭다운)
- [ ] 정렬 옵션 추가 (이름순, 달란트순, 최근등록순)
- [ ] 커스텀 삭제 확인 다이얼로그 (앱 디자인에 맞는 모달)
- [ ] 학생 카드에 최근 출석 상태 표시 (최근 4주 미니 표시)
- [ ] 학생 상세 보기 모달 (출석 이력, 달란트 내역, 기본 정보 통합)
- [ ] 프로필 이미지 URL 입력 및 표시 (Avatar 컴포넌트 확장)
- [ ] DELETE API에 관리자(admin) 권한 체크 추가
- [ ] 학생 등록 시 중복 감지 (동명+동학년 경고)
- [ ] 학생 수 통계 카드 (전체/학년별/반별 인원)

### 2.2 Out of Scope

- CSV 가져오기/내보내기 (별도 기능으로 분리)
- 학생 사진 직접 업로드 (URL 입력만 지원)
- 학부모 연동/알림 시스템
- 학생 졸업/진급 일괄 처리
- QR 코드 학생 식별

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 반(Class) 드롭다운 필터 - 학년 필터와 연동하여 해당 학년의 반만 표시 | High | Pending |
| FR-02 | 정렬 옵션 (이름순 ㄱ-ㅎ, 달란트 많은순, 최근등록순) | Medium | Pending |
| FR-03 | 커스텀 삭제 확인 다이얼로그 - 학생 이름 표시, 관련 출석/달란트 데이터도 삭제됨을 안내 | High | Pending |
| FR-04 | 학생 카드에 최근 4주 출석 미니 인디케이터 (출석=초록, 결석=빨강, 지각=노랑, 없음=회색) | Medium | Pending |
| FR-05 | 학생 상세 보기 모달 - 기본 정보, 최근 출석 이력(10건), 최근 달란트 내역(10건) 통합 표시 | High | Pending |
| FR-06 | 프로필 이미지 URL 입력 필드 (추가/수정 폼에 추가) 및 Avatar 컴포넌트에서 이미지 표시 | Low | Pending |
| FR-07 | DELETE API에 admin 역할 검증 추가, 교사는 삭제 불가 | High | Pending |
| FR-08 | 학생 등록 시 동명+동학년 학생이 존재하면 경고 표시 (등록은 허용) | Medium | Pending |
| FR-09 | 페이지 상단 통계 요약 카드 (전체 학생 수, 학년별 분포, 반 배정률) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 학생 목록 로딩 200ms 이내 | 브라우저 개발자 도구 네트워크 탭 |
| UX 일관성 | 모든 모달/다이얼로그가 앱 디자인 시스템 따름 | 시각적 검토 |
| 모바일 대응 | 모든 신규 UI가 모바일에서 정상 동작 | 모바일 뷰포트 테스트 |
| 접근성 | 키보드 네비게이션 및 스크린 리더 호환 | 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 Functional Requirements 구현 완료
- [ ] `npm run build` 성공
- [ ] `npm run lint` 에러 없음
- [ ] 모바일/데스크톱 화면에서 정상 동작 확인
- [ ] 기존 학생 데이터에 영향 없음

### 4.2 Quality Criteria

- [ ] 빌드 성공 (zero errors)
- [ ] 린트 에러 없음
- [ ] Gap Analysis 90% 이상

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 출석 미니 인디케이터 데이터 로딩 성능 저하 (학생별 출석 조회) | Medium | Medium | 학생 목록 API에서 최근 4주 출석을 JOIN하여 한번에 조회 |
| 관리자 권한 체크 추가 시 교사 UX 혼란 | Low | Low | 삭제 버튼 비활성화 + 권한 안내 툴팁 표시 |
| 학생 상세 모달 정보 과다 | Medium | Low | 탭 UI로 기본정보/출석/달란트 분리 |
| profileImage URL 유효성 검증 어려움 | Low | Medium | 이미지 로드 실패 시 기본 Avatar 폴백 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based, BaaS | Web apps, SaaS MVPs | ☑ |
| **Enterprise** | Strict layers, DI | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js 16 | Next.js 16 | 기존 프로젝트 유지 |
| State | React useState | useState | 기존 패턴 유지, 단일 페이지 범위 |
| API Client | fetch | fetch | 기존 패턴 유지 |
| Styling | Tailwind CSS 4 | Tailwind CSS 4 | 기존 글래스모피즘 디자인 시스템 유지 |
| DB 접근 | better-sqlite3 | better-sqlite3 | 기존 패턴 유지 (Prisma는 마이그레이션 전용) |

### 6.3 영향받는 파일

```
수정 대상 파일:
├── src/app/(dashboard)/students/page.tsx  (주요 UI 개편)
├── src/app/api/students/route.ts          (GET 확장: 출석 데이터 포함)
├── src/app/api/students/[id]/route.ts     (DELETE 권한 체크, GET 상세 정보)
└── src/lib/db.ts                          (신규 쿼리 함수 추가)

신규 API 없음 (기존 API 확장)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists
- [ ] `CONVENTIONS.md` exists
- [x] ESLint configuration (Next.js core-web-vitals + TypeScript)
- [ ] Prettier configuration
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | 기존 패턴 존재 | camelCase 함수, PascalCase 컴포넌트 유지 | High |
| **Folder structure** | App Router 기반 | 기존 구조 유지 | High |
| **API 패턴** | JSON 응답, getSession() 인증 | 관리자 전용 API 권한 체크 패턴 추가 | Medium |
| **Error handling** | try-catch + console.error | UI 에러 피드백 알림 추가 | Medium |

### 7.3 Environment Variables Needed

추가 환경 변수 불필요 (기존 `JWT_SECRET`만 사용)

---

## 8. Implementation Order (예상)

1. **DB 계층** - `src/lib/db.ts`에 신규 쿼리 함수 추가 (출석 미리보기, 학생 상세, 중복 체크)
2. **API 계층** - 기존 API 확장 (GET에 출석 데이터 포함, DELETE에 권한 체크)
3. **UI 기반** - 통계 카드, 필터 확장, 정렬 옵션
4. **삭제 다이얼로그** - 커스텀 삭제 확인 모달
5. **학생 상세 모달** - 출석 이력, 달란트 내역 통합 뷰
6. **프로필 이미지** - 폼 필드 추가, Avatar 이미지 표시
7. **중복 감지** - 등록 시 경고 UI

---

## 9. Next Steps

1. [ ] Design document 작성 (`student-management.design.md`)
2. [ ] 구현 시작
3. [ ] Gap Analysis 실행

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Claude Code |
