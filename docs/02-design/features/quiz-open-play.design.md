# quiz-open-play Design Document

> **Feature**: 성경퀴즈 오픈 플레이 - 학생 선택 없이 자유 플레이, 결과 후 이름 입력, 리더보드
>
> **Plan Reference**: [quiz-open-play.plan.md](../../01-plan/features/quiz-open-play.plan.md)
> **Author**: Claude
> **Created**: 2026-02-17
> **Status**: Draft

---

## 1. Overview

### 1.1 Summary

기존 성경퀴즈 시스템을 리팩토링하여:
- **학생 선택 없이** 카테고리/난이도만 고르면 바로 퀴즈 시작
- 결과 화면에서 **점수를 먼저 확인한 후** 이름을 입력하여 기록 등록
- 이름이 등록 학생과 일치하면 **달란트 자동 지급**
- **게임 결과 목록**(리더보드)으로 전체 기록 확인

### 1.2 User Flow

```
[/quiz 메인]
  ├─ 카테고리 선택 (구약/신약/인물/사건/일반/전체)
  ├─ 난이도 선택 (쉬움/보통/어려움/전체)
  └─ [게임 시작] 버튼 클릭
      ↓
[/quiz/play 플레이]
  ├─ 10문제 풀기 (현재 UI 유지)
  └─ [결과 확인] 버튼 클릭
      ↓
[/quiz/result 결과]
  ├─ 점수 표시 (emoji, 별, 메시지)
  ├─ 오답 복습
  ├─ 이름 입력 필드
  └─ [기록 등록] 버튼 → API 저장
      ↓ (저장 후)
  ├─ 달란트 결과 표시 (매칭 시)
  └─ [다시 하기] / [결과 목록] 버튼
```

---

## 2. Database Schema Changes

### 2.1 QuizResult Model (Modified)

```prisma
model QuizResult {
  id           String   @id @default(cuid())
  score        Int
  totalCount   Int      @default(10)
  earnedTalent Int
  answers      String   // JSON: [{ questionId, selected, correct, isCorrect }]
  playerName   String   // NEW: 플레이어 이름 (필수)
  createdAt    DateTime @default(now())

  student   Student? @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId String?  // CHANGED: 필수 → 선택
}
```

**Changes**:
- `playerName` String (NOT NULL) 추가
- `studentId` String (NOT NULL) → String? (NULLABLE) 변경

### 2.2 Migration Strategy

마이그레이션 SQL (2단계):

```sql
-- Step 1: Add playerName with default, then populate from Student
ALTER TABLE "QuizResult" ADD COLUMN "playerName" TEXT NOT NULL DEFAULT '';
UPDATE "QuizResult" SET "playerName" = s."name"
  FROM "Student" s WHERE "QuizResult"."studentId" = s."id";

-- Step 2: Make studentId optional
ALTER TABLE "QuizResult" ALTER COLUMN "studentId" DROP NOT NULL;
```

---

## 3. API Design

### 3.1 `POST /api/quiz/start` (Modified)

**Changes**: 인증 제거, studentId 제거

**Request**:
```json
{
  "category": "all",       // optional, default: "all"
  "difficulty": "all"      // optional, default: "all"
}
```

**Response 200**:
```json
{
  "questions": [
    {
      "id": "cuid...",
      "question": "다윗이 골리앗을 이긴 무기는?",
      "option1": "칼",
      "option2": "물맷돌",
      "option3": "창",
      "option4": "활",
      "category": "old_testament",
      "difficulty": "easy",
      "reference": "사무엘상 17:49"
    }
  ]
}
```

**Response 404**: `{ "error": "해당 조건의 문제가 부족합니다. (최소 10개 필요)" }`

**Implementation**:
```typescript
export async function POST(request: NextRequest) {
  // No auth check needed
  const body = await request.json();
  const { category, difficulty } = body;

  const questions = await getRandomQuizQuestions(category, difficulty, 10);
  if (questions.length < 10) {
    return NextResponse.json({ error: '해당 조건의 문제가 부족합니다. (최소 10개 필요)' }, { status: 404 });
  }

  return NextResponse.json({ questions });
}
```

### 3.2 `POST /api/quiz/submit` (Modified)

**Changes**: studentId 제거, 채점만 수행 (DB 저장하지 않음)

**Request**:
```json
{
  "answers": [
    { "questionId": "cuid...", "selected": 2 }
  ]
}
```

**Response 200**:
```json
{
  "score": 7,
  "totalCount": 10,
  "details": [
    {
      "questionId": "cuid...",
      "question": "다윗이 골리앗을 이긴 무기는?",
      "selected": 2,
      "correct": 2,
      "isCorrect": true,
      "reference": "사무엘상 17:49"
    }
  ]
}
```

**Implementation**:
```typescript
export async function POST(request: NextRequest) {
  // No auth check needed
  const body = await request.json();
  const { answers } = body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: '답안을 입력해주세요.' }, { status: 400 });
  }

  const result = await scoreQuizAnswers(answers);
  return NextResponse.json(result);
}
```

### 3.3 `POST /api/quiz/save` (NEW)

**Purpose**: 이름과 함께 결과를 DB에 저장, 학생 매칭 시 달란트 지급

**Request**:
```json
{
  "playerName": "김다윗",
  "answers": [
    { "questionId": "cuid...", "selected": 2 }
  ]
}
```

**Response 200**:
```json
{
  "success": true,
  "score": 7,
  "totalCount": 10,
  "earnedTalent": 7,
  "talentAwarded": true,
  "studentMatched": true,
  "newBalance": 52,
  "playerName": "김다윗"
}
```

**Response 200 (학생 미매칭)**:
```json
{
  "success": true,
  "score": 7,
  "totalCount": 10,
  "earnedTalent": 0,
  "talentAwarded": false,
  "studentMatched": false,
  "newBalance": 0,
  "playerName": "방문자"
}
```

**Response 400**: `{ "error": "이름을 입력해주세요." }`

**Implementation**:
```typescript
export async function POST(request: NextRequest) {
  // No auth check needed
  const body = await request.json();
  const { playerName, answers } = body;

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  }
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: '답안 데이터가 없습니다.' }, { status: 400 });
  }

  const trimmedName = playerName.trim().slice(0, 20); // max 20 chars
  const result = await saveQuizResult(trimmedName, answers);
  return NextResponse.json(result);
}
```

### 3.4 `GET /api/quiz/results` (Modified)

**Changes**: 인증 제거, playerName 기반 반환

**Query Parameters**:
- `type`: `recent` (default) | `ranking`
- `limit`: number (default: 10)

**Response (type=recent)**:
```json
{
  "results": [
    {
      "id": "cuid...",
      "playerName": "김다윗",
      "score": 8,
      "totalCount": 10,
      "earnedTalent": 7,
      "createdAt": "2026-02-17T10:00:00Z"
    }
  ]
}
```

**Response (type=ranking)**:
```json
{
  "ranking": [
    {
      "playerName": "김다윗",
      "totalGames": 5,
      "avgScore": 8.2,
      "bestScore": 10,
      "totalTalentEarned": 28
    }
  ]
}
```

---

## 4. DB Functions (src/lib/db.ts)

### 4.1 `scoreQuizAnswers` (NEW - replaces scoring logic from submitQuizAndAwardTalent)

```typescript
export async function scoreQuizAnswers(
  answers: { questionId: string; selected: number }[]
): Promise<{
  score: number;
  totalCount: number;
  details: { questionId: string; question: string; selected: number; correct: number; isCorrect: boolean; reference: string | null; correctOption?: string }[];
}> {
  const questionIds = answers.map(a => a.questionId);
  const questions = await prisma.quizQuestion.findMany({
    where: { id: { in: questionIds } },
  });
  const questionMap = new Map(questions.map(q => [q.id, q]));

  let score = 0;
  const details = answers.map(a => {
    const q = questionMap.get(a.questionId);
    if (!q) return { questionId: a.questionId, question: '?', selected: a.selected, correct: 0, isCorrect: false, reference: null };
    const isCorrect = a.selected === q.answer;
    if (isCorrect) score++;
    const optionKey = `option${q.answer}` as 'option1' | 'option2' | 'option3' | 'option4';
    return {
      questionId: a.questionId,
      question: q.question,
      selected: a.selected,
      correct: q.answer,
      isCorrect,
      reference: q.reference,
      ...(!isCorrect && { correctOption: q[optionKey] }),
    };
  });

  return { score, totalCount: answers.length, details };
}
```

### 4.2 `saveQuizResult` (NEW - save with playerName + optional talent)

```typescript
export async function saveQuizResult(
  playerName: string,
  answers: { questionId: string; selected: number }[]
): Promise<{
  success: boolean;
  score: number;
  totalCount: number;
  earnedTalent: number;
  talentAwarded: boolean;
  studentMatched: boolean;
  newBalance: number;
  playerName: string;
}> {
  return prisma.$transaction(async (tx) => {
    // 1. Score the answers
    const questionIds = answers.map(a => a.questionId);
    const questions = await tx.quizQuestion.findMany({
      where: { id: { in: questionIds } },
    });
    const questionMap = new Map(questions.map(q => [q.id, q]));

    let score = 0;
    const details = answers.map(a => {
      const q = questionMap.get(a.questionId);
      if (!q) return { questionId: a.questionId, selected: a.selected, correct: 0, isCorrect: false };
      const isCorrect = a.selected === q.answer;
      if (isCorrect) score++;
      return { questionId: a.questionId, selected: a.selected, correct: q.answer, isCorrect };
    });

    const totalCount = answers.length;

    // 2. Calculate talent
    let earnedTalent = 0;
    if (score === 10) earnedTalent = 10;
    else if (score >= 7) earnedTalent = 7;
    else if (score >= 4) earnedTalent = 4;
    else if (score >= 1) earnedTalent = 1;

    // 3. Try to match student by exact name (unique match only)
    let studentId: string | null = null;
    let studentMatched = false;
    let talentAwarded = false;
    let newBalance = 0;

    if (earnedTalent > 0) {
      const matchingStudents = await tx.student.findMany({
        where: { name: playerName },
        select: { id: true, talentBalance: true },
      });

      if (matchingStudents.length === 1) {
        // Exact unique match found
        const student = matchingStudents[0];
        studentId = student.id;
        studentMatched = true;

        // Check daily limit (3 per day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayCount = await tx.quizResult.count({
          where: { studentId: student.id, createdAt: { gte: today, lt: tomorrow } },
        });

        if (todayCount < 3) {
          talentAwarded = true;
        }
      }
    }

    const actualTalent = talentAwarded ? earnedTalent : 0;

    // 4. Create QuizResult
    await tx.quizResult.create({
      data: {
        playerName,
        studentId,
        score,
        totalCount,
        earnedTalent: actualTalent,
        answers: JSON.stringify(details),
      },
    });

    // 5. Award talent if matched
    if (talentAwarded && studentId) {
      await tx.talent.create({
        data: {
          studentId,
          amount: actualTalent,
          reason: `성경퀴즈 ${score}/${totalCount} (${actualTalent}달란트)`,
          type: 'quiz',
        },
      });
      const updated = await tx.student.update({
        where: { id: studentId },
        data: { talentBalance: { increment: actualTalent } },
      });
      newBalance = updated.talentBalance;
    }

    return {
      success: true,
      score,
      totalCount,
      earnedTalent: actualTalent,
      talentAwarded,
      studentMatched,
      newBalance,
      playerName,
    };
  });
}
```

### 4.3 `getQuizResults` (Modified)

```typescript
export async function getQuizResults(
  limit: number = 10
): Promise<{
  id: string;
  playerName: string;
  score: number;
  totalCount: number;
  earnedTalent: number;
  createdAt: string;
}[]> {
  const results = await prisma.quizResult.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      playerName: true,
      score: true,
      totalCount: true,
      earnedTalent: true,
      createdAt: true,
    },
  });

  return results.map(r => ({
    id: r.id,
    playerName: r.playerName,
    score: r.score,
    totalCount: r.totalCount,
    earnedTalent: r.earnedTalent,
    createdAt: r.createdAt.toISOString(),
  }));
}
```

### 4.4 `getQuizRanking` (Modified)

```typescript
export async function getQuizRanking(
  limit: number = 10
): Promise<{
  playerName: string;
  totalGames: number;
  avgScore: number;
  bestScore: number;
  totalTalentEarned: number;
}[]> {
  // Raw query for playerName grouping (Prisma groupBy supports scalar fields)
  const results = await prisma.quizResult.groupBy({
    by: ['playerName'],
    _count: { id: true },
    _avg: { score: true },
    _max: { score: true },
    _sum: { earnedTalent: true },
  });

  return results
    .map(r => ({
      playerName: r.playerName,
      totalGames: r._count.id,
      avgScore: Math.round((r._avg.score || 0) * 10) / 10,
      bestScore: r._max.score || 0,
      totalTalentEarned: r._sum.earnedTalent || 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.bestScore - a.bestScore)
    .slice(0, limit);
}
```

### 4.5 Legacy Function Cleanup

**Remove or deprecate**:
- `getStudentTodayQuizCount(studentId)` - daily limit logic moved into `saveQuizResult`
- `submitQuizAndAwardTalent(studentId, answers)` - replaced by `scoreQuizAnswers` + `saveQuizResult`

---

## 5. UI Component Design

### 5.1 `/quiz` Main Page (Modified)

**Remove**:
- `Student` interface, `students` state, `fetchStudents()`, `selectedStudentId`
- `remainingAttempts` state
- Student selection Card (학생 선택 드롭다운)
- `disabled={!selectedStudentId}` from start button

**Modify**:
- `handleStart()`: no studentId, sessionStorage stores only `{ questions }`
- `RecentResult` interface: `studentName` → `playerName`
- `RankingEntry` interface: `studentId`/`studentName` → `playerName`
- Start button always enabled (no studentId check)
- Recent results: `r.studentName` → `r.playerName`
- Ranking: `r.studentName` → `r.playerName`, key: `r.studentId` → `r.playerName`

**Keep unchanged**:
- Header (title, Settings link)
- Category selection grid
- Difficulty selection grid
- Recent results Card layout
- Ranking Card layout

**New `handleStart()`**:
```typescript
async function handleStart() {
  setLoading(true);
  try {
    const res = await fetch('/api/quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: selectedCategory,
        difficulty: selectedDifficulty,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || '퀴즈를 시작할 수 없습니다.');
      return;
    }
    const data = await res.json();
    sessionStorage.setItem('quizData', JSON.stringify({
      questions: data.questions,
    }));
    router.push('/quiz/play');
  } finally {
    setLoading(false);
  }
}
```

**New interfaces**:
```typescript
interface RecentResult {
  id: string;
  playerName: string;     // changed from studentName
  score: number;
  totalCount: number;
  earnedTalent: number;
  createdAt: string;
}

interface RankingEntry {
  playerName: string;      // changed from studentId + studentName
  totalGames: number;
  avgScore: number;
  bestScore: number;
  totalTalentEarned: number;
}
```

### 5.2 `/quiz/play` Play Page (Modified)

**Remove from `QuizData` interface**:
- `studentId: string`
- `studentName: string`
- `canEarnTalent: boolean`

**New `QuizData` interface**:
```typescript
interface QuizData {
  questions: QuizPlayQuestion[];
}
```

**Remove from UI**:
- `studentName` display in header (line 152)

**Modify `handleSubmit()`**:
```typescript
async function handleSubmit() {
  if (!allAnswered) {
    alert('모든 문제에 답해주세요.');
    return;
  }
  setSubmitting(true);
  try {
    const answers = questions.map(q => ({
      questionId: q.id,
      selected: selectedAnswers.get(q.id)!,
    }));

    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || '채점에 실패했습니다.');
      return;
    }

    const result = await res.json();
    // Store score result + raw answers for later save
    sessionStorage.setItem('quizResult', JSON.stringify({
      ...result,
      answers,  // keep raw answers for save API
    }));
    sessionStorage.removeItem('quizData');
    router.push('/quiz/result');
  } finally {
    setSubmitting(false);
  }
}
```

### 5.3 `/quiz/result` Result Page (Modified)

**Major changes**: 이름 입력 + 저장 기능 추가

**New `QuizResultData` interface**:
```typescript
interface QuizResultData {
  score: number;
  totalCount: number;
  details: QuizDetail[];
  // Raw answers for save API
  answers: { questionId: string; selected: number }[];
}

interface SavedResult {
  earnedTalent: number;
  talentAwarded: boolean;
  studentMatched: boolean;
  newBalance: number;
  playerName: string;
}
```

**New state**:
```typescript
const [playerName, setPlayerName] = useState('');
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);
const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
```

**New `handleSave()` function**:
```typescript
async function handleSave() {
  if (!playerName.trim()) {
    alert('이름을 입력해주세요.');
    return;
  }
  setSaving(true);
  try {
    const res = await fetch('/api/quiz/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: playerName.trim(),
        answers: result.answers,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || '저장에 실패했습니다.');
      return;
    }
    const data = await res.json();
    setSavedResult(data);
    setSaved(true);
  } finally {
    setSaving(false);
  }
}
```

**UI layout (top to bottom)**:

1. **Score Card** (keep existing): emoji, score, stars, message
2. **Wrong Answers Review** (keep existing)
3. **Name Input + Save** (NEW):

```tsx
{/* 기록 등록 */}
{!saved ? (
  <Card className="p-4">
    <h2 className="text-sm font-semibold text-slate-700 mb-3">기록 등록</h2>
    <input
      type="text"
      value={playerName}
      onChange={(e) => setPlayerName(e.target.value)}
      placeholder="이름을 입력하세요"
      maxLength={20}
      className="w-full p-3 border border-slate-200 rounded-lg text-sm
        focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-3"
    />
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleSave}
      disabled={saving || !playerName.trim()}
      className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500
        text-white rounded-xl font-bold disabled:opacity-50"
    >
      {saving ? '저장 중...' : '기록 등록'}
    </motion.button>
  </Card>
) : (
  <Card className="p-4 text-center">
    <p className="text-green-600 font-bold mb-1">기록이 등록되었습니다!</p>
    {savedResult?.talentAwarded && savedResult.earnedTalent > 0 ? (
      <div>
        <p className="text-amber-600 font-bold text-lg">
          +{savedResult.earnedTalent} 달란트 획득!
        </p>
        <p className="text-sm text-slate-500">
          현재 잔액: <b>{savedResult.newBalance}</b> 달란트
        </p>
      </div>
    ) : savedResult?.studentMatched ? (
      <p className="text-sm text-slate-500">
        오늘 달란트 획득 횟수를 초과했어요.
      </p>
    ) : (
      <p className="text-sm text-slate-500">
        등록된 학생이 아니어서 달란트는 지급되지 않았어요.
      </p>
    )}
  </Card>
)}
```

4. **Action buttons** (modified):

```tsx
<div className="flex gap-3">
  <motion.button onClick={() => { sessionStorage.removeItem('quizResult'); router.push('/quiz'); }}
    className="flex-1 py-3 rounded-xl border-2 border-indigo-200 text-indigo-600 font-bold ...">
    <RotateCcw size={18} /> 다시 하기
  </motion.button>
  <motion.button onClick={() => { sessionStorage.removeItem('quizResult'); router.push('/quiz'); }}
    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold ...">
    <Trophy size={18} /> 결과 목록
  </motion.button>
</div>
```

---

## 6. File Change Summary

### 6.1 Modified Files

| # | File | Changes |
|---|------|---------|
| 1 | `prisma/schema.prisma` | QuizResult: add `playerName`, make `studentId` optional |
| 2 | `src/lib/db.ts` | Add `scoreQuizAnswers`, `saveQuizResult`. Modify `getQuizResults`, `getQuizRanking`. Remove `submitQuizAndAwardTalent`, `getStudentTodayQuizCount` |
| 3 | `src/app/api/quiz/start/route.ts` | Remove auth check, remove studentId requirement |
| 4 | `src/app/api/quiz/submit/route.ts` | Remove auth check, remove studentId, return score only (no DB save) |
| 5 | `src/app/api/quiz/results/route.ts` | Remove auth check, return playerName, simplify params |
| 6 | `src/app/(dashboard)/quiz/page.tsx` | Remove student dropdown, update interfaces, always-enabled start |
| 7 | `src/app/(dashboard)/quiz/play/page.tsx` | Remove studentId/studentName from QuizData, simplify submit |
| 8 | `src/app/(dashboard)/quiz/result/page.tsx` | Add name input, save button, talent result display |

### 6.2 New Files

| # | File | Purpose |
|---|------|---------|
| 9 | `src/app/api/quiz/save/route.ts` | New save endpoint with name + student matching |

### 6.3 Migration

| # | File | Purpose |
|---|------|---------|
| 10 | `prisma/migrations/XXXX_quiz_open_play/migration.sql` | Schema migration |

---

## 7. Implementation Checklist

| # | Task | File(s) | Priority |
|---|------|---------|----------|
| 1 | Prisma 스키마 수정 | `prisma/schema.prisma` | 필수 |
| 2 | DB 마이그레이션 실행 | `prisma/migrations/` | 필수 |
| 3 | `scoreQuizAnswers` 함수 추가 | `src/lib/db.ts` | 필수 |
| 4 | `saveQuizResult` 함수 추가 | `src/lib/db.ts` | 필수 |
| 5 | `getQuizResults` 함수 수정 | `src/lib/db.ts` | 필수 |
| 6 | `getQuizRanking` 함수 수정 | `src/lib/db.ts` | 필수 |
| 7 | `submitQuizAndAwardTalent` 제거 | `src/lib/db.ts` | 필수 |
| 8 | `POST /api/quiz/start` 수정 | `src/app/api/quiz/start/route.ts` | 필수 |
| 9 | `POST /api/quiz/submit` 수정 | `src/app/api/quiz/submit/route.ts` | 필수 |
| 10 | `POST /api/quiz/save` 신규 | `src/app/api/quiz/save/route.ts` | 필수 |
| 11 | `GET /api/quiz/results` 수정 | `src/app/api/quiz/results/route.ts` | 필수 |
| 12 | 퀴즈 메인 페이지 수정 | `src/app/(dashboard)/quiz/page.tsx` | 필수 |
| 13 | 퀴즈 플레이 페이지 수정 | `src/app/(dashboard)/quiz/play/page.tsx` | 필수 |
| 14 | 퀴즈 결과 페이지 수정 | `src/app/(dashboard)/quiz/result/page.tsx` | 필수 |
| 15 | 빌드 확인 | - | 필수 |

---

## 8. Security Considerations

| Area | Design | Notes |
|------|--------|-------|
| Quiz start/play/save | No auth required | Public game |
| Quiz manage | Auth required (admin/teacher) | Unchanged |
| Name input | Max 20 chars, trim whitespace | XSS safe (React auto-escapes) |
| Student matching | Exact name, unique only | No match if 0 or 2+ students |
| Daily limit | 3 talent awards per studentId per day | Same as current |
| Answer integrity | Server-side scoring in save endpoint | Cannot fake score |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-17 | Initial design | Claude |
