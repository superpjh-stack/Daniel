# telegram-remote-control Design

> **Feature**: Telegram 봇을 통한 다니엘 교회앱 원격제어 시스템
>
> **Author**: Claude
> **Created**: 2026-02-18
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/telegram-remote-control.plan.md`

---

## 1. 아키텍처 개요

### 1.1 시스템 구조

```
┌─────────────┐     HTTPS POST      ┌──────────────────────────────┐
│  Telegram    │ ──────────────────► │  Next.js API Route           │
│  Bot API     │                     │  /api/telegram/webhook       │
│  Server      │ ◄────────────────── │                              │
└─────────────┘   sendMessage API    └──────────┬───────────────────┘
                                                 │
                                     ┌───────────┴───────────────┐
                                     │    Telegram 모듈 계층      │
                                     │                           │
                                     │  ┌─────────────────────┐  │
                                     │  │  commands.ts         │  │
                                     │  │  (명령어 파싱/라우팅)  │  │
                                     │  └─────────┬───────────┘  │
                                     │            │              │
                                     │  ┌─────────┴───────────┐  │
                                     │  │  handlers.ts         │  │
                                     │  │  (비즈니스 로직)      │  │
                                     │  └─────────┬───────────┘  │
                                     │            │              │
                                     │  ┌─────────┴───────────┐  │
                                     │  │  bot.ts              │  │
                                     │  │  (Telegram API 통신)  │  │
                                     │  └─────────────────────┘  │
                                     └───────────┬───────────────┘
                                                 │
                                     ┌───────────┴───────────────┐
                                     │  src/lib/db.ts             │
                                     │  (기존 데이터 접근 계층)    │
                                     └───────────┬───────────────┘
                                                 │
                                     ┌───────────┴───────────────┐
                                     │  PostgreSQL (Prisma)       │
                                     └───────────────────────────┘
```

### 1.2 모듈 의존관계

```
webhook/route.ts
  └─► commands.ts (parseCommand, routeCommand)
        └─► auth.ts (verifyTelegramUser)
        └─► handlers.ts (handleAttendance, handleTalent, ...)
              └─► bot.ts (sendMessage, sendHTMLMessage)
              └─► db.ts (기존 함수 재사용)
```

---

## 2. 데이터베이스 설계

### 2.1 TelegramLink 모델

```prisma
// prisma/schema.prisma 에 추가

model TelegramLink {
  id         String   @id @default(cuid())
  chatId     String   @unique      // Telegram chat ID (문자열 - 큰 숫자 가능)
  userId     String                // 연결된 앱 User.id
  username   String?               // Telegram @username (선택)
  isActive   Boolean  @default(true)
  linkedAt   DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**User 모델 관계 추가**:
```prisma
model User {
  // ... 기존 필드 유지
  telegramLinks TelegramLink[]    // 추가
}
```

**Setting 테이블에 저장할 연결 코드** (별도 모델 불필요):
- Key: `telegram_link_code_{code}`, Value: `{userId}|{expiresAt}`
- 코드 발급 시 Setting에 저장, 사용 시 삭제

### 2.2 DB 함수 추가 (src/lib/db.ts)

```typescript
// ─── Telegram 함수 ───

export async function getTelegramLinkByChatId(
  chatId: string
): Promise<{ id: string; userId: string; user: { id: string; name: string; role: string } } | null>

export async function createTelegramLink(
  chatId: string, userId: string, username?: string
): Promise<void>

export async function deleteTelegramLinkByChatId(
  chatId: string
): Promise<void>

export async function getActiveTelegramLinks(): Promise<
  { chatId: string; userId: string; userName: string; userRole: string }[]
>

export async function findStudentsByName(
  name: string
): Promise<{ id: string; name: string; grade: number; className: string | null; talentBalance: number }[]>
```

---

## 3. 모듈 상세 설계

### 3.1 `src/lib/telegram/bot.ts` - Telegram Bot API 통신

```typescript
// 환경변수
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── 타입 정의 ───

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

interface SendMessageOptions {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

// ─── 함수 ───

export async function sendMessage(options: SendMessageOptions): Promise<boolean>
// POST /sendMessage { chat_id, text, parse_mode }

export async function sendHTMLMessage(chatId: string | number, html: string): Promise<boolean>
// sendMessage의 편의 래퍼 (parseMode: 'HTML')

export function isBotConfigured(): boolean
// BOT_TOKEN이 설정되어 있는지 확인
```

### 3.2 `src/lib/telegram/commands.ts` - 명령어 파싱

```typescript
// ─── 타입 ───

interface ParsedCommand {
  command: string;        // 예: "출석", "달란트", "지급"
  args: string[];         // 나머지 인수들
  rawText: string;        // 원본 텍스트
}

interface CommandContext {
  chatId: string;
  username?: string;
  userId?: string;        // 연결된 앱 사용자 ID (인증 후)
  userRole?: string;      // 연결된 사용자 역할
  userName?: string;      // 연결된 사용자 이름
}

// ─── 명령어 맵 ───

const COMMAND_ALIASES: Record<string, string> = {
  // 한국어 명령어
  'start': 'start',
  '시작': 'start',
  '연결': 'link',
  '해제': 'unlink',
  '도움말': 'help',
  'help': 'help',
  '출석': 'attendance',
  '달란트': 'talent',
  '지급': 'give',
  '차감': 'deduct',
  '학생': 'students',
  '요약': 'summary',
  '랭킹': 'ranking',
  '공지': 'announce',
};

// ─── 함수 ───

export function parseCommand(text: string): ParsedCommand | null
// "/출석" → { command: "attendance", args: [], rawText: "/출석" }
// "/지급 홍길동 10 성경읽기" → { command: "give", args: ["홍길동", "10", "성경읽기"], rawText: "..." }
// "/달란트 홍길동" → { command: "talent", args: ["홍길동"], rawText: "..." }

export async function routeCommand(
  parsed: ParsedCommand,
  context: CommandContext
): Promise<string>
// 명령어에 따라 적절한 핸들러를 호출하고 응답 HTML을 반환
```

### 3.3 `src/lib/telegram/handlers.ts` - 명령어 핸들러

각 핸들러는 HTML 문자열을 반환합니다.

```typescript
import { CommandContext } from './commands';

// ─── 공개 명령어 (인증 불필요) ───

export async function handleStart(context: CommandContext): Promise<string>
// 봇 소개 + 연결 안내 메시지 반환

export async function handleLink(code: string, context: CommandContext): Promise<string>
// 연결 코드 검증 → TelegramLink 생성 → 성공/실패 메시지

export async function handleHelp(context: CommandContext): Promise<string>
// 사용 가능한 명령어 목록 반환

// ─── 인증 필요 명령어 ───

export async function handleAttendance(context: CommandContext): Promise<string>
// 오늘 출석 현황 조회
// 응답 예시:
// 📊 오늘의 출석 현황 (2026-02-18)
// ━━━━━━━━━━━━━━━━━━
// ✅ 출석: 25명
// ⏰ 지각: 3명
// ❌ 결석: 5명
// ━━━━━━━━━━━━━━━━━━
// 출석률: 84.8%

export async function handleTalentQuery(
  studentName: string, context: CommandContext
): Promise<string>
// 학생 달란트 잔액 조회
// 동명이인 시 목록 표시

export async function handleGiveTalent(
  studentName: string, amount: number, reason: string, context: CommandContext
): Promise<string>
// 달란트 지급 (teacher, admin)
// DB: updateStudentTalentBalance + createTalentRecord 호출

export async function handleDeductTalent(
  studentName: string, amount: number, reason: string, context: CommandContext
): Promise<string>
// 달란트 차감 (admin 전용)

export async function handleStudents(
  className?: string, context?: CommandContext
): Promise<string>
// 학생 목록 조회 (전체 또는 반별)

export async function handleSummary(context: CommandContext): Promise<string>
// 오늘의 출석/달란트 통계 요약

export async function handleRanking(context: CommandContext): Promise<string>
// 달란트 상위 랭킹 (상위 10명)

export async function handleAnnounce(
  title: string, content: string, context: CommandContext
): Promise<string>
// 공지사항 등록 (admin 전용)

export async function handleUnlink(context: CommandContext): Promise<string>
// Telegram 연결 해제
```

### 3.4 `src/lib/telegram/auth.ts` - 인증 모듈

```typescript
interface TelegramUser {
  userId: string;
  userName: string;
  userRole: string;
}

export async function verifyTelegramUser(
  chatId: string
): Promise<TelegramUser | null>
// chatId로 TelegramLink 조회 → 연결된 User 정보 반환
// isActive: true인 링크만 조회

export async function generateLinkCode(userId: string): Promise<string>
// 6자리 랜덤 코드 생성 (대문자+숫자)
// Setting 테이블에 저장: key = "telegram_link_{code}", value = "{userId}|{expiresAt}"
// 유효기간: 5분

export async function validateAndConsumeLinkCode(
  code: string
): Promise<{ userId: string } | null>
// Setting 테이블에서 코드 조회 → 만료 확인 → 사용 후 삭제
// 만료되었거나 존재하지 않으면 null

export function requireRole(
  userRole: string, allowedRoles: string[]
): boolean
// userRole이 allowedRoles에 포함되는지 확인
```

---

## 4. API 라우트 설계

### 4.1 `POST /api/telegram/webhook` - Webhook 수신

```typescript
// src/app/api/telegram/webhook/route.ts

export async function POST(request: NextRequest): Promise<NextResponse>
```

**처리 흐름**:
1. `X-Telegram-Bot-Api-Secret-Token` 헤더 검증
2. Request body에서 `TelegramUpdate` 파싱
3. `message.text`가 있으면 명령어 파싱
4. `/start`, `/연결` → 인증 불필요, 직접 처리
5. 나머지 명령어 → `verifyTelegramUser(chatId)` 인증
6. `routeCommand(parsed, context)` 호출
7. 결과를 `sendHTMLMessage(chatId, response)` 로 전송
8. Telegram에 `200 OK` 즉시 반환 (응답 대기 방지)

**요청 형식** (Telegram에서 전송):
```json
{
  "update_id": 123456,
  "message": {
    "message_id": 789,
    "from": { "id": 123, "first_name": "관리자", "username": "admin" },
    "chat": { "id": 123, "type": "private" },
    "date": 1708300000,
    "text": "/출석"
  }
}
```

**보안**:
- `TELEGRAM_WEBHOOK_SECRET` 환경변수와 헤더 비교
- 불일치 시 `403 Forbidden` 반환
- `TELEGRAM_BOT_TOKEN` 미설정 시 `503 Service Unavailable`

### 4.2 `POST /api/telegram/link` - 연결 코드 생성 (웹 앱용)

```typescript
// src/app/api/telegram/link/route.ts

export async function POST(request: NextRequest): Promise<NextResponse>
```

**요청**:
```json
{ "action": "generate" }
```

**응답**:
```json
{ "code": "A3B7K9", "expiresIn": 300 }
```

**인증**: 웹 앱 세션 기반 (`getSession()`) - admin/teacher만

### 4.3 `POST /api/telegram/setup` - Webhook 설정 (관리자용)

```typescript
// src/app/api/telegram/setup/route.ts

export async function POST(request: NextRequest): Promise<NextResponse>
```

**기능**: Telegram Bot API에 webhook URL 등록 (`setWebhook` 호출)
**인증**: admin 전용
**요청**:
```json
{ "webhookUrl": "https://your-domain.com/api/telegram/webhook" }
```

---

## 5. 명령어 응답 포맷 설계

모든 응답은 Telegram HTML 모드 (`parse_mode: "HTML"`)를 사용합니다.

### 5.1 `/start`

```html
<b>🏠 다니엘 교회앱 봇</b>

동은교회 초등부 출석·달란트 관리 봇입니다.

<b>📌 시작하기</b>
1. 웹 앱 설정에서 <b>연결코드</b>를 발급받으세요
2. 아래 형식으로 입력하세요:
<code>/연결 ABC123</code>

연결 완료 후 /도움말 로 명령어를 확인하세요.
```

### 5.2 `/도움말`

```html
<b>📋 사용 가능한 명령어</b>

<b>📊 조회</b>
/출석 — 오늘 출석 현황
/달란트 {이름} — 달란트 잔액
/학생 — 전체 학생 목록
/학생 {반이름} — 반별 학생 목록
/요약 — 오늘 통계 요약
/랭킹 — 달란트 TOP 10

<b>💰 관리</b>
/지급 {이름} {금액} {사유}
/차감 {이름} {금액} {사유}

<b>📢 공지 (관리자)</b>
/공지 {제목}
{내용}

<b>🔗 계정</b>
/해제 — 연결 해제
```

### 5.3 `/출석`

```html
<b>📊 오늘의 출석 현황</b>
<i>2026-02-18 (일)</i>

✅ 출석: 25명
⏰ 지각: 3명
❌ 결석: 5명
⬜ 미체크: 2명

<b>출석률: 84.8%</b> (28/33명)
```

### 5.4 `/달란트 홍길동`

```html
<b>💰 달란트 조회</b>

👤 <b>홍길동</b> (3학년, 다윗반)
잔액: <b>85 달란트</b>

<b>최근 내역</b>
+5 주일 출석 (02/18)
+10 성경읽기 (02/17)
-20 연필세트 구매 (02/15)
```

### 5.5 `/지급 홍길동 10 성경읽기` (성공)

```html
✅ <b>달란트 지급 완료</b>

👤 홍길동 (다윗반)
💰 +10 달란트
📝 사유: 성경읽기
잔액: 95 → <b>105 달란트</b>
```

### 5.6 동명이인 발견 시

```html
⚠️ <b>동명이인이 있습니다</b>

"홍길동" 검색 결과:
1. 홍길동 (3학년, 다윗반)
2. 홍길동 (5학년, 모세반)

반 이름을 포함해서 입력해주세요:
<code>/달란트 홍길동 다윗반</code>
```

### 5.7 에러 응답

```html
❌ <b>학생을 찾을 수 없습니다</b>

"김철수"와 일치하는 학생이 없습니다.
/학생 명령으로 학생 목록을 확인하세요.
```

```html
🔒 <b>권한이 없습니다</b>

이 명령어는 관리자만 사용할 수 있습니다.
```

---

## 6. 보안 설계

### 6.1 Webhook 검증

```typescript
function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  return secret === process.env.TELEGRAM_WEBHOOK_SECRET;
}
```

### 6.2 사용자 인증 흐름

```
Telegram 메시지 수신
  │
  ├─ /start, /연결 → 인증 불필요 (공개 명령)
  │
  └─ 기타 명령
       │
       ├─ chatId로 TelegramLink 조회
       │    ├─ 없음 → "연결되지 않았습니다. /start로 시작하세요." 반환
       │    └─ 있음 → User 역할 확인
       │         ├─ 명령어 요구 역할 충족 → 핸들러 실행
       │         └─ 역할 부족 → "권한이 없습니다." 반환
       │
       └─ 응답 전송
```

### 6.3 권한 매트릭스

| 명령어 | 공개 | teacher | admin |
|--------|:----:|:-------:|:-----:|
| /start | O | O | O |
| /연결 | O | O | O |
| /도움말 | - | O | O |
| /출석 | - | O | O |
| /달란트 | - | O | O |
| /지급 | - | O | O |
| /차감 | - | - | O |
| /학생 | - | O | O |
| /요약 | - | O | O |
| /랭킹 | - | O | O |
| /공지 | - | - | O |
| /해제 | - | O | O |

### 6.4 연결 코드 보안

- 6자리 영대문자+숫자 조합 (36^6 = 약 21억 가지)
- 유효기간: 5분
- 1회 사용 후 즉시 삭제
- Setting 테이블에 저장 (별도 모델 불필요)

---

## 7. 환경변수 설계

```env
# Telegram Bot (필수)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Webhook 보안 (필수)
TELEGRAM_WEBHOOK_SECRET=my-secure-webhook-secret-2026

# 앱 URL (Webhook 설정 시 사용)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 8. 파일 구조

```
src/lib/telegram/
  ├── bot.ts          # Telegram Bot API 통신 (sendMessage, isBotConfigured)
  ├── commands.ts     # 명령어 파싱, 별칭 매핑, 라우팅
  ├── handlers.ts     # 각 명령어별 비즈니스 로직 핸들러
  └── auth.ts         # 인증/연결코드 관리

src/app/api/telegram/
  ├── webhook/
  │   └── route.ts    # POST: Telegram webhook 수신
  ├── link/
  │   └── route.ts    # POST: 연결코드 생성 (웹 앱용)
  └── setup/
      └── route.ts    # POST: Webhook URL 등록 (관리자용)
```

---

## 9. 기존 코드 재사용 맵

기존 `src/lib/db.ts` 함수를 최대한 재사용합니다:

| 명령어 | 사용하는 기존 DB 함수 |
|--------|----------------------|
| `/출석` | `getAttendanceSummaryByDate(today)` |
| `/달란트 {이름}` | `findStudentsByName(name)` (신규) + `getTalentHistory(5, studentId)` |
| `/지급` | `findStudentsByName(name)` (신규) + `updateStudentTalentBalance` + `createTalentRecord` |
| `/차감` | 위와 동일 (음수 amount) |
| `/학생` | `getAllStudents(classId?)` |
| `/학생 {반}` | `getAllClasses()` → classId 찾기 → `getAllStudents(classId)` |
| `/요약` | `getAttendanceSummaryByDate(today)` + `getTotalTalent()` + `getStudentCount()` |
| `/랭킹` | `getTopStudentsByTalent(10)` |
| `/공지` | `createAnnouncement(...)` |

---

## 10. 구현 순서

| # | 작업 | 파일 | 의존성 |
|---|------|------|--------|
| 1 | Prisma 스키마 수정 (TelegramLink + User 관계) | `prisma/schema.prisma` | - |
| 2 | DB 마이그레이션 | `prisma/migrations/` | #1 |
| 3 | DB 함수 추가 (telegram 관련 + findStudentsByName) | `src/lib/db.ts` | #2 |
| 4 | Telegram Bot API 통신 모듈 | `src/lib/telegram/bot.ts` | - |
| 5 | 인증/연결 모듈 | `src/lib/telegram/auth.ts` | #3 |
| 6 | 명령어 파서 | `src/lib/telegram/commands.ts` | - |
| 7 | 명령어 핸들러 (모든 명령어) | `src/lib/telegram/handlers.ts` | #3, #4, #5 |
| 8 | Webhook API 라우트 | `src/app/api/telegram/webhook/route.ts` | #5, #6, #7 |
| 9 | 연결코드 생성 API | `src/app/api/telegram/link/route.ts` | #5 |
| 10 | Webhook 설정 API | `src/app/api/telegram/setup/route.ts` | #4 |
| 11 | 설정 페이지 Telegram 섹션 UI | `src/app/(dashboard)/settings/page.tsx` | #9, #10 |
| 12 | 빌드 확인 | - | #1-#11 |

---

## 11. 에러 핸들링 설계

### 11.1 에러 타입별 응답

| 에러 상황 | Telegram 응답 |
|----------|---------------|
| 봇 토큰 미설정 | Webhook 비활성 (503 반환, 메시지 없음) |
| Webhook 서명 불일치 | 403 반환, 메시지 없음 |
| 미연결 사용자 | "🔗 연결되지 않았습니다. /start로 시작하세요." |
| 권한 부족 | "🔒 권한이 없습니다. 이 명령어는 {role}만 사용할 수 있습니다." |
| 학생 미발견 | "❌ '{이름}'와 일치하는 학생이 없습니다." |
| 동명이인 | "⚠️ 동명이인이 있습니다. 반 이름을 포함해주세요." (목록 표시) |
| 잘못된 명령어 형식 | "❓ 올바른 형식: /지급 {이름} {금액} {사유}" |
| 인식 불가 명령어 | "❓ 알 수 없는 명령어입니다. /도움말로 확인하세요." |
| 금액 파싱 오류 | "❌ 금액은 숫자로 입력해주세요. 예: /지급 홍길동 10 성경읽기" |
| 서버 내부 오류 | "⚠️ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." |

### 11.2 로깅

모든 명령어 처리 결과를 `console.log`로 기록:
```
[Telegram] 명령: /출석, chatId: 123, user: admin, 처리시간: 150ms
[Telegram] 에러: /지급, chatId: 123, 원인: STUDENT_NOT_FOUND
```

---

## 12. 동명이인 처리 설계

### 12.1 이름만으로 검색

```
/달란트 홍길동
  → findStudentsByName("홍길동")
  → 결과 1명: 바로 조회 결과 표시
  → 결과 2명+: 동명이인 목록 표시
  → 결과 0명: "학생을 찾을 수 없습니다" 표시
```

### 12.2 이름 + 반이름으로 검색

```
/달란트 홍길동 다윗반
  → findStudentsByName("홍길동")
  → className이 "다윗반"과 일치하는 학생 필터링
  → 1명 매칭: 결과 표시
  → 0명 매칭: "다윗반에 홍길동 학생이 없습니다"
```

**args 파싱 규칙**:
- `/달란트 홍길동` → name="홍길동", className=undefined
- `/달란트 홍길동 다윗반` → name="홍길동", className="다윗반"
- `/지급 홍길동 10 성경읽기` → name="홍길동", amount=10, reason="성경읽기"
- `/지급 홍길동 다윗반 10 성경읽기` → name="홍길동", className="다윗반", amount=10, reason="성경읽기"

**판별**: 두 번째 인수가 숫자이면 amount, 아니면 className으로 처리

---

## 13. 설정 페이지 UI 설계

기존 설정 페이지(`/settings`)에 Telegram 탭/섹션 추가:

```
┌─────────────────────────────────┐
│ ⚙️ 설정                         │
│                                 │
│ [사용자 관리] [반 관리] [달란트]  │
│ [학부모] [텔레그램]              │  ← 탭 추가
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🤖 텔레그램 봇 연동          │ │
│ │                             │ │
│ │ 상태: ✅ 연결됨 / ❌ 미설정   │ │
│ │                             │ │
│ │ [연결코드 발급]              │ │
│ │                             │ │
│ │ 코드: A3B7K9 (4분 32초 남음) │ │
│ │                             │ │
│ │ 연결된 기기:                 │ │
│ │ • @admin_user (관리자)       │ │
│ │   [연결 해제]               │ │
│ │                             │ │
│ │ Webhook URL:                │ │
│ │ [https://...  ] [설정]      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-18 | Initial design | Claude |
