# Plan: 추천CCM 초등부 Top10 콘텐츠 추가

## 메타데이터
- **기능명**: ccm-content-seed
- **우선순위**: Medium
- **예상 규모**: Small (콘텐츠 데이터 추가)
- **작성일**: 2026-02-18

---

## 1. 배경 및 목적

### 현황
- `/ccm` 추천CCM 페이지는 이미 완성된 UI/API가 존재
- 하지만 데이터베이스에 실제 콘텐츠(YouTube 동영상)가 없어 빈 화면 표시
- 교사/관리자가 수동으로 URL을 입력해야 하는 불편함

### 목적
- 실제 초등부(어린이) 찬양 Top10 YouTube 영상을 데이터베이스에 등록
- 앱 배포/초기화 시 자동으로 콘텐츠가 채워지도록 시드 스크립트 작성
- 아이들이 앱 접속 즉시 찬양 영상을 볼 수 있게 함

---

## 2. 기능 요구사항

### FR-01: 초등부 찬양 Top10 영상 등록
- 실제 YouTube 영상 ID를 사용한 10개 영상 등록
- 카테고리별(찬양/율동/워십/특송) 균형 있는 구성
- 인기 어린이 찬양 채널의 영상 우선 선정

### FR-02: 시드 스크립트 작성
- `prisma/seed-ccm.ts` 스크립트 작성
- 기존 CCM 데이터가 없을 때만 시드 실행 (중복 방지)
- npm script로 실행 가능: `npm run db:seed-ccm`

### FR-03: 추천 영상 상단 고정
- 상위 5개 영상은 `isPinned: true` 설정
- 핑크 배지로 "추천" 표시 (기존 UI 활용)

### FR-04: 카테고리 구성
| 카테고리 | 영상 수 | 설명 |
|---------|---------|------|
| praise (찬양) | 4개 | 일반 찬양 모음 |
| action (율동) | 3개 | 율동찬양 |
| worship (워십) | 2개 | 워십/예배 찬양 |
| special (특송) | 1개 | 영어찬양 특송 |

---

## 3. 선정 YouTube 영상 (Top 10)

실제 웹 검색으로 확인된 영상들:

| 순위 | 제목 | YouTube ID | 카테고리 | 고정 |
|-----|------|-----------|---------|------|
| 1 | 어린이 신나는 찬양 연속듣기 | kcKMPEon3vw | praise | ✅ |
| 2 | 어린이 축복찬양 모음 | wgbKghqiUZU | praise | ✅ |
| 3 | 어린이 유치부찬양 연속듣기 | iRPT7mZdbmM | praise | ✅ |
| 4 | 어린이 해피송, 신나는 찬양 | hwEn27MfqTc | action | ✅ |
| 5 | 엄마아빠가 들려주는 축복송 모음 | LApHZ5d3Eak | special | ✅ |
| 6 | 어린이 축복송 모음 | upcYiwTYL7Q | praise | ❌ |
| 7 | 어린이 예배용 찬양 모음 | XDXtf-Dc1so | worship | ❌ |
| 8 | 신나는 찬양듣기 모음 | D7Zdbrw4fNI | action | ❌ |
| 9 | 귀여운 어린이 찬양 3 | w0JtaiKyxd0 | action | ❌ |
| 10 | 어린이 영어찬양 Hello! Jesus | L1NbYaQ2nms | special | ❌ |

> 출처: 예수참영성교회 어린이 찬양 큐레이션 목록 (jesusspiritch.com)

---

## 4. 구현 방법

### 방법 A: 시드 스크립트 (권장)
```bash
# 새 스크립트 파일 생성
prisma/seed-ccm.ts

# package.json에 스크립트 추가
"db:seed-ccm": "npx tsx prisma/seed-ccm.ts"
```

### 방법 B: 기존 seed.ts 통합
- 기존 `prisma/seed.ts`에 CCM 시드 로직 추가
- `npm run db:seed` 시 자동 포함

**결정: 방법 A 선택** (독립적인 CCM 콘텐츠 관리 가능)

---

## 5. 기술 스택 및 제약

- **데이터베이스**: PostgreSQL via Prisma (CcmVideo 모델)
- **썸네일**: YouTube 자동 생성 URL `https://img.youtube.com/vi/{ID}/mqdefault.jpg`
- **중복 방지**: `prisma.ccmVideo.count()` 체크 후 0일 때만 실행
- **기존 CCM 관리 UI** 활용: 교사가 언제든 추가/수정/삭제 가능

---

## 6. 완료 기준

- [ ] 10개 CCM 영상이 데이터베이스에 등록됨
- [ ] 각 영상 썸네일이 YouTube에서 정상 로드됨
- [ ] `/ccm` 페이지에서 영상 목록이 표시됨
- [ ] 상위 5개 영상에 "추천" 핑크 배지 표시
- [ ] 카테고리 필터(전체/찬양/율동/워십/특송)가 정상 작동
- [ ] `npm run db:seed-ccm` 명령어로 실행 가능

---

## 7. 범위 제외

- YouTube API 연동 (실시간 인기 영상 자동 업데이트)
- 영상 재생 횟수 통계
- 학생 좋아요/즐겨찾기 기능
- 자동 CCM 추천 알고리즘
