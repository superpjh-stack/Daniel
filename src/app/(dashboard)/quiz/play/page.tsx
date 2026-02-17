'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Cross, Users, Sparkles, ChevronRight, Send, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui';

interface QuizPlayQuestion {
  id: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  category: string;
  difficulty: string;
  reference: string | null;
}

interface QuizData {
  questions: QuizPlayQuestion[];
}

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  old_testament: { label: '구약', icon: <BookOpen size={14} /> },
  new_testament: { label: '신약', icon: <Cross size={14} /> },
  person: { label: '인물', icon: <Users size={14} /> },
  event: { label: '사건', icon: <Sparkles size={14} /> },
  general: { label: '일반', icon: <Lightbulb size={14} /> },
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: '쉬움', color: 'text-green-600 bg-green-50' },
  medium: { label: '보통', color: 'text-yellow-600 bg-yellow-50' },
  hard: { label: '어려움', color: 'text-red-600 bg-red-50' },
};

const optionLabels = ['①', '②', '③', '④'];

export default function QuizPlayPage() {
  const router = useRouter();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, number>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('quizData');
    if (!stored) {
      router.replace('/quiz');
      return;
    }
    try {
      const data = JSON.parse(stored) as QuizData;
      if (!data.questions || data.questions.length === 0) {
        router.replace('/quiz');
        return;
      }
      setQuizData(data);
    } catch {
      router.replace('/quiz');
    }
  }, [router]);

  if (!quizData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { questions } = quizData;
  const totalCount = questions.length;
  const currentQuestion = questions[currentIndex];
  const currentSelected = selectedAnswers.get(currentQuestion.id);
  const progress = ((currentIndex + 1) / totalCount) * 100;
  const allAnswered = selectedAnswers.size === totalCount;

  function handleSelect(optionNumber: number) {
    setSelectedAnswers(prev => {
      const next = new Map(prev);
      next.set(currentQuestion.id, optionNumber);
      return next;
    });
  }

  function handleNext() {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  async function handleSubmit() {
    if (!allAnswered) {
      alert('모든 문제에 답해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const answers = questions.map(q => ({
        questionId: q.id,
        selected: selectedAnswers.get(q.id)!,
      }));

      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '채점에 실패했습니다.');
        return;
      }

      const result = await res.json();
      sessionStorage.setItem('quizResult', JSON.stringify({
        ...result,
        answers,
      }));
      sessionStorage.removeItem('quizData');
      router.push('/quiz/result');
    } finally {
      setSubmitting(false);
    }
  }

  const cat = categoryLabels[currentQuestion.category] || { label: currentQuestion.category, icon: null };
  const diff = difficultyLabels[currentQuestion.difficulty] || { label: currentQuestion.difficulty, color: 'text-gray-600 bg-gray-50' };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-500">문제</span>
          <span className="ml-1 text-lg font-bold text-indigo-600">{currentIndex + 1}</span>
          <span className="text-sm text-slate-500"> / {totalCount}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${diff.color}`}>
                {diff.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-indigo-600 bg-indigo-50">
                {cat.icon} {cat.label}
              </span>
            </div>
            <p className="text-lg font-semibold text-slate-800 leading-relaxed">
              {currentQuestion.question}
            </p>
          </Card>

          {/* Options */}
          <div className="mt-4 space-y-2.5">
            {[1, 2, 3, 4].map((num) => {
              const optionText = currentQuestion[`option${num}` as keyof QuizPlayQuestion] as string;
              const isSelected = currentSelected === num;

              return (
                <motion.button
                  key={num}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(num)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {optionLabels[num - 1]}
                  </span>
                  <span className="font-medium">{optionText}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer Progress Dots */}
      <div className="flex justify-center gap-1.5 py-2">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === currentIndex
                ? 'bg-indigo-500 scale-125'
                : selectedAnswers.has(q.id)
                  ? 'bg-indigo-300'
                  : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
          >
            이전
          </button>
        )}

        {currentIndex < totalCount - 1 ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={!currentSelected}
            className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음 <ChevronRight size={18} />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '채점 중...' : '결과 확인'} <Send size={16} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
