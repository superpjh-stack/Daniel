'use client';

import { useState } from 'react';
import type { QuizData, QuizAnswer } from '../_lib/types';
import BrickBreakerGame from './BrickBreakerGame';

interface StudentOption {
  id: string;
  name: string;
  grade: number;
}

interface Props {
  quizzes: QuizData[];
  answers: QuizAnswer[];
  students: StudentOption[];
}

export default function BrickBreakerWrapper({ quizzes, answers, students }: Props) {
  const [selectedStudent, setSelectedStudent] = useState('');

  return (
    <div className="space-y-3">
      {/* 학생 선택 */}
      <div className="flex items-center gap-2" style={{ maxWidth: 480 }}>
        <label className="text-sm font-medium text-slate-600 whitespace-nowrap">학생:</label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">선택 안함 (보상 없이 플레이)</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>
              {s.grade}학년 {s.name}
            </option>
          ))}
        </select>
      </div>

      <BrickBreakerGame
        quizzes={quizzes}
        answers={answers}
        studentId={selectedStudent || undefined}
      />
    </div>
  );
}
