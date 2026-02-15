# bible-quiz-game Planning Document

> **Summary**: 성경퀴즈게임 - 사이드바 새 메뉴로 성경 퀴즈를 풀고 달란트를 획득하는 게임
>
> **Project**: 다니엘 (동은교회 초등부 출석/달란트 관리)
> **Author**: Claude
> **Date**: 2026-02-15
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

사이드바에 새로운 "성경퀴즈" 메뉴를 추가하여, 초등부 학생들이 성경 지식을 재미있게 학습할 수 있는 퀴즈 게임을 제공한다. 정답을 맞히면 달란트를 획득하여 기존 달란트 시장과 연동된다.

### 1.2 Background

현재 "다니엘" 앱은 출석, 달란트, 상점 기능을 제공하지만, 학생들이 적극적으로 참여할 수 있는 인터랙티브 콘텐츠가 없다. 성경퀴즈게임을 통해 학생들의 앱 참여도를 높이고, 성경 학습 동기를 부여하며, 달란트 획득의 새로운 경로를 제공한다.

### 1.3 Related Documents

- CLAUDE.md (프로젝트 아키텍처 참조)
- prisma/schema.prisma (Student, Talent 모델 참조)
- talent-shop-improvement 설계서 (달란트 시스템 참조)

---

## 2. Scope

### 2.1 In Scope

- [x] 사이드바에 "성경퀴즈" 메뉴 추가 (교사/관리자/학부모 모두 접근 가능)
- [x] 퀴즈 카테고리 분류 (구약/신약/인물/사건/일반상식)
- [x] 퀴즈 문제 데이터 모델 (QuizQuestion)
- [x] 퀴즈 게임 결과 기록 모델 (QuizResult)
- [x] 퀴즈 풀기 UI (4지선다 객관식)
- [x] 정답 시 달란트 자동 지급 (기존 Talent 시스템 연동)
- [x] 퀴즈 결과 확인 및 오답 복습 화면
- [x] 관리자/교사용 퀴즈 문제 관리 (CRUD)
- [x] 반별 퀴즈 랭킹 / 통계
- [x] 기본 성경퀴즈 시드 데이터 (50문제)

### 2.2 Out of Scope

- 실시간 대전 (멀티플레이어) 모드
- 타이머 기반 스피드 퀴즈
- 이미지/영상 기반 퀴즈 (텍스트만)
- 사용자 제작 퀴즈 (관리자만 생성)
- 난이도 자동 조절 (AI 기반)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | QuizQuestion 모델 (문제, 보기 4개, 정답, 카테고리, 난이도) | High | Pending |
| FR-02 | QuizResult 모델 (학생별 퀴즈 결과 기록) | High | Pending |
| FR-03 | 퀴즈 문제 CRUD API (관리자/교사 전용) | High | Pending |
| FR-04 | 퀴즈 게임 시작 API (카테고리/난이도 선택, 랜덤 10문제) | High | Pending |
| FR-05 | 퀴즈 답안 제출 API (정답 확인 + 달란트 지급) | High | Pending |
| FR-06 | 퀴즈 게임 메인 페이지 (/quiz) — 카테고리 선택 UI | High | Pending |
| FR-07 | 퀴즈 풀기 페이지 (/quiz/play) — 4지선다 게임 UI | High | Pending |
| FR-08 | 퀴즈 결과 페이지 (/quiz/result) — 점수, 오답 복습 | High | Pending |
| FR-09 | 퀴즈 관리 페이지 (/quiz/manage) — 문제 등록/수정/삭제 | Medium | Pending |
| FR-10 | 퀴즈 랭킹 API (반별/전체 최고 점수) | Medium | Pending |
| FR-11 | 사이드바에 "성경퀴즈" 메뉴 항목 추가 | High | Pending |
| FR-12 | 기본 성경퀴즈 50문제 시드 데이터 | Medium | Pending |
| FR-13 | 하루 퀴즈 횟수 제한 (3회) — 무한 달란트 방지 | High | Pending |
| FR-14 | 학부모용 자녀 퀴즈 기록 조회 (/parent/quiz) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 퀴즈 로딩 < 200ms | Prisma 쿼리 최적화 |
| UX | 모바일 우선 반응형, 터치 친화적 버튼 | 수동 테스트 |
| UX | 정답/오답 시 시각적 피드백 (색상 + 애니메이션) | Framer Motion |
| Security | 클라이언트에 정답 노출 금지 (서버 검증) | API 레벨 검증 |
| Data | 퀴즈 결과 이력 영구 보관 | DB 저장 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Prisma 스키마에 QuizQuestion, QuizResult 모델 추가 및 마이그레이션
- [ ] db.ts에 퀴즈 관련 함수 구현
- [ ] 퀴즈 API 엔드포인트 구현 (CRUD + 게임 로직)
- [ ] 퀴즈 UI 페이지 구현 (메인, 플레이, 결과, 관리)
- [ ] 사이드바 메뉴 추가
- [ ] 달란트 연동 (정답 시 자동 지급)
- [ ] 시드 데이터 50문제 추가
- [ ] 빌드 성공 (npm run build)

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] 모바일/데스크톱 반응형 확인
- [ ] 정답이 클라이언트에 노출되지 않음 확인
- [ ] 하루 3회 제한 동작 확인
- [ ] 달란트 지급/잔액 정확성 확인

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 달란트 무한 획득 | High | High | 하루 3회 퀴즈 횟수 제한 |
| 정답 클라이언트 노출 | High | Medium | 서버 사이드 정답 검증, 클라이언트에 정답 미전송 |
| 퀴즈 문제 부족 | Medium | Low | 초기 50문제 시드 + 관리자 추가 기능 |
| 기존 달란트 시스템 영향 | Medium | Low | 기존 Talent 모델 그대로 활용 (type='quiz' 추가) |
| 학생별 퀴즈 기록 데이터 증가 | Low | Medium | QuizResult에 인덱스 설정 |

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
| 퀴즈 데이터 저장 | JSON 파일 vs DB 테이블 | DB 테이블 (QuizQuestion) | 관리자 CRUD, 검색/필터링 필요 |
| 정답 검증 | 클라이언트 vs 서버 | 서버 검증 | 보안상 정답 노출 방지 필수 |
| 게임 흐름 | 전체 제출 vs 문항별 제출 | 문항별 즉시 피드백 | 초등부 UX, 즉각적 보상 효과 |
| 달란트 지급 방식 | 게임 완료 후 일괄 vs 문항별 | 게임 완료 후 일괄 | 중도 이탈 시 부분 지급 방지 |
| 퀴즈 제한 | 횟수 vs 시간 기반 | 하루 3회 횟수 제한 | 구현 단순, 공정성 보장 |

### 6.3 데이터 모델 추가

```prisma
// 퀴즈 문제
model QuizQuestion {
  id         String   @id @default(cuid())
  question   String   // 문제 텍스트
  option1    String   // 보기 1
  option2    String   // 보기 2
  option3    String   // 보기 3
  option4    String   // 보기 4
  answer     Int      // 정답 번호 (1-4)
  category   String   // old_testament, new_testament, person, event, general
  difficulty String   @default("easy") // easy, medium, hard
  reference  String?  // 성경 구절 참조 (예: "창세기 1:1")
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  results QuizResult[]
}

// 퀴즈 게임 결과
model QuizResult {
  id           String   @id @default(cuid())
  score        Int      // 맞힌 개수
  totalCount   Int      // 전체 문제 수
  earnedTalent Int      // 획득 달란트
  answers      String   // JSON: [{questionId, selected, correct}]
  createdAt    DateTime @default(now())

  student    Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId  String

  question   QuizQuestion @relation(fields: [questionId], references: [id])
  questionId String
}
```

### 6.4 달란트 연동 규칙

| 조건 | 달란트 지급 |
|------|------------|
| 10문제 중 10개 정답 (만점) | 10 달란트 |
| 10문제 중 7~9개 정답 | 7 달란트 |
| 10문제 중 4~6개 정답 | 4 달란트 |
| 10문제 중 1~3개 정답 | 1 달란트 |
| 10문제 중 0개 정답 | 0 달란트 |
| 하루 3회 초과 | 달란트 미지급 (게임은 가능) |

### 6.5 파일 구조

```
수정 파일:
  prisma/schema.prisma               -- QuizQuestion, QuizResult 모델 추가
  prisma/seed.ts                     -- 성경퀴즈 50문제 시드 데이터
  src/lib/db.ts                      -- 퀴즈 관련 함수 추가
  src/components/layout/Sidebar.tsx  -- "성경퀴즈" 메뉴 항목 추가

신규 파일:
  src/app/api/quiz/route.ts               -- GET (문제 목록), POST (문제 생성)
  src/app/api/quiz/[id]/route.ts          -- GET, PUT, DELETE (문제 관리)
  src/app/api/quiz/start/route.ts         -- POST (게임 시작 - 랜덤 10문제)
  src/app/api/quiz/submit/route.ts        -- POST (답안 제출 + 결과 저장 + 달란트 지급)
  src/app/api/quiz/results/route.ts       -- GET (퀴즈 결과/랭킹 조회)
  src/app/(dashboard)/quiz/page.tsx       -- 퀴즈 메인 (카테고리 선택)
  src/app/(dashboard)/quiz/play/page.tsx  -- 퀴즈 플레이 (게임 UI)
  src/app/(dashboard)/quiz/result/page.tsx -- 퀴즈 결과 (점수/오답)
  src/app/(dashboard)/quiz/manage/page.tsx -- 퀴즈 관리 (관리자/교사)
```

### 6.6 게임 흐름

```
1. /quiz (메인)
   └─ 카테고리 선택 (구약/신약/인물/사건/전체)
   └─ 난이도 선택 (쉬움/보통/어려움)
   └─ "게임 시작" 버튼

2. /quiz/play (플레이)
   └─ 문제 표시 (1/10)
   └─ 4지선다 보기 터치
   └─ 정답/오답 즉시 피드백 (색상 + 해설)
   └─ 다음 문제 →
   └─ 10문제 완료

3. /quiz/result (결과)
   └─ 점수 표시 (8/10)
   └─ 획득 달란트 표시
   └─ 오답 복습 리스트
   └─ "다시 하기" / "홈으로" 버튼
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
| DB 함수 | Prisma Client 싱글톤 (db.ts) |
| API 인증 | `getSession()` → null check → 401 |
| 관리자 체크 | `session.role !== 'admin'` → 403 |
| UI 스타일 | Card, Badge, Button 컴포넌트 + gradient + Framer Motion |
| 사이드바 | `navItems` 배열 필터링 + 역할별 표시 제어 |
| 달란트 지급 | Talent 레코드 생성 + Student.talentBalance 업데이트 |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`/pdca design bible-quiz-game`)
2. [ ] 구현 시작 (`/pdca do bible-quiz-game`)
3. [ ] Gap 분석 (`/pdca analyze bible-quiz-game`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial draft | Claude |
