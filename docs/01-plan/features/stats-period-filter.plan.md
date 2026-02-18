# Plan: 통계 기간 필터 버그 수정

**Feature**: stats-period-filter
**Date**: 2026-02-18
**Type**: Bug Fix
**Priority**: High

---

## 1. 문제 정의

### 증상
통계 메뉴(`/stats`)에서 "최근 1개월", "최근 3개월", "최근 1년" 버튼을 클릭해도 데이터가 바뀌지 않음.

### 근본 원인 (코드 분석 완료)

**원인 1: API 라우트가 `period` 파라미터를 무시**
- `src/app/api/stats/route.ts`는 `period` 쿼리 파라미터를 수신하지만 읽지 않음
- DB 함수들을 파라미터 없이 항상 동일하게 호출

**원인 2: DB 함수들에 기간 파라미터 없음**
- `getWeeklyAttendanceStats()` → 하드코딩 28일 (4주)
- `getAttendanceRanking(limit)` → 하드코딩 30일
- `getTopStudentsByTalent(limit)` → 기간 필터링 자체 없음 (현재 잔액만 반환)

---

## 2. 수정 범위

### 수정할 파일
1. `src/lib/db.ts` — DB 함수에 `startDate` 파라미터 추가
2. `src/app/api/stats/route.ts` — `period`를 읽어 날짜 범위 계산 후 DB 함수에 전달

### 기간 매핑
| period 값 | 의미 | 조회 기간 |
|-----------|------|-----------|
| `month` | 최근 1개월 | 30일 |
| `quarter` | 최근 3개월 | 90일 |
| `year` | 최근 1년 | 365일 |

---

## 3. 수정 계획

### Step 1: `getWeeklyAttendanceStats(startDate)` 수정
- 파라미터: `startDate: Date` 추가
- 기존 하드코딩 `fourWeeksAgo` 제거 → `startDate` 사용
- 반환: 기간에 따라 주별 그룹핑된 데이터

### Step 2: `getAttendanceRanking(limit, startDate)` 수정
- 파라미터: `startDate: Date` 추가
- 기존 하드코딩 `thirtyDaysAgo` 제거 → `startDate` 사용

### Step 3: `getTopStudentsByTalent(limit, startDate)` 확인
- 달란트 랭킹은 "기간 내 획득 달란트"가 아닌 "현재 잔액" 기반
- 기간 필터 추가 여부 결정 필요

### Step 4: `src/app/api/stats/route.ts` 수정
- `request.nextUrl.searchParams.get('period')` 로 파라미터 읽기
- 기간별 `startDate` 계산
- 수정된 DB 함수에 `startDate` 전달

---

## 4. 예상 결과
- 버튼 클릭 시 실제로 해당 기간 데이터를 반환
- `최근 1개월` → 최근 30일 주별 출석 데이터
- `최근 3개월` → 최근 90일 주별 출석 데이터 (더 많은 주 표시)
- `최근 1년` → 최근 365일 (월별 또는 주별 집계)

---

## 5. 고려사항
- 1년 기간의 경우 주별 집계 시 52주가 되어 너무 많을 수 있음 → 월별 집계로 변경 고려
- 기존 함수 시그니처 변경이므로 다른 호출부 확인 필요
