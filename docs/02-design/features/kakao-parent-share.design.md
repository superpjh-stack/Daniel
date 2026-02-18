# kakao-parent-share Design

> **Feature**: 학부모 카카오톡 공유 기능
>
> **Author**: Claude
> **Created**: 2026-02-18
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/kakao-parent-share.plan.md`

---

## 1. 아키텍처 개요

### 1.1 시스템 구조

```
[관리자]
  설정 > 카카오 탭
  → PUT /api/settings { kakao_js_key: "..." }
  → Setting 테이블에 저장

[학부모 브라우저]
  페이지 로드
  → GET /api/settings → kakao_js_key 획득
  → window.Kakao.init(jsKey)  ← Kakao SDK (CDN, lazyOnload)
  → 공유 버튼 클릭
  → window.Kakao.Share.sendDefault({ ... })
  → 카카오톡 앱 열림 (공유 화면)
```

### 1.2 모듈 의존 관계

```
parent/attendance/page.tsx
  └─► KakaoShareButton (props: type='attendance', data={...})
        └─► useKakao() hook (src/lib/kakao.ts)
              └─► window.Kakao (CDN으로 로드된 SDK)
              └─► GET /api/settings → kakao_js_key

parent/talent/page.tsx
  └─► KakaoShareButton (props: type='talent', data={...})
        └─► useKakao() hook (동일)

settings/page.tsx (카카오 탭)
  └─► PUT /api/settings { kakao_js_key }
        └─► upsertSetting() in db.ts (기존 함수)
```

---

## 2. 데이터 설계

### 2.1 DB 변경 없음

기존 `Setting` 테이블 (key-value)을 그대로 활용합니다.

```
Setting 테이블에 추가되는 키:
  key: "kakao_js_key"
  value: "발급받은 JavaScript 앱 키 문자열"
```

스키마 변경 없음. `upsertSetting(key, value)` 기존 함수로 저장.

### 2.2 설정 키 규칙

| 키 | 설명 | 예시 값 |
|----|------|---------|
| `kakao_js_key` | 카카오 JavaScript 앱 키 | `abc123def456...` (32자 헥스) |

---

## 3. API 설계

### 3.1 기존 API 재사용 (변경 없음)

**GET /api/settings**
- 기존 응답에 `kakao_js_key` 가 자동으로 포함됨
- 인증 필요 (session)

```json
{
  "attendance_talent_points": "5",
  "streak_bonus_threshold": "4",
  "streak_bonus_points": "10",
  "kakao_js_key": "abc123..."   // 저장된 경우 포함
}
```

**PUT /api/settings**
- 기존 엔드포인트에 `kakao_js_key` 키를 전달하면 저장됨
- 관리자/교사 권한 필요

```json
{ "kakao_js_key": "abc123..." }
```

---

## 4. 컴포넌트 설계

### 4.1 `src/lib/kakao.ts` — SDK 헬퍼

```typescript
// Kakao SDK 전역 타입 선언
declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: KakaoShareOptions) => void;
      };
    };
  }
}

export interface KakaoShareOptions {
  objectType: 'feed';
  content: {
    title: string;
    description: string;
    imageUrl?: string;
    link: { mobileWebUrl: string; webUrl: string };
  };
  buttons?: { title: string; link: { mobileWebUrl: string; webUrl: string } }[];
}

// Kakao SDK 초기화 (중복 호출 방어)
export function initKakao(jsKey: string): void {
  if (typeof window === 'undefined') return;
  if (!window.Kakao) return;
  if (window.Kakao.isInitialized()) return;
  window.Kakao.init(jsKey);
}

// 출석 공유 메시지 생성
export function buildAttendanceShareOptions(params: {
  studentName: string;
  grade: number;
  className: string | null;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  streak: number;
  appUrl: string;
}): KakaoShareOptions { ... }

// 달란트 공유 메시지 생성
export function buildTalentShareOptions(params: {
  studentName: string;
  grade: number;
  talentBalance: number;
  monthEarned: number;
  appUrl: string;
}): KakaoShareOptions { ... }
```

### 4.2 `src/hooks/useKakao.ts` — 초기화 훅

```typescript
export function useKakao() {
  const [isReady, setIsReady] = useState(false);
  const [jsKey, setJsKey] = useState<string | null>(null);

  useEffect(() => {
    // 설정에서 카카오 JS 키 로드
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.kakao_js_key) {
          setJsKey(data.kakao_js_key);
        }
      });
  }, []);

  // SDK 스크립트 로드 완료 + jsKey 있을 때 초기화
  const handleSdkLoad = useCallback(() => {
    if (jsKey) {
      initKakao(jsKey);
      setIsReady(true);
    }
  }, [jsKey]);

  return { isReady, jsKey, handleSdkLoad };
}
```

### 4.3 `src/components/KakaoShareButton.tsx` — 공유 버튼

```typescript
interface KakaoShareButtonProps {
  options: KakaoShareOptions;
  disabled?: boolean;
  className?: string;
}

export function KakaoShareButton({ options, disabled, className }: KakaoShareButtonProps) {
  const { isReady, jsKey, handleSdkLoad } = useKakao();

  const handleClick = () => {
    if (!jsKey) {
      alert('카카오 앱 키가 설정되지 않았습니다.\n관리자에게 문의하세요.');
      return;
    }
    if (!isReady || !window.Kakao?.isInitialized()) {
      alert('카카오톡 공유를 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    window.Kakao.Share.sendDefault(options);
  };

  return (
    <>
      {/* 카카오 SDK 스크립트 (lazyOnload) */}
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
        strategy="lazyOnload"
        onLoad={handleSdkLoad}
        crossOrigin="anonymous"
      />
      <button
        onClick={handleClick}
        disabled={disabled || !jsKey}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium
          bg-[#FEE500] text-[#3C1E1E] hover:bg-[#F5DC00]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all shadow-sm ${className}`}
      >
        <KakaoIcon />
        카카오톡으로 공유
      </button>
    </>
  );
}
```

---

## 5. UI/UX 설계

### 5.1 설정 페이지 — 카카오 탭

```
┌─────────────────────────────────────────────────────┐
│ [교사관리] [반관리] [달란트] [학부모] [텔레그램] [카카오] [출력] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🟡 카카오 앱 키 설정                                  │
│                                                     │
│  카카오 개발자 사이트에서 JavaScript 키를 발급받아    │
│  입력하세요.                                          │
│                                                     │
│  설정 방법:                                           │
│  1. developers.kakao.com 접속                        │
│  2. 내 애플리케이션 → 앱 만들기                       │
│  3. 플랫폼 → Web → 사이트 도메인 등록               │
│  4. 앱 키 → JavaScript 키 복사                      │
│  5. 카카오링크 제품 활성화 필요                      │
│                                                     │
│  JavaScript 앱 키                                    │
│  ┌───────────────────────────────────────────────┐  │
│  │ abc123def456...                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [현재 상태: 미설정 ●] 또는 [현재 상태: 설정됨 ●]      │
│                                                     │
│            [저장하기]                                │
└─────────────────────────────────────────────────────┘
```

### 5.2 학부모 출석 페이지 — 공유 버튼 위치

```
┌─────────────────────────────────────────────────────┐
│ 📅 출석 내역                                          │
│ 자녀의 출석 기록을 확인하세요                          │
│                                    [🟡 카카오톡 공유] │  ← 헤더 우측
└─────────────────────────────────────────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│ ✅ 출석   │  │ ⏰ 지각   │  │ ❌ 결석   │
│    12    │  │    1     │  │    0     │
└──────────┘  └──────────┘  └──────────┘

[🔥 연속 출석 4주!]

...출석 목록...
```

### 5.3 학부모 달란트 페이지 — 공유 버튼 위치

```
┌─────────────────────────────────────────────────────┐
│ ⭐ 달란트 내역                                        │
│ 자녀의 달란트 현황을 확인하세요        [🟡 카카오톡 공유] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                     ⭐                               │
│             현재 달란트 잔액                          │
│                    42                               │
│               홍길동 (3학년)                          │
└─────────────────────────────────────────────────────┘
```

### 5.4 카카오톡 공유 메시지 템플릿

**출석 공유 메시지 (feed 타입)**
```
┌─────────────────────────────────┐
│ [동은교회 초등부 로고/이미지]     │
│                                 │
│ 홍길동 어린이의 출석 현황         │
│ (3학년 · 다윗반)                 │
│                                 │
│ ✅ 출석 12회  ⏰ 지각 1회        │
│ ❌ 결석 0회   🔥 연속 4주        │
│                                 │
│        [출석 내역 확인하기]       │
└─────────────────────────────────┘
```

**달란트 공유 메시지 (feed 타입)**
```
┌─────────────────────────────────┐
│ [동은교회 초등부 로고/이미지]     │
│                                 │
│ 홍길동 어린이의 달란트 현황       │
│ (3학년)                          │
│                                 │
│ ⭐ 현재 잔액: 42 달란트           │
│ 이번 달 획득: +25 달란트          │
│                                 │
│        [달란트 내역 확인하기]     │
└─────────────────────────────────┘
```

---

## 6. 구현 상세

### 6.1 카카오 Share 옵션 (출석)

```typescript
{
  objectType: 'feed',
  content: {
    title: `${studentName} 어린이의 출석 현황`,
    description: `${grade}학년${className ? ` · ${className}` : ''}\n✅ 출석 ${presentCount}회  ⏰ 지각 ${lateCount}회  ❌ 결석 ${absentCount}회${streak > 0 ? `\n🔥 연속 출석 ${streak}주!` : ''}`,
    imageUrl: `${appUrl}/icons/icon-512x512.png`,  // PWA 아이콘 활용
    link: {
      mobileWebUrl: `${appUrl}/parent/attendance`,
      webUrl: `${appUrl}/parent/attendance`,
    },
  },
  buttons: [
    {
      title: '출석 내역 확인하기',
      link: {
        mobileWebUrl: `${appUrl}/parent/attendance`,
        webUrl: `${appUrl}/parent/attendance`,
      },
    },
  ],
}
```

### 6.2 카카오 Share 옵션 (달란트)

```typescript
{
  objectType: 'feed',
  content: {
    title: `${studentName} 어린이의 달란트 현황`,
    description: `${grade}학년\n⭐ 현재 잔액: ${talentBalance} 달란트\n이번 달 획득: +${monthEarned} 달란트`,
    imageUrl: `${appUrl}/icons/icon-512x512.png`,
    link: {
      mobileWebUrl: `${appUrl}/parent/talent`,
      webUrl: `${appUrl}/parent/talent`,
    },
  },
  buttons: [
    {
      title: '달란트 내역 확인하기',
      link: {
        mobileWebUrl: `${appUrl}/parent/talent`,
        webUrl: `${appUrl}/parent/talent`,
      },
    },
  ],
}
```

### 6.3 appUrl 결정 방법

```typescript
// 클라이언트에서 현재 origin 사용
const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
```

### 6.4 이번 달 획득 달란트 계산 (달란트 페이지)

```typescript
// 기존 transactions 배열에서 이번 달 양수 합산
const now = new Date();
const monthEarned = transactions
  .filter(t => {
    const d = new Date(t.createdAt);
    return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && t.amount > 0;
  })
  .reduce((sum, t) => sum + t.amount, 0);
```

---

## 7. 구현 순서 (Implementation Order)

```
Step 1: src/lib/kakao.ts 생성
  - KakaoShareOptions 타입 정의
  - initKakao() 함수
  - buildAttendanceShareOptions() 함수
  - buildTalentShareOptions() 함수

Step 2: src/components/KakaoShareButton.tsx 생성
  - useKakao 로직 인라인 구현 (간결하게)
  - KakaoIcon SVG 인라인
  - 카카오 SDK Script 태그

Step 3: settings/page.tsx 수정
  - activeTab 타입에 'kakao' 추가
  - 카카오 탭 버튼 추가
  - 카카오 탭 UI (키 입력 + 저장)
  - fetchData()에서 kakao_js_key 상태 로드

Step 4: parent/attendance/page.tsx 수정
  - 헤더 영역에 KakaoShareButton 추가
  - buildAttendanceShareOptions() 호출하여 props 전달

Step 5: parent/talent/page.tsx 수정
  - 헤더 영역에 KakaoShareButton 추가
  - buildTalentShareOptions() 호출
  - monthEarned 계산 추가
```

---

## 8. 타입 선언 (global.d.ts 또는 kakao.ts 내 선언)

```typescript
// Kakao SDK window 타입 (CDN 로드)
declare global {
  interface Window {
    Kakao: {
      init(appKey: string): void;
      isInitialized(): boolean;
      Share: {
        sendDefault(settings: KakaoFeedOptions): void;
      };
    };
  }
}
```

---

## 9. 주요 고려사항

| 항목 | 내용 |
|------|------|
| **모바일 전용** | 카카오링크는 모바일에서만 앱 연동. 데스크탑에서는 카카오톡 웹 공유로 대체 |
| **SDK 버전** | 2.7.x 최신 안정 버전 사용 (`kakao.min.js`) |
| **CORS/도메인** | 카카오 개발자 콘솔에서 Web 플랫폼으로 도메인 등록 필요 (관리자 가이드 포함) |
| **이미지 URL** | `imageUrl`은 HTTPS 퍼블릭 URL 필요. PWA 아이콘 `/icons/icon-512x512.png` 사용 (S3 또는 public/) |
| **Next.js Script** | `strategy="lazyOnload"` → 초기 로딩 속도 영향 없음 |
| **중복 초기화** | `Kakao.isInitialized()` 체크로 방어 |

---

## 10. 파일 변경 요약

| 파일 | 변경 유형 | 변경 내용 |
|------|----------|----------|
| `src/lib/kakao.ts` | 신규 | 카카오 SDK 헬퍼 (타입, 초기화, 메시지 빌더) |
| `src/components/KakaoShareButton.tsx` | 신규 | 카카오 공유 버튼 컴포넌트 |
| `src/app/(dashboard)/settings/page.tsx` | 수정 | 카카오 탭 추가 (탭 버튼 + 탭 내용) |
| `src/app/(dashboard)/parent/attendance/page.tsx` | 수정 | 헤더에 KakaoShareButton 추가 |
| `src/app/(dashboard)/parent/talent/page.tsx` | 수정 | 헤더에 KakaoShareButton 추가 + monthEarned 계산 |

**DB 마이그레이션**: 불필요 (Setting 테이블 기존 사용)
**환경 변수 추가**: 불필요 (카카오 JS 키는 DB Setting에 저장)
**npm 패키지 추가**: 불필요 (CDN 방식으로 SDK 로드)
