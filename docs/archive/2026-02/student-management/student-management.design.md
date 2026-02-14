# Student Management Improvement Design Document

> **Summary**: 학생 관리 개선 - 반별 필터, 삭제 확인 다이얼로그, 학생 상세, 프로필 이미지, 관리자 권한 체크 기술 설계
>
> **Project**: daniel (동은교회 초등부 출석/달란트 관리)
> **Version**: 1.0.0
> **Author**: Claude Code
> **Date**: 2026-02-13
> **Status**: Draft
> **Planning Doc**: [student-management.plan.md](../../01-plan/features/student-management.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 기존 학생 관리 코드 구조(db.ts → API Route → page.tsx)를 유지하면서 확장
- 학생 목록 API에서 최근 출석 데이터를 JOIN하여 한번에 조회 (N+1 쿼리 방지)
- 관리자 역할 기반 삭제 권한 제어를 API 레벨에서 적용
- 학생 상세 모달에서 출석 이력, 달란트 내역, 기본 정보를 탭으로 분리
- 모바일 우선 UX: 반별 필터, 정렬 옵션, 커스텀 삭제 다이얼로그

### 1.2 Design Principles

- **기존 패턴 유지**: 새 DB 연결 → 쿼리 → 연결 닫기 패턴
- **최소 변경**: 기존 파일에 기능 추가, 구조적 리팩토링 없음
- **하위 호환성**: 기존 API 응답 형식 유지, 새 필드는 선택적 추가
- **스키마 변경 없음**: 기존 Student 모델의 `profileImage` 필드 활용 (마이그레이션 불필요)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  students/page.tsx (Client Component)                             │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Stats Cards  │ │ Class    │ │ Sort     │ │ Search        │  │
│  │ (신규)       │ │ Filter   │ │ Select   │ │ (기존)        │  │
│  │              │ │ (신규)   │ │ (신규)   │ │               │  │
│  └──────────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Student Card (기존 + 확장)                                │   │
│  │  + 출석 미니 인디케이터 (4주)                             │   │
│  │  + 프로필 이미지 (Avatar image prop 활용)                  │   │
│  │  + 클릭 시 상세 모달 열기                                 │   │
│  │  + admin만 삭제 버튼 표시                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────┐ ┌──────────────────────────────────────┐  │
│  │ Delete Confirm   │ │ Student Detail Modal (신규)           │  │
│  │ Dialog (신규)    │ │  [기본정보] [출석이력] [달란트내역]    │  │
│  └──────────────────┘ └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Student Form Modal (기존 + profileImage 필드 추가)         │   │
│  │  + 중복 감지 경고 UI                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────┬───────────────────────────────────────────────┘
                   │ fetch()
┌──────────────────▼───────────────────────────────────────────────┐
│  API Routes                                                       │
│  ┌──────────────────────────┐ ┌────────────────────────────────┐ │
│  │ /api/students             │ │ /api/students/[id]             │ │
│  │  GET: + recentAttendance  │ │  GET: + 출석통계, 달란트내역   │ │
│  │  POST: + profileImage     │ │  PUT: + profileImage           │ │
│  │   + 중복 체크 경고 반환   │ │  DELETE: + admin 체크          │ │
│  └──────────────────────────┘ └────────────────────────────────┘ │
│  ┌──────────────────────────┐                                    │
│  │ /api/auth/me (기존)      │                                    │
│  │  GET: admin 역할 확인용   │                                    │
│  └──────────────────────────┘                                    │
└──────────────────┬───────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│  src/lib/db.ts (Data Access Layer)                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 기존 함수:                                                   │ │
│  │  getAllStudents, getStudentById, createStudent,               │ │
│  │  updateStudent, deleteStudent, updateStudentTalentBalance,    │ │
│  │  getStudentAttendanceHistory, getStudentAttendanceStats,      │ │
│  │  getStudentAttendanceStreak, getTalentHistory,                │ │
│  │  getStudentCount                                              │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 신규 함수:                                                   │ │
│  │  getAllStudentsWithAttendance()   → 학생+최근4주출석 통합조회  │ │
│  │  getStudentDetail(id)            → 상세정보+통계 통합조회     │ │
│  │  checkDuplicateStudent(name,grade)→ 중복 학생 체크            │ │
│  │  getStudentStats()               → 전체/학년별/반별 통계      │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 수정 함수:                                                   │ │
│  │  createStudent() + profileImage 파라미터 추가                 │ │
│  │  updateStudent() + profileImage 파라미터 추가                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
[학생 목록 로딩]
User → page load → GET /api/students (with attendance) → getAllStudentsWithAttendance() → Response with 4-week data

[학생 상세 보기]
User click → GET /api/students/[id] → getStudentDetail(id) → 기본정보 + 출석통계 + 달란트내역

[학생 삭제]
User click delete → Show confirm dialog → (admin check) → DELETE /api/students/[id] → deleteStudent(id)

[학생 등록 (중복 체크)]
User submit form → POST /api/students (includes duplicate check) → checkDuplicateStudent() → 중복 시 경고 응답 포함
```

---

## 3. Data Model

### 3.1 기존 Student 모델 (변경 없음)

```prisma
model Student {
  id           String       @id @default(cuid())
  name         String
  grade        Int
  birthday     DateTime?
  parentPhone  String?
  parentName   String?
  note         String?
  profileImage String?      // ← 기존 필드, 현재 미사용 → 활성화
  talentBalance Int         @default(0)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  class        Class?       @relation(fields: [classId], references: [id])
  classId      String?
  attendances  Attendance[]
  talents      Talent[]
}
```

**스키마 변경 없음** - `profileImage` 필드가 이미 존재하므로 마이그레이션 불필요.

### 3.2 신규 TypeScript 인터페이스

```typescript
// 학생 목록용 (출석 미니 인디케이터 포함)
interface StudentWithAttendance extends Student {
  recentAttendance: { date: string; status: string }[];  // 최근 4주 (최대 4건)
}

// 학생 상세용
interface StudentDetail extends Student {
  attendanceStats: { totalPresent: number; totalLate: number; totalAbsent: number };
  attendanceStreak: number;
  recentAttendance: { date: string; status: string; memo: string | null }[];  // 최근 10건
  recentTalents: { amount: number; reason: string; type: string; createdAt: string }[];  // 최근 10건
}

// 통계 카드용
interface StudentStats {
  total: number;
  byGrade: { grade: number; count: number }[];
  assignedToClass: number;  // 반 배정된 학생 수
}
```

---

## 4. API Specification

### 4.1 Endpoint Changes

| Method | Path | Change | Description |
|--------|------|--------|-------------|
| GET | /api/students | **수정** | recentAttendance 필드 추가, stats 쿼리 파라미터 추가 |
| POST | /api/students | **수정** | profileImage 파라미터 추가, 중복 경고 응답 |
| GET | /api/students/[id] | **수정** | 상세 정보(출석통계, 달란트내역) 포함 응답 |
| PUT | /api/students/[id] | **수정** | profileImage 파라미터 추가 |
| DELETE | /api/students/[id] | **수정** | admin 역할 체크 추가 |

### 4.2 Detailed Specification

#### `GET /api/students` (수정)

기존 동작 유지 + 출석 미니 인디케이터 데이터 추가.

**Query Parameters:**
- `classId` (optional): 반별 필터 (기존)
- `stats` (optional): `true`이면 통계 데이터도 반환

**Response (200):**
```json
{
  "students": [
    {
      "id": "student-xxx",
      "name": "홍길동",
      "grade": 3,
      "birthday": "2017-05-15",
      "parentPhone": "010-1234-5678",
      "parentName": "홍부모",
      "note": null,
      "profileImage": "https://example.com/photo.jpg",
      "talentBalance": 150,
      "classId": "class-xxx",
      "className": "사랑반",
      "recentAttendance": [
        { "date": "2026-02-09", "status": "present" },
        { "date": "2026-02-02", "status": "present" },
        { "date": "2026-01-26", "status": "absent" },
        { "date": "2026-01-19", "status": "late" }
      ]
    }
  ],
  "stats": {
    "total": 45,
    "byGrade": [
      { "grade": 1, "count": 8 },
      { "grade": 2, "count": 7 },
      { "grade": 3, "count": 10 }
    ],
    "assignedToClass": 38
  }
}
```

> **하위 호환성**: `stats` 파라미터가 없으면 기존처럼 배열만 반환. `stats=true`일 때만 `{ students, stats }` 객체 반환.

#### `POST /api/students` (수정)

**Request:**
```json
{
  "name": "홍길동",
  "grade": 3,
  "birthday": "2017-05-15",
  "parentPhone": "010-1234-5678",
  "parentName": "홍부모",
  "note": "알레르기: 땅콩",
  "classId": "class-xxx",
  "profileImage": "https://example.com/photo.jpg"
}
```

**Response (200 - 중복 경고 포함):**
```json
{
  "id": "student-xxx",
  "name": "홍길동",
  "grade": 3,
  "duplicateWarning": "같은 학년에 '홍길동' 학생이 이미 존재합니다."
}
```

> `duplicateWarning`은 선택적 필드. 중복이 없으면 포함되지 않음. 중복이 있어도 등록은 완료됨.

#### `GET /api/students/[id]` (수정)

상세 정보 포함 응답.

**Query Parameters:**
- `detail` (optional): `true`이면 출석/달란트 내역 포함

**Response (200 - detail=true):**
```json
{
  "id": "student-xxx",
  "name": "홍길동",
  "grade": 3,
  "birthday": "2017-05-15",
  "parentPhone": "010-1234-5678",
  "parentName": "홍부모",
  "note": "알레르기: 땅콩",
  "profileImage": null,
  "talentBalance": 150,
  "className": "사랑반",
  "classId": "class-xxx",
  "attendanceStats": {
    "totalPresent": 20,
    "totalLate": 3,
    "totalAbsent": 2
  },
  "attendanceStreak": 5,
  "recentAttendance": [
    { "date": "2026-02-09", "status": "present", "memo": null },
    { "date": "2026-02-02", "status": "present", "memo": null }
  ],
  "recentTalents": [
    { "amount": 5, "reason": "출석", "type": "attendance", "createdAt": "2026-02-09T10:00:00Z" },
    { "amount": -50, "reason": "연필 세트 구매", "type": "purchase", "createdAt": "2026-02-08T14:00:00Z" }
  ]
}
```

#### `PUT /api/students/[id]` (수정)

기존 동작 + `profileImage` 파라미터 추가.

**Request:**
```json
{
  "name": "홍길동",
  "grade": 3,
  "profileImage": "https://example.com/new-photo.jpg"
}
```

#### `DELETE /api/students/[id]` (수정)

**권한 체크 추가:**
```typescript
const session = await getSession();
if (!session) return 401;
if (session.role !== 'admin') {
  return NextResponse.json(
    { error: '관리자만 학생을 삭제할 수 있습니다.' },
    { status: 403 }
  );
}
```

---

## 5. DB 함수 설계

### 5.1 신규 함수

#### `getAllStudentsWithAttendance(): StudentWithAttendance[]`

학생 목록 + 최근 4주 일요일 출석 데이터를 한번에 조회.

```sql
-- 1단계: 학생 목록 조회 (기존)
SELECT s.*, c.name as className
FROM Student s
LEFT JOIN Class c ON s.classId = c.id
ORDER BY s.grade ASC, s.name ASC;

-- 2단계: 최근 4주 출석 데이터 일괄 조회
SELECT studentId, date(date) as date, status
FROM Attendance
WHERE date(date) >= date('now', '-28 days')
ORDER BY date DESC;
```

> 2개 쿼리로 나눠서 조회 후 JavaScript에서 merge. 학생별 서브쿼리(N+1)보다 효율적.

#### `getStudentDetail(id: string): StudentDetail | undefined`

학생 상세 + 출석통계 + 최근출석 + 최근달란트를 한 함수에서 조회.

```typescript
function getStudentDetail(id: string) {
  const db = createDb();
  try {
    // 1. 기본 정보
    const student = db.prepare('SELECT s.*, c.name as className FROM Student s LEFT JOIN Class c ON s.classId = c.id WHERE s.id = ?').get(id);
    if (!student) return undefined;

    // 2. 출석 통계
    const attendanceStats = db.prepare('SELECT SUM(CASE WHEN status="present" THEN 1 ELSE 0 END) as totalPresent, ...').get(id);

    // 3. 연속 출석
    const streak = getStudentAttendanceStreak(id);  // 기존 함수 재사용은 불가 (별도 DB 연결), 인라인 구현

    // 4. 최근 출석 10건
    const recentAttendance = db.prepare('SELECT date(date) as date, status, memo FROM Attendance WHERE studentId = ? ORDER BY date DESC LIMIT 10').all(id);

    // 5. 최근 달란트 10건
    const recentTalents = db.prepare('SELECT amount, reason, type, createdAt FROM Talent WHERE studentId = ? ORDER BY createdAt DESC LIMIT 10').all(id);

    return { ...student, attendanceStats, attendanceStreak: streak, recentAttendance, recentTalents };
  } finally {
    db.close();
  }
}
```

> **중요**: 단일 DB 연결에서 5개 쿼리 실행 (기존 함수들은 각각 별도 연결을 열므로 재사용 불가). 단일 연결에서 모든 데이터를 조회하는 것이 성능상 유리.

#### `checkDuplicateStudent(name: string, grade: number): { exists: boolean; count: number }`

```sql
SELECT COUNT(*) as count FROM Student WHERE name = ? AND grade = ?
```

#### `getStudentStats(): StudentStats`

```sql
-- 전체 수
SELECT COUNT(*) as total FROM Student;

-- 학년별 수
SELECT grade, COUNT(*) as count FROM Student GROUP BY grade ORDER BY grade;

-- 반 배정 수
SELECT COUNT(*) as count FROM Student WHERE classId IS NOT NULL;
```

### 5.2 수정 함수

#### `createStudent()` - profileImage 추가

```diff
- function createStudent(student: { id; name; grade; birthday?; parentPhone?; parentName?; note?; classId? })
+ function createStudent(student: { id; name; grade; birthday?; parentPhone?; parentName?; note?; classId?; profileImage? })

  INSERT INTO Student (id, name, grade, birthday, parentPhone, parentName, note, talentBalance, classId,
+   profileImage,
    createdAt, updatedAt)
- VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))
+ VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, datetime('now'), datetime('now'))
```

#### `updateStudent()` - profileImage 추가

```diff
- function updateStudent(id, student: { name?; grade?; birthday?; parentPhone?; parentName?; note?; classId? })
+ function updateStudent(id, student: { name?; grade?; birthday?; parentPhone?; parentName?; note?; classId?; profileImage? })

  UPDATE Student SET name=?, grade=?, birthday=?, parentPhone=?, parentName=?, note=?, classId=?,
+   profileImage=?,
    updatedAt=datetime('now') WHERE id=?
```

---

## 6. UI/UX Design

### 6.1 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│  Header: "학생 관리"  (subtitle: "총 45명의 학생")          │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ 전체 학생     │ │ 반 배정률    │ │ 평균 달란트   │       │
│  │   45명       │ │   84%       │ │   120점      │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
├────────────────────────────────────────────────────────────┤
│  [🔍 검색...] [학년▼] [반▼] [정렬▼] [+ 학생 추가]          │
├────────────────────────────────────────────────────────────┤
│  ── 1학년 (8명) ─────────────────────────                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ [Avatar] 김철수  사랑반  🟢🟢🔴🟡  ⭐150            │   │
│  │                                  [수정] [삭제*]     │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ [Avatar] 이영희  믿음반  🟢🟢🟢🟢  ⭐230            │   │
│  └────────────────────────────────────────────────────┘   │
│  ── 2학년 (7명) ─────────────────────────                  │
│  ...                                                       │
└────────────────────────────────────────────────────────────┘

* 삭제 버튼: admin에게만 표시
  출석 미니 인디케이터: 🟢=출석, 🔴=결석, 🟡=지각, ⚪=없음
  학생 이름 클릭 → 상세 모달 열기
```

### 6.2 Student Detail Modal (탭 UI)

```
┌────────────────────────────────────────────────────┐
│  [Avatar(lg)] 김철수  3학년 사랑반                    │
│  ⭐ 150 달란트  |  🔥 연속 5주 출석                   │
├────────────────────────────────────────────────────┤
│  [기본정보]  [출석이력]  [달란트내역]                   │
├────────────────────────────────────────────────────┤
│ << 기본정보 탭 >>                                    │
│  생일: 5월 15일                                      │
│  보호자: 홍부모 (010-1234-5678)                      │
│  특이사항: 알레르기: 땅콩                             │
│  출석률: 출석 20 / 지각 3 / 결석 2 (80%)              │
│                                                      │
│ << 출석이력 탭 >>                                     │
│  2026-02-09  출석  ✅                                │
│  2026-02-02  출석  ✅                                │
│  2026-01-26  결석  ❌                                │
│  ...                                                 │
│                                                      │
│ << 달란트내역 탭 >>                                   │
│  +5   출석       2026-02-09                          │
│  -50  연필세트    2026-02-08                          │
│  +10  보너스     2026-02-07                          │
│  ...                                                 │
├────────────────────────────────────────────────────┤
│                              [닫기]                  │
└────────────────────────────────────────────────────┘
```

### 6.3 Delete Confirm Dialog

```
┌────────────────────────────────────────────────────┐
│  ⚠️ 학생 삭제                                       │
│                                                      │
│  '김철수' 학생을 정말 삭제하시겠습니까?               │
│                                                      │
│  ⚠ 해당 학생의 출석 기록과 달란트 내역이              │
│    모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.     │
│                                                      │
│            [취소]          [삭제]                     │
└────────────────────────────────────────────────────┘
```

### 6.4 Duplicate Warning (폼 내 인라인)

```
┌────────────────────────────────────────────────────┐
│  새 학생 추가                                        │
│                                                      │
│  이름*: [홍길동        ]                              │
│  학년*: [3학년 ▼]  반: [사랑반 ▼]                    │
│                                                      │
│  ⚠️ 같은 3학년에 '홍길동' 학생이 이미 1명 있습니다.   │
│     그래도 등록하시겠습니까?                          │
│                                                      │
│  ...                                                 │
└────────────────────────────────────────────────────┘
```

### 6.5 User Flow

```
학생 목록 페이지
├── 필터: 학년 선택 → 반 드롭다운 (해당 학년의 반만 표시)
├── 정렬: 이름순 / 달란트순 / 최근등록순
├── 검색: 이름 검색 (기존)
├── 학생 카드 클릭 → 상세 모달 (탭 전환)
├── 수정 버튼 → 폼 모달 (기존 + profileImage)
├── 삭제 버튼 (admin만) → 커스텀 삭제 확인 → DELETE API
└── 추가 버튼 → 폼 모달 + 중복 체크 경고
```

### 6.6 Component List

| Component/Section | Location | Responsibility |
|-------------------|----------|----------------|
| StatsCards | page.tsx 내 인라인 | 전체/반배정/평균달란트 통계 |
| ClassFilter | page.tsx 내 인라인 | 학년 연동 반 필터 |
| SortSelect | page.tsx 내 인라인 | 정렬 옵션 |
| AttendanceMini | page.tsx 내 인라인 | 4주 출석 도트 표시 |
| StudentDetailModal | page.tsx 내 인라인 | 탭 UI 상세 보기 |
| DeleteConfirmDialog | page.tsx 내 인라인 | 삭제 확인 다이얼로그 |
| DuplicateWarning | page.tsx 내 인라인 | 중복 경고 배너 |

> 모든 컴포넌트는 `students/page.tsx` 내 인라인으로 구현 (기존 shop/page.tsx 패턴 유지).

---

## 7. Error Handling

| Code | Scenario | UI 처리 |
|------|----------|---------|
| 401 | 미인증 요청 | 로그인 리다이렉트 (layout에서 처리) |
| 403 | 교사가 삭제 시도 | alert('관리자만 학생을 삭제할 수 있습니다.') |
| 400 | 필수 필드 누락 (이름, 학년) | 폼 유효성 검사 (클라이언트) |
| 404 | 존재하지 않는 학생 | alert('학생을 찾을 수 없습니다.') |
| 500 | 서버 에러 | alert('오류가 발생했습니다. 다시 시도해주세요.') |

---

## 8. Security Considerations

- [x] DELETE API에 admin 역할 체크 추가 (FR-07)
- [x] profileImage는 URL 문자열만 저장 (파일 업로드 없음, XSS 위험 없음)
- [x] 기존 getSession() 인증 유지 (모든 API에 적용)
- [x] SQL 파라미터 바인딩 사용 (SQL Injection 방지, better-sqlite3 기본 패턴)

---

## 9. State Management

### 9.1 Page State

```typescript
// 기존 state (유지)
const [students, setStudents] = useState<StudentWithAttendance[]>([]);
const [classes, setClasses] = useState<Class[]>([]);
const [loading, setLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState('');
const [selectedGrade, setSelectedGrade] = useState<string>('all');
const [showModal, setShowModal] = useState(false);
const [editingStudent, setEditingStudent] = useState<Student | null>(null);
const [saving, setSaving] = useState(false);

// 신규 state
const [isAdmin, setIsAdmin] = useState(false);              // admin 역할 여부
const [selectedClass, setSelectedClass] = useState('all');    // 반 필터
const [sortBy, setSortBy] = useState<'name' | 'talent' | 'recent'>('name');  // 정렬
const [stats, setStats] = useState<StudentStats | null>(null);  // 통계
const [showDetailModal, setShowDetailModal] = useState(false);  // 상세 모달
const [detailStudent, setDetailStudent] = useState<StudentDetail | null>(null);  // 상세 데이터
const [detailTab, setDetailTab] = useState<'info' | 'attendance' | 'talent'>('info');  // 상세 탭
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);  // 삭제 확인
const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);  // 삭제 대상
const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);  // 중복 경고

// formData 확장
const [formData, setFormData] = useState({
  name: '',
  grade: 1,
  birthday: '',
  parentPhone: '',
  parentName: '',
  note: '',
  classId: '',
  profileImage: '',  // 신규
});
```

---

## 10. Implementation Guide

### 10.1 File Structure (변경 대상)

```
src/
├── lib/
│   └── db.ts                               // 신규 함수 4개 + 기존 수정 2개
├── app/
│   ├── api/
│   │   └── students/
│   │       ├── route.ts                     // GET 확장, POST 확장
│   │       └── [id]/
│   │           └── route.ts                 // GET 확장, DELETE 수정
│   └── (dashboard)/
│       └── students/
│           └── page.tsx                     // 전체 UI 개편
└── components/
    └── ui/
        └── Avatar.tsx                       // 변경 없음 (이미 image prop 지원)
```

### 10.2 Implementation Order

1. **[Step 1] DB 함수 추가** (`src/lib/db.ts`)
   - [ ] `getAllStudentsWithAttendance()` 함수 추가
   - [ ] `getStudentDetail(id)` 함수 추가
   - [ ] `checkDuplicateStudent(name, grade)` 함수 추가
   - [ ] `getStudentStats()` 함수 추가
   - [ ] `createStudent()` profileImage 파라미터 추가
   - [ ] `updateStudent()` profileImage 파라미터 추가

2. **[Step 2] API 확장** (`src/app/api/students/`)
   - [ ] `route.ts` GET: stats 쿼리 파라미터 + recentAttendance
   - [ ] `route.ts` POST: profileImage + 중복 체크 경고
   - [ ] `[id]/route.ts` GET: detail 쿼리 파라미터
   - [ ] `[id]/route.ts` PUT: profileImage
   - [ ] `[id]/route.ts` DELETE: admin 역할 체크

3. **[Step 3] UI - 통계 카드 + 필터 + 정렬** (`students/page.tsx`)
   - [ ] 상단 통계 요약 카드 3개
   - [ ] 반 필터 드롭다운 (학년 연동)
   - [ ] 정렬 드롭다운 (이름순/달란트순/최근등록순)
   - [ ] admin 역할 확인 (fetch /api/auth/me)

4. **[Step 4] UI - 학생 카드 확장** (`students/page.tsx`)
   - [ ] 출석 미니 인디케이터 (4주 도트)
   - [ ] 프로필 이미지 Avatar 표시
   - [ ] admin만 삭제 버튼 표시
   - [ ] 카드 클릭 → 상세 모달 열기

5. **[Step 5] UI - 삭제 확인 다이얼로그** (`students/page.tsx`)
   - [ ] 커스텀 삭제 확인 모달 (학생 이름 + 경고 문구)
   - [ ] confirm() 대체

6. **[Step 6] UI - 학생 상세 모달** (`students/page.tsx`)
   - [ ] 탭 UI (기본정보 / 출석이력 / 달란트내역)
   - [ ] 출석 통계 바 + 연속 출석 표시
   - [ ] 출석 이력 리스트 (최근 10건)
   - [ ] 달란트 내역 리스트 (최근 10건)

7. **[Step 7] UI - 폼 확장** (`students/page.tsx`)
   - [ ] profileImage URL 입력 필드
   - [ ] 중복 감지 경고 UI (이름+학년 입력 시 실시간 체크 or 제출 시 체크)

### 10.3 Convention Reference

| Item | Convention |
|------|-----------|
| Component naming | PascalCase (인라인이므로 해당 없음) |
| File organization | 기존 App Router 구조 유지 |
| State management | React useState (기존 패턴) |
| Error handling | try-catch + alert() (기존 shop 패턴) |
| Admin detection | fetch('/api/auth/me') → isAdmin state (기존 shop 패턴) |
| DB 패턴 | createDb() → query → db.close() (기존 패턴) |
| API 인증 | getSession() + role 체크 (기존 패턴) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Claude Code |
