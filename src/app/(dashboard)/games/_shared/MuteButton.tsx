'use client';

import { useState } from 'react';
import { soundEngine } from './soundEngine';

export default function MuteButton() {
  const [muted, setMuted] = useState(false);

  function toggle() {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  }

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 shadow text-lg hover:bg-white transition-colors"
      title={muted ? '소리 켜기' : '소리 끄기'}
    >
      {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
    </button>
  );
}
