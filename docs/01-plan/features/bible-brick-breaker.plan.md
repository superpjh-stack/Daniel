# Bible Brick Breaker Game Planning Document

> **Summary**: 사이드바에 "게임" 메뉴를 추가하고, 첫 번째 게임으로 성경 관련 벽돌깨기 게임을 구현
>
> **Project**: 다니엘 - 동은교회 초등부 출석부
> **Author**: AI Assistant
> **Date**: 2026-02-16
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

사이드바에 "게임" 카테고리 메뉴를 신설하고, 초등부 아이들이 성경 내용을 재미있게 학습할 수 있는 벽돌깨기(Breakout) 게임을 첫 번째 게임으로 제공합니다. 벽돌에 성경 구절이나 퀴즈가 담겨 있어 게임을 즐기면서 자연스럽게 성경을 접할 수 있습니다.

### 1.2 Background

- 기존 성경퀴즈 기능은 텍스트 기반으로, 게임적 요소가 부족
- 초등부 아이들에게 보다 재미있고 인터랙티브한 성경 학습 도구 필요
- 게임 메뉴를 확장 가능한 구조로 설계하여 향후 다른 게임 추가 가능

### 1.3 Related Documents

- 기존 성경퀴즈: `src/app/(dashboard)/quiz/`
- 사이드바: `src/components/layout/Sidebar.tsx`
- DB 퀴즈 모델: `prisma/schema.prisma` (QuizQuestion)

---

## 2. Scope

### 2.1 In Scope

- [x] 사이드바에 "게임" 메뉴 항목 추가 (게임 목록 페이지)
- [x] 게임 목록 페이지 (`/games`) - 벽돌깨기 등 게임 카드 나열
- [x] 성경 벽돌깨기 게임 (`/games/brick-breaker`) - HTML5 Canvas 기반
- [x] 게임 내 성경 퀴즈 통합 - 특수 벽돌 깰 때 퀴즈 팝업
- [x] 게임 결과에 따른 달란트 보상 연동
- [x] 모바일/데스크톱 반응형 (터치 + 마우스/키보드)

### 2.2 Out of Scope

- 멀티플레이어 기능
- 사용자 커스텀 스테이지 제작
- 리더보드/랭킹 시스템 (향후 확장)
- 학부모(parent) 역할의 게임 접근

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사이드바에 "게임" 메뉴 추가 (Gamepad2 아이콘) | High | Pending |
| FR-02 | 게임 목록 페이지 - 카드 형태로 게임 나열 | High | Pending |
| FR-03 | Canvas 기반 벽돌깨기 게임 엔진 구현 | High | Pending |
| FR-04 | 패들: 마우스/터치/키보드(좌우) 조작 | High | Pending |
| FR-05 | 벽돌: 일반 벽돌 + 퀴즈 벽돌(성경 아이콘) | High | Pending |
| FR-06 | 퀴즈 벽돌 파괴 시 성경퀴즈 팝업 (DB 연동) | High | Pending |
| FR-07 | 퀴즈 정답 시 추가 점수 + 특수 효과 | Medium | Pending |
| FR-08 | 스테이지 시스템 (1~5 스테이지, 난이도 증가) | Medium | Pending |
| FR-09 | 게임 완료 시 점수에 따라 달란트 보상 | High | Pending |
| FR-10 | 게임 결과 화면 (점수, 보상 달란트, 다시하기) | High | Pending |
| FR-11 | 일시정지/재개 기능 | Medium | Pending |
| FR-12 | 모바일 터치 지원 (패들 드래그) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 게임 60fps 유지 | Canvas requestAnimationFrame |
| Responsiveness | 모바일 320px~데스크톱 1920px 지원 | Canvas 동적 리사이즈 |
| UX | 게임 로딩 1초 이내 | 번들 크기 최소화 |

---

## 4. Game Design

### 4.1 게임 화면 구성

```
┌──────────────────────────────────┐
│  Score: 1500   Stage: 2   ⏸️     │
├──────────────────────────────────┤
│  [창1:3] [일반] [일반] [📖Quiz]  │
│  [일반] [요3:16] [일반] [일반]    │
│  [📖Quiz] [일반] [일반] [시23:1]  │
│  [일반] [일반] [📖Quiz] [일반]    │
│                                  │
│              ●                   │
│                                  │
│         ════════════             │
│          (paddle)                │
└──────────────────────────────────┘
```

### 4.2 벽돌 타입

| 타입 | 색상 | HP | 점수 | 효과 |
|------|------|-----|------|------|
| 일반 | 보라/파랑/초록 그라데이션 | 1 | 10 | 없음 |
| 강화 | 주황 | 2 | 30 | 2번 맞아야 파괴 |
| 퀴즈 | 금색 + 📖 아이콘 | 1 | 50 (정답 시 +100) | 성경퀴즈 팝업 |
| 성경구절 | 하늘색 + 구절표시 | 1 | 20 | 파괴 시 구절 표시 |

### 4.3 스테이지 설계

| Stage | 벽돌 수 | 퀴즈 벽돌 | 공 속도 | 특징 |
|-------|---------|----------|---------|------|
| 1 | 20 | 2 | 느림 | 튜토리얼 |
| 2 | 30 | 3 | 보통 | 강화 벽돌 등장 |
| 3 | 35 | 4 | 보통 | 2줄 강화 벽돌 |
| 4 | 40 | 5 | 빠름 | 혼합 배치 |
| 5 | 45 | 6 | 빠름 | 보스 스테이지 |

### 4.4 보상 체계

| 조건 | 달란트 |
|------|--------|
| 게임 참여 (최소 1스테이지 클리어) | 1 |
| 3스테이지 클리어 | 3 |
| 전체 클리어 (5스테이지) | 5 |
| 퀴즈 전문 정답 보너스 | +2 |

---

## 5. Technical Design

### 5.1 파일 구조

```
src/app/(dashboard)/games/
  page.tsx                    # 게임 목록 페이지
  brick-breaker/
    page.tsx                  # 벽돌깨기 게임 래퍼
    _components/
      BrickBreakerGame.tsx    # Canvas 게임 엔진 (client component)
      QuizModal.tsx           # 퀴즈 팝업 모달
      GameOverModal.tsx       # 게임 종료 모달
      StageIntro.tsx          # 스테이지 시작 화면
    _lib/
      gameEngine.ts           # 게임 로직 (공, 패들, 충돌 감지)
      stages.ts               # 스테이지 데이터 정의
      types.ts                # 게임 타입 정의

src/app/api/games/
  brick-breaker/
    reward/route.ts           # 달란트 보상 API
```

### 5.2 사이드바 변경

기존 `성경퀴즈` 항목을 `게임` 메뉴로 교체 또는 별도 추가:
```typescript
// 기존: { href: '/quiz', icon: <Gamepad2 />, label: '성경퀴즈' }
// 변경: { href: '/games', icon: <Gamepad2 />, label: '게임' }
// 성경퀴즈는 /games 하위 또는 기존 /quiz 유지
```

### 5.3 기술 선택

| 항목 | 선택 | 이유 |
|------|------|------|
| 렌더링 | HTML5 Canvas + React | 게임 성능, Next.js 호환 |
| 게임 루프 | requestAnimationFrame | 60fps 부드러운 애니메이션 |
| 퀴즈 데이터 | 기존 QuizQuestion DB | 이미 100문제 등록됨 |
| 보상 API | Next.js Route Handler | 기존 Talent 시스템 연동 |
| 상태 관리 | React useRef + useState | 외부 라이브러리 불필요 |

---

## 6. Success Criteria

### 6.1 Definition of Done

- [x] 사이드바에 "게임" 메뉴 표시
- [x] 게임 목록 페이지에 벽돌깨기 카드 표시
- [x] 벽돌깨기 게임 정상 플레이 가능 (5 스테이지)
- [x] 퀴즈 벽돌 파괴 시 성경퀴즈 팝업 동작
- [x] 게임 완료 시 달란트 보상 지급
- [x] 모바일 터치 조작 정상 동작
- [x] 빌드 성공 (npm run build)

### 6.2 Quality Criteria

- [x] Zero lint errors
- [x] 빌드 에러 없음
- [x] 모바일/데스크톱 정상 동작

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Canvas 모바일 성능 이슈 | Medium | Low | 벽돌/파티클 수 제한, 해상도 조정 |
| 게임 중 퀴즈 팝업 UX | Medium | Medium | 게임 일시정지 후 팝업, 타이머 없음 |
| 달란트 어뷰징 | High | Medium | 하루 최대 보상 횟수 제한 (3회) |
| Canvas SSR 호환 | Low | High | 'use client' + dynamic import |

---

## 8. Next Steps

1. [x] Plan 문서 작성 완료
2. [ ] Design 문서 작성 (`/pdca design bible-brick-breaker`)
3. [ ] 구현 시작
4. [ ] Gap Analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-16 | Initial draft | AI Assistant |
