# parent-portal Design Document

> **Summary**: 학부모 전용 포털 - 자녀 출석/달란트 조회 및 공지 열람
>
> **Project**: 다니엘 (동은교회 초등부 출석/달란트 관리)
> **Author**: Claude
> **Date**: 2026-02-13
> **Status**: Draft
> **Planning Doc**: [parent-portal.plan.md](../../01-plan/features/parent-portal.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 기존 User 모델에 `role='parent'` 추가하여 학부모 계정 지원
- ParentStudent 다대다 관계로 복수 자녀/보호자 지원
- 학부모 전용 페이지에서 자녀 출석/달란트를 읽기 전용으로 조회
- 기존 로그인 시스템 공유, role 기반 리다이렉트

### 1.2 Design Principles

- 기존 아키텍처 패턴 100% 준수 (better-sqlite3, createDb() 패턴)
- 학부모는 자신의 자녀 데이터만 접근 가능 (보안)
- 모바일 우선 반응형 디자인 (학부모는 휴대폰 사용 비율 높음)
- 기존 사이드바/레이아웃 재활용 (role 기반 메뉴 필터링)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌───────────────────────┐     ┌────────────────────────┐     ┌──────────────┐
│  Parent Dashboard     │────▶│  /api/parent/dashboard  │────▶│  SQLite DB   │
│  Parent Attendance    │     │  /api/parent/attendance  │     │  (better-    │
│  Parent Talent        │     │  /api/parent/talent      │     │   sqlite3)   │
└───────────────────────┘     └────────────────────────┘     └──────────────┘

┌───────────────────────┐     ┌────────────────────────┐     ┌──────────────┐
│  Settings (학부모 탭)  │────▶│  /api/parents           │────▶│  ParentStudent│
│                       │     │  /api/parents/[id]      │     │  테이블       │
└───────────────────────┘     └────────────────────────┘     └──────────────┘
```

### 2.2 Data Flow

```
[관리자] → 설정 > 학부모 탭 → 학부모 계정 생성 + 자녀 연결 → API → SQLite
[학부모] → 로그인 → role=parent → /parent 리다이렉트 → 자녀 데이터 조회
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Parent Pages | /api/parent/* | 자녀 데이터 조회 |
| Parent API | db.ts, auth.ts | 데이터 접근, 인증, 자녀 관계 검증 |
| Settings 학부모 탭 | /api/parents | 학부모 계정 CRUD |
| Sidebar | session.role | 메뉴 필터링 |

---

## 3. Data Model

### 3.1 ParentStudent Interface (db.ts)

```typescript
export interface ParentStudent {
  id: string;
  parentId: string;
  studentId: string;
  parentName?: string;
  studentName?: string;
  createdAt: string;
}
```

### 3.2 Entity Relationships

```
[User(role=parent)] 1 ──── N [ParentStudent] N ──── 1 [Student]
```

### 3.3 Prisma Schema 추가

```prisma
// 학부모-자녀 연결 (다대다)
model ParentStudent {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  parent    User     @relation(fields: [parentId], references: [id], onDelete: Cascade)
  parentId  String

  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId String

  @@unique([parentId, studentId])
}
```

User 모델에 relation 추가:
```prisma
model User {
  // ... 기존 필드
  parentStudents ParentStudent[]
}
```

Student 모델에 relation 추가:
```prisma
model Student {
  // ... 기존 필드
  parentStudents ParentStudent[]
}
```

### 3.4 SQLite 테이블 (마이그레이션 결과)

```sql
CREATE TABLE "ParentStudent" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "parentId"  TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");
```

---

## 4. API Specification

### 4.1 관리자용 학부모 계정 관리 API

| Method | Path | Description | Auth | Admin Only |
|--------|------|-------------|:----:|:----------:|
| GET | /api/parents | 학부모 목록 (자녀 포함) | Yes | Yes |
| POST | /api/parents | 학부모 계정 생성 + 자녀 연결 | Yes | Yes |
| GET | /api/parents/[id] | 학부모 상세 (자녀 목록) | Yes | Yes |
| PUT | /api/parents/[id] | 학부모 정보 수정 + 자녀 재연결 | Yes | Yes |
| DELETE | /api/parents/[id] | 학부모 계정 삭제 (연결도 삭제) | Yes | Yes |

### 4.2 학부모용 데이터 조회 API

| Method | Path | Description | Auth | Parent Only |
|--------|------|-------------|:----:|:-----------:|
| GET | /api/parent/children | 내 자녀 목록 | Yes | Yes |
| GET | /api/parent/dashboard | 자녀 대시보드 (출석/달란트 요약) | Yes | Yes |
| GET | /api/parent/attendance | 자녀 출석 내역 | Yes | Yes |
| GET | /api/parent/talent | 자녀 달란트 내역 | Yes | Yes |

### 4.3 Detailed Specification

#### `GET /api/parents` (관리자)

**Response (200 OK):**
```json
[
  {
    "id": "user-id",
    "loginId": "parent1",
    "name": "김철수 부모",
    "phone": "010-1234-5678",
    "children": [
      { "id": "student-id", "name": "김철수", "grade": 3, "className": "다윗반" }
    ]
  }
]
```

#### `POST /api/parents` (관리자)

**Request:**
```json
{
  "loginId": "parent1",
  "password": "1234",
  "name": "김철수 부모",
  "phone": "010-1234-5678",
  "studentIds": ["student-id-1", "student-id-2"]
}
```

**Response (200 OK):**
```json
{ "id": "user-id", "name": "김철수 부모" }
```

**Error Responses:**
- `400`: loginId, name, password 누락 또는 studentIds 빈 배열
- `401`: 미인증
- `403`: 관리자 아님
- `409`: loginId 중복

#### `PUT /api/parents/[id]` (관리자)

**Request:**
```json
{
  "name": "수정된 이름",
  "phone": "010-9999-8888",
  "password": "newpass",
  "studentIds": ["student-id-1"]
}
```

- password가 비어있으면 기존 비밀번호 유지
- studentIds: 전달된 목록으로 교체 (기존 연결 삭제 후 새로 추가)

**Response (200 OK):** `{ "success": true }`

#### `DELETE /api/parents/[id]` (관리자)

ParentStudent 연결 + User 레코드 삭제

**Response (200 OK):** `{ "success": true }`

#### `GET /api/parent/children` (학부모)

**Query:** 없음 (세션에서 parentId 추출)

**Response (200 OK):**
```json
[
  {
    "id": "student-id",
    "name": "김철수",
    "grade": 3,
    "className": "다윗반",
    "talentBalance": 150,
    "profileImage": null
  }
]
```

#### `GET /api/parent/dashboard` (학부모)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| studentId | string | (첫 자녀) | 조회할 자녀 ID |

**Response (200 OK):**
```json
{
  "student": {
    "id": "student-id",
    "name": "김철수",
    "grade": 3,
    "className": "다윗반",
    "talentBalance": 150
  },
  "attendanceSummary": {
    "totalPresent": 15,
    "totalLate": 2,
    "totalAbsent": 1,
    "streak": 3
  },
  "recentAttendance": [
    { "date": "2026-02-09", "status": "present" },
    { "date": "2026-02-02", "status": "present" }
  ],
  "recentTalent": [
    { "amount": 5, "reason": "출석", "type": "attendance", "createdAt": "..." },
    { "amount": 10, "reason": "연속 출석 보너스", "type": "bonus", "createdAt": "..." }
  ],
  "announcements": [
    { "id": "...", "title": "...", "category": "general", "createdAt": "..." }
  ]
}
```

#### `GET /api/parent/attendance` (학부모)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| studentId | string | (첫 자녀) | 조회할 자녀 ID |
| limit | number | 20 | 항목 수 |

**Response (200 OK):**
```json
{
  "student": { "id": "...", "name": "김철수" },
  "attendance": [
    { "date": "2026-02-09", "status": "present", "memo": null },
    { "date": "2026-02-02", "status": "late", "memo": "교통 체증" }
  ],
  "stats": {
    "totalPresent": 15,
    "totalLate": 2,
    "totalAbsent": 1
  }
}
```

#### `GET /api/parent/talent` (학부모)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| studentId | string | (첫 자녀) | 조회할 자녀 ID |
| limit | number | 20 | 항목 수 |

**Response (200 OK):**
```json
{
  "student": { "id": "...", "name": "김철수", "talentBalance": 150 },
  "transactions": [
    { "amount": 5, "reason": "출석", "type": "attendance", "createdAt": "..." },
    { "amount": -30, "reason": "연필 세트", "type": "purchase", "createdAt": "..." }
  ]
}
```

---

## 5. DB Functions (db.ts)

### 5.1 함수 목록

| Function | Parameters | Return | Description |
|----------|-----------|--------|-------------|
| `getParentList` | - | `ParentWithChildren[]` | 학부모 목록 (자녀 포함) |
| `getParentById` | id | `ParentWithChildren \| undefined` | 학부모 상세 |
| `createParentAccount` | { id, loginId, password, name, phone } | void | 학부모 User 생성 (role=parent) |
| `linkParentStudent` | parentId, studentId | void | 학부모-자녀 연결 |
| `unlinkAllParentStudents` | parentId | void | 학부모의 모든 자녀 연결 해제 |
| `deleteParentAccount` | id | void | 학부모 계정 + 연결 삭제 |
| `getChildrenByParentId` | parentId | `StudentSummary[]` | 학부모의 자녀 목록 |
| `isParentOfStudent` | parentId, studentId | boolean | 학부모-자녀 관계 검증 |
| `getParentDashboardData` | parentId, studentId | `ParentDashboard` | 대시보드 데이터 |

### 5.2 주요 함수 상세

```typescript
// 학부모의 자녀인지 검증 (보안 핵심)
export function isParentOfStudent(parentId: string, studentId: string): boolean {
  const db = createDb();
  try {
    const row = db.prepare(
      'SELECT id FROM ParentStudent WHERE parentId = ? AND studentId = ?'
    ).get(parentId, studentId);
    return !!row;
  } finally {
    db.close();
  }
}

// 학부모의 자녀 목록
export function getChildrenByParentId(parentId: string): StudentSummary[] {
  const db = createDb();
  try {
    return db.prepare(`
      SELECT s.id, s.name, s.grade, s.talentBalance, s.profileImage,
             c.name as className
      FROM ParentStudent ps
      JOIN Student s ON ps.studentId = s.id
      LEFT JOIN Class c ON s.classId = c.id
      WHERE ps.parentId = ?
      ORDER BY s.grade, s.name
    `).all(parentId) as StudentSummary[];
  } finally {
    db.close();
  }
}

// 학부모 목록 (관리자용, 자녀 포함)
export function getParentList(): ParentWithChildren[] {
  const db = createDb();
  try {
    const parents = db.prepare(`
      SELECT id, loginId, name, phone
      FROM User WHERE role = 'parent'
      ORDER BY name
    `).all() as { id: string; loginId: string; name: string; phone: string | null }[];

    return parents.map(parent => {
      const children = db.prepare(`
        SELECT s.id, s.name, s.grade, c.name as className
        FROM ParentStudent ps
        JOIN Student s ON ps.studentId = s.id
        LEFT JOIN Class c ON s.classId = c.id
        WHERE ps.parentId = ?
      `).all(parent.id) as { id: string; name: string; grade: number; className: string | null }[];

      return { ...parent, children };
    });
  } finally {
    db.close();
  }
}
```

---

## 6. UI/UX Design

### 6.1 학부모 대시보드 (`/parent`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "학부모 대시보드"                             │
├─────────────────────────────────────────────────────┤
│  [자녀 선택: 김철수 ▼]  (복수 자녀인 경우만 표시)      │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 🎒 김철수 │ │ 📅 출석률 │ │ ⭐ 달란트 │            │
│  │  3학년    │ │   83%    │ │   150    │            │
│  │ 다윗반    │ │  15/18   │ │          │            │
│  └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│  📅 최근 출석                                        │
│  ┌──────────────────────────────────────┐           │
│  │ 2/9  출석 ✅                          │           │
│  │ 2/2  출석 ✅                          │           │
│  │ 1/26 지각 ⏰                          │           │
│  └──────────────────────────────────────┘           │
│                                [출석 내역 더보기 →]   │
├─────────────────────────────────────────────────────┤
│  ⭐ 최근 달란트                                      │
│  ┌──────────────────────────────────────┐           │
│  │ +5  출석            2/9              │           │
│  │ +10 연속출석 보너스   2/9              │           │
│  │ -30 연필 세트 구매   2/5              │           │
│  └──────────────────────────────────────┘           │
│                                [달란트 내역 더보기 →]  │
├─────────────────────────────────────────────────────┤
│  📢 공지사항                            [더보기 →]    │
│  ┌──────────────────────────────────────┐           │
│  │ [긴급] 다음 주 예배 시간 변경          │           │
│  │ [행사] 부활절 특별 행사               │           │
│  └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

### 6.2 출석 내역 페이지 (`/parent/attendance`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "출석 내역"  subtitle: "자녀의 출석을 확인"   │
├─────────────────────────────────────────────────────┤
│  [자녀 선택: 김철수 ▼]                               │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ ✅ 출석   │ │ ⏰ 지각   │ │ ❌ 결석   │            │
│  │   15     │ │    2     │ │    1     │            │
│  └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│  2/9  (일)  출석 ✅                                  │
│  2/2  (일)  출석 ✅                                  │
│  1/26 (일)  지각 ⏰  사유: 교통 체증                   │
│  1/19 (일)  출석 ✅                                  │
│  1/12 (일)  결석 ❌                                  │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

### 6.3 달란트 내역 페이지 (`/parent/talent`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "달란트 내역"  subtitle: "자녀의 달란트 현황" │
├─────────────────────────────────────────────────────┤
│  [자녀 선택: 김철수 ▼]                               │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐            │
│  │  ⭐ 현재 달란트 잔액                 │            │
│  │         150                         │            │
│  └─────────────────────────────────────┘            │
├─────────────────────────────────────────────────────┤
│  +5   출석              2/9  ✅ 출석    │            │
│  +10  연속출석 보너스     2/9  🎯 보너스  │            │
│  +5   출석              2/2  ✅ 출석    │            │
│  -30  연필 세트          2/1  🛒 구매    │            │
│  +5   출석              1/26 ✅ 출석    │            │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

### 6.4 사이드바 학부모용 메뉴

```
┌─────────────────────┐
│  🦁 다니엘            │
│  동은교회 초등부       │
├─────────────────────┤
│  김부모                │
│  👨‍👩‍👧 학부모            │
├─────────────────────┤
│  🏠 대시보드           │  → /parent
│  📅 출석 내역          │  → /parent/attendance
│  ⭐ 달란트 내역        │  → /parent/talent
│  📢 공지사항           │  → /announcements
├─────────────────────┤
│  🚪 로그아웃           │
└─────────────────────┘
```

### 6.5 설정 페이지 학부모 탭

```
┌─────────────────────────────────────────────────────┐
│  [교사 관리] [반 관리] [달란트 설정] [학부모 관리]     │
├─────────────────────────────────────────────────────┤
│  총 5명의 학부모                    [+ 학부모 추가]   │
├─────────────────────────────────────────────────────┤
│  김철수 부모  (parent1)                              │
│    자녀: 김철수(3학년)                               │
│    📞 010-1234-5678        [수정] [삭제]             │
├─────────────────────────────────────────────────────┤
│  이영희 부모  (parent2)                              │
│    자녀: 이영희(2학년), 이민수(5학년)                  │
│    📞 010-5678-1234        [수정] [삭제]             │
└─────────────────────────────────────────────────────┘
```

### 6.6 학부모 추가 모달

```
┌─────────────────────────────────────┐
│  학부모 추가                    [X]  │
├─────────────────────────────────────┤
│  이름 *                             │
│  [________________________]         │
│                                     │
│  아이디 *                           │
│  [________________________]         │
│                                     │
│  비밀번호 *                         │
│  [________________________]         │
│                                     │
│  연락처                             │
│  [________________________]         │
│                                     │
│  자녀 선택 *                        │
│  ☑ 김철수 (3학년, 다윗반)           │
│  ☐ 이영희 (2학년, 사무엘반)         │
│  ☐ 박민수 (5학년, 모세반)           │
│  ...                               │
│                                     │
│  [취소]  [추가하기]                  │
└─────────────────────────────────────┘
```

### 6.7 자녀 선택 드롭다운 (복수 자녀)

```
┌──────────────────────────┐
│  [🎒 김철수 (3학년) ▼]   │
│  ┌────────────────────┐  │
│  │ 🎒 김철수 (3학년) ✓│  │
│  │ 🎒 김영희 (1학년)  │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### 6.8 Category Badge 참조

| Type | Badge Variant | Icon |
|------|---------------|------|
| attendance (+) | green | ✅ |
| bonus (+) | gold | 🎯 |
| purchase (-) | red | 🛒 |

### 6.9 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| ParentDashboard | src/app/(dashboard)/parent/page.tsx | 자녀 요약 대시보드 |
| ParentAttendance | src/app/(dashboard)/parent/attendance/page.tsx | 출석 내역 |
| ParentTalent | src/app/(dashboard)/parent/talent/page.tsx | 달란트 내역 |
| ChildSelector | 각 Parent 페이지 내 inline | 자녀 선택 드롭다운 |
| Settings 학부모 탭 | src/app/(dashboard)/settings/page.tsx (수정) | 학부모 계정 관리 |

---

## 7. Sidebar Modification

### 7.1 NavItem 타입 확장

```typescript
interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
  parentOnly?: boolean;   // 신규: 학부모 전용
  hideForParent?: boolean; // 신규: 학부모에게 숨김
}
```

### 7.2 navItems 배열

```typescript
const navItems: NavItem[] = [
  // 관리자/교사 메뉴
  { href: '/dashboard', icon: <Home />, label: '대시보드', hideForParent: true },
  { href: '/attendance', icon: <Calendar />, label: '출석 관리', hideForParent: true },
  { href: '/talent', icon: <Star />, label: '달란트 관리', hideForParent: true },
  { href: '/students', icon: <Users />, label: '학생 관리', hideForParent: true },
  { href: '/announcements', icon: <Megaphone />, label: '공지사항' },
  { href: '/shop', icon: <ShoppingBag />, label: '달란트 시장', adminOnly: true },
  { href: '/stats', icon: <BarChart3 />, label: '통계', adminOnly: true },
  { href: '/settings', icon: <Settings />, label: '설정', adminOnly: true },
  // 학부모 메뉴
  { href: '/parent', icon: <Home />, label: '대시보드', parentOnly: true },
  { href: '/parent/attendance', icon: <Calendar />, label: '출석 내역', parentOnly: true },
  { href: '/parent/talent', icon: <Star />, label: '달란트 내역', parentOnly: true },
];
```

### 7.3 필터링 로직

```typescript
const isAdmin = userRole === 'admin';
const isParent = userRole === 'parent';

const filteredNavItems = navItems.filter(item => {
  if (isParent) {
    // 학부모: parentOnly이거나 hideForParent가 아닌 항목
    return item.parentOnly || (!item.hideForParent && !item.adminOnly);
  }
  // 관리자/교사: parentOnly가 아닌 항목
  if (item.parentOnly) return false;
  return !item.adminOnly || isAdmin;
});
```

---

## 8. Login & Redirect Flow

### 8.1 로그인 후 리다이렉트

기존 `/api/auth/login` 응답에 role 포함 (이미 포함됨).
클라이언트 login/page.tsx에서 role 기반 리다이렉트:

```typescript
// login/page.tsx 수정
if (data.user.role === 'parent') {
  router.push('/parent');
} else {
  router.push('/dashboard');
}
```

### 8.2 Layout 보호

`(dashboard)/layout.tsx`에서 학부모가 관리 페이지 접근 시 리다이렉트:

```typescript
// layout.tsx 수정 (간단한 접근 제어)
if (session.role === 'parent') {
  const pathname = /* 현재 경로 */;
  // /parent, /announcements 외의 경로 접근 시 /parent로 리다이렉트
}
```

> Note: Next.js App Router의 서버 컴포넌트에서는 pathname 직접 접근이 제한적이므로,
> 학부모 전용 페이지는 `/parent` 하위에 배치하고, 기존 관리 페이지들에서는
> 클라이언트 사이드에서 role 체크하여 접근 제어.

---

## 9. Security Considerations

- [x] 모든 parent API에서 `getSession()` → 401
- [x] 학부모 전용 API에서 `session.role !== 'parent'` → 403
- [x] **자녀 관계 검증**: `isParentOfStudent(parentId, studentId)` 호출로 자녀 데이터만 접근
- [x] 학부모 계정 관리 API에서 `session.role !== 'admin'` → 403
- [x] 학부모 비밀번호는 bcrypt 해싱 (기존 패턴)
- [x] SQL injection 방지: prepared statements

---

## 10. Error Handling

| Code | Situation | Response | UI Handling |
|------|-----------|----------|-------------|
| 400 | 필수 필드 누락 | `{ error: "..." }` | alert 표시 |
| 401 | 미인증 | `{ error: "Unauthorized" }` | 로그인 리다이렉트 |
| 403 | 권한 없음 | `{ error: "..." }` | alert / 리다이렉트 |
| 404 | 학부모/자녀 없음 | `{ error: "Not found" }` | 빈 상태 표시 |
| 409 | loginId 중복 | `{ error: "이미 사용 중인 아이디입니다." }` | alert 표시 |
| 500 | 서버 오류 | `{ error: "Internal server error" }` | alert 표시 |

---

## 11. State Management

### 11.1 ParentDashboard 상태

```typescript
const [children, setChildren] = useState<StudentSummary[]>([]);
const [selectedChild, setSelectedChild] = useState<string>('');
const [dashboardData, setDashboardData] = useState<ParentDashboardData | null>(null);
const [loading, setLoading] = useState(true);
```

### 11.2 ParentAttendance 상태

```typescript
const [children, setChildren] = useState<StudentSummary[]>([]);
const [selectedChild, setSelectedChild] = useState<string>('');
const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
const [stats, setStats] = useState<AttendanceStats | null>(null);
const [loading, setLoading] = useState(true);
```

### 11.3 ParentTalent 상태

```typescript
const [children, setChildren] = useState<StudentSummary[]>([]);
const [selectedChild, setSelectedChild] = useState<string>('');
const [student, setStudent] = useState<StudentInfo | null>(null);
const [transactions, setTransactions] = useState<TalentTransaction[]>([]);
const [loading, setLoading] = useState(true);
```

### 11.4 Settings 학부모 탭 상태 추가

```typescript
// 기존 activeTab 타입 확장
const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'talent' | 'parents'>('users');

// 학부모 관련
const [parents, setParents] = useState<ParentWithChildren[]>([]);
const [showParentModal, setShowParentModal] = useState(false);
const [editingParent, setEditingParent] = useState<ParentWithChildren | null>(null);
const [parentForm, setParentForm] = useState({
  loginId: '', password: '', name: '', phone: '', studentIds: [] as string[],
});
const [allStudents, setAllStudents] = useState<Student[]>([]);  // 학생 전체 목록
```

---

## 12. Coding Convention Reference

### 12.1 기존 패턴 준수

| Item | Convention |
|------|-----------|
| DB 함수 | `createDb()` → 쿼리 → `db.close()` (try/finally) |
| API 인증 | `getSession()` → null → 401 |
| 관리자 체크 | `session.role !== 'admin'` → 403 |
| 학부모 체크 (신규) | `session.role !== 'parent'` → 403 |
| 자녀 검증 (신규) | `isParentOfStudent(session.id, studentId)` → 403 |
| ID 생성 | `parentstudent-${Date.now()}-${...}` |
| UI 컴포넌트 | Card, Badge, Button, Input, Avatar from `@/components/ui` |
| 아이콘 | lucide-react (Home, Calendar, Star, Users 등) |
| 날짜 포맷 | date-fns + ko locale |
| 애니메이션 | Framer Motion |

---

## 13. Implementation Guide

### 13.1 File Structure

```
수정 파일:
  prisma/schema.prisma                        -- ParentStudent + User/Student relation
  src/lib/db.ts                               -- 9개 학부모 함수 + interfaces
  src/components/layout/Sidebar.tsx            -- parentOnly/hideForParent 필터
  src/app/login/page.tsx                      -- role별 리다이렉트
  src/app/(dashboard)/settings/page.tsx       -- 학부모 관리 탭

신규 파일:
  src/app/api/parents/route.ts                -- GET (목록), POST (생성)
  src/app/api/parents/[id]/route.ts           -- GET, PUT, DELETE
  src/app/api/parent/children/route.ts        -- 내 자녀 목록
  src/app/api/parent/dashboard/route.ts       -- 학부모 대시보드 데이터
  src/app/api/parent/attendance/route.ts      -- 자녀 출석 내역
  src/app/api/parent/talent/route.ts          -- 자녀 달란트 내역
  src/app/(dashboard)/parent/page.tsx         -- 학부모 대시보드
  src/app/(dashboard)/parent/attendance/page.tsx -- 출석 내역
  src/app/(dashboard)/parent/talent/page.tsx  -- 달란트 내역
```

### 13.2 Implementation Order

1. [ ] **DB Layer**: Prisma 스키마 + 마이그레이션 + db.ts 함수 9개
2. [ ] **Admin API**: /api/parents (CRUD) - 학부모 계정 관리
3. [ ] **Parent API**: /api/parent/* (children, dashboard, attendance, talent)
4. [ ] **Sidebar**: parentOnly/hideForParent 필터링
5. [ ] **Login**: role별 리다이렉트
6. [ ] **UI - 학부모 페이지**: /parent, /parent/attendance, /parent/talent
7. [ ] **UI - 설정 학부모 탭**: settings/page.tsx 수정

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Claude |
