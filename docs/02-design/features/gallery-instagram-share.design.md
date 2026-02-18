# Design Document: gallery-instagram-share

## 메타데이터
- **기능명**: gallery-instagram-share
- **작성일**: 2026-02-19
- **참조 Plan**: `docs/01-plan/features/gallery-instagram-share.plan.md`
- **관련 파일**: `src/components/gallery/GalleryShareButtons.tsx`

---

## 1. 수정 범위 (Scope)

수정 파일 **1개**:

| 파일 | 변경 유형 | 변경 내용 |
|------|----------|----------|
| `src/components/gallery/GalleryShareButtons.tsx` | 수정 | Instagram 공유 버튼 + 핸들러 + 토스트 추가 |

신규 파일 없음 / DB 변경 없음 / API 변경 없음

---

## 2. 컴포넌트 인터페이스 (Component Interface)

### Props (변경 없음)

```typescript
interface GalleryShareButtonsProps {
  title: string;
  imageUrl: string;   // S3 원본 이미지 URL (Instagram 공유 시 Blob 변환에 사용)
}
```

> `imageUrl`은 이미 존재하는 prop으로, Instagram 파일 공유 시 이 URL로 fetch → Blob 변환

---

## 3. 상태 설계 (State Design)

### 추가되는 상태

```typescript
// Instagram 로딩 상태
const [isInstagramLoading, setIsInstagramLoading] = useState(false);

// 토스트 메시지 상태
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
```

### 기존 상태 (유지)

```typescript
const [copied, setCopied] = useState(false);
const [jsKey, setJsKey] = useState<string | null>(null);
```

### 토스트 헬퍼

```typescript
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  setToast({ message, type });
  setTimeout(() => setToast(null), 3000);
};
```

---

## 4. 핵심 로직: handleInstagram() 설계

```
handleInstagram() 호출
  │
  ├─ setIsInstagramLoading(true)
  │
  ├─ [1단계] 파일 공유 지원 확인
  │   canShare = typeof navigator !== 'undefined'
  │             && 'canShare' in navigator
  │
  ├─ [2단계-A] canShare === true (모바일)
  │   │
  │   ├─ fetch(imageUrl) → response.blob() → new File([blob], filename, { type: blob.type })
  │   │   filename = 'dongeun-gallery.jpg'
  │   │
  │   ├─ navigator.canShare({ files: [file] }) 재확인
  │   │   (일부 브라우저: canShare 있어도 files 불가)
  │   │
  │   ├─ true → navigator.share({ files: [file], title, text: '동은교회 초등부 사진첩' })
  │   │          → catch AbortError (사용자 취소) → 무시
  │   │          → catch 기타 에러 → showToast('공유에 실패했습니다', 'error')
  │   │
  │   └─ false → [2단계-B]로 폴백
  │
  ├─ [2단계-B] canShare === false (데스크탑 / 구버전 브라우저)
  │   │
  │   ├─ <a href={imageUrl} download="dongeun-gallery.jpg"> 생성 → click() → remove()
  │   └─ showToast('이미지를 저장했어요! Instagram 앱에서 공유해보세요 📸', 'success')
  │
  ├─ catch (fetch 실패 등)
  │   └─ showToast('이미지를 불러오지 못했어요', 'error')
  │
  └─ finally: setIsInstagramLoading(false)
```

### 상세 구현 의사코드 (Pseudocode)

```typescript
const handleInstagram = async () => {
  setIsInstagramLoading(true);
  try {
    const canShareFiles =
      typeof navigator !== 'undefined' &&
      'canShare' in navigator;

    if (canShareFiles) {
      // 모바일: 파일 공유 시도
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'dongeun-gallery.jpg', { type: blob.type || 'image/jpeg' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: '동은교회 초등부 사진첩',
        });
        // 성공 시 특별 처리 없음 (시스템 공유 시트가 처리)
      } else {
        // files 공유 불가 → 다운로드 폴백
        triggerDownload(imageUrl);
        showToast('이미지를 저장했어요! Instagram 앱에서 공유해보세요 📸', 'success');
      }
    } else {
      // 데스크탑: 다운로드 폴백
      triggerDownload(imageUrl);
      showToast('이미지를 저장했어요! Instagram 앱에서 공유해보세요 📸', 'success');
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // 사용자가 공유 취소 → 무시
      return;
    }
    showToast('이미지를 불러오지 못했어요', 'error');
  } finally {
    setIsInstagramLoading(false);
  }
};

// 다운로드 헬퍼 (인라인 함수)
const triggerDownload = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dongeun-gallery.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
```

---

## 5. UI 설계

### 5.1 버튼 레이아웃 (변경 후)

```
┌────────────────────────────────────────────────────────┐
│  [K 카카오톡]  [📷 Instagram]  [📋 URL 복사]  [↗ 공유] │
└────────────────────────────────────────────────────────┘
```

> 네이티브 공유 버튼(`↗ 공유`)은 `navigator.share` 지원 시에만 표시 (기존 조건 유지)

### 5.2 Instagram 버튼 JSX

```tsx
{/* Instagram 공유 버튼 */}
<button
  onClick={handleInstagram}
  disabled={isInstagramLoading}
  aria-label="Instagram으로 공유"
  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
  style={{
    background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
  }}
>
  {isInstagramLoading ? (
    <svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity={0.25} />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  ) : (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )}
  Instagram
</button>
```

### 5.3 토스트 JSX

```tsx
{/* 토스트 메시지 */}
{toast && (
  <div
    className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg transition-all ${
      toast.type === 'error' ? 'bg-red-500' : 'bg-gray-800'
    }`}
  >
    {toast.message}
  </div>
)}
```

> 토스트는 컴포넌트 최상단 `<div>` 바깥(또는 `return` 내 최상위)에 배치하여 버튼 레이아웃과 분리

---

## 6. 전체 컴포넌트 구조 (After)

```typescript
'use client';

// 기존 imports (유지)
import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { Share2, Copy, Check } from 'lucide-react';
import { initKakao } from '@/lib/kakao';

interface GalleryShareButtonsProps {
  title: string;
  imageUrl: string;
}

export default function GalleryShareButtons({ title, imageUrl }: GalleryShareButtonsProps) {
  // 기존 상태 (유지)
  const [copied, setCopied] = useState(false);
  const [jsKey, setJsKey] = useState<string | null>(null);

  // 신규 상태
  const [isInstagramLoading, setIsInstagramLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ... 기존 useEffect, handleSdkLoad, handleCopy, handleKakao (모두 유지)

  // 신규: showToast 헬퍼
  const showToast = (message: string, type: 'success' | 'error' = 'success') => { ... };

  // 신규: triggerDownload 헬퍼
  const triggerDownload = (url: string) => { ... };

  // 신규: handleInstagram 핸들러
  const handleInstagram = async () => { ... };

  return (
    <>
      {/* 토스트 (포탈 없이 fixed positioning 활용) */}
      {toast && <div className="fixed ...">...</div>}

      <div className="flex items-center gap-2">
        {/* 기존: 카카오 SDK 스크립트 (유지) */}
        {/* 기존: 카카오톡 버튼 (유지) */}

        {/* 신규: Instagram 버튼 */}
        <button onClick={handleInstagram} ...>
          {isInstagramLoading ? <Spinner /> : <InstagramIcon />}
          Instagram
        </button>

        {/* 기존: URL 복사 버튼 (유지) */}
        {/* 기존: 네이티브 공유 버튼 (유지, 조건부) */}
      </div>
    </>
  );
}
```

---

## 7. S3 CORS 고려사항

`fetch(imageUrl)`로 S3 URL에 접근 시 CORS 오류 발생 가능.

### 확인 필요 사항
- S3 버킷 CORS 설정에 앱 도메인(`https://your-domain.com`)이 허용되어 있는지
- 개발 환경: `http://localhost:3000` 허용 여부

### 폴백 전략 (CORS 오류 시)
`handleInstagram`의 `catch` 블록이 CORS 오류도 캡처하므로, 자동으로 에러 토스트 표시.
단, 에러 메시지를 더 명확하게 하려면 `response.ok` 확인 후 분기 가능:

```typescript
const response = await fetch(imageUrl);
if (!response.ok) throw new Error('fetch-failed');
```

---

## 8. 브라우저 호환성

| 환경 | `navigator.canShare` | Files 공유 | 동작 |
|------|----------------------|------------|------|
| iOS Safari 15+ | ✅ | ✅ | Instagram Stories로 공유 가능 |
| Android Chrome 89+ | ✅ | ✅ | Instagram으로 공유 가능 |
| Chrome (데스크탑) | ✅ (일부) | ❌ | 다운로드 폴백 |
| Firefox | ❌ | ❌ | 다운로드 폴백 |
| Safari (macOS) | ❌ | ❌ | 다운로드 폴백 |

---

## 9. 완료 기준 대비 설계 매핑

| 완료 기준 (Plan) | 설계 요소 |
|----------------|----------|
| Instagram 버튼 표시 | §5.2 Instagram 버튼 JSX |
| 모바일: 파일 공유 시트 | §4 handleInstagram() → 2단계-A |
| 데스크탑: 이미지 다운로드 + 토스트 | §4 handleInstagram() → 2단계-B |
| 로딩 상태 표시 | `isInstagramLoading` 상태 + SVG 스피너 |
| CORS/네트워크 에러 처리 | `catch` 블록 → `showToast(..., 'error')` |
| 브랜드 그라데이션 | `style={{ background: 'linear-gradient(...)' }}` |
| 기존 버튼 정상 동작 | 기존 코드 무변경 |

---

## 10. 구현 체크리스트

- [ ] `isInstagramLoading` 상태 추가
- [ ] `toast` 상태 추가 (`{ message, type } | null`)
- [ ] `showToast()` 헬퍼 함수 추가
- [ ] `triggerDownload()` 헬퍼 함수 추가
- [ ] `handleInstagram()` 비동기 핸들러 구현
  - [ ] `navigator.canShare` 분기
  - [ ] `fetch → Blob → File → navigator.share` (모바일)
  - [ ] `triggerDownload` + `showToast` (데스크탑 폴백)
  - [ ] `AbortError` 무시, 기타 에러 토스트
  - [ ] `finally` 로딩 상태 해제
- [ ] Instagram 버튼 JSX 추가 (그라데이션 스타일, 로딩 스피너, Instagram SVG 아이콘)
- [ ] 토스트 JSX 추가 (`fixed bottom-4`)
- [ ] `return` 최상위를 `<>...</>` Fragment로 감싸기 (토스트 + 버튼 묶음)
