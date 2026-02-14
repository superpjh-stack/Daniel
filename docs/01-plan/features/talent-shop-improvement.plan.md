# Talent Shop Improvement Planning Document

> **Summary**: 달란트 시장(상점) 개선 - 상품 관리 강화, 구매 UX 개선, 구매 이력, 권한 제어, 데이터 무결성 보장
>
> **Project**: daniel (동은교회 초등부 출석/달란트 관리)
> **Version**: 1.0.0
> **Author**: Claude Code
> **Date**: 2026-02-13
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

달란트 시장의 상품 관리, 구매 UX, 데이터 무결성을 전면 개선하여, 관리자가 상품을 효과적으로 관리하고 교사/학생이 안전하고 편리하게 구매할 수 있도록 한다.

### 1.2 Background

현재 달란트 시장은 기본적인 상품 조회/구매 기능만 제공하며, 다음과 같은 개선이 필요하다:

- **상품 관리 부재**: 상품 생성만 가능하고 수정/삭제 불가. 이미지 업로드 미지원.
- **권한 제어 미흡**: 상품 생성 API에 관리자 권한 체크가 없어 모든 인증 사용자가 상품을 추가할 수 있음
- **구매 이력 없음**: 학생의 구매 내역을 조회할 수 있는 화면이 없음
- **데이터 무결성 위험**: 구매 트랜잭션이 원자적이지 않아, 동시 요청 시 재고/잔액 불일치 가능
- **잔액 검증 미비**: 달란트 차감 시 잔액이 음수로 갈 수 있음
- **상품 카테고리 없음**: 상품이 많아지면 탐색이 어려움
- **UI/UX 한계**: 재고 소진 상품 처리, 인기 상품 표시 등 부재

### 1.3 Related Documents

- CLAUDE.md (프로젝트 아키텍처 참조)
- `prisma/schema.prisma` (Product, Talent, Student 모델)
- `src/lib/db.ts` (데이터베이스 함수)
- `src/app/(dashboard)/shop/page.tsx` (현재 상점 UI)
- `src/app/api/shop/products/route.ts` (상품 API)
- `src/app/api/shop/purchase/route.ts` (구매 API)
- `src/app/(dashboard)/talent/page.tsx` (달란트 관리 UI)
- `attendance-improvement` PDCA 완료 보고서 (Setting 테이블 패턴 참조)

---

## 2. Scope

### 2.1 In Scope

- [ ] 상품 수정/삭제 기능 (관리자 전용)
- [ ] 상품 생성/수정/삭제 API에 관리자 권한 체크 추가
- [ ] 상품 이미지 URL 지원 (외부 URL 입력)
- [ ] 학생별 구매 이력 조회 (상점 페이지 내 모달)
- [ ] 구매 트랜잭션 원자성 보장 (SQLite 트랜잭션)
- [ ] 잔액 음수 방지 검증 강화
- [ ] 상품 카테고리 분류 (Setting 테이블 활용)
- [ ] 품절 상품 표시 개선 및 재입고 알림 UI
- [ ] 인기 상품 / 신규 상품 배지
- [ ] 구매 확인 다이얼로그

### 2.2 Out of Scope

- 실제 이미지 파일 업로드 (외부 URL만 지원, 파일 스토리지 미구현)
- 장바구니 기능 (단일 구매 유지)
- 상품 리뷰/평점 시스템
- 구매 취소/환불 기능 (별도 기능으로 분리)
- 달란트 관리 페이지 개선 (별도 PDCA 사이클)
- 상품 할인/프로모션 시스템

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 상품 수정: 관리자가 상품명, 설명, 가격, 재고, 이미지 URL을 수정할 수 있음 | High | Pending |
| FR-02 | 상품 삭제: 관리자가 상품을 비활성화(soft delete)할 수 있음. 비활성 상품은 목록에서 숨김 | High | Pending |
| FR-03 | 관리자 권한 제어: 상품 생성/수정/삭제 API에 `role === 'admin'` 체크 추가 | High | Pending |
| FR-04 | 상품 이미지: 상품 카드에 이미지 URL 표시, 없으면 기본 아이콘 표시 | Medium | Pending |
| FR-05 | 구매 이력: 학생별 구매 내역을 조회할 수 있는 모달 (상품명, 수량, 금액, 날짜) | Medium | Pending |
| FR-06 | 트랜잭션 원자성: 구매 시 재고 차감, 잔액 차감, 기록 생성을 단일 SQLite 트랜잭션으로 처리 | High | Pending |
| FR-07 | 잔액 음수 방지: 구매 및 달란트 차감 시 잔액이 0 미만이 되지 않도록 검증 | High | Pending |
| FR-08 | 상품 카테고리: 상품을 카테고리별로 분류하고 필터링 가능 (예: 학용품, 간식, 문화, 기타) | Low | Pending |
| FR-09 | 구매 확인 다이얼로그: 구매 버튼 클릭 시 상품명, 수량, 총 가격을 확인하는 다이얼로그 표시 | Medium | Pending |
| FR-10 | 상품 배지: 품절(SOLD OUT), 신규(NEW, 7일 이내), 인기(HOT, 구매 빈도 기준) 배지 표시 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 구매 트랜잭션 응답시간 < 500ms | API 응답시간 측정 |
| Data Integrity | 동시 구매 시 재고/잔액 정합성 보장 | 다중 요청 테스트 |
| UX | 상품 목록 로딩 < 300ms | UI 렌더링 측정 |
| Security | 관리자 전용 기능에 대한 권한 체크 | API 테스트 |
| Accessibility | 모든 버튼 터치 영역 최소 44x44px | 모바일 검사 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 기능 요구사항(FR-01 ~ FR-10) 구현 완료
- [ ] 기존 구매 로직과의 호환성 유지 (기존 구매 기록 영향 없음)
- [ ] 모바일 화면(375px~)에서 정상 동작 확인
- [ ] 관리자/교사 두 역할의 권한 분리 확인

### 4.2 Quality Criteria

- [ ] ESLint 에러 0건 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 기존 API 엔드포인트 하위 호환성 유지

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 동시 구매 시 재고 불일치 | High | Medium | SQLite 트랜잭션으로 원자성 보장 (FR-06) |
| 상품 삭제 시 기존 구매 기록 영향 | Medium | Low | Soft delete 방식(isActive=false)으로 기록 보존 |
| 이미지 URL 유효성 문제 | Low | Medium | 이미지 로딩 실패 시 기본 아이콘 fallback |
| 카테고리 추가로 인한 스키마 변경 필요 | Medium | Low | Setting 테이블 또는 Product 필드 활용으로 마이그레이션 회피 |
| 기존 상품 생성 API 파괴적 변경 | Medium | Low | 권한 체크만 추가, 요청/응답 형식 유지 |

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
| Transaction | better-sqlite3 transaction() | better-sqlite3 transaction() | SQLite 네이티브 트랜잭션 |
| Image | 외부 URL 입력 | URL | 파일 업로드 인프라 불필요 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic (기존 프로젝트 구조 유지)

변경/추가될 파일:
┌─────────────────────────────────────────────────────┐
│ src/lib/db.ts                                       │
│   - updateProduct()                  (신규)         │
│   - deactivateProduct()              (신규)         │
│   - purchaseTransaction()            (신규)         │
│   - getStudentPurchaseHistory()      (신규)         │
│   - getProductPurchaseCount()        (신규)         │
├─────────────────────────────────────────────────────┤
│ src/app/api/shop/products/route.ts                  │
│   - POST: 관리자 권한 체크 추가                      │
│   - PUT: 상품 수정 (신규)                            │
├─────────────────────────────────────────────────────┤
│ src/app/api/shop/products/[id]/route.ts  (신규)     │
│   - PUT: 개별 상품 수정                              │
│   - DELETE: 상품 비활성화                             │
├─────────────────────────────────────────────────────┤
│ src/app/api/shop/purchase/route.ts                  │
│   - POST: 트랜잭션 원자성 적용                        │
│   - POST: 잔액 음수 방지 강화                         │
├─────────────────────────────────────────────────────┤
│ src/app/api/shop/history/route.ts        (신규)     │
│   - GET: 학생별 구매 이력 조회                        │
├─────────────────────────────────────────────────────┤
│ src/app/(dashboard)/shop/page.tsx                   │
│   - 상품 수정/삭제 UI (관리자)                        │
│   - 구매 이력 모달                                    │
│   - 구매 확인 다이얼로그                               │
│   - 카테고리 필터                                     │
│   - 상품 배지 (품절/신규/인기)                         │
│   - 이미지 표시                                       │
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
| **Naming** | exists (CLAUDE.md) | 동적 라우트 `[id]` 파라미터 네이밍 | Medium |
| **Folder structure** | exists | 동적 라우트 파일 위치 (`api/shop/products/[id]/`) | High |
| **DB functions** | exists (db.ts) | 트랜잭션 함수 네이밍 패턴 (`purchaseTransaction`) | High |
| **Error handling** | partial | API 에러 응답 코드/메시지 통일 | Medium |
| **Auth patterns** | exists (auth.ts) | 역할 기반 권한 체크 패턴 통일 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `JWT_SECRET` | Auth secret key | Server | 기존 |

> 추가 환경 변수 불필요 - 카테고리 등 설정은 DB Setting 테이블 또는 Product 컬럼에서 관리

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | N/A | `prisma/schema.prisma` (기존) | - |
| Phase 2 (Convention) | N/A | `CLAUDE.md` (기존) | - |

---

## 8. Implementation Priority Order

구현 우선순위 (의존성 + 위험도 기반):

1. **FR-06** 트랜잭션 원자성 (데이터 무결성, 가장 높은 위험)
2. **FR-07** 잔액 음수 방지 (데이터 무결성)
3. **FR-03** 관리자 권한 제어 (보안, FR-01/02의 선행 조건)
4. **FR-01** 상품 수정 (관리자 기능)
5. **FR-02** 상품 삭제 (관리자 기능)
6. **FR-04** 상품 이미지 URL (UI 개선)
7. **FR-09** 구매 확인 다이얼로그 (UX 안전성)
8. **FR-05** 구매 이력 모달 (부가 기능)
9. **FR-10** 상품 배지 (부가 기능)
10. **FR-08** 상품 카테고리 (부가 기능)

---

## 9. Next Steps

1. [ ] Write design document (`talent-shop-improvement.design.md`)
2. [ ] Review and approve plan
3. [ ] Start implementation

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Claude Code |
