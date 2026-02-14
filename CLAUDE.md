# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 다룰 때 참고하는 가이드입니다.

## 프로젝트 개요

"다니엘"은 동은교회 초등부 출석 및 달란트 관리 시스템입니다. 한국어 기반 모바일 우선 PWA로, Next.js 16 App Router를 사용합니다.

## 주요 명령어

```bash
npm run dev          # 개발 서버 실행 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint (Next.js core-web-vitals + TypeScript 규칙)
npx prisma migrate dev   # 데이터베이스 마이그레이션 실행
npm run db:seed      # 샘플 데이터 시드 (npx tsx prisma/seed.ts)
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
- **PostgreSQL** (AWS RDS) — Prisma Client ORM 사용
- **Prisma 7** — 스키마 정의, 마이그레이션, 런타임 ORM
- **Tailwind CSS 4** + `globals.css`의 글래스모피즘/그라데이션 커스텀 CSS
- **Framer Motion** — 애니메이션
- **jose** — JWT, **bcryptjs** — 비밀번호 해싱
- **date-fns** — 날짜 포맷팅

### 데이터베이스: Prisma Client ORM
`src/lib/db.ts`가 유일한 데이터 접근 계층입니다. Prisma Client 싱글톤을 사용하며, 모든 함수가 async입니다. 데이터소스 URL은 `DATABASE_URL` 환경변수에서 읽습니다 (`prisma.config.ts`).

### 인증
- JWT 토큰을 HTTP-only 쿠키(`auth_token`)에 저장, `src/lib/auth.ts`에서 관리
- 미들웨어 없음 — `(dashboard)/layout.tsx` 서버 컴포넌트에서 인증을 확인하고, 미인증 사용자는 `/login`으로 리다이렉트
- `JWT_SECRET` 환경 변수가 없으면 하드코딩된 기본값 사용

### 라우팅 구조
- `/` — 랜딩 페이지 (공개)
- `/login` — 로그인 페이지 (공개)
- `/(dashboard)/*` — 모든 보호된 페이지, `Sidebar`가 포함된 공통 레이아웃 사용
  - `/dashboard` — 통계 개요, 최근 출석, 달란트 랭킹, 생일
  - `/attendance` — 날짜/반별 출석 체크 (출석/지각/결석 버튼)
  - `/talent` — 달란트 지급/차감 (사전 정의된 사유 선택)
  - `/shop` — 달란트 시장 (달란트로 상품 구매)
  - `/students` — 학생 CRUD 및 반 배정
  - `/stats` — 출석 및 달란트 통계
  - `/settings` — 관리자 전용 설정

### API 라우트 (`src/app/api/`)
모든 API 라우트는 JSON을 반환합니다. 주요 비즈니스 로직:
- **출석** (`/api/attendance`): 출석 저장 시 출석/지각이면 달란트 5점 자동 지급, 결석으로 변경 시 차감
- **상품 구매** (`/api/shop/purchase`): 달란트 잔액 검증, 포인트 차감, 상품 재고 감소
- **사용자** (`/api/users`): 관리자만 사용자 생성 가능

### 컴포넌트
- `src/components/ui/` — 재사용 가능한 UI 기본 컴포넌트 (Button, Card, Input, Avatar, Badge) + Framer Motion 애니메이션
- `src/components/layout/` — Sidebar (네비게이션, 모바일 햄버거 메뉴) 및 Header
- 두 디렉토리 모두 `index.ts` 배럴 export 파일 보유

### 경로 별칭
`@/*`는 `./src/*`에 매핑됩니다 (`tsconfig.json`에서 설정)

### 배포
Docker 멀티 스테이지 빌드 (Node 20 Alpine) → ECR 푸시 → AWS App Runner 배포. standalone Next.js 출력. 프로덕션 포트는 8080. 배포 스크립트: `deploy-aws.ps1`.

## 데이터 모델 (prisma/schema.prisma)

- **User** — 관리자(admin), 교사(teacher), 학부모(parent) 역할
- **Class** — 교사에 소속, 여러 학생 보유
- **Student** — 반에 소속, talentBalance(달란트 잔액) 필드 보유
- **Attendance** — 학생별 날짜별 기록 (studentId+date 유니크 제약), 상태: present/absent/late
- **Talent** — 달란트 거래 기록 (유형: attendance/bonus/purchase), 양수 또는 음수 금액
- **Product** — 달란트 시장 상품 (재고 및 가격 포함)
- **Announcement** — 공지사항 (일반/이벤트/긴급), 고정 기능
- **ParentStudent** — 학부모-자녀 다대다 연결
- **Setting** — 키-값 형태의 앱 설정
