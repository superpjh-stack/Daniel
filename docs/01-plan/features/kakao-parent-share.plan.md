# Feature Plan: kakao-parent-share

## 메타데이터
- **기능명**: kakao-parent-share
- **작성일**: 2026-02-18
- **우선순위**: Medium
- **예상 복잡도**: Medium
- **관련 기능**: parent-portal, telegram-remote-control

---

## 1. 개요 (Overview)

학부모가 자녀의 출석 및 달란트 현황을 카카오톡으로 쉽게 공유할 수 있는 기능입니다.
별도 봇 서버 없이 **Kakao JavaScript SDK**의 카카오링크(Kakao.Share) API를 활용하여
클라이언트 사이드에서 직접 공유 메시지를 전송합니다.

---

## 2. 사용자 스토리 (User Stories)

### 학부모 관점
- **US-01**: 학부모가 자녀의 이번 달 출석 현황을 카카오톡 가족/친구에게 공유하고 싶다
- **US-02**: 학부모가 자녀의 달란트 잔액 및 최근 내역을 카카오톡으로 공유하고 싶다
- **US-03**: 공유 버튼 클릭 시 카카오톡 앱이 열리며 바로 공유 화면이 나타나야 한다

### 관리자 관점
- **US-04**: 관리자가 설정 메뉴에서 카카오 앱 키를 등록/관리할 수 있다
- **US-05**: 카카오 앱 키 미설정 시 공유 버튼이 비활성화되고 안내 메시지가 표시된다

---

## 3. 기능 요구사항 (Functional Requirements)

### FR-01: 설정 메뉴 카카오 탭
- 설정 페이지에 "카카오" 탭 추가 (기존: users/classes/talent/parents/telegram/export)
- 카카오 JavaScript 키(앱 키) 입력 및 저장 기능
- 저장된 키는 `Setting` 테이블에 `kakao_js_key` 키로 관리
- 설정 방법 가이드 (카카오 개발자 사이트 안내)

### FR-02: 학부모 출석 페이지 공유 버튼
- `/parent/attendance` 페이지 상단 또는 통계 카드 하단에 "카카오톡 공유" 버튼 추가
- 공유 내용:
  - 자녀 이름, 학년, 반
  - 이번 달 출석/지각/결석 횟수
  - 연속 출석 주수 (있을 경우)
  - 앱 링크 (동은교회 초등부)
- 공유 형식: 카카오링크 피드 메시지 템플릿

### FR-03: 학부모 달란트 페이지 공유 버튼
- `/parent/talent` 페이지에 "카카오톡 공유" 버튼 추가
- 공유 내용:
  - 자녀 이름, 현재 달란트 잔액
  - 이번 달 획득/차감 달란트 요약
  - 달란트 달성 격려 메시지

### FR-04: Kakao SDK 초기화
- `kakao_js_key` 설정값이 있을 때만 SDK 초기화
- SDK는 Next.js Script 컴포넌트를 통해 `strategy="lazyOnload"`로 로드
- 설정 미완료 시 공유 버튼 클릭 시 "카카오 앱 키 설정이 필요합니다" 안내

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

- **플랫폼**: 모바일 우선 (카카오톡은 모바일 환경에서 주로 사용)
- **성능**: SDK 로드 지연으로 인해 초기 페이지 로딩에 영향 없어야 함 (lazyOnload)
- **보안**: 카카오 앱 키는 JavaScript 키(공개 가능), 서버 측 시크릿 키 불필요
- **UX**: 공유 버튼은 카카오 노란색 브랜드 컬러 (#FEE500) 적용

---

## 5. 기술적 접근 방법 (Technical Approach)

### 카카오링크 vs 카카오 메시지 API 선택
| 방법 | 장점 | 단점 |
|------|------|------|
| **카카오링크 (Kakao.Share)** | 별도 서버 불필요, 앱 키만 필요 | 공유 대상 선택을 사용자가 직접 |
| 카카오 메시지 API | 자동 발송 가능 | OAuth 인증 + 백엔드 필요, 복잡 |

→ **카카오링크(Kakao.Share.sendDefault) 선택**: 서버 없이 클라이언트에서 바로 공유

### 구현 방식
```
Kakao JavaScript SDK (CDN)
  ↓ lazyOnload via Next.js Script
  ↓ Kakao.init(kakaoJsKey) - 설정값 로드 후 초기화
  ↓ Kakao.Share.sendDefault({ objectType: 'feed', ... })
  ↓ 카카오톡 앱 열림 → 공유 화면
```

### 설정 키 관리
- 기존 `Setting` 테이블 (key-value) 활용
- `/api/settings` GET에 `kakao_js_key` 포함하여 반환
- `/api/settings` PUT으로 저장 (관리자만)
- 학부모 페이지에서는 `/api/settings`로 키를 읽어 초기화

---

## 6. 영향 범위 (Scope of Changes)

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/app/(dashboard)/settings/page.tsx` | 카카오 탭 추가, 카카오 JS 키 설정 UI |
| `src/app/(dashboard)/parent/attendance/page.tsx` | 카카오 공유 버튼 추가 |
| `src/app/(dashboard)/parent/talent/page.tsx` | 카카오 공유 버튼 추가 |
| `src/app/api/settings/route.ts` | `kakao_js_key` 반환 포함 확인 |

### 신규 파일
| 파일 | 설명 |
|------|------|
| `src/lib/kakao.ts` | Kakao SDK 초기화 및 공유 헬퍼 함수 |
| `src/components/KakaoShareButton.tsx` | 재사용 가능한 카카오 공유 버튼 컴포넌트 |

### DB 변경 없음
- 기존 `Setting` 테이블에 새 key (`kakao_js_key`) 추가만 필요 (스키마 변경 없음)

---

## 7. 카카오 개발자 설정 가이드 (관리자용)

1. [카카오 개발자 사이트](https://developers.kakao.com) 접속
2. 앱 만들기 → 플랫폼 등록 (사이트 도메인 추가)
3. 앱 요약 정보에서 **JavaScript 키** 복사
4. 카카오링크 활성화: 제품 → 카카오링크 → ON
5. 다니엘 설정 > 카카오 탭에서 JavaScript 키 입력 후 저장

---

## 8. 완료 조건 (Acceptance Criteria)

- [x] 설정 > 카카오 탭에서 JS 키 입력/저장 가능
- [x] 학부모 출석 페이지에 카카오 공유 버튼 표시
- [x] 공유 클릭 시 카카오톡 공유 화면 열림 (모바일)
- [x] 공유 메시지에 자녀 이름, 출석 통계 포함
- [x] 학부모 달란트 페이지에도 동일하게 공유 기능 제공
- [x] 카카오 앱 키 미설정 시 적절한 안내 메시지 표시
- [x] 기존 기능(출석, 달란트, 설정) 정상 동작 유지

---

## 9. 우선순위 및 단계 (Priority & Phases)

### Phase 1 (필수)
- 설정 카카오 탭 + JS 키 저장
- 카카오 SDK 로더 컴포넌트
- 학부모 출석 페이지 공유 버튼

### Phase 2 (추가)
- 학부모 달란트 페이지 공유 버튼
- 공유 메시지 커스터마이징 (교회 로고 이미지 포함 옵션)

---

## 10. 관련 문서
- 텔레그램 연동 참고: `docs/01-plan/features/telegram-remote-control.plan.md`
- 학부모 포털: `docs/01-plan/features/parent-portal.plan.md`
