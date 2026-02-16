'use client';

interface Props {
  stage: number;
  verse: string;
  verseRef: string;
  score: number;
  onNext: () => void;
}

export default function StageClearModal({ stage, verse, verseRef, score, onNext }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
        <div className="text-4xl">{'\u2694\uFE0F'}</div>

        <h3 className="text-2xl font-bold text-slate-800">
          Stage {stage} 클리어!
        </h3>

        <p className="text-sm text-amber-600 font-medium">
          골리앗에게 승리했습니다!
        </p>

        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
          <p className="text-slate-700 font-medium italic leading-relaxed">
            &ldquo;{verse}&rdquo;
          </p>
          <p className="text-xs text-slate-500">
            &mdash; {verseRef}
          </p>
        </div>

        <div className="text-sm text-slate-600">
          <span className="block text-lg font-bold text-slate-800">{score.toLocaleString()}</span>
          현재 점수
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
