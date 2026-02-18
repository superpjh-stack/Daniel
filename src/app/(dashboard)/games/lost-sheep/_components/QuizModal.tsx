'use client';

import { useState } from 'react';
import type { SheepQuiz } from '../_lib/types';

interface Props {
  quiz: SheepQuiz;
  onAnswer: (correct: boolean) => void;
}

export default function QuizModal({ quiz, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  function handleSelect(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
  }

  function handleContinue() {
    if (selected === null) return;
    onAnswer(selected === quiz.answer);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-center text-lg font-bold text-green-700">
          {'\uD83D\uDC11'} 잃은 양 퀴즈!
        </h3>

        <p className="text-center text-slate-800 font-medium leading-relaxed">
          {quiz.question}
        </p>

        <div className="space-y-2">
          {quiz.options.map((opt, idx) => {
            const num = idx + 1;
            const isCorrect = num === quiz.answer;
            const isSelected = num === selected;

            let style = 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100';
            if (revealed) {
              if (isCorrect) {
                style = 'border-green-400 bg-green-50 text-green-800';
              } else if (isSelected && !isCorrect) {
                style = 'border-red-400 bg-red-50 text-red-800';
              } else {
                style = 'border-slate-200 bg-slate-50 text-slate-400';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(num)}
                disabled={revealed}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${style}`}
              >
                <span className="mr-2">{'\u2460\u2461\u2462\u2463'[idx]}</span>
                {opt}
                {revealed && isCorrect && <span className="float-right">O</span>}
                {revealed && isSelected && !isCorrect && <span className="float-right">X</span>}
              </button>
            );
          })}
        </div>

        {revealed && (
          <p className="text-center text-xs text-slate-500">
            {quiz.reference}
          </p>
        )}

        {revealed && (
          <button
            onClick={handleContinue}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
          >
            계속하기
          </button>
        )}
      </div>
    </div>
  );
}
