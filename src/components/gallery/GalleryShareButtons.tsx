'use client';

import { useState, useEffect } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

interface KakaoSDK {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: { sendDefault: (opts: Record<string, unknown>) => void };
}

interface GalleryShareButtonsProps {
  title: string;
  imageUrl: string;
}

export default function GalleryShareButtons({ title, imageUrl }: GalleryShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!kakaoKey) return;

    const initKakao = () => {
      const w = window as typeof window & { Kakao?: KakaoSDK };
      if (w.Kakao && !w.Kakao.isInitialized()) {
        w.Kakao.init(kakaoKey);
      }
      if (w.Kakao?.isInitialized()) {
        setKakaoReady(true);
      }
    };

    // SDK가 이미 로드된 경우
    if ((window as typeof window & { Kakao?: KakaoSDK }).Kakao) {
      initKakao();
      return;
    }

    // SDK 로딩 대기
    const check = setInterval(() => {
      if ((window as typeof window & { Kakao?: KakaoSDK }).Kakao) {
        clearInterval(check);
        initKakao();
      }
    }, 300);

    return () => clearInterval(check);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKakao = () => {
    const w = window as typeof window & { Kakao?: KakaoSDK };
    if (w.Kakao && w.Kakao.isInitialized()) {
      w.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: '동은교회 초등부 사진첩',
          imageUrl: imageUrl,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '사진 보기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } else {
      alert('카카오톡 공유 기능을 사용하려면 카카오 앱 키 설정이 필요합니다.');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 카카오톡 */}
      <button
        onClick={handleKakao}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors"
      >
        <span className="font-bold">K</span>
        카카오톡
      </button>

      {/* URL 복사 */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
      >
        {copied ? (
          <>
            <Check size={14} className="text-green-500" />
            <span className="text-green-600">복사됨!</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            URL 복사
          </>
        )}
      </button>

      {/* Native Share (mobile) */}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={() => navigator.share({ title, url: shareUrl })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <Share2 size={14} />
          공유
        </button>
      )}
    </div>
  );
}
