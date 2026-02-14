# notification-announcement Design Document

> **Summary**: 교회 초등부 공지사항 및 알림 시스템 상세 설계
>
> **Project**: 다니엘 (동은교회 초등부 출석/달란트 관리)
> **Author**: Claude
> **Date**: 2026-02-13
> **Status**: Draft
> **Planning Doc**: [notification-announcement.plan.md](../../01-plan/features/notification-announcement.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 기존 프로젝트 패턴(db.ts 함수, API route, 글래스모피즘 UI)을 100% 준수하여 공지사항 기능 추가
- 관리자가 쉽게 공지를 작성/관리하고, 모든 사용자가 대시보드에서 즉시 확인 가능
- 카테고리(일반/행사/긴급)와 고정(핀) 기능으로 공지 우선순위 관리

### 1.2 Design Principles

- 기존 아키텍처 패턴 100% 준수 (better-sqlite3, createDb() 패턴)
- 모바일 우선 반응형 디자인
- 관리자/교사 권한 분리 일관성 유지

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Announcements Page │────▶│  /api/announcements   │────▶│  SQLite DB   │
│  Dashboard Widget   │     │  /api/announcements/  │     │  (better-    │
│  Sidebar Menu       │     │       [id]            │     │   sqlite3)   │
└─────────────────────┘     └──────────────────────┘     └──────────────┘
                            ┌──────────────────────┐
                            │  /api/dashboard       │ (기존 + 공지 추가)
                            └──────────────────────┘
```

### 2.2 Data Flow

```
[관리자] → 공지 작성/수정/삭제 → API (POST/PUT/DELETE) → db.ts 함수 → SQLite
[모든 사용자] → 대시보드/공지 페이지 → API (GET) → db.ts 함수 → SQLite → JSON 응답
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Announcements Page | /api/announcements | 공지 CRUD |
| Dashboard Widget | /api/dashboard | 최신 공지 조회 |
| Sidebar | Announcements Page | 네비게이션 |
| API Routes | db.ts, auth.ts | 데이터 접근, 인증 |

---

## 3. Data Model

### 3.1 Announcement Interface (db.ts)

```typescript
export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;       // 'general' | 'event' | 'urgent'
  isPinned: number;       // SQLite boolean (0 | 1)
  authorId: string;
  authorName?: string;    // JOIN으로 가져올 때
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Entity Relationships

```
[User] 1 ──── N [Announcement]  (authorId → User.id)
```

### 3.3 Prisma Schema 추가

```prisma
// 공지사항
model Announcement {
  id        String   @id @default(cuid())
  title     String
  content   String
  category  String   @default("general")  // general, event, urgent
  isPinned  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
}
```

User 모델에 relation 추가:
```prisma
model User {
  // ... 기존 필드
  announcements Announcement[]
}
```

### 3.4 SQLite 테이블 (마이그레이션 결과)

```sql
CREATE TABLE "Announcement" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "title"     TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "category"  TEXT NOT NULL DEFAULT 'general',
  "isPinned"  BOOLEAN NOT NULL DEFAULT false,
  "authorId"  TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth | Admin Only |
|--------|------|-------------|:----:|:----------:|
| GET | /api/announcements | 공지 목록 조회 (필터, 페이지네이션) | Yes | No |
| POST | /api/announcements | 공지 생성 | Yes | Yes |
| GET | /api/announcements/[id] | 공지 상세 조회 | Yes | No |
| PUT | /api/announcements/[id] | 공지 수정 | Yes | Yes |
| DELETE | /api/announcements/[id] | 공지 삭제 | Yes | Yes |
| PATCH | /api/announcements/[id] | 고정 토글 | Yes | Yes |

### 4.2 Detailed Specification

#### `GET /api/announcements`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| category | string | (all) | 카테고리 필터: general, event, urgent |
| page | number | 1 | 페이지 번호 |
| limit | number | 10 | 페이지당 항목 수 |

**Response (200 OK):**
```json
{
  "announcements": [
    {
      "id": "cuid...",
      "title": "다음 주 예배 시간 변경",
      "content": "다음 주일은 10시에 예배합니다.",
      "category": "urgent",
      "isPinned": 1,
      "authorId": "user-id",
      "authorName": "관리자",
      "createdAt": "2026-02-13T10:00:00.000Z",
      "updatedAt": "2026-02-13T10:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

#### `POST /api/announcements`

**Request:**
```json
{
  "title": "공지 제목",
  "content": "공지 내용",
  "category": "general",
  "isPinned": false
}
```

**Response (200 OK):**
```json
{
  "id": "announcement-...",
  "title": "공지 제목"
}
```

**Error Responses:**
- `400`: title, content 누락
- `401`: 미인증
- `403`: 관리자 아님

#### `GET /api/announcements/[id]`

**Response (200 OK):**
```json
{
  "id": "cuid...",
  "title": "공지 제목",
  "content": "공지 내용 전체",
  "category": "general",
  "isPinned": 0,
  "authorId": "user-id",
  "authorName": "관리자",
  "createdAt": "2026-02-13T10:00:00.000Z",
  "updatedAt": "2026-02-13T10:00:00.000Z"
}
```

#### `PUT /api/announcements/[id]`

**Request:**
```json
{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "category": "event",
  "isPinned": true
}
```

**Response (200 OK):** `{ "success": true }`

#### `DELETE /api/announcements/[id]`

**Response (200 OK):** `{ "success": true }`

#### `PATCH /api/announcements/[id]` (고정 토글)

**Request:**
```json
{
  "isPinned": true
}
```

**Response (200 OK):** `{ "success": true }`

---

## 5. DB Functions (db.ts)

### 5.1 함수 목록

| Function | Parameters | Return | Description |
|----------|-----------|--------|-------------|
| `getAllAnnouncements` | category?, page?, limit? | `{ announcements, total }` | 공지 목록 (고정+최신순, JOIN authorName) |
| `getAnnouncementById` | id | `Announcement \| undefined` | 공지 상세 |
| `createAnnouncement` | { id, title, content, category, isPinned, authorId } | void | 공지 생성 |
| `updateAnnouncement` | id, { title, content, category, isPinned } | void | 공지 수정 |
| `deleteAnnouncement` | id | void | 공지 삭제 |
| `toggleAnnouncementPin` | id, isPinned | void | 고정 토글 |
| `getRecentAnnouncements` | limit? | `Announcement[]` | 대시보드용 최신 공지 (고정 우선) |

### 5.2 getAllAnnouncements 상세

```typescript
export function getAllAnnouncements(
  category?: string,
  page: number = 1,
  limit: number = 10
): { announcements: Announcement[]; total: number } {
  const db = createDb();
  try {
    // WHERE 조건 동적 생성
    let where = '';
    const params: (string | number)[] = [];
    if (category) {
      where = 'WHERE a.category = ?';
      params.push(category);
    }

    // 전체 개수
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM Announcement a ${where}`).get(...params);
    const total = (countRow as { count: number }).count;

    // 목록 (고정 → 최신순, authorName JOIN)
    const offset = (page - 1) * limit;
    const announcements = db.prepare(`
      SELECT a.*, u.name as authorName
      FROM Announcement a
      LEFT JOIN User u ON a.authorId = u.id
      ${where}
      ORDER BY a.isPinned DESC, a.createdAt DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as Announcement[];

    return { announcements, total };
  } finally {
    db.close();
  }
}
```

### 5.3 getRecentAnnouncements 상세 (대시보드용)

```typescript
export function getRecentAnnouncements(limit: number = 3): Announcement[] {
  const db = createDb();
  try {
    return db.prepare(`
      SELECT a.*, u.name as authorName
      FROM Announcement a
      LEFT JOIN User u ON a.authorId = u.id
      ORDER BY a.isPinned DESC, a.createdAt DESC
      LIMIT ?
    `).all(limit) as Announcement[];
  } finally {
    db.close();
  }
}
```

---

## 6. UI/UX Design

### 6.1 공지사항 관리 페이지 (`/announcements`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "공지사항"  subtitle: "공지사항을 관리합니다" │
├─────────────────────────────────────────────────────┤
│  [전체] [일반] [행사] [긴급]    [+ 새 공지] (admin)  │
├─────────────────────────────────────────────────────┤
│  📌 [긴급] 다음 주 예배 시간 변경                     │
│       관리자 · 2026-02-13                            │
│       다음 주일은 10시에 예배합니다...                  │
├─────────────────────────────────────────────────────┤
│  [행사] 부활절 특별 행사 안내                          │
│       관리자 · 2026-02-12                            │
│       부활절 특별 행사를...                            │
├─────────────────────────────────────────────────────┤
│  [일반] 달란트 시장 안내                              │
│       교사1 · 2026-02-11                             │
│       이번 주 달란트 시장은...                         │
└─────────────────────────────────────────────────────┘
```

### 6.2 공지 작성/수정 모달

```
┌─────────────────────────────────────┐
│  새 공지 작성 / 공지 수정       [X]  │
├─────────────────────────────────────┤
│  제목 *                             │
│  [________________________]         │
│                                     │
│  카테고리                            │
│  [일반 ▼] [행사] [긴급]             │
│                                     │
│  내용 *                             │
│  [________________________]         │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  ☐ 상단 고정                        │
│                                     │
│  [취소]  [저장하기]                   │
└─────────────────────────────────────┘
```

### 6.3 대시보드 공지 위젯

```
┌─────────────────────────────────────┐
│  📢 공지사항               [더보기]  │
├─────────────────────────────────────┤
│  📌 [긴급] 다음 주 예배 시간 변경    │
│     관리자 · 2시간 전                │
│                                     │
│  [행사] 부활절 특별 행사 안내        │
│     관리자 · 1일 전                  │
│                                     │
│  [일반] 달란트 시장 안내             │
│     교사1 · 2일 전                   │
└─────────────────────────────────────┘
```

### 6.4 카테고리 배지 스타일

| Category | Label | Badge Variant | Color |
|----------|-------|---------------|-------|
| general | 일반 | purple | 보라 (기본) |
| event | 행사 | gold | 금색 |
| urgent | 긴급 | red | 빨간색 |

### 6.5 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| AnnouncementsPage | src/app/(dashboard)/announcements/page.tsx | 공지 목록, 필터, CRUD UI |
| Dashboard Widget | src/app/(dashboard)/dashboard/page.tsx (수정) | 최신 공지 3개 표시 |
| Sidebar | src/components/layout/Sidebar.tsx (수정) | 공지 메뉴 추가 |
| 작성/수정 Modal | AnnouncementsPage 내 inline | 공지 작성/수정 폼 |

### 6.6 User Flow

```
[모든 사용자]
  대시보드 → 공지 위젯 확인 → "더보기" → 공지 목록 페이지
  사이드바 → "공지사항" → 공지 목록 페이지

[관리자]
  공지 목록 → "새 공지" → 작성 모달 → 저장
  공지 목록 → 수정 버튼 → 수정 모달 → 저장
  공지 목록 → 삭제 버튼 → confirm → 삭제
  공지 목록 → 📌 버튼 → 고정 토글
```

---

## 7. Security Considerations

- [x] 인증 체크: 모든 API에서 `getSession()` → 미인증 시 401
- [x] 관리자 권한: POST/PUT/DELETE/PATCH에서 `session.role !== 'admin'` → 403
- [x] XSS 방지: React의 자동 이스케이프 활용, content를 `dangerouslySetInnerHTML` 미사용
- [x] SQL Injection 방지: better-sqlite3 prepared statements 사용 (기존 패턴)
- [x] 입력 검증: title, content 필수 체크

---

## 8. Error Handling

| Code | Situation | Response | UI Handling |
|------|-----------|----------|-------------|
| 400 | title/content 누락 | `{ error: "Title and content are required" }` | alert 표시 |
| 401 | 미인증 | `{ error: "Unauthorized" }` | 로그인 리다이렉트 |
| 403 | 관리자 아님 | `{ error: "관리자만 공지를 작성할 수 있습니다." }` | alert 표시 |
| 404 | 공지 없음 | `{ error: "Announcement not found" }` | alert 표시 |
| 500 | 서버 오류 | `{ error: "Internal server error" }` | alert 표시 |

---

## 9. State Management (Page 내부)

### 9.1 AnnouncementsPage 상태

```typescript
// 목록 데이터
const [announcements, setAnnouncements] = useState<Announcement[]>([]);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(true);

// 필터/페이지네이션
const [activeCategory, setActiveCategory] = useState<string>('all');
const [currentPage, setCurrentPage] = useState(1);

// 모달
const [showModal, setShowModal] = useState(false);
const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
const [saving, setSaving] = useState(false);

// 폼
const [form, setForm] = useState({
  title: '',
  content: '',
  category: 'general',
  isPinned: false,
});

// 사용자 역할
const [userRole, setUserRole] = useState<string>('teacher');
```

### 9.2 Dashboard 추가 상태

```typescript
// 기존 DashboardData 인터페이스에 추가
interface DashboardData {
  // ... 기존 필드
  announcements: {
    id: string;
    title: string;
    category: string;
    isPinned: number;
    authorName: string;
    createdAt: string;
  }[];
}
```

---

## 10. Coding Convention Reference

### 10.1 기존 패턴 준수

| Item | Convention |
|------|-----------|
| DB 함수 | `createDb()` → 쿼리 → `db.close()` (try/finally) |
| API 인증 | `getSession()` → null → 401 |
| 관리자 체크 | `session.role !== 'admin'` → 403 |
| ID 생성 | `announcement-${Date.now()}-${Math.random().toString(36).substring(7)}` |
| UI 컴포넌트 | Card, Badge, Button, Input, Avatar from `@/components/ui` |
| 레이아웃 | Header from `@/components/layout` |
| 애니메이션 | Framer Motion (containerVariants, itemVariants) |
| 아이콘 | lucide-react |
| 날짜 포맷 | date-fns + ko locale |

### 10.2 Import Order

```typescript
// 1. React/Next
'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 2. Icons
import { Megaphone, Plus, Edit3, Trash2, Pin, ... } from 'lucide-react';

// 3. Components
import { Header } from '@/components/layout';
import { Card, Badge, Button, Input } from '@/components/ui';

// 4. Utils
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
```

---

## 11. Implementation Guide

### 11.1 File Structure

```
수정 파일:
  prisma/schema.prisma          -- Announcement 모델 + User relation 추가
  src/lib/db.ts                 -- 7개 공지 함수 추가 + Announcement interface
  src/app/api/dashboard/route.ts -- getRecentAnnouncements 호출 추가
  src/app/(dashboard)/dashboard/page.tsx -- 공지 위젯 추가
  src/components/layout/Sidebar.tsx      -- 공지 메뉴 항목 추가

신규 파일:
  src/app/api/announcements/route.ts     -- GET (목록), POST (생성)
  src/app/api/announcements/[id]/route.ts -- GET, PUT, DELETE, PATCH
  src/app/(dashboard)/announcements/page.tsx -- 공지 관리 페이지
```

### 11.2 Implementation Order

1. [ ] **DB Layer**: Prisma 스키마 + 마이그레이션 + db.ts 함수 7개
2. [ ] **API Layer**: /api/announcements 라우트 (route.ts + [id]/route.ts)
3. [ ] **Dashboard API**: /api/dashboard 수정 (공지 데이터 추가)
4. [ ] **UI - 공지 페이지**: announcements/page.tsx (목록, 필터, 모달)
5. [ ] **UI - 대시보드 위젯**: dashboard/page.tsx 수정
6. [ ] **UI - 사이드바**: Sidebar.tsx 수정 (메뉴 추가)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Claude |
