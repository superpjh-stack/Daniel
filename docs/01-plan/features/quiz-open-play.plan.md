# quiz-open-play Plan

> **Feature**: 성경퀴즈 오픈 플레이 - 학생 선택 없이 자유롭게 퀴즈를 진행하고, 결과 후 이름을 입력하여 결과 목록에 등록하는 방식으로 리팩토링
>
> **Author**: Claude
> **Created**: 2026-02-17
> **Status**: Draft

---

## 1. 배경 및 목적

### 1.1 현재 상황 (AS-IS)

현재 성경퀴즈는 다음과 같은 흐름으로 진행됩니다:

1. 교사가 **학생을 드롭다운에서 선택** (필수)
2. 카테고리/난이도 선택
3. 게임 시작 → 10문제 풀기
4. 결과 제출 시 선택된 학생에게 달란트 자동 지급
5. 최근 기록 & 랭킹 표시

**문제점**:
- 학생 선택이 필수여서 시작까지의 허들이 높음
- 교사/관리자만 시작할 수 있어 학생이 자율적으로 참여하기 어려움
- 게임 페이지에서 학생을 선택하는 UX가 직관적이지 않음

### 1.2 목표 (TO-BE)

학생 선택 없이 누구나 바로 퀴즈를 시작할 수 있도록 변경:

1. 퀴즈 페이지 진입 → 카테고리/난이도만 선택 → **바로 게임 시작**
2. 10문제를 다 풀면 결과 화면에서 **이름을 입력**
3. 이름 입력 후 **결과 저장** (달란트 연동은 선택적)
4. **게임 결과 목록** (리더보드)에서 전체 결과를 확인

---

## 2. 요구사항 정의

### 2.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상세 |
|----|---------|---------|------|
| FR-01 | 학생 선택 없이 퀴즈 시작 | 필수 | 카테고리/난이도만 선택하면 바로 시작 |
| FR-02 | 결과 화면에서 이름 입력 | 필수 | 퀴즈 완료 후 결과 화면에 이름 입력 필드 추가 |
| FR-03 | 이름 입력 후 결과 저장 | 필수 | 입력한 이름으로 QuizResult에 저장 |
| FR-04 | 게임 결과 목록 (리더보드) | 필수 | 전체 결과를 점수순/최신순으로 볼 수 있는 목록 |
| FR-05 | 달란트 연동 (이름→학생 매칭) | 선택 | 입력 이름이 등록 학생과 일치하면 달란트 지급 |
| FR-06 | 일일 제한 유지 | 선택 | 이름 기준으로 하루 3회 달란트 지급 제한 |

### 2.2 비기능 요구사항

| ID | 요구사항 | 상세 |
|----|---------|------|
| NFR-01 | 인증 불필요 | 퀴즈 시작/플레이에 로그인 불필요 (결과 조회도 공개) |
| NFR-02 | 기존 데이터 호환 | 기존 QuizResult 데이터 유지 |
| NFR-03 | 모바일 우선 | 현재 UI 패턴 유지 |

---

## 3. 변경 범위

### 3.1 데이터베이스 스키마 변경

**QuizResult 모델 수정**:
- `studentId`: 필수 → **선택(optional)** 변경
- `playerName`: 새 필드 추가 (String, 필수)

```prisma
model QuizResult {
  id           String   @id @default(cuid())
  score        Int
  totalCount   Int      @default(10)
  earnedTalent Int
  answers      String   // JSON
  playerName   String   // 새 필드: 플레이어 이름
  createdAt    DateTime @default(now())

  student   Student? @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId String?  // 필수 → 선택으로 변경
}
```

### 3.2 API 변경

| API | 현재 | 변경 후 |
|-----|------|--------|
| `POST /api/quiz/start` | studentId 필수, 인증 필수 | studentId 제거, 인증 불필요 |
| `POST /api/quiz/submit` | studentId 필수, 인증 필수 | playerName 필수, studentId 선택, 인증 불필요 |
| `GET /api/quiz/results` | 인증 필수, studentId 기반 | 인증 불필요, playerName 표시 |

### 3.3 UI 변경

| 페이지 | 현재 | 변경 후 |
|--------|------|--------|
| `/quiz` (메인) | 학생 선택 드롭다운 + 시작 | 카테고리/난이도만 선택 + 바로 시작 + 결과 목록 |
| `/quiz/play` | sessionStorage에 studentId 필수 | studentId 불필요, 문제 데이터만 필요 |
| `/quiz/result` | studentName 표시, 달란트 결과 | 이름 입력 필드 추가, 저장 버튼, 달란트 연동 (선택적) |

### 3.4 DB 함수 변경 (src/lib/db.ts)

| 함수 | 변경 내용 |
|------|----------|
| `submitQuizAndAwardTalent` | playerName 파라미터 추가, studentId 선택적, 이름으로 학생 매칭 시도 |
| `getStudentTodayQuizCount` | playerName 기반 카운트 추가 또는 studentId 기반 유지 |
| `getQuizResults` | playerName 반환, student 조인 optional |
| `getQuizRanking` | playerName 기반 랭킹으로 변경 |

---

## 4. 사용자 흐름 (User Flow)

### 4.1 퀴즈 플레이 흐름

```
[퀴즈 메인] → 카테고리/난이도 선택
    ↓
[게임 시작] 버튼 클릭 (학생 선택 불필요)
    ↓
[퀴즈 플레이] 10문제 풀기
    ↓
[결과 확인] 점수/오답 표시
    ↓
[이름 입력] 텍스트 필드에 이름 입력
    ↓
[결과 저장] 버튼 → API 호출 → 결과 목록에 추가
    ↓
(이름이 등록 학생과 일치 → 달란트 자동 지급)
    ↓
[결과 목록] 전체 리더보드 확인
```

### 4.2 결과 저장 시 달란트 처리

```
이름 입력 → 학생 DB에서 이름으로 검색
  ├─ 일치하는 학생 있음 → studentId 연결 + 달란트 지급 (일일 3회 제한)
  └─ 일치하는 학생 없음 → studentId 없이 결과만 저장 (달란트 없음)
```

---

## 5. 구현 체크리스트

| # | 작업 | 파일 |
|---|------|------|
| 1 | Prisma 스키마 수정 (QuizResult) | `prisma/schema.prisma` |
| 2 | DB 마이그레이션 생성 | `prisma/migrations/` |
| 3 | `submitQuizAndAwardTalent` 함수 수정 | `src/lib/db.ts` |
| 4 | `getQuizResults` 함수 수정 | `src/lib/db.ts` |
| 5 | `getQuizRanking` 함수 수정 | `src/lib/db.ts` |
| 6 | `POST /api/quiz/start` 수정 (인증/studentId 제거) | `src/app/api/quiz/start/route.ts` |
| 7 | `POST /api/quiz/submit` 수정 (playerName 추가) | `src/app/api/quiz/submit/route.ts` |
| 8 | `GET /api/quiz/results` 수정 (인증 제거, playerName) | `src/app/api/quiz/results/route.ts` |
| 9 | 퀴즈 메인 페이지 수정 (학생 선택 제거, 결과 목록 강화) | `src/app/(dashboard)/quiz/page.tsx` |
| 10 | 퀴즈 플레이 페이지 수정 (studentId 제거) | `src/app/(dashboard)/quiz/play/page.tsx` |
| 11 | 퀴즈 결과 페이지 수정 (이름 입력 + 저장) | `src/app/(dashboard)/quiz/result/page.tsx` |
| 12 | 빌드 확인 | - |

---

## 6. 기술 고려사항

### 6.1 스키마 마이그레이션 전략

기존 QuizResult 데이터에 `studentId`가 모두 있으므로:
1. `playerName` 필드 추가 시 기존 데이터는 연결된 Student의 이름으로 채움
2. `studentId`를 optional로 변경
3. 마이그레이션 SQL에서 기존 레코드의 playerName을 Student.name으로 업데이트

### 6.2 보안

- 퀴즈 시작/플레이/결과 저장에는 인증 불필요 (공개 기능)
- 퀴즈 관리(/quiz/manage)는 기존대로 admin/teacher만 접근 가능
- 이름 입력 시 XSS 방지를 위한 sanitization

### 6.3 달란트 연동 규칙

- 이름으로 Student 테이블 검색 (정확 일치)
- 동명이인이 있는 경우: 달란트 지급하지 않음 (또는 목록에서 선택)
- 학생 매칭 실패 시: 결과만 저장, 달란트 미지급

---

## 7. 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| 동명이인 처리 | 잘못된 학생에게 달란트 지급 가능 | 이름+학년으로 매칭하거나, 동명이인 시 달란트 미지급 |
| 스팸 결과 입력 | 가짜 이름으로 결과 등록 | 일일 IP 제한 또는 최소 점수 제한 고려 |
| 기존 데이터 호환 | 마이그레이션 실패 | 단계적 마이그레이션 (playerName 추가 → 데이터 채움 → studentId optional) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-17 | Initial plan | Claude |
