'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Photo {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
}

interface PhotoViewerProps {
  photos: Photo[];
}

export default function PhotoViewer({ photos }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < photos.length) {
      setCurrentIndex(index);
    }
  }, [photos.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  if (photos.length === 0) return null;

  return (
    <>
      <div className="relative bg-slate-900 rounded-xl overflow-hidden">
        {/* Main Image */}
        <div
          className="relative aspect-[4/3] cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setFullscreen(true)}
        >
          <img
            src={photos[currentIndex].imageUrl}
            alt={`Photo ${currentIndex + 1}`}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="text-white" size={24} />
              </button>
            )}
            {currentIndex < photos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="text-white" size={24} />
              </button>
            )}
          </>
        )}

        {/* Dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-white w-4' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        {photos.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10"
          >
            &times;
          </button>
          <img
            src={photos[currentIndex].imageUrl}
            alt={`Photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
          {photos.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  <ChevronLeft className="text-white" size={28} />
                </button>
              )}
              {currentIndex < photos.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  <ChevronRight className="text-white" size={28} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
