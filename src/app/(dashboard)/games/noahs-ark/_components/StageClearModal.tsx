'use client';

interface Props {
  stage: number;
  verse: string;
  verseRef: string;
  lines: number;
  score: number;
  onNext: () => void;
}

export default function StageClearModal({ stage, verse, verseRef, lines, score, onNext }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
        {/* 무지개 애니메이션 */}
        <div className="relative h-16 overflow-hidden">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 180deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
              opacity: 0.3,
              animation: 'spin 4s linear infinite',
            }}
          />
          <div className="relative flex items-center justify-center h-full">
            <span className="text-4xl">🌈</span>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-slate-800">
          Stage {stage} 클리어!
        </h3>

        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
          <p className="text-slate-700 font-medium italic leading-relaxed">
            &ldquo;{verse}&rdquo;
          </p>
          <p className="text-xs text-slate-500">
            — {verseRef}
          </p>
        </div>

        <div className="flex justify-center gap-6 text-sm text-slate-600">
          <div>
            <span className="block text-lg font-bold text-slate-800">{lines}</span>
            제거한 줄
          </div>
          <div>
            <span className="block text-lg font-bold text-slate-800">{score.toLocaleString()}</span>
            점수
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors"
        >
          다음 스테이지 →
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
