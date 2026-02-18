'use client';

import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { initKakao, type KakaoFeedOptions } from '@/lib/kakao';

interface KakaoShareButtonProps {
  options: KakaoFeedOptions;
  className?: string;
}

export default function KakaoShareButton({ options, className = '' }: KakaoShareButtonProps) {
  const [jsKey, setJsKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.kakao_js_key) setJsKey(data.kakao_js_key);
      })
      .catch(() => {});
  }, []);

  // SDK 로드 완료 시 초기화
  const handleSdkLoad = useCallback(() => {
    if (jsKey) initKakao(jsKey);
  }, [jsKey]);

  const handleClick = () => {
    if (!jsKey) {
      alert('카카오 앱 키가 설정되지 않았습니다.\n관리자에게 문의하세요.');
      return;
    }
    // SDK가 아직 초기화되지 않은 경우 지금 초기화 시도
    if (typeof window !== 'undefined' && window.Kakao && !window.Kakao.isInitialized()) {
      initKakao(jsKey);
    }
    if (!window.Kakao?.isInitialized()) {
      alert('카카오톡 공유를 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    window.Kakao.Share.sendDefault(options);
  };

  return (
    <>
      {jsKey && (
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          strategy="lazyOnload"
          onLoad={handleSdkLoad}
          crossOrigin="anonymous"
        />
      )}
      <button
        onClick={handleClick}
        disabled={!jsKey}
        title={!jsKey ? '관리자에게 카카오 앱 키 설정을 요청하세요' : '카카오톡으로 공유'}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
          bg-[#FEE500] text-[#3C1E1E] hover:bg-[#F5DC00] active:bg-[#e6d000]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all shadow-sm ${className}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.477 3 2 6.477 2 10.955c0 2.821 1.67 5.29 4.2 6.812l-.87 3.2a.3.3 0 0 0 .456.332l3.89-2.59A11.3 11.3 0 0 0 12 18.91c5.523 0 10-3.477 10-7.955C22 6.477 17.523 3 12 3z"/>
        </svg>
        카카오톡 공유
      </button>
    </>
  );
}
