# telegram-remote-control Plan

> **Feature**: Telegram 봇을 통한 다니엘 교회앱 원격제어 시스템
>
> **Author**: Claude
> **Created**: 2026-02-18
> **Status**: Draft

---

## 1. 배경 및 목적

### 1.1 현재 상황 (AS-IS)

현재 다니엘 교회앱의 모든 관리 기능은 웹 대시보드를 통해서만 접근 가능합니다:

- 출석 체크: `/attendance` 페이지에서 직접 조작
- 달란트 지급/차감: `/talent` 페이지에서 직접 조작
- 학생 관리: `/students` 페이지에서 직접 조작
- 공지사항: `/announcements` 페이지에서 직접 조작
- 통계 확인: `/dashboard`, `/stats` 페이지에서 확인

**문제점**:
- 예배 중이나 이동 중에 빠른 조작이 어려움
- 매번 브라우저를 열고 로그인해야 하는 번거로움
- 실시간 알림(출석 현황, 달란트 변동 등)을 받을 수 없음
- 교사들이 간단한 정보(학생 달란트 잔액 등)를 확인하려면 전체 앱에 접속해야 함

### 1.2 목표 (TO-BE)

Telegram 봇을 통해 관리자/교사가 앱의 주요 기능을 원격으로 제어하고 실시간 알림을 받을 수 있도록 합니다:

1. **명령어 기반 조회**: `/출석현황`, `/달란트조회 홍길동` 등으로 빠른 정보 확인
2. **원격 조작**: 달란트 지급/차감, 공지사항 등록 등을 Telegram에서 직접 수행
3. **실시간 알림**: 출석 완료 알림, 달란트 변동 알림 등을 자동 발송
4. **일일 리포트**: 매일 출석 요약, 달란트 현황 등을 자동으로 발송

---

## 2. 요구사항 정의

### 2.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상세 |
|----|---------|---------|------|
| FR-01 | Telegram 봇 Webhook 연동 | 필수 | Telegram Bot API webhook을 Next.js API 라우트로 수신 |
| FR-02 | 관리자 인증/연결 | 필수 | Telegram 사용자를 다니엘 앱 관리자 계정에 연결 |
| FR-03 | 출석 현황 조회 | 필수 | `/출석` 또는 `/attendance` 명령으로 오늘 출석 현황 조회 |
| FR-04 | 달란트 조회 | 필수 | `/달란트 {학생이름}` 명령으로 학생 달란트 잔액 조회 |
| FR-05 | 달란트 지급 | 필수 | `/지급 {학생이름} {금액} {사유}` 명령으로 달란트 지급 |
| FR-06 | 오늘 통계 요약 | 필수 | `/요약` 명령으로 오늘의 출석/달란트 통계 요약 조회 |
| FR-07 | 공지사항 등록 | 선택 | `/공지 {제목} {내용}` 명령으로 공지사항 등록 |
| FR-08 | 실시간 알림 발송 | 선택 | 출석 체크 완료, 상품 구매 등 주요 이벤트 시 Telegram 알림 |
| FR-09 | 학생 목록 조회 | 필수 | `/학생` 또는 `/학생 {반이름}` 명령으로 학생 목록 조회 |
| FR-10 | 도움말 | 필수 | `/도움말` 또는 `/help` 명령으로 사용 가능한 명령어 목록 표시 |

### 2.2 비기능 요구사항

| ID | 요구사항 | 상세 |
|----|---------|------|
| NFR-01 | 보안 | 인증된 관리자/교사만 명령 실행 가능, Telegram chatId 기반 인증 |
| NFR-02 | Webhook 보안 | Telegram 서명 검증으로 위조 요청 차단 |
| NFR-03 | 응답 속도 | 명령 처리 후 3초 이내 응답 |
| NFR-04 | 한국어 지원 | 모든 명령어와 응답을 한국어로 제공 |
| NFR-05 | 에러 핸들링 | 잘못된 명령이나 존재하지 않는 학생에 대한 친절한 에러 메시지 |

---

## 3. 변경 범위

### 3.1 데이터베이스 스키마 변경

**TelegramLink 모델 추가** (Telegram 사용자 ↔ 앱 사용자 연결):

```prisma
model TelegramLink {
  id         String   @id @default(cuid())
  chatId     String   @unique  // Telegram chat ID
  userId     String   // 연결된 앱 사용자 ID
  username   String?  // Telegram username
  isActive   Boolean  @default(true)
  linkedAt   DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**User 모델에 관계 추가**:
```prisma
model User {
  // ... 기존 필드
  telegramLinks TelegramLink[]
}
```

### 3.2 새로운 API 라우트

| API | 메서드 | 설명 |
|-----|--------|------|
| `/api/telegram/webhook` | POST | Telegram 봇 webhook 수신 엔드포인트 |
| `/api/telegram/link` | POST | Telegram 계정 연결 (인증 코드 기반) |
| `/api/telegram/unlink` | POST | Telegram 계정 연결 해제 |

### 3.3 새로운 라이브러리 모듈

| 파일 | 역할 |
|------|------|
| `src/lib/telegram/bot.ts` | Telegram Bot API 통신 (메시지 전송, webhook 설정) |
| `src/lib/telegram/commands.ts` | 명령어 파싱 및 라우팅 |
| `src/lib/telegram/handlers.ts` | 각 명령어별 핸들러 로직 |
| `src/lib/telegram/auth.ts` | Telegram 사용자 인증/연결 관리 |
| `src/lib/telegram/notify.ts` | 알림 발송 유틸리티 |

### 3.4 기존 코드 수정

| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | TelegramLink 모델 추가, User 관계 추가 |
| `src/lib/db.ts` | Telegram 관련 DB 함수 추가 |
| `src/app/api/attendance/route.ts` | 출석 저장 후 Telegram 알림 트리거 (선택) |
| `src/app/api/shop/purchase/route.ts` | 구매 완료 후 Telegram 알림 트리거 (선택) |

### 3.5 환경 변수 추가

```env
TELEGRAM_BOT_TOKEN=       # Telegram Bot API 토큰 (@BotFather에서 발급)
TELEGRAM_WEBHOOK_SECRET=  # Webhook 검증용 시크릿
```

### 3.6 의존성 추가

```bash
npm install node-telegram-bot-api
# 또는 직접 Telegram Bot API를 fetch로 호출 (의존성 최소화)
```

> **권장**: 외부 라이브러리 없이 `fetch`로 Telegram Bot API를 직접 호출하여 의존성을 최소화합니다.

---

## 4. 사용자 흐름 (User Flow)

### 4.1 초기 연결 흐름

```
[관리자] Telegram에서 봇 검색 → /start 명령
    ↓
[봇] "다니엘 교회앱 봇입니다. 연결코드를 입력해주세요." 응답
    ↓
[관리자] 웹 앱 설정 페이지에서 연결코드 생성 → Telegram에 입력
    ↓
[봇] chatId ↔ userId 연결 저장 → "연결 완료! /도움말로 명령어를 확인하세요."
    ↓
[관리자] 이제 명령어 사용 가능
```

### 4.2 명령어 사용 흐름

```
[관리자] /출석 입력
    ↓
[Webhook] POST /api/telegram/webhook 수신
    ↓
[명령어 파서] "출석" 명령어 매칭
    ↓
[인증 확인] chatId로 연결된 사용자 조회 → 권한 확인
    ↓
[핸들러] 오늘 출석 데이터 조회
    ↓
[응답] Telegram 메시지로 결과 전송

📊 오늘의 출석 현황 (2026-02-18)
━━━━━━━━━━━━━━━━━━
✅ 출석: 25명
⏰ 지각: 3명
❌ 결석: 5명
━━━━━━━━━━━━━━━━━━
출석률: 75.8%
```

### 4.3 달란트 지급 흐름

```
[교사] /지급 홍길동 10 성경읽기 입력
    ↓
[핸들러] 학생 "홍길동" 검색 → 달란트 10점 지급
    ↓
[응답]
✅ 달란트 지급 완료
학생: 홍길동 (다윗반)
금액: +10 달란트
사유: 성경읽기
현재 잔액: 85 달란트
```

---

## 5. 명령어 목록

| 명령어 | 설명 | 권한 | 예시 |
|--------|------|------|------|
| `/start` | 봇 시작 및 연결 안내 | 모든 사용자 | `/start` |
| `/연결 {코드}` | 앱 계정 연결 | 모든 사용자 | `/연결 ABC123` |
| `/도움말` | 명령어 목록 표시 | 연결된 사용자 | `/도움말` |
| `/출석` | 오늘 출석 현황 | teacher, admin | `/출석` |
| `/달란트 {이름}` | 학생 달란트 잔액 조회 | teacher, admin | `/달란트 홍길동` |
| `/지급 {이름} {금액} {사유}` | 달란트 지급 | teacher, admin | `/지급 홍길동 10 성경읽기` |
| `/차감 {이름} {금액} {사유}` | 달란트 차감 | admin | `/차감 홍길동 5 규칙위반` |
| `/학생` | 전체 학생 목록 | teacher, admin | `/학생` |
| `/학생 {반이름}` | 반별 학생 목록 | teacher, admin | `/학생 다윗반` |
| `/요약` | 오늘의 출석/달란트 통계 | teacher, admin | `/요약` |
| `/랭킹` | 달란트 상위 랭킹 | teacher, admin | `/랭킹` |
| `/공지 {제목}\n{내용}` | 공지사항 등록 | admin | `/공지 이번주 안내\n수련회 준비...` |
| `/해제` | Telegram 연결 해제 | 연결된 사용자 | `/해제` |

---

## 6. 구현 체크리스트

| # | 작업 | 파일 |
|---|------|------|
| 1 | Prisma 스키마에 TelegramLink 모델 추가 | `prisma/schema.prisma` |
| 2 | DB 마이그레이션 생성 | `prisma/migrations/` |
| 3 | Telegram Bot API 통신 모듈 구현 | `src/lib/telegram/bot.ts` |
| 4 | 명령어 파서 구현 | `src/lib/telegram/commands.ts` |
| 5 | 명령어 핸들러 구현 (출석, 달란트, 학생 등) | `src/lib/telegram/handlers.ts` |
| 6 | Telegram 인증/연결 모듈 구현 | `src/lib/telegram/auth.ts` |
| 7 | Telegram 알림 발송 모듈 구현 | `src/lib/telegram/notify.ts` |
| 8 | DB 함수 추가 (linkTelegram, getTelegramUser 등) | `src/lib/db.ts` |
| 9 | Webhook API 라우트 구현 | `src/app/api/telegram/webhook/route.ts` |
| 10 | 계정 연결 API 라우트 구현 | `src/app/api/telegram/link/route.ts` |
| 11 | 설정 페이지에 Telegram 연결 UI 추가 | `src/app/(dashboard)/settings/page.tsx` |
| 12 | 환경 변수 설정 (TELEGRAM_BOT_TOKEN 등) | `.env` |
| 13 | 빌드 확인 | - |

---

## 7. 기술 고려사항

### 7.1 Telegram Bot API 통신 방식

**Webhook 방식** 채택 (Long Polling 대신):
- Next.js API Route(`/api/telegram/webhook`)로 직접 수신
- 서버리스 환경(App Runner)에 적합
- Telegram → HTTPS POST → Next.js 처리 → 응답 전송

### 7.2 보안

- Webhook 요청의 `X-Telegram-Bot-Api-Secret-Token` 헤더로 진위 검증
- chatId는 연결된 사용자만 명령어 실행 가능
- 달란트 차감은 admin 권한만 허용
- 연결 코드는 1회용, 유효기간 5분

### 7.3 외부 의존성 최소화

- `node-telegram-bot-api` 라이브러리 대신 `fetch`로 직접 API 호출
- Telegram Bot API 엔드포인트: `https://api.telegram.org/bot{TOKEN}/{method}`
- 필요한 메서드: `sendMessage`, `setWebhook`, `getMe`

### 7.4 Webhook 설정

배포 후 한 번만 호출하면 됨:
```
POST https://api.telegram.org/bot{TOKEN}/setWebhook
Body: { "url": "https://{domain}/api/telegram/webhook", "secret_token": "{SECRET}" }
```

### 7.5 메시지 포맷

Telegram은 HTML과 Markdown 포맷을 지원합니다. **HTML 모드** 사용 권장:
```html
<b>📊 오늘의 출석 현황</b>
<code>━━━━━━━━━━━━━━</code>
✅ 출석: 25명
⏰ 지각: 3명
❌ 결석: 5명
```

---

## 8. 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| Bot Token 노출 | 봇 탈취, 악의적 메시지 전송 | 환경변수로만 관리, 절대 코드에 하드코딩하지 않음 |
| Webhook 위조 | 비인가 명령 실행 | secret_token 헤더 검증 필수 |
| 동명이인 학생 | 잘못된 학생에게 달란트 지급 | 검색 결과가 2명 이상이면 반 이름과 함께 목록 표시하여 선택 요청 |
| 대량 메시지 공격 | API 과부하 | Rate limiting (사용자당 초당 1회), 비인가 사용자 즉시 차단 |
| HTTPS 필요 | Telegram Webhook은 HTTPS만 지원 | App Runner 배포 시 자동 HTTPS 제공 |

---

## 9. 향후 확장 가능성

| 기능 | 설명 |
|------|------|
| 인라인 키보드 | 버튼 기반 UI로 명령어 입력 없이 조작 |
| 일일 자동 리포트 | 매일 저녁 출석/달란트 요약을 자동 발송 |
| 학부모 알림 | 자녀 출석/달란트 변동 시 학부모 Telegram에 알림 |
| 사진첩 알림 | 새 사진이 업로드되면 Telegram으로 미리보기 전송 |
| 그룹 채팅 지원 | 교사 그룹에서 봇을 사용하여 공유 조회 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-18 | Initial plan | Claude |
