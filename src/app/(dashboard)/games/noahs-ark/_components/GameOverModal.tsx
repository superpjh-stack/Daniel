'use client';

import { useState } from 'react';
import type { RewardResult } from '../_lib/types';
import { soundEngine } from '../../_shared/soundEngine';

interface Props {
  score: number;
  stageCleared: number;
  quizCorrect: number;
  quizTotal: number;
  isAllClear: boolean;
  studentId?: string;
  onRestart: () => void;
}

export default function GameOverModal({
  score, stageCleared, quizCorrect, quizTotal, isAllClear, studentId, onRestart,
}: Props) {
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  async function handleClaimReward() {
    if (!studentId || claimed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/games/noahs-ark/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, score, stageCleared, quizCorrect, quizTotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '보상 지급에 실패했습니다.');
      } else {
        setReward(data);
        setClaimed(true);
        soundEngine.playRewardClaim();
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-center text-2xl font-bold">
          {isAllClear ? '축하합니다!' : '게임 오버'}
        </h3>

        {isAllClear && (
          <p className="text-center text-amber-600 font-medium">
            🚢 방주 완성! Stage 5 올클리어!
          </p>
        )}

        <div className="space-y-2 text-center text-sm text-slate-600">
          <p>최종 점수: <span className="font-bold text-slate-900">{score.toLocaleString()}</span></p>
          <p>클리어 스테이지: <span className="font-bold text-slate-900">{stageCleared}</span></p>
          {quizTotal > 0 && (
            <p>퀴즈: <span className="font-bold text-slate-900">{quizCorrect}/{quizTotal}</span> 정답</p>
          )}
        </div>

        {reward && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center space-y-1">
            <p className="text-amber-700 font-bold">
              달란트 +{reward.reward.talentEarned} 획득!
            </p>
            <p className="text-xs text-amber-600">
              스테이지 보상 +{reward.reward.breakdown.stageClear}
              {reward.reward.breakdown.quizBonus > 0 && ` / 퀴즈 보너스 +${reward.reward.breakdown.quizBonus}`}
            </p>
            <p className="text-xs text-slate-500">
              현재 잔액: {reward.newBalance} 달란트
            </p>
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-2">
          {studentId && !claimed && (
            <button
              onClick={handleClaimReward}
              disabled={loading}
              className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {loading ? '지급 중...' : '보상 받기'}
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors"
          >
            다시하기
          </button>
          <button
            onClick={() => window.location.href = '/games'}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            목록으로
          </button>
        </div>
      </div>
    </div>
  );
}
