'use client';

interface Props {
  stage: number;
  verse: string;
  verseRef: string;
  score: number;
  starsCollected: number;
  totalStars: number;
  onNext: () => void;
}

export default function StageClearModal({
  stage, verse, verseRef, score,
  starsCollected, totalStars, onNext,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
        <div className="text-center">
          <div className="text-4xl">{'\uD83D\uDC11'}</div>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">
            Stage {stage} 클리어!
          </h3>
          <p className="text-sm text-green-600 font-medium mt-1">
            잃은 양을 무사히 데려왔습니다!
          </p>
        </div>

        {/* Bible verse */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-1">
          <p className="text-slate-700 font-medium italic leading-relaxed text-sm">
            &ldquo;{verse}&rdquo;
          </p>
          <p className="text-xs text-slate-500">
            &mdash; {verseRef}
          </p>
        </div>

        <div className="flex justify-center gap-6 text-center text-sm text-slate-600">
          <div>
            <span className="block text-lg font-bold text-slate-800">{score.toLocaleString()}</span>
            점수
          </div>
          <div>
            <span className="block text-lg font-bold text-amber-600">{'\u2B50'} {starsCollected}/{totalStars}</span>
            별 수집
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors"
        >
          다음 스테이지 &rarr;
        </button>
      </div>
    </div>
  );
}
