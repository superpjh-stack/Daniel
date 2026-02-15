'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import ShareButtons from './ShareButtons';

interface HeroMedia {
  id: string;
  title: string;
  subtitle: string | null;
  mediaType: string;
  mediaUrl: string;
  youtubeId: string | null;
  thumbnailUrl: string | null;
}

interface HeroCarouselProps {
  media: HeroMedia[];
}

export default function HeroCarousel({ media }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const total = media.length;

  const goTo = useCallback((idx: number) => {
    setCurrent(((idx % total) + total) % total);
    setPlayingVideo(null);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // 자동 슬라이드 (5초)
  useEffect(() => {
    if (total <= 1 || playingVideo) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, total, playingVideo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  };

  if (total === 0) {
    return (
      <section className="relative w-full h-[60vh] md:h-[80vh] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white px-6">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            동은교회 초등부에 오신 것을 환영합니다
          </h1>
          <p className="text-lg md:text-xl opacity-90">
            함께 성장하는 믿음의 어린이들
          </p>
        </div>
      </section>
    );
  }

  const item = media[current];

  return (
    <section
      className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 미디어 */}
      {item.mediaType === 'youtube' && item.youtubeId ? (
        playingVideo === item.id ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0">
            <img
              src={item.thumbnailUrl || `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setPlayingVideo(item.id)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 md:w-10 md:h-10 text-red-600 ml-1" fill="currentColor" />
              </div>
            </button>
          </div>
        )
      ) : (
        <img
          src={item.mediaUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading={current === 0 ? 'eager' : 'lazy'}
        />
      )}

      {/* 오버레이 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      {/* 텍스트 오버레이 */}
      <div className="absolute bottom-20 md:bottom-28 left-0 right-0 px-6 md:px-12 text-white z-10">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 drop-shadow-lg">
          {item.title}
        </h2>
        {item.subtitle && (
          <p className="text-base md:text-xl opacity-90 drop-shadow-md">
            {item.subtitle}
          </p>
        )}
      </div>

      {/* 공유 버튼 */}
      <div className="absolute bottom-20 md:bottom-28 right-4 md:right-12 z-10">
        <ShareButtons
          title={item.title}
          imageUrl={item.thumbnailUrl || item.mediaUrl}
        />
      </div>

      {/* 좌우 네비게이션 */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* 인디케이터 도트 */}
      {total > 1 && (
        <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
