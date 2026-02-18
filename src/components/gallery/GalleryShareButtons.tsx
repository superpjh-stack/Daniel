'use client';

import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { Share2, Copy, Check } from 'lucide-react';
import { initKakao } from '@/lib/kakao';

interface GalleryShareButtonsProps {
  title: string;
  imageUrl: string;
}

export default function GalleryShareButtons({ title, imageUrl }: GalleryShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [jsKey, setJsKey] = useState<string | null>(null);
  const [isInstagramLoading, setIsInstagramLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.kakao_js_key) setJsKey(data.kakao_js_key);
      })
      .catch(() => {});
  }, []);

  const handleSdkLoad = useCallback(() => {
    if (jsKey) initKakao(jsKey);
  }, [jsKey]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const triggerDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dongeun-gallery.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleInstagram = async () => {
    setIsInstagramLoading(true);
    try {
      const canShareFiles =
        typeof navigator !== 'undefined' && 'canShare' in navigator;

      if (canShareFiles) {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('fetch-failed');
        const blob = await response.blob();
        const file = new File([blob], 'dongeun-gallery.jpg', {
          type: blob.type || 'image/jpeg',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title,
            text: '동은교회 초등부 사진첩',
          });
        } else {
          triggerDownload(imageUrl);
          showToast('이미지를 저장했어요! Instagram 앱에서 공유해보세요 📸');
        }
      } else {
        triggerDownload(imageUrl);
        showToast('이미지를 저장했어요! Instagram 앱에서 공유해보세요 📸');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showToast('이미지를 불러오지 못했어요', 'error');
    } finally {
      setIsInstagramLoading(false);
    }
  };

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
    if (!jsKey) {
      alert('카카오 앱 키가 설정되지 않았습니다.\n설정 > 카카오 탭에서 앱 키를 등록해주세요.');
      return;
    }
    if (typeof window !== 'undefined' && window.Kakao && !window.Kakao.isInitialized()) {
      initKakao(jsKey);
    }
    if (!window.Kakao?.isInitialized()) {
      alert('카카오톡 공유를 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description: '동은교회 초등부 사진첩',
        imageUrl,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: '사진 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
  };

  return (
    <>
      {/* 토스트 메시지 */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg pointer-events-none ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-gray-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* 카카오 SDK 스크립트 */}
        {jsKey && (
          <Script
            src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
            strategy="lazyOnload"
            onLoad={handleSdkLoad}
            crossOrigin="anonymous"
          />
        )}

        {/* 카카오톡 공유 */}
        <button
          onClick={handleKakao}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors"
        >
          <span className="font-bold">K</span>
          카카오톡
        </button>

        {/* Instagram 공유 */}
        <button
          onClick={handleInstagram}
          disabled={isInstagramLoading}
          aria-label="Instagram으로 공유"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{
            background:
              'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
          }}
        >
          {isInstagramLoading ? (
            <svg
              className="animate-spin"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M21 12a9 9 0 00-9-9" />
            </svg>
          ) : (
            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          )}
          Instagram
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
    </>
  );
}
