/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface KakaoFeedOptions {
  objectType: 'feed';
  content: {
    title: string;
    description: string;
    imageUrl?: string;
    link: { mobileWebUrl: string; webUrl: string };
  };
  buttons?: { title: string; link: { mobileWebUrl: string; webUrl: string } }[];
}

export function initKakao(jsKey: string): void {
  if (typeof window === 'undefined') return;
  if (!(window as any).Kakao) return;
  if (window.Kakao.isInitialized()) return;
  window.Kakao.init(jsKey);
}

export function buildAttendanceShareOptions(params: {
  studentName: string;
  grade: number;
  className: string | null;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  streak: number;
  appUrl: string;
}): KakaoFeedOptions {
  const { studentName, grade, className, presentCount, lateCount, absentCount, streak, appUrl } = params;
  const classLabel = className ? ` · ${className}` : '';
  const streakLine = streak > 0 ? `\n🔥 연속 출석 ${streak}주!` : '';
  const link = { mobileWebUrl: `${appUrl}/parent/attendance`, webUrl: `${appUrl}/parent/attendance` };

  return {
    objectType: 'feed',
    content: {
      title: `${studentName} 어린이의 출석 현황`,
      description: `${grade}학년${classLabel}\n✅ 출석 ${presentCount}회  ⏰ 지각 ${lateCount}회  ❌ 결석 ${absentCount}회${streakLine}`,
      imageUrl: `${appUrl}/icons/icon-512x512.png`,
      link,
    },
    buttons: [{ title: '출석 내역 확인하기', link }],
  };
}

export function buildTalentShareOptions(params: {
  studentName: string;
  grade: number;
  talentBalance: number;
  monthEarned: number;
  appUrl: string;
}): KakaoFeedOptions {
  const { studentName, grade, talentBalance, monthEarned, appUrl } = params;
  const link = { mobileWebUrl: `${appUrl}/parent/talent`, webUrl: `${appUrl}/parent/talent` };

  return {
    objectType: 'feed',
    content: {
      title: `${studentName} 어린이의 달란트 현황`,
      description: `${grade}학년\n⭐ 현재 잔액: ${talentBalance} 달란트\n이번 달 획득: +${monthEarned} 달란트`,
      imageUrl: `${appUrl}/icons/icon-512x512.png`,
      link,
    },
    buttons: [{ title: '달란트 내역 확인하기', link }],
  };
}
