'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui';

interface QuizDetail {
  questionId: string;
  question: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
  reference: string | null;
  correctOption?: string;
}

interface QuizResultData {
  score: number;
  totalCount: number;
  details: QuizDetail[];
  answers: { questionId: string; selected: number }[];
}

interface SavedResult {
  earnedTalent: number;
  talentAwarded: boolean;
  studentMatched: boolean;
  newBalance: number;
  playerName: string;
}

export default function QuizResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('quizResult');
    if (!stored) {
      router.replace('/quiz');
      return;
    }
    try {
      setResult(JSON.parse(stored));
    } catch {
      router.replace('/quiz');
    }
  }, [router]);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { score, totalCount, details } = result;
  const wrongAnswers = details.filter(d => !d.isCorrect);

  let scoreColor = 'text-red-500';
  let scoreEmoji = '😢';
  let scoreMessage = '다음엔 더 잘할 수 있어요!';
  if (score === totalCount) {
    scoreColor = 'text-yellow-500';
    scoreEmoji = '🎉';
    scoreMessage = '만점! 정말 대단해요!';
  } else if (score >= 7) {
    scoreColor = 'text-green-500';
    scoreEmoji = '😊';
    scoreMessage = '훌륭해요!';
  } else if (score >= 4) {
    scoreColor = 'text-yellow-500';
    scoreEmoji = '🤔';
    scoreMessage = '잘했어요! 조금만 더 노력해봐요!';
  }

  const stars = Array.from({ length: totalCount }, (_, i) => i < score);

  async function handleSave() {
    if (!playerName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/quiz/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim(),
          answers: result!.answers,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '저장에 실패했습니다.');
        return;
      }
      const data = await res.json();
      setSavedResult(data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-5xl mb-2"
          >
            {scoreEmoji}
          </motion.div>

          <h1 className="text-lg font-bold text-slate-800 mb-3">퀴즈 완료!</h1>

          <div className={`text-5xl font-black ${scoreColor} mb-2`}>
            {score} <span className="text-2xl text-slate-400">/ {totalCount}</span>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-1 mb-3">
            {stars.map((filled, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`text-lg ${filled ? 'text-yellow-400' : 'text-slate-200'}`}
              >
                ★
              </motion.span>
            ))}
          </div>

          <p className="text-sm font-medium text-slate-600">{scoreMessage}</p>
        </Card>
      </motion.div>

      {/* Wrong Answers Review */}
      {wrongAnswers.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-red-500" />
            오답 복습 ({wrongAnswers.length}문제)
          </h2>
          <div className="space-y-3">
            {wrongAnswers.map((d, i) => (
              <motion.div
                key={d.questionId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <p className="text-sm font-medium text-slate-800 mb-2">{d.question}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle size={14} />
                    <span>내 답: 보기 {d.selected}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={14} />
                    <span>정답: {d.correctOption || `보기 ${d.correct}`}</span>
                  </div>
                  {d.reference && (
                    <div className="text-indigo-500 text-xs mt-1">
                      📗 {d.reference}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* All Correct */}
      {wrongAnswers.length === 0 && (
        <Card className="p-6 text-center">
          <Trophy size={40} className="mx-auto text-yellow-500 mb-2" />
          <p className="font-bold text-slate-700">모든 문제를 맞혔어요!</p>
          <p className="text-sm text-slate-500 mt-1">성경 박사네요!</p>
        </Card>
      )}

      {/* Name Input + Save */}
      {!saved ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">기록 등록</h2>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="이름을 입력하세요"
            maxLength={20}
            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-3"
          />
          <p className="text-xs text-slate-400 mb-3">
            등록된 학생 이름과 일치하면 달란트가 자동 지급됩니다.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving || !playerName.trim()}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '기록 등록'}
          </motion.button>
        </Card>
      ) : (
        <Card className="p-4 text-center">
          <p className="text-green-600 font-bold mb-1">기록이 등록되었습니다!</p>
          {savedResult?.talentAwarded && savedResult.earnedTalent > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-amber-600 font-bold text-lg">
                +{savedResult.earnedTalent} 달란트 획득!
              </p>
              <p className="text-sm text-slate-500">
                현재 잔액: <b className="text-slate-700">{savedResult.newBalance}</b> 달란트
              </p>
            </motion.div>
          ) : savedResult?.studentMatched ? (
            <p className="text-sm text-slate-500">
              오늘 달란트 획득 횟수를 초과했어요.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              등록된 학생이 아니어서 달란트는 지급되지 않았어요.
            </p>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sessionStorage.removeItem('quizResult');
            router.push('/quiz');
          }}
          className="flex-1 py-3 rounded-xl border-2 border-indigo-200 text-indigo-600 font-bold flex items-center justify-center gap-2 hover:bg-indigo-50"
        >
          <RotateCcw size={18} />
          다시 하기
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sessionStorage.removeItem('quizResult');
            router.push('/quiz');
          }}
          className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center gap-2 hover:bg-slate-200"
        >
          <Trophy size={18} />
          결과 목록
        </motion.button>
      </div>
    </div>
  );
}
