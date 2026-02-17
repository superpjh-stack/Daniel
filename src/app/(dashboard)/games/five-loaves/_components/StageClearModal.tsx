'use client';

import type { Disciple, DiscipleId } from '../_lib/types';

interface Props {
  stage: number;
  verse: string;
  verseRef: string;
  score: number;
  servedCount: number;
  disciples: Disciple[];
  upgradePoints: number;
  onUpgrade: (discipleId: DiscipleId) => void;
  onNext: () => void;
}

export default function StageClearModal({
  stage, verse, verseRef, score, servedCount,
  disciples, upgradePoints, onUpgrade, onNext,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="text-4xl">{'\u{1F35E}'}</div>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">
            Stage {stage} 클리어!
          </h3>
          <p className="text-sm text-amber-600 font-medium mt-1">
            {servedCount}명에게 음식을 나눠주었습니다!
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

        <div className="text-center text-sm text-slate-600">
          <span className="block text-lg font-bold text-slate-800">{score.toLocaleString()}</span>
          현재 점수
        </div>

        {/* Disciple upgrade section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700">제자 업그레이드</h4>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              포인트: {upgradePoints}
            </span>
          </div>

          <div className="space-y-1.5">
            {disciples.map((d) => {
              const isMaxLevel = d.level >= 3;
              const cost = isMaxLevel ? 0 : d.cost[d.level];
              const canAfford = upgradePoints >= cost;
              const canBuy = !isMaxLevel && canAfford;

              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${
                    canBuy
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800">{d.name}</span>
                      <span className="text-xs text-slate-500">Lv.{d.level}</span>
                      {d.level > 0 && (
                        <span className="text-xs">
                          {'⭐'.repeat(d.level)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{d.description}</p>
                  </div>
                  {isMaxLevel ? (
                    <span className="text-xs text-green-600 font-bold whitespace-nowrap">MAX</span>
                  ) : (
                    <button
                      onClick={() => onUpgrade(d.id)}
                      disabled={!canBuy}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                        canBuy
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {cost}pt
                    </button>
                  )}
                </div>
              );
            })}
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
