'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, Pencil, Trash2, X, BookOpen, Cross, Users, Sparkles, Lightbulb } from 'lucide-react';
import { Card, Button } from '@/components/ui';

interface QuizQuestion {
  id: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: number;
  category: string;
  difficulty: string;
  reference: string | null;
  isActive: boolean;
}

const categoryOptions = [
  { value: 'all', label: '전체' },
  { value: 'old_testament', label: '구약' },
  { value: 'new_testament', label: '신약' },
  { value: 'person', label: '인물' },
  { value: 'event', label: '사건' },
  { value: 'general', label: '일반' },
];

const difficultyOptions = [
  { value: 'all', label: '전체' },
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  old_testament: <BookOpen size={12} />,
  new_testament: <Cross size={12} />,
  person: <Users size={12} />,
  event: <Sparkles size={12} />,
  general: <Lightbulb size={12} />,
};

const categoryLabels: Record<string, string> = {
  old_testament: '구약',
  new_testament: '신약',
  person: '인물',
  event: '사건',
  general: '일반',
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: '쉬움', color: 'text-green-600 bg-green-50' },
  medium: { label: '보통', color: 'text-yellow-600 bg-yellow-50' },
  hard: { label: '어려움', color: 'text-red-600 bg-red-50' },
};

const emptyForm = {
  question: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  answer: 1,
  category: 'old_testament',
  difficulty: 'easy',
  reference: '',
};

export default function QuizManagePage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const limit = 20;

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterDifficulty !== 'all') params.set('difficulty', filterDifficulty);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/quiz?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterDifficulty, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(q: QuizQuestion) {
    setEditingId(q.id);
    setForm({
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      answer: q.answer,
      category: q.category,
      difficulty: q.difficulty,
      reference: q.reference || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.question || !form.option1 || !form.option2 || !form.option3 || !form.option4) {
      alert('문제와 보기를 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        reference: form.reference || null,
      };

      const url = editingId ? `/api/quiz/${editingId}` : '/api/quiz';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '저장에 실패했습니다.');
        return;
      }

      setModalOpen(false);
      fetchQuestions();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 문제를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/quiz/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchQuestions();
    } else {
      alert('삭제에 실패했습니다.');
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-indigo-500" />
            퀴즈 관리
          </h1>
          <p className="text-slate-500 mt-1">총 {total}개 문제</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-1">
          <Plus size={18} />
          문제 추가
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">카테고리</label>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {categoryOptions.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">난이도</label>
            <select
              value={filterDifficulty}
              onChange={(e) => { setFilterDifficulty(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {difficultyOptions.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Question List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          문제가 없습니다.
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => {
            const diff = difficultyLabels[q.difficulty] || { label: q.difficulty, color: 'text-gray-600 bg-gray-50' };
            const catLabel = categoryLabels[q.category] || q.category;
            const catIcon = categoryIcons[q.category] || null;

            return (
              <Card key={q.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 mb-2">
                      <span className="text-slate-400 mr-1">Q{(page - 1) * limit + i + 1}.</span>
                      {q.question}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-indigo-600 bg-indigo-50">
                        {catIcon} {catLabel}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${diff.color}`}>
                        {diff.label}
                      </span>
                      <span className="text-green-600">
                        정답: {'①②③④'[q.answer - 1]} {String(q[`option${q.answer}` as keyof QuizQuestion])}
                      </span>
                      {q.reference && (
                        <span className="text-slate-400">📗 {q.reference}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(q)}
                      className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">
                  {editingId ? '문제 수정' : '문제 추가'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">문제 *</label>
                  <textarea
                    value={form.question}
                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                    rows={2}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                    placeholder="문제를 입력하세요"
                  />
                </div>

                {[1, 2, 3, 4].map(num => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">보기 {num} *</label>
                    <input
                      type="text"
                      value={form[`option${num}` as keyof typeof form] as string}
                      onChange={(e) => setForm({ ...form, [`option${num}`]: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder={`보기 ${num}을 입력하세요`}
                    />
                  </div>
                ))}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">정답 *</label>
                    <select
                      value={form.answer}
                      onChange={(e) => setForm({ ...form, answer: Number(e.target.value) })}
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      {[1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{'①②③④'[n - 1]} 보기 {n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      {categoryOptions.filter(c => c.value !== 'all').map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">난이도</label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      {difficultyOptions.filter(d => d.value !== 'all').map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">성경 구절 참조</label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="예: 창세기 2:8"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-4 border-t border-slate-100">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
