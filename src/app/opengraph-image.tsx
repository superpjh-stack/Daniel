import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '다니엘 - 동은교회 초등부 출석부';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #a855f7 50%, #ec4899 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorations */}
        <div style={{ position: 'absolute', top: 40, left: 60, fontSize: 48, opacity: 0.3, display: 'flex' }}>
          ⭐
        </div>
        <div style={{ position: 'absolute', top: 80, right: 100, fontSize: 36, opacity: 0.25, display: 'flex' }}>
          ✨
        </div>
        <div style={{ position: 'absolute', bottom: 60, left: 120, fontSize: 40, opacity: 0.2, display: 'flex' }}>
          🌟
        </div>
        <div style={{ position: 'absolute', bottom: 100, right: 80, fontSize: 32, opacity: 0.3, display: 'flex' }}>
          ⭐
        </div>
        <div style={{ position: 'absolute', top: 200, left: 40, fontSize: 28, opacity: 0.15, display: 'flex' }}>
          ✨
        </div>
        <div style={{ position: 'absolute', bottom: 200, right: 40, fontSize: 44, opacity: 0.2, display: 'flex' }}>
          🌟
        </div>

        {/* Main content card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 32,
            padding: '48px 80px',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          {/* Lion icon */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: 'linear-gradient(135deg, #f59e0b, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ fontSize: 64 }}>🦁</span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-2px',
              marginBottom: 8,
              textShadow: '0 4px 12px rgba(0,0,0,0.2)',
              display: 'flex',
            }}
          >
            다니엘
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.9)',
              marginBottom: 16,
              display: 'flex',
            }}
          >
            동은교회 초등부 출석부
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 22,
              color: 'rgba(255, 255, 255, 0.75)',
              display: 'flex',
              gap: 16,
            }}
          >
            <span>출석</span>
            <span>{'  '}{'  '}</span>
            <span>달란트</span>
            <span>{'  '}{'  '}</span>
            <span>성경퀴즈</span>
            <span>{'  '}{'  '}</span>
            <span>추천CCM</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
