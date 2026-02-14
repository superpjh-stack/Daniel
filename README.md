# 🦁 다니엘 - 동은교회 초등부 출석부

동은교회 초등부 아이들의 출석과 달란트를 스마트하게 관리하는 모바일 웹 서비스입니다.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)

## ✨ 주요 기능

### 📋 출석 관리
- 터치 한 번으로 빠른 출결 처리 (출석/지각/결석)
- 지각 및 결석 사유 메모
- 실시간 출석 현황 집계
- 달력 형태의 지난 기록 조회

### ⭐ 달란트 관리
- 출석 시 자동 달란트 지급 (기본 +5)
- 성경 암송, 친구 전도 등 추가 지급
- 달란트 시장 - 상품 구매 시 즉시 차감
- 전체 히스토리 조회

### 👨‍👩‍👧‍👦 회원 및 반 관리
- 관리자/교사 권한 분리
- 학생 프로필 관리 (이름, 학년, 생일, 연락처, 특이사항)
- 학년별/반별 그룹화

### 📊 통계
- 개인별/학년별 출석 통계
- 출석왕, 달란트왕 랭킹
- 주간/월간/분기별 리포트

### 📱 모바일 최적화
- 반응형 디자인 (스마트폰, 태블릿, PC)
- PWA 지원 (홈 화면에 추가)
- 블링블링한 UI ✨

## 🚀 시작하기

### 1. 의존성 설치

\`\`\`bash
npm install
\`\`\`

### 2. 데이터베이스 설정

\`\`\`bash
# Prisma 마이그레이션 실행
npx prisma migrate dev

# 샘플 데이터 생성
npm run db:seed
\`\`\`

### 3. 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📌 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@church.com | admin123 |
| 교사 | teacher@church.com | teacher123 |

## 🛠 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: SQLite (Prisma ORM)
- **Authentication**: JWT (jose)
- **Icons**: Lucide React

## 📂 프로젝트 구조

\`\`\`
daniel/
├── prisma/
│   ├── schema.prisma     # DB 스키마
│   ├── seed.ts           # 샘플 데이터
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (dashboard)/  # 로그인 후 페이지들
│   │   ├── api/          # API 라우트
│   │   ├── login/
│   │   └── page.tsx      # 랜딩 페이지
│   ├── components/
│   │   ├── ui/           # 공통 UI 컴포넌트
│   │   └── layout/       # 레이아웃 컴포넌트
│   └── lib/
│       ├── prisma.ts     # Prisma 클라이언트
│       └── auth.ts       # 인증 유틸리티
└── public/
    └── manifest.json     # PWA 설정
\`\`\`

## 🙏 만든이

동은교회 초등부를 위해 만들었습니다.

---

*"나의 도움은 천지를 지으신 여호와에게서 온다" - 시편 121:2*
