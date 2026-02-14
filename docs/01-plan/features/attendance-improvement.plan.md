# Attendance Improvement Planning Document

> **Summary**: 동은교회 초등부 출석 시스템 개선 - 일괄 처리, 출석 이력, 연속 출석 보상, UX 향상
>
> **Project**: daniel (동은교회 초등부 출석/달란트 관리)
> **Version**: 1.0.0
> **Author**: Claude Code
> **Date**: 2026-02-13
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 출석 시스템의 UX 한계와 기능 부족을 개선하여, 교사가 더 빠르고 정확하게 출석을 관리하고 학생/학부모가 출석 현황을 쉽게 확인할 수 있도록 한다.

### 1.2 Background

현재 시스템은 기본적인 출석 체크(출석/지각/결석)와 달란트 자동 지급 기능을 제공하지만, 다음과 같은 개선이 필요하다:

- **일괄 처리 부재**: 학생이 많을 때 하나씩 클릭해야 하는 불편함
- **이력 조회 불가**: 개별 학생의 출석 기록을 시간순으로 조회할 수 없음
- **연속 출석 보상 없음**: 꾸준히 출석하는 학생에게 추가 동기부여 수단이 없음
- **달란트 설정 고정**: 출석/지각 시 지급되는 달란트(5점)가 하드코딩되어 있음
- **자동 저장 없음**: 변경 후 페이지 이동 시 데이터 유실 위험
- **미래 날짜 출석 가능**: 날짜 검증이 없어 잘못된 출석 기록이 생길 수 있음

### 1.3 Related Documents

- CLAUDE.md (프로젝트 아키텍처 참조)
- `prisma/schema.prisma` (데이터 모델)
- `src/lib/db.ts` (데이터베이스 함수)
- `src/app/(dashboard)/attendance/page.tsx` (현재 출석 UI)
- `src/app/api/attendance/route.ts` (출석 API)

---

## 2. Scope

### 2.1 In Scope

- [ ] 일괄 출석 처리 (전체 출석/전체 결석 버튼)
- [ ] 출석 달란트 설정 가능화 (관리자 설정 페이지 연동)
- [ ] 개별 학생 출석 이력 조회 (학생 카드에서 이력 보기)
- [ ] 연속 출석 카운터 표시 및 보너스 달란트 지급
- [ ] 미래 날짜 출석 방지 (날짜 검증)
- [ ] 출석 변경 시 확인 다이얼로그 (출석 → 결석 변경)
- [ ] 출석 통계 요약 (출석 페이지 상단 요약 카드)
- [ ] 저장하지 않은 변경사항 이탈 방지 (beforeunload 경고)

### 2.2 Out of Scope

- QR 코드 체크인 (별도 기능으로 분리)
- 학부모 알림 시스템 (parent-portal 기능에서 다룸)
- CSV/PDF 내보내기 (reports-analytics 기능에서 다룸)
- 오프라인 지원 (PWA 고도화 시 검토)
- 사진 출석 확인

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 일괄 출석 처리: "전체 출석" / "전체 결석" 버튼으로 현재 표시된 학생 전체의 상태를 한 번에 변경 | High | Pending |
| FR-02 | 출석 달란트 설정: Setting 테이블에 `attendance_talent_points` 값을 저장하고, API에서 이를 참조하여 달란트 지급 | High | Pending |
| FR-03 | 학생별 출석 이력: 학생 카드 클릭 시 최근 출석 기록(날짜, 상태, 메모)을 모달/시트로 표시 | Medium | Pending |
| FR-04 | 연속 출석 카운터: 학생의 연속 출석 횟수를 계산하여 UI에 표시, N회 연속 시 보너스 달란트 자동 지급 | Medium | Pending |
| FR-05 | 날짜 검증: 미래 날짜 선택 시 출석 기록 불가, 캘린더에서 미래 날짜 비활성화 | High | Pending |
| FR-06 | 상태 변경 확인: 출석/지각 → 결석으로 변경 시 달란트 차감 경고 확인 다이얼로그 | Medium | Pending |
| FR-07 | 출석 통계 요약: 출석 페이지 상단에 오늘 출석률, 출석/지각/결석 수 표시 | Low | Pending |
| FR-08 | 미저장 변경 경고: 변경사항이 있는 상태에서 페이지 이탈 시 확인 다이얼로그 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 출석 저장 응답시간 < 500ms (30명 기준) | API 응답시간 측정 |
| UX | 일괄 처리 후 화면 갱신 < 200ms | UI 반응 측정 |
| Accessibility | 모든 버튼 터치 영역 최소 44x44px | 모바일 검사 |
| Data Integrity | 출석-달란트 트랜잭션 정합성 보장 | DB 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 기능 요구사항(FR-01 ~ FR-08) 구현 완료
- [ ] 기존 출석/달란트 로직과의 호환성 유지
- [ ] 모바일 화면(375px~)에서 정상 동작 확인
- [ ] 관리자/교사 두 역할 모두에서 동작 확인

### 4.2 Quality Criteria

- [ ] ESLint 에러 0건 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 기존 API 엔드포인트 하위 호환성 유지

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 일괄 처리 시 달란트 트랜잭션 불일치 | High | Medium | 일괄 처리를 단일 트랜잭션으로 묶어 원자성 보장 |
| 연속 출석 계산 오류 (지각 포함 여부) | Medium | Medium | 규칙 명확화: 지각도 연속 출석으로 인정 |
| 설정값 변경 후 기존 기록과의 불일치 | Low | Low | 달란트 기록은 지급 시점의 값을 그대로 기록 |
| 대량 학생 일괄 처리 시 성능 저하 | Medium | Low | better-sqlite3의 트랜잭션 batch 처리 활용 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs | **X** |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js 16 | Next.js 16 | 기존 프로젝트 스택 유지 |
| State Management | React useState | React useState | 페이지 단위 상태, 추가 라이브러리 불필요 |
| API Client | fetch | fetch | 기존 패턴 유지 |
| Styling | Tailwind CSS 4 | Tailwind CSS 4 | 기존 프로젝트 스택 유지 |
| Database | better-sqlite3 (직접) | better-sqlite3 | Prisma 런타임 미사용 패턴 유지 |
| Animation | Framer Motion | Framer Motion | 기존 프로젝트 스택 유지 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic (기존 프로젝트 구조 유지)

변경/추가될 파일:
┌─────────────────────────────────────────────────────┐
│ src/lib/db.ts                                       │
│   - getStudentAttendanceHistory()     (신규)        │
│   - getStudentAttendanceStreak()      (신규)        │
│   - getAttendanceSummary()            (신규)        │
│   - getSettingValue()                 (기존 활용)   │
├─────────────────────────────────────────────────────┤
│ src/app/api/attendance/route.ts                     │
│   - POST: 달란트 설정값 참조로 변경                  │
│   - POST: 연속 출석 보너스 로직 추가                  │
├─────────────────────────────────────────────────────┤
│ src/app/api/attendance/history/route.ts  (신규)     │
│   - GET: 학생별 출석 이력 조회                       │
├─────────────────────────────────────────────────────┤
│ src/app/(dashboard)/attendance/page.tsx             │
│   - 일괄 처리 버튼 추가                              │
│   - 통계 요약 카드 추가                              │
│   - 출석 이력 모달 추가                              │
│   - 연속 출석 배지 표시                              │
│   - 미래 날짜 비활성화                               │
│   - 미저장 변경 경고                                 │
│   - 상태 변경 확인 다이얼로그                         │
├─────────────────────────────────────────────────────┤
│ src/app/(dashboard)/settings/page.tsx               │
│   - 출석 달란트 설정 UI 추가                         │
└─────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists
- [ ] `CONVENTIONS.md` exists at project root
- [x] ESLint configuration (Next.js core-web-vitals + TypeScript)
- [ ] Prettier configuration
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | exists (CLAUDE.md) | API route 파라미터 snake_case vs camelCase 통일 | Medium |
| **Folder structure** | exists | 신규 API route 위치 (`api/attendance/history/`) | High |
| **Import order** | missing | 자동 정렬 규칙 | Low |
| **Error handling** | partial | API 에러 응답 형식 통일 | Medium |
| **DB functions** | exists (db.ts) | 신규 함수 네이밍 패턴 유지 | High |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `JWT_SECRET` | Auth secret key | Server | 기존 |

> 추가 환경 변수 불필요 - 모든 설정은 DB Setting 테이블에서 관리

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | N/A | `prisma/schema.prisma` (기존) | - |
| Phase 2 (Convention) | N/A | `CLAUDE.md` (기존) | - |

---

## 8. Implementation Priority Order

구현 우선순위 (의존성 기반):

1. **FR-05** 날짜 검증 (독립적, 즉시 적용 가능)
2. **FR-02** 달란트 설정 가능화 (FR-01, FR-04의 선행 조건)
3. **FR-01** 일괄 출석 처리 (주요 UX 개선)
4. **FR-08** 미저장 변경 경고 (데이터 안전성)
5. **FR-06** 상태 변경 확인 다이얼로그 (데이터 안전성)
6. **FR-07** 출석 통계 요약 (부가 기능)
7. **FR-03** 학생별 출석 이력 (부가 기능)
8. **FR-04** 연속 출석 카운터 & 보너스 (복합 기능)

---

## 9. Next Steps

1. [ ] Write design document (`attendance-improvement.design.md`)
2. [ ] Review and approve plan
3. [ ] Start implementation

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Claude Code |
