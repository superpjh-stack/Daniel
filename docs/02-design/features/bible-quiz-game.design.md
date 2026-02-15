# bible-quiz-game Design Document

> **Summary**: 성경퀴즈게임 - 사이드바 새 메뉴로 성경 퀴즈를 풀고 달란트를 획득하는 게임
>
> **Project**: 다니엘 (동은교회 초등부 출석/달란트 관리)
> **Author**: Claude
> **Date**: 2026-02-15
> **Status**: Draft
> **Planning Doc**: [bible-quiz-game.plan.md](../../01-plan/features/bible-quiz-game.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 사이드바에 "성경퀴즈" 메뉴를 추가하여 교사가 학생을 선택 후 퀴즈를 진행
- 4지선다 객관식 퀴즈로 문항별 즉시 피드백 제공
- 퀴즈 완료 후 점수에 따라 달란트 자동 지급 (기존 Talent 시스템 연동)
- 관리자/교사가 퀴즈 문제를 관리 (CRUD)
- 하루 학생당 3회 제한으로 달란트 무한 획득 방지

### 1.2 Design Principles

- 기존 아키텍처 패턴 100% 준수 (Prisma Client 싱글톤, async 함수)
- 정답은 서버에서만 검증 (클라이언트에 정답 미전송)
- 모바일 우선 반응형 디자인 (초등부 학생용 큰 버튼, 선명한 색상)
- Framer Motion 애니메이션으로 정답/오답 피드백

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  Quiz Main (/quiz)       │────>│  /api/quiz/start          │────>│  PostgreSQL   │
│  Quiz Play (/quiz/play)  │     │  /api/quiz/submit         │     │  (Prisma)     │
│  Quiz Result (/quiz/result)│   │  /api/quiz/results        │     │              │
│  Quiz Manage (/quiz/manage)│   │  /api/quiz (CRUD)         │     │              │
└──────────────────────────┘     └──────────────────────────┘     └──────────────┘
```

### 2.2 Data Flow

```
[교사] → /quiz → 학생 선택 → 카테고리/난이도 선택 → "게임 시작"
  → /api/quiz/start (랜덤 10문제, 정답 제외하여 반환)
  → /quiz/play (문항별 풀기, 선택값 클라이언트 저장)
  → /api/quiz/submit (답안 전체 제출 → 서버 채점 → 달란트 지급)
  → /quiz/result (결과 표시)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Quiz Pages | /api/quiz/* | 퀴즈 데이터 및 게임 로직 |
| Quiz API | db.ts, auth.ts | 데이터 접근, 인증 |
| Talent Integration | createTalentRecord, updateStudentTalentBalance | 달란트 지급 |
| Sidebar | navItems 배열 | 메뉴 추가 |

---

## 3. Data Model

### 3.1 QuizQuestion Interface (db.ts)

```typescript
export interface QuizQuestion {
  id: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: number;       // 1-4
  category: string;     // old_testament, new_testament, person, event, general
  difficulty: string;   // easy, medium, hard
  reference: string | null;  // 성경 구절 참조
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizResult {
  id: string;
  studentId: string;
  score: number;        // 맞힌 개수
  totalCount: number;   // 전체 문제 수 (10)
  earnedTalent: number; // 획득 달란트
  answers: string;      // JSON string
  createdAt: string;
  studentName?: string;
}
```

### 3.2 Entity Relationships

```
[QuizQuestion] 1 ──── N [QuizResult] N ──── 1 [Student]
                                      N ──── 1 [Talent] (간접: quiz submit 시 생성)
```

### 3.3 Prisma Schema 추가

```prisma
// 퀴즈 문제
model QuizQuestion {
  id         String   @id @default(cuid())
  question   String
  option1    String
  option2    String
  option3    String
  option4    String
  answer     Int      // 정답 번호 (1-4)
  category   String   // old_testament, new_testament, person, event, general
  difficulty String   @default("easy") // easy, medium, hard
  reference  String?  // 성경 구절 참조
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// 퀴즈 결과
model QuizResult {
  id           String   @id @default(cuid())
  score        Int      // 맞힌 개수
  totalCount   Int      @default(10)
  earnedTalent Int      // 획득 달란트
  answers      String   // JSON: [{ questionId, selected, correct, isCorrect }]
  createdAt    DateTime @default(now())

  student   Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId String
}
```

Student 모델에 relation 추가:
```prisma
model Student {
  // ... 기존 필드
  quizResults QuizResult[]
}
```

---

## 4. API Specification

### 4.1 퀴즈 문제 관리 API (관리자/교사)

| Method | Path | Description | Auth | Role |
|--------|------|-------------|:----:|:----:|
| GET | /api/quiz | 문제 목록 (카테고리/난이도 필터) | Yes | admin/teacher |
| POST | /api/quiz | 문제 생성 | Yes | admin/teacher |
| GET | /api/quiz/[id] | 문제 상세 | Yes | admin/teacher |
| PUT | /api/quiz/[id] | 문제 수정 | Yes | admin/teacher |
| DELETE | /api/quiz/[id] | 문제 삭제 (비활성화) | Yes | admin/teacher |

### 4.2 퀴즈 게임 API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|:----:|:----:|
| POST | /api/quiz/start | 게임 시작 (랜덤 10문제) | Yes | admin/teacher |
| POST | /api/quiz/submit | 답안 제출 + 채점 + 달란트 | Yes | admin/teacher |
| GET | /api/quiz/results | 퀴즈 결과/랭킹 조회 | Yes | admin/teacher |

### 4.3 Detailed Specification

#### `GET /api/quiz` (문제 목록)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| category | string | all | 카테고리 필터 |
| difficulty | string | all | 난이도 필터 |
| page | number | 1 | 페이지 |
| limit | number | 20 | 항목 수 |

**Response (200 OK):**
```json
{
  "questions": [
    {
      "id": "cuid...",
      "question": "아담과 하와가 살았던 곳은?",
      "option1": "에덴동산",
      "option2": "바벨탑",
      "option3": "시내산",
      "option4": "갈릴리",
      "answer": 1,
      "category": "old_testament",
      "difficulty": "easy",
      "reference": "창세기 2:8",
      "isActive": true
    }
  ],
  "total": 50
}
```

#### `POST /api/quiz` (문제 생성)

**Request:**
```json
{
  "question": "노아의 방주에 동물은 몇 쌍씩 들어갔나요?",
  "option1": "한 쌍",
  "option2": "두 쌍",
  "option3": "세 쌍",
  "option4": "네 쌍",
  "answer": 1,
  "category": "old_testament",
  "difficulty": "easy",
  "reference": "창세기 7:2"
}
```

**Response (200 OK):**
```json
{ "id": "cuid...", "question": "..." }
```

**Error Responses:**
- `400`: 필수 필드 누락 (question, options, answer, category)
- `401`: 미인증
- `403`: 권한 없음

#### `POST /api/quiz/start` (게임 시작)

**Request:**
```json
{
  "studentId": "student-id",
  "category": "old_testament",
  "difficulty": "easy"
}
```

- category가 "all"이면 전체에서 랜덤
- difficulty가 "all"이면 전 난이도에서 랜덤

**Response (200 OK):**
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "아담과 하와가 살았던 곳은?",
      "option1": "에덴동산",
      "option2": "바벨탑",
      "option3": "시내산",
      "option4": "갈릴리",
      "category": "old_testament",
      "difficulty": "easy",
      "reference": "창세기 2:8"
    }
  ],
  "remainingAttempts": 2,
  "canEarnTalent": true
}
```

**주의:** `answer` 필드를 응답에 포함하지 않음 (보안)

**Error Responses:**
- `400`: studentId 누락
- `401`: 미인증
- `403`: 권한 없음
- `404`: 해당 조건의 문제 부족 (10개 미만)

#### `POST /api/quiz/submit` (답안 제출)

**Request:**
```json
{
  "studentId": "student-id",
  "answers": [
    { "questionId": "q1", "selected": 1 },
    { "questionId": "q2", "selected": 3 },
    { "questionId": "q3", "selected": 2 }
  ]
}
```

**Response (200 OK):**
```json
{
  "score": 8,
  "totalCount": 10,
  "earnedTalent": 7,
  "talentAwarded": true,
  "newBalance": 157,
  "details": [
    {
      "questionId": "q1",
      "question": "아담과 하와가 살았던 곳은?",
      "selected": 1,
      "correct": 1,
      "isCorrect": true,
      "reference": "창세기 2:8"
    },
    {
      "questionId": "q2",
      "question": "모세가 바다를 가른 곳은?",
      "selected": 3,
      "correct": 2,
      "isCorrect": false,
      "reference": "출애굽기 14:21",
      "correctOption": "홍해"
    }
  ]
}
```

**달란트 지급 로직:**
| Score | Talent |
|-------|--------|
| 10/10 (만점) | 10 |
| 7~9/10 | 7 |
| 4~6/10 | 4 |
| 1~3/10 | 1 |
| 0/10 | 0 |

**하루 3회 초과 시:** `talentAwarded: false`, `earnedTalent: 0`

**Error Responses:**
- `400`: studentId/answers 누락, answers 형식 오류
- `401`: 미인증

#### `GET /api/quiz/results` (결과/랭킹)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| studentId | string | - | 특정 학생 결과 |
| classId | string | all | 반별 필터 |
| type | string | recent | recent(최근) / ranking(랭킹) |
| limit | number | 10 | 항목 수 |

**Response (200 OK) - type=recent:**
```json
{
  "results": [
    {
      "id": "result-id",
      "studentName": "김철수",
      "score": 8,
      "totalCount": 10,
      "earnedTalent": 7,
      "createdAt": "2026-02-15T10:00:00Z"
    }
  ]
}
```

**Response (200 OK) - type=ranking:**
```json
{
  "ranking": [
    {
      "studentId": "student-id",
      "studentName": "김철수",
      "totalGames": 5,
      "avgScore": 8.2,
      "bestScore": 10,
      "totalTalentEarned": 35
    }
  ]
}
```

---

## 5. DB Functions (db.ts)

### 5.1 함수 목록

| Function | Parameters | Return | Description |
|----------|-----------|--------|-------------|
| `getAllQuizQuestions` | category?, difficulty?, page, limit | `{ questions, total }` | 퀴즈 목록 (관리용) |
| `getQuizQuestionById` | id | `QuizQuestion \| undefined` | 문제 상세 |
| `createQuizQuestion` | { question, options, answer, ... } | `void` | 문제 생성 |
| `updateQuizQuestion` | id, data | `void` | 문제 수정 |
| `deactivateQuizQuestion` | id | `void` | 문제 비활성화 |
| `getRandomQuizQuestions` | category?, difficulty?, count | `QuizQuestion[]` (answer 제외) | 랜덤 문제 추출 |
| `getQuizAnswers` | questionIds | `Map<string, number>` | 정답 조회 (채점용) |
| `createQuizResult` | { studentId, score, totalCount, earnedTalent, answers } | `void` | 결과 저장 |
| `getStudentTodayQuizCount` | studentId | `number` | 오늘 퀴즈 횟수 |
| `getQuizResults` | studentId?, classId?, limit | `QuizResult[]` | 결과 목록 |
| `getQuizRanking` | classId?, limit | `RankingEntry[]` | 퀴즈 랭킹 |
| `getQuizQuestionCount` | - | `number` | 전체 문제 수 |

### 5.2 주요 함수 상세

```typescript
// 랜덤 문제 추출 (정답 제외하여 반환)
export async function getRandomQuizQuestions(
  category?: string,
  difficulty?: string,
  count: number = 10
): Promise<Omit<QuizQuestion, 'answer'>[]> {
  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== 'all') where.category = category;
  if (difficulty && difficulty !== 'all') where.difficulty = difficulty;

  // PostgreSQL에서 랜덤 정렬 후 N개 추출
  const questions = await prisma.$queryRaw`
    SELECT id, question, option1, option2, option3, option4,
           category, difficulty, reference
    FROM "QuizQuestion"
    WHERE "isActive" = true
    ${category && category !== 'all' ? Prisma.sql`AND category = ${category}` : Prisma.empty}
    ${difficulty && difficulty !== 'all' ? Prisma.sql`AND difficulty = ${difficulty}` : Prisma.empty}
    ORDER BY RANDOM()
    LIMIT ${count}
  `;
  return questions;
}

// 오늘 퀴즈 횟수 조회
export async function getStudentTodayQuizCount(studentId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.quizResult.count({
    where: {
      studentId,
      createdAt: { gte: today, lt: tomorrow },
    },
  });
}

// 퀴즈 채점 + 달란트 지급 (트랜잭션)
export async function submitQuizAndAwardTalent(
  studentId: string,
  answers: { questionId: string; selected: number }[]
): Promise<{
  score: number;
  totalCount: number;
  earnedTalent: number;
  talentAwarded: boolean;
  newBalance: number;
  details: { questionId: string; question: string; selected: number; correct: number; isCorrect: boolean; reference: string | null; correctOption?: string }[];
}> {
  return prisma.$transaction(async (tx) => {
    // 1. 정답 조회
    const questionIds = answers.map(a => a.questionId);
    const questions = await tx.quizQuestion.findMany({
      where: { id: { in: questionIds } },
    });
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // 2. 채점
    let score = 0;
    const details = answers.map(a => {
      const q = questionMap.get(a.questionId)!;
      const isCorrect = a.selected === q.answer;
      if (isCorrect) score++;
      return {
        questionId: a.questionId,
        question: q.question,
        selected: a.selected,
        correct: q.answer,
        isCorrect,
        reference: q.reference,
        ...(!isCorrect && { correctOption: q[`option${q.answer}` as keyof typeof q] as string }),
      };
    });

    // 3. 달란트 계산
    const totalCount = answers.length;
    let earnedTalent = 0;
    if (score === 10) earnedTalent = 10;
    else if (score >= 7) earnedTalent = 7;
    else if (score >= 4) earnedTalent = 4;
    else if (score >= 1) earnedTalent = 1;

    // 4. 하루 횟수 체크
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayCount = await tx.quizResult.count({
      where: { studentId, createdAt: { gte: today, lt: tomorrow } },
    });
    const talentAwarded = todayCount < 3 && earnedTalent > 0;
    const actualTalent = talentAwarded ? earnedTalent : 0;

    // 5. 결과 저장
    await tx.quizResult.create({
      data: {
        studentId,
        score,
        totalCount,
        earnedTalent: actualTalent,
        answers: JSON.stringify(details),
      },
    });

    // 6. 달란트 지급
    let newBalance = 0;
    if (talentAwarded) {
      await tx.talent.create({
        data: {
          studentId,
          amount: actualTalent,
          reason: `성경퀴즈 ${score}/${totalCount} (${actualTalent}달란트)`,
          type: 'quiz',
        },
      });
      const student = await tx.student.update({
        where: { id: studentId },
        data: { talentBalance: { increment: actualTalent } },
      });
      newBalance = student.talentBalance;
    } else {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      newBalance = student?.talentBalance ?? 0;
    }

    return { score, totalCount, earnedTalent: actualTalent, talentAwarded, newBalance, details };
  });
}

// 퀴즈 랭킹 조회
export async function getQuizRanking(
  classId?: string,
  limit: number = 10
): Promise<{ studentId: string; studentName: string; totalGames: number; avgScore: number; bestScore: number; totalTalentEarned: number }[]> {
  const where: Record<string, unknown> = {};
  if (classId && classId !== 'all') {
    where.student = { classId };
  }

  const results = await prisma.quizResult.groupBy({
    by: ['studentId'],
    where,
    _count: { id: true },
    _avg: { score: true },
    _max: { score: true },
    _sum: { earnedTalent: true },
    orderBy: { _avg: { score: 'desc' } },
    take: limit,
  });

  // 학생 이름 조회
  const studentIds = results.map(r => r.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(students.map(s => [s.id, s.name]));

  return results.map(r => ({
    studentId: r.studentId,
    studentName: nameMap.get(r.studentId) || '알 수 없음',
    totalGames: r._count.id,
    avgScore: Math.round((r._avg.score || 0) * 10) / 10,
    bestScore: r._max.score || 0,
    totalTalentEarned: r._sum.earnedTalent || 0,
  }));
}
```

---

## 6. UI/UX Design

### 6.1 퀴즈 메인 페이지 (`/quiz`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "성경퀴즈"  subtitle: "성경 지식을 테스트해보세요!"  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  학생 선택                                           │
│  [김철수 (3학년, 다윗반)    ▼]                        │
│                                                     │
│  오늘 남은 횟수: 2/3회                               │
│                                                     │
├─────────────────────────────────────────────────────┤
│  카테고리 선택                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ 📖 전체  │ │ 📜 구약  │ │ ✝️ 신약  │               │
│  └─────────┘ └─────────┘ └─────────┘               │
│  ┌─────────┐ ┌─────────┐                           │
│  │ 👤 인물  │ │ 🌟 사건  │                           │
│  └─────────┘ └─────────┘                           │
├─────────────────────────────────────────────────────┤
│  난이도 선택                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ 😊 쉬움  │ │ 🤔 보통  │ │ 😤 어려움 │               │
│  └─────────┘ └─────────┘ └─────────┘               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [      🎮 게임 시작!      ]                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  최근 퀴즈 기록                                      │
│  ┌──────────────────────────────────┐               │
│  │ 김철수  8/10  +7달란트  2/15     │               │
│  │ 이영희  6/10  +4달란트  2/14     │               │
│  │ 박민수 10/10 +10달란트  2/14     │               │
│  └──────────────────────────────────┘               │
├─────────────────────────────────────────────────────┤
│  퀴즈 랭킹 TOP 5                                    │
│  ┌──────────────────────────────────┐               │
│  │ 🥇 박민수  평균 9.2  최고 10     │               │
│  │ 🥈 김철수  평균 7.8  최고 9      │               │
│  │ 🥉 이영희  평균 6.5  최고 8      │               │
│  └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

### 6.2 퀴즈 플레이 페이지 (`/quiz/play`)

```
┌─────────────────────────────────────────────────────┐
│  문제 3 / 10                    김철수               │
│  ═══════════════════░░░░░░░░░░  (30%)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  📖 구약 · 쉬움                              │    │
│  │                                              │    │
│  │  모세가 하나님께 십계명을                      │    │
│  │  받은 산의 이름은?                            │    │
│  │                                              │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  ① 감람산                                    │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │  ② 시내산                    ✅ 정답!         │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │  ③ 아라랏산                                  │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │  ④ 갈멜산                                    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  📗 출애굽기 19:20                                   │
│                                                     │
│  [          다음 문제 →          ]                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**정답 선택 시:**
- 정답 보기: 초록색 배경 + 체크 아이콘
- 오답 보기 (선택한 것): 빨간색 배경 + X 아이콘
- 정답 보기 (표시): 초록색 테두리
- 성경 구절 참조 표시
- Framer Motion으로 shake(오답) / bounce(정답) 애니메이션

### 6.3 퀴즈 결과 페이지 (`/quiz/result`)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           🎉 퀴즈 완료!                              │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │          김철수                               │    │
│  │                                              │    │
│  │        8 / 10                                │    │
│  │      ⭐⭐⭐⭐⭐⭐⭐⭐☆☆                       │    │
│  │                                              │    │
│  │      +7 달란트 획득!                          │    │
│  │      현재 잔액: 157 달란트                    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  오답 복습 (2문제)                                   │
│  ┌──────────────────────────────────┐               │
│  │ Q3. 모세가 바다를 가른 곳은?     │               │
│  │ ❌ 내 답: 지중해                 │               │
│  │ ✅ 정답: 홍해                    │               │
│  │ 📗 출애굽기 14:21               │               │
│  ├──────────────────────────────────┤               │
│  │ Q7. 다윗이 이긴 거인은?         │               │
│  │ ❌ 내 답: 삼손                   │               │
│  │ ✅ 정답: 골리앗                  │               │
│  │ 📗 사무엘상 17:50              │               │
│  └──────────────────────────────────┘               │
│                                                     │
│  [  🔄 다시 하기  ]  [  🏠 홈으로  ]                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.4 퀴즈 관리 페이지 (`/quiz/manage`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "퀴즈 관리"                    [+ 문제 추가] │
├─────────────────────────────────────────────────────┤
│  카테고리: [전체 ▼]  난이도: [전체 ▼]                  │
│  총 50개 문제                                        │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │ Q1. 아담과 하와가 살았던 곳은?               │   │
│  │ 📖 구약 · 😊 쉬움 · 📗 창세기 2:8           │   │
│  │ 정답: ① 에덴동산                   [수정][삭제]│   │
│  ├──────────────────────────────────────────────┤   │
│  │ Q2. 노아의 방주에서 먼저 보낸 새는?          │   │
│  │ 📖 구약 · 😊 쉬움 · 📗 창세기 8:8           │   │
│  │ 정답: ② 비둘기                     [수정][삭제]│   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 6.5 문제 추가/수정 모달

```
┌─────────────────────────────────────┐
│  문제 추가                     [X]   │
├─────────────────────────────────────┤
│  문제 *                             │
│  [________________________]         │
│                                     │
│  보기 1 *                           │
│  [________________________]         │
│  보기 2 *                           │
│  [________________________]         │
│  보기 3 *                           │
│  [________________________]         │
│  보기 4 *                           │
│  [________________________]         │
│                                     │
│  정답 *                             │
│  [① ▼]                             │
│                                     │
│  카테고리 *                         │
│  [구약 ▼]                           │
│                                     │
│  난이도 *                           │
│  [쉬움 ▼]                           │
│                                     │
│  성경 구절 참조                      │
│  [________________________]         │
│                                     │
│  [취소]  [저장하기]                  │
└─────────────────────────────────────┘
```

### 6.6 사이드바 메뉴 추가

```typescript
// Sidebar.tsx navItems에 추가
{ href: '/quiz', icon: <Gamepad2 size={20} />, label: '성경퀴즈', hideForParent: true },
```

위치: "공지사항" 다음, "달란트 시장" 이전

### 6.7 Category/Difficulty 표시

| Category | Label | Icon |
|----------|-------|------|
| all | 전체 | 📖 |
| old_testament | 구약 | 📜 |
| new_testament | 신약 | ✝️ |
| person | 인물 | 👤 |
| event | 사건 | 🌟 |
| general | 일반 | 💡 |

| Difficulty | Label | Color |
|------------|-------|-------|
| easy | 쉬움 | green |
| medium | 보통 | yellow |
| hard | 어려움 | red |

### 6.8 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| QuizMain | /quiz/page.tsx | 카테고리/난이도 선택, 학생 선택, 게임 시작 |
| QuizPlay | /quiz/play/page.tsx | 문항별 퀴즈 플레이 UI |
| QuizResult | /quiz/result/page.tsx | 점수/달란트/오답 복습 |
| QuizManage | /quiz/manage/page.tsx | 관리자 문제 CRUD |

---

## 7. Game Logic

### 7.1 게임 흐름 상세

```
1. /quiz (메인)
   a. 교사가 학생 드롭다운에서 학생 선택
   b. 카테고리 카드 터치 (선택 표시)
   c. 난이도 카드 터치 (선택 표시)
   d. "게임 시작" 버튼 클릭
   e. POST /api/quiz/start → 정답 없는 10문제 수신
   f. 클라이언트 state에 문제 저장
   g. /quiz/play로 이동 (query param 또는 state)

2. /quiz/play (플레이)
   a. 현재 문제 번호 표시 (1/10), 진행률 바
   b. 문제 텍스트 + 4개 보기 버튼 표시
   c. 보기 터치 → 선택한 보기 하이라이트
   d. 아직 채점하지 않음 (정답 없으므로)
   e. 선택 후 "다음 문제" 버튼 활성화
   f. 다음 문제 → currentIndex++
   g. 10문제 모두 선택 완료 → "결과 확인" 버튼
   h. POST /api/quiz/submit → 서버 채점 + 달란트 지급
   i. /quiz/result로 이동

3. /quiz/result (결과)
   a. 점수 표시 (8/10), 별 아이콘
   b. 획득 달란트, 현재 잔액 표시
   c. 오답 목록 (문제, 내 답, 정답, 성경 구절)
   d. "다시 하기" → /quiz
   e. "홈으로" → /dashboard
```

### 7.2 State Management

```typescript
// /quiz/page.tsx
const [students, setStudents] = useState<Student[]>([]);
const [selectedStudentId, setSelectedStudentId] = useState('');
const [selectedCategory, setSelectedCategory] = useState('all');
const [selectedDifficulty, setSelectedDifficulty] = useState('all');
const [remainingAttempts, setRemainingAttempts] = useState(3);
const [recentResults, setRecentResults] = useState([]);
const [ranking, setRanking] = useState([]);
const [loading, setLoading] = useState(false);

// /quiz/play/page.tsx
const [questions, setQuestions] = useState<QuizPlayQuestion[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [selectedAnswers, setSelectedAnswers] = useState<Map<string, number>>(new Map());
const [submitting, setSubmitting] = useState(false);

// /quiz/result/page.tsx (from router state or API)
const [result, setResult] = useState<QuizSubmitResult | null>(null);
```

---

## 8. Seed Data

### 8.1 시드 데이터 구조

`prisma/seed.ts`에 50문제 추가. 카테고리별 분포:

| Category | Count | Description |
|----------|-------|-------------|
| old_testament | 15 | 구약성경 관련 |
| new_testament | 15 | 신약성경 관련 |
| person | 10 | 성경 인물 |
| event | 5 | 성경 사건/기적 |
| general | 5 | 일반 성경 상식 |

난이도별 분포:

| Difficulty | Count |
|------------|-------|
| easy | 25 |
| medium | 15 |
| hard | 10 |

---

## 9. Security Considerations

- [x] 모든 퀴즈 API에서 `getSession()` → 401
- [x] 문제 관리 API에서 admin/teacher role 체크 → 403
- [x] `/api/quiz/start` 응답에 `answer` 필드 미포함
- [x] `/api/quiz/submit`에서 서버 사이드 정답 검증
- [x] 하루 3회 횟수 제한으로 달란트 무한 획득 방지
- [x] 달란트 지급은 트랜잭션 내에서 처리 (일관성 보장)

---

## 10. Error Handling

| Code | Situation | Response | UI Handling |
|------|-----------|----------|-------------|
| 400 | 필수 필드 누락 | `{ error: "..." }` | alert 표시 |
| 401 | 미인증 | `{ error: "Unauthorized" }` | 로그인 리다이렉트 |
| 403 | 권한 없음 | `{ error: "Forbidden" }` | alert / 리다이렉트 |
| 404 | 문제 부족 (<10개) | `{ error: "Not enough questions" }` | alert 표시 |
| 500 | 서버 오류 | `{ error: "Internal server error" }` | alert 표시 |

---

## 11. Implementation Order

1. [ ] **Schema**: Prisma 스키마에 QuizQuestion, QuizResult 추가 + 마이그레이션
2. [ ] **DB Functions**: db.ts에 퀴즈 관련 함수 12개 추가
3. [ ] **Seed Data**: prisma/seed.ts에 성경퀴즈 50문제 추가
4. [ ] **Quiz CRUD API**: /api/quiz, /api/quiz/[id] (문제 관리)
5. [ ] **Game API**: /api/quiz/start, /api/quiz/submit, /api/quiz/results
6. [ ] **Sidebar**: "성경퀴즈" 메뉴 항목 추가 (Gamepad2 아이콘)
7. [ ] **UI - 퀴즈 메인**: /quiz/page.tsx (카테고리/난이도 선택)
8. [ ] **UI - 퀴즈 플레이**: /quiz/play/page.tsx (게임 UI)
9. [ ] **UI - 퀴즈 결과**: /quiz/result/page.tsx (점수/오답)
10. [ ] **UI - 퀴즈 관리**: /quiz/manage/page.tsx (문제 CRUD)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial draft | Claude |
