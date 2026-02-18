# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

"다니엘"은 동은교회 초등부 출석 및 달란트 관리 시스템입니다. 한국어 기반 모바일 우선 PWA로, Next.js 16 App Router를 사용합니다.

## 주요 명령어

```bash
npm run dev          # 개발 서버 실행 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint (Next.js core-web-vitals + TypeScript 규칙)
npx prisma migrate dev   # 데이터베이스 마이그레이션 실행
npm run db:seed      # 기본 샘플 데이터 시드 (npx tsx prisma/seed.ts)
npm run db:seed-ccm  # CCM 동영상 데이터 시드 (npx tsx prisma/seed-ccm.ts)
npm run db:reset     # DB 초기화 후 마이그레이션 재실행
npm run db:studio    # Prisma Studio GUI 열기
```

AWS App Runner 배포: `.\deploy-aws.ps1` (PowerShell)

## 테스트 계정

| 역할 | 로그인ID | 비밀번호 |
|------|----------|----------|
| 관리자 | admin | admin123 |
| 교사 | teacher | teacher123 |

## 아키텍처

### 기술 스택
- **Next.js 16** (App Router) + **React 19**, **TypeScript 5**
- **PostgreSQL** (AWS RDS) — `@prisma/adapter-pg`(pg Pool) + Prisma Client 7 ORM
- **Tailwind CSS 4** + `globals.css`의 글래스모피즘/그라데이션 커스텀 CSS
- **Framer Motion** — 애니메이션
- **jose** — JWT (7일 만료), **bcryptjs** — 비밀번호 해싱
- **date-fns** — 날짜 포맷팅
- **AWS S3** — 갤러리 사진 업로드 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)

### 데이터베이스: Prisma Client ORM
`src/lib/db.ts`가 유일한 데이터 접근 계층입니다. Prisma Client 싱글톤을 사용하며(`PrismaPg` 드라이버 어댑터), `DATABASE_URL`이 `.rds.amazonaws.com`을 포함하면 SSL을 자동으로 활성화합니다. 모든 함수가 async이며 Date 객체를 ISO 문자열로 직렬화하여 반환합니다.

### 인증
- JWT 토큰을 HTTP-only 쿠키(`token`)에 저장 (7일 만료), `src/lib/auth.ts`에서 관리
- 미들웨어 없음 — `(dashboard)/layout.tsx` 서버 컴포넌트에서 인증 확인 후 미인증 사용자를 `/login`으로 리다이렉트
- `JWT_SECRET` 환경 변수가 없으면 하드코딩된 기본값 사용

### 라우팅 구조
- `/` — 랜딩 페이지 (공개): 히어로 캐러셀, 공지사항, 통계
- `/login` — 로그인 페이지 (공개)
- `/(dashboard)/*` — 모든 보호된 페이지, `Sidebar`가 포함된 공통 레이아웃 사용
  - `/dashboard` — 통계 개요, 최근 출석, 달란트 랭킹, 생일
  - `/attendance` — 날짜/반별 출석 체크 (출석/지각/결석 버튼)
  - `/talent` — 달란트 지급/차감 (사전 정의된 사유 선택)
  - `/shop` — 달란트 시장 (달란트로 상품 구매)
  - `/students` — 학생 CRUD 및 반 배정
  - `/stats` — 출석 및 달란트 통계
  - `/announcements` — 공지사항 (일반/이벤트/긴급, 고정 기능)
  - `/ccm` — CCM 동영상 목록 및 유튜브 재생, `/ccm/manage` 관리
  - `/gallery` — 사진첩 (S3 업로드, 댓글), `/gallery/upload`
  - `/quiz/manage` — 성경 퀴즈 관리 (관리자)
  - `/hero-manage` — 랜딩 페이지 히어로 캐러셀 관리
  - `/games` — 미니게임 허브 (5종)
    - `/games/brick-breaker`, `/games/noahs-ark`, `/games/davids-sling`
    - `/games/five-loaves`, `/games/lost-sheep`
  - `/parent/attendance`, `/parent/talent` — 학부모 전용 뷰
  - `/settings` — 관리자 전용 설정

### 게임 구조 패턴
각 게임은 동일한 폴더 구조를 따릅니다:
- `_lib/` — `types.ts`, `stages.ts`, `quizData.ts`, `gameEngine.ts`, `renderer.ts`
- `_components/` — `GameWrapper.tsx`(서버, 인증), `Game.tsx`(클라이언트, Canvas), `QuizModal.tsx`, `StageClearModal.tsx`, `GameOverModal.tsx`
- `page.tsx` (서버 컴포넌트) → Wrapper → Game 순으로 조합
- 게임 클리어 시 `/api/games/{game-name}/reward` POST로 달란트 지급

### API 라우트 (`src/app/api/`)
모든 API 라우트는 JSON을 반환합니다. 주요 비즈니스 로직:
- **출석** (`/api/attendance`): 출석/지각 시 달란트 5점 자동 지급, 결석 변경 시 차감
- **상품 구매** (`/api/shop/purchase`): Prisma 트랜잭션으로 잔액 검증, 포인트 차감, 재고 감소를 원자적으로 처리
- **퀴즈** (`/api/quiz`): 성경 퀴즈 CRUD. `/api/games/*/reward`에서 스테이지 클리어 달란트 지급
- **갤러리** (`/api/gallery`): S3 Presigned URL 생성 후 클라이언트에서 직접 업로드; `src/lib/image-utils.ts`에서 S3 헬퍼 관리
- **사용자** (`/api/users`): 관리자만 생성 가능

### 달란트 지급 유형 (`Talent.type`)
`attendance` | `bonus` | `purchase` | `quiz` — 게임을 통해 달란트를 받으면 `quiz` 타입으로 기록

### 성경 퀴즈 달란트 규칙
10문제 기준: 1점 이상=1달란트, 4점 이상=4달란트, 7점 이상=7달란트, 10점=10달란트.
학생당 하루 최대 3회 퀴즈 달란트 지급 (초과 시 0달란트).

### 컴포넌트
- `src/components/ui/` — Button, Card, Input, Avatar, Badge (Framer Motion 포함)
- `src/components/layout/` — Sidebar (네비게이션, 모바일 햄버거 메뉴) 및 Header
- `src/components/landing/` — HeroCarousel, AnnouncementSection, StatsHighlight, ShareButtons
- `src/components/gallery/` — PhotoViewer, CommentSection
- 각 디렉토리에 `index.ts` 배럴 export 파일 있음

### 경로 별칭
`@/*`는 `./src/*`에 매핑됩니다 (`tsconfig.json`에서 설정)

### 배포
Docker 멀티 스테이지 빌드 (Node 20 Alpine) → ECR 푸시 → AWS App Runner 배포. standalone Next.js 출력. 프로덕션 포트는 8080. 배포 스크립트: `deploy-aws.ps1`.

## 환경 변수

```
DATABASE_URL         # PostgreSQL 연결 문자열
JWT_SECRET           # JWT 서명 키
AWS_REGION           # S3/App Runner 리전
AWS_ACCESS_KEY_ID    # S3 액세스 키
AWS_SECRET_ACCESS_KEY # S3 시크릿 키
S3_BUCKET_NAME       # 갤러리 사진 버킷명
TELEGRAM_BOT_TOKEN   # 텔레그램 봇 토큰 (선택)
```

## 데이터 모델 (prisma/schema.prisma)

- **User** — 관리자(admin), 교사(teacher), 학부모(parent) 역할
- **Class** — 교사에 소속, 여러 학생 보유
- **Student** — 반에 소속, `talentBalance`(달란트 잔액) 필드 보유
- **Attendance** — 학생별 날짜별 기록 (`studentId+date` 유니크 제약), 상태: `present`/`absent`/`late`
- **Talent** — 달란트 거래 기록 (유형: `attendance`/`bonus`/`purchase`/`quiz`), 양수 또는 음수 금액
- **Product** — 달란트 시장 상품 (재고 및 가격 포함)
- **Announcement** — 공지사항 (`general`/`event`/`urgent`), 고정 기능
- **QuizQuestion** — 성경 퀴즈 문제 (카테고리, 난이도, 정답 번호 1-4)
- **QuizResult** — 퀴즈 결과 (JSON 답변 저장, 학생 자동 매칭)
- **HeroMedia** — 랜딩 페이지 캐러셀 (이미지 또는 유튜브)
- **PhotoPost** / **Photo** / **PhotoComment** — 사진첩 (S3 URL 저장)
- **CcmVideo** — CCM 유튜브 동영상 (`praise`/`worship`/`action`/`special`)
- **TelegramLink** — 텔레그램 봇 연결 (chatId 유니크)
- **ParentStudent** — 학부모-자녀 다대다 연결
- **Setting** — 키-값 형태의 앱 설정
