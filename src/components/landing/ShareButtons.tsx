'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

interface ShareButtonsProps {
  title: string;
  imageUrl: string;
}

export default function ShareButtons({ title, imageUrl }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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
    const w = window as typeof window & { Kakao?: { isInitialized: () => boolean; Share: { sendDefault: (opts: Record<string, unknown>) => void } } };
    if (w.Kakao && w.Kakao.isInitialized()) {
      w.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: '동은교회 초등부',
          imageUrl: imageUrl,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '방문하기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } else {
      alert('카카오톡 공유 기능이 준비되지 않았습니다.');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors"
      >
        <Share2 className="w-5 h-5 text-white" />
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 bg-white rounded-xl shadow-xl p-2 min-w-[140px] z-20">
          {/* 카카오톡 */}
          <button
            onClick={handleKakao}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-yellow-50 rounded-lg transition-colors"
          >
            <span className="w-5 h-5 bg-yellow-400 rounded-sm flex items-center justify-center text-xs font-bold text-yellow-900">K</span>
            카카오톡
          </button>

          {/* URL 복사 */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-green-600">복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 text-slate-400" />
                URL 복사
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
