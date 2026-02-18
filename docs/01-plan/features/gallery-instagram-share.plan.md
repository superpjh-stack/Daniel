# Feature Plan: gallery-instagram-share

## 메타데이터
- **기능명**: gallery-instagram-share
- **작성일**: 2026-02-19
- **우선순위**: Medium
- **예상 복잡도**: Low-Medium
- **관련 기능**: photo-gallery, kakao-parent-share

---

## 1. 개요 (Overview)

### 1.1 배경
현재 `GalleryShareButtons` 컴포넌트에는 카카오톡 공유, URL 복사, 네이티브 공유(모바일) 3가지 버튼이 있습니다.
Instagram 공유 버튼을 추가하여 학부모/교사가 사진첩 게시글을 Instagram Story 또는 일반 포스트로 공유할 수 있게 합니다.

### 1.2 목표
- `GalleryShareButtons.tsx`에 Instagram 공유 버튼 추가
- 모바일: Instagram 앱 딥링크로 바로 열기 (Stories 공유 우선)
- 데스크탑: 이미지 다운로드 + 안내 메시지 (Instagram은 웹 공유 API 미지원)
- 기존 버튼 UI 스타일 일관성 유지

---

## 2. 기술 분석 (Technical Analysis)

### 2.1 Instagram 공유 방식 비교

| 방법 | 모바일 | 데스크탑 | 구현 복잡도 | 비고 |
|------|--------|----------|------------|------|
| **Web Share API** (`navigator.share`) | ✅ Instagram 포함 | ❌ | 없음 (이미 존재) | 이미 "공유" 버튼이 처리 |
| **Instagram Story 딥링크** | ✅ | ❌ | 낮음 | `instagram://story-camera?backgroundImage=...` |
| **Instagram App 딥링크** | ✅ | ❌ | 낮음 | `instagram://app` (앱만 열림) |
| **Instagram Web Sharing API** | ✅ | ✅ (일부) | 높음 | Facebook 파트너 앱만 사용 가능 |
| **이미지 다운로드 유도** | ✅ | ✅ | 없음 | UX 불편하지만 항상 가능 |

### 2.2 선택 전략

**모바일 (최우선)**:
- Instagram Stories 딥링크: `instagram://story-camera?backgroundImage={encodedImageUrl}`
  - 단, `backgroundImage`는 `content://` 또는 로컬 URI만 허용 (S3 직접 URL 미지원)
  - 대안: `navigator.share({ files: [...] })` — 이미지 파일을 공유하면 Instagram Stories로 전달 가능
- **최종 채택**: `navigator.share({ files: [imageFile] })` — Blob으로 이미지를 가져와 File 객체로 공유
  - iOS Safari, Android Chrome 지원
  - Instagram이 파일 수신 앱으로 표시됨

**데스크탑**:
- Instagram은 공식 웹 공유 URL 미지원
- 이미지 다운로드 버튼 제공 + "Instagram 앱에서 공유하세요" 토스트 안내

### 2.3 구현 흐름

```
Instagram 버튼 클릭
  ↓
canShareFiles() 확인 (navigator.canShare({ files }))
  ├─ 지원 (모바일): Fetch imageUrl → Blob → File → navigator.share({ files })
  │    → 공유 시트에서 Instagram 선택 가능
  └─ 미지원 (데스크탑/구버전): 이미지 URL로 <a download> 생성 후 클릭
       → 토스트: "이미지를 다운로드했습니다. Instagram 앱에서 공유해보세요!"
```

---

## 3. 사용자 스토리 (User Stories)

- **US-01**: 모바일에서 사진첩 게시글의 Instagram 버튼을 클릭하면 공유 시트가 열리고 Instagram으로 바로 공유할 수 있다
- **US-02**: 데스크탑에서 Instagram 버튼을 클릭하면 이미지가 다운로드되고 Instagram에서 직접 게시하라는 안내가 표시된다
- **US-03**: Instagram 버튼은 Instagram 브랜드 컬러(그라데이션)로 직관적으로 식별된다

---

## 4. 기능 요구사항 (Functional Requirements)

### FR-01: Instagram 공유 버튼 UI
- `GalleryShareButtons.tsx`에 Instagram 버튼 추가
- 스타일: Instagram 브랜드 그라데이션 (자주-핑크-오렌지 `#833ab4 → #fd1d1d → #fcb045`)
- 텍스트 및 아이콘: Instagram 로고 또는 📷 아이콘 + "Instagram" 텍스트
- 기존 버튼과 동일한 크기(`px-3 py-1.5 text-xs`)

### FR-02: 모바일 파일 공유
- `navigator.canShare({ files: [...] })`로 파일 공유 지원 여부 확인
- 지원 시: `imageUrl`에서 Blob 가져오기 → `File` 객체 생성 → `navigator.share({ files, title, text })`
- 파일명: `dongeun-gallery-{postId}.jpg`
- 공유 title: 게시글 제목, text: "동은교회 초등부 사진첩"

### FR-03: 데스크탑 다운로드 폴백
- 파일 공유 미지원 시: `imageUrl`로 `<a>` 태그 생성 후 다운로드 트리거
- 다운로드 후 토스트 메시지: "이미지를 저장했어요! Instagram 앱에서 공유해보세요 📸"
- 토스트는 3초 후 자동 사라짐

### FR-04: 로딩 상태
- 이미지 Fetch 중 버튼에 로딩 스피너 표시
- Fetch 실패 시 에러 토스트: "이미지를 불러오는데 실패했습니다"

---

## 5. 비기능 요구사항 (Non-Functional Requirements)

- **플랫폼**: 모바일 우선 (Instagram은 모바일이 주 사용 환경)
- **성능**: 이미지 Fetch는 버튼 클릭 시에만 수행 (사전 로딩 없음)
- **접근성**: 버튼에 `aria-label="Instagram으로 공유"` 추가
- **에러 처리**: CORS 오류, 네트워크 오류, 공유 취소 모두 처리

---

## 6. 영향 범위 (Scope of Changes)

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/components/gallery/GalleryShareButtons.tsx` | Instagram 공유 버튼 + 로직 추가 |

### 신규 파일
없음 — 기존 컴포넌트에만 추가

### DB 변경 없음

---

## 7. UI 설계 (UI Design)

### 현재 버튼 배치
```
[K 카카오톡] [📋 URL 복사] [↗ 공유]
```

### 변경 후 버튼 배치
```
[K 카카오톡] [📷 Instagram] [📋 URL 복사] [↗ 공유]
```

### Instagram 버튼 스타일
```css
/* 그라데이션 배경 */
background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)

/* 또는 Tailwind 인라인 스타일로 처리 */
style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
className="text-white rounded-lg hover:opacity-80 transition-opacity"
```

---

## 8. 기술적 제약사항 (Constraints)

### S3 CORS 설정 필요
- `imageUrl`이 S3 URL인 경우 `fetch(imageUrl)` 시 CORS 오류 가능
- 해결책: S3 버킷의 CORS 설정에 앱 도메인 추가 (기존 갤러리 업로드용 설정 활용 가능)
- 또는: `thumbnailUrl` 우선 사용 (썸네일은 이미 브라우저에서 로딩됨 → 캐시 활용)

### Instagram Web API 미지원
- Instagram은 공식적으로 웹 사이트에서 직접 Instagram에 포스팅하는 API를 일반 개발자에게 제공하지 않음
- Facebook Graph API의 Instagram Content Publishing은 Business Account + App Review 필요
- 따라서 `navigator.share` + 다운로드 방식이 현실적인 최선

---

## 9. 완료 조건 (Acceptance Criteria)

- [ ] Instagram 버튼이 갤러리 상세 페이지 공유 버튼 영역에 표시됨
- [ ] 모바일(iOS/Android)에서 클릭 시 파일 공유 시트가 열리고 Instagram이 표시됨
- [ ] 데스크탑에서 클릭 시 이미지가 다운로드되고 안내 토스트가 표시됨
- [ ] 이미지 로딩 중 버튼에 로딩 상태 표시됨
- [ ] CORS 또는 네트워크 오류 시 에러 메시지 표시됨
- [ ] Instagram 버튼이 브랜드 그라데이션 컬러로 표시됨
- [ ] 기존 카카오톡, URL 복사, 네이티브 공유 버튼 정상 동작 유지

---

## 10. 구현 순서 (Implementation Order)

1. `GalleryShareButtons.tsx` 상태 추가 (`isInstagramLoading`, 토스트 상태)
2. `handleInstagram()` 핸들러 구현
   - `navigator.canShare` 체크
   - 모바일: `fetch` → `Blob` → `File` → `navigator.share`
   - 데스크탑: `<a download>` 트리거
3. Instagram 버튼 UI 추가 (그라데이션 스타일)
4. 토스트 UI 추가 (성공/에러 메시지)
5. 로딩 스피너 추가

---

## 11. 관련 문서
- 갤러리 기능 전체 계획: `docs/01-plan/features/photo-gallery.plan.md`
- 카카오 공유 참고: `docs/01-plan/features/kakao-parent-share.plan.md`
- 현재 구현: `src/components/gallery/GalleryShareButtons.tsx`
