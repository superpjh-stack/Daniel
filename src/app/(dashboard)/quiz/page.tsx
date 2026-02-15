'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Gamepad2, BookOpen, Cross, Users, Sparkles, Trophy, Clock, Settings, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui';

interface Student {
  id: string;
  name: string;
  grade: number;
  className: string | null;
}

interface RecentResult {
  id: string;
  studentName: string;
  score: number;
  totalCount: number;
  earnedTalent: number;
  createdAt: string;
}

interface RankingEntry {
  studentId: string;
  studentName: string;
  totalGames: number;
  avgScore: number;
  bestScore: number;
  totalTalentEarned: number;
}

const categories = [
  { value: 'all', label: '전체', icon: <BookOpen size={24} /> },
  { value: 'old_testament', label: '구약', icon: <BookOpen size={24} /> },
  { value: 'new_testament', label: '신약', icon: <Cross size={24} /> },
  { value: 'person', label: '인물', icon: <Users size={24} /> },
  { value: 'event', label: '사건', icon: <Sparkles size={24} /> },
  { value: 'general', label: '일반', icon: <Lightbulb size={24} /> },
];

const difficulties = [
  { value: 'all', label: '전체', color: 'bg-gray-100 text-gray-700' },
  { value: 'easy', label: '쉬움', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: '보통', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'hard', label: '어려움', color: 'bg-red-100 text-red-700' },
];

export default function QuizMainPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);

  useEffect(() => {
    fetchStudents();
    fetchResults();
  }, []);

  async function fetchStudents() {
    const res = await fetch('/api/students');
    if (res.ok) {
      const data = await res.json();
      setStudents(data);
    }
  }

  async function fetchResults() {
    const [recentRes, rankingRes] = await Promise.all([
      fetch('/api/quiz/results?type=recent&limit=5'),
      fetch('/api/quiz/results?type=ranking&limit=5'),
    ]);
    if (recentRes.ok) {
      const data = await recentRes.json();
      setRecentResults(data.results || []);
    }
    if (rankingRes.ok) {
      const data = await rankingRes.json();
      setRanking(data.ranking || []);
    }
  }

  async function handleStart() {
    if (!selectedStudentId) {
      alert('학생을 선택해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          category: selectedCategory,
          difficulty: selectedDifficulty,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '퀴즈를 시작할 수 없습니다.');
        return;
      }
      const data = await res.json();
      setRemainingAttempts(data.remainingAttempts);

      // sessionStorage에 게임 데이터 저장
      sessionStorage.setItem('quizData', JSON.stringify({
        questions: data.questions,
        studentId: selectedStudentId,
        studentName: students.find(s => s.id === selectedStudentId)?.name || '',
        canEarnTalent: data.canEarnTalent,
      }));
      router.push('/quiz/play');
    } finally {
      setLoading(false);
    }
  }

  const medalIcons = ['🥇', '🥈', '🥉', '4', '5'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Gamepad2 className="text-indigo-500" />
            성경퀴즈
          </h1>
          <p className="text-slate-500 mt-1">성경 지식을 테스트해보세요!</p>
        </div>
        <Link
          href="/quiz/manage"
          className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
          title="퀴즈 관리"
        >
          <Settings size={22} />
        </Link>
      </div>

      {/* 학생 선택 */}
      <Card className="p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">학생 선택</label>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">-- 학생을 선택하세요 --</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.grade}학년{s.className ? `, ${s.className}` : ''})
            </option>
          ))}
        </select>
        {selectedStudentId && (
          <p className="mt-2 text-sm text-slate-500">
            오늘 남은 횟수: <b className="text-indigo-600">{remainingAttempts}</b>/3회
          </p>
        )}
      </Card>

      {/* 카테고리 선택 */}
      <Card className="p-4">
        <label className="block text-sm font-medium text-slate-700 mb-3">카테고리 선택</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {categories.map((cat) => (
            <motion.button
              key={cat.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                selectedCategory === cat.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </Card>

      {/* 난이도 선택 */}
      <Card className="p-4">
        <label className="block text-sm font-medium text-slate-700 mb-3">난이도 선택</label>
        <div className="grid grid-cols-4 gap-2">
          {difficulties.map((diff) => (
            <motion.button
              key={diff.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDifficulty(diff.value)}
              className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedDifficulty === diff.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : `border-slate-200 ${diff.color} hover:border-slate-300`
              }`}
            >
              {diff.label}
            </motion.button>
          ))}
        </div>
      </Card>

      {/* 게임 시작 버튼 */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStart}
        disabled={loading || !selectedStudentId}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '준비 중...' : '🎮 게임 시작!'}
      </motion.button>

      {/* 최근 기록 */}
      {recentResults.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock size={16} />
            최근 퀴즈 기록
          </h2>
          <div className="space-y-2">
            {recentResults.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{r.studentName}</span>
                  <span className={`font-bold ${r.score >= 7 ? 'text-green-600' : r.score >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {r.score}/{r.totalCount}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  {r.earnedTalent > 0 && <span className="text-amber-600 font-medium">+{r.earnedTalent}⭐</span>}
                  <span>{new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 랭킹 */}
      {ranking.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            퀴즈 랭킹 TOP 5
          </h2>
          <div className="space-y-2">
            {ranking.map((r, i) => (
              <div key={r.studentId} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center">{i < 3 ? medalIcons[i] : `${i + 1}`}</span>
                  <span className="font-medium text-slate-700">{r.studentName}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <span>평균 <b className="text-indigo-600">{r.avgScore}</b></span>
                  <span>최고 <b className="text-green-600">{r.bestScore}</b></span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
