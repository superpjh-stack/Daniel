'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Plus, 
  Minus, 
  History,
  Search,
  Sparkles
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Avatar, Input } from '@/components/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Student {
  id: string;
  name: string;
  grade: number;
  talentBalance: number;
}

interface TalentHistory {
  id: string;
  amount: number;
  reason: string;
  type: string;
  createdAt: string;
  studentName: string;
}

const TALENT_REASONS = [
  { label: '성경 암송', value: '성경 암송', amount: 10 },
  { label: '친구 전도', value: '친구 전도', amount: 20 },
  { label: '청소 봉사', value: '청소 봉사', amount: 5 },
  { label: '공과 참여', value: '공과 참여', amount: 3 },
  { label: '찬양 인도', value: '찬양 인도', amount: 10 },
  { label: '기타', value: '기타', amount: 0 },
];

export default function TalentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<TalentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState(5);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, historyRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/talent/history?limit=20'),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (student: Student, mode: 'add' | 'subtract') => {
    setSelectedStudent(student);
    setModalMode(mode);
    setAmount(5);
    setReason('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !reason) return;

    setSaving(true);
    try {
      const res = await fetch('/api/talent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amount: modalMode === 'add' ? amount : -amount,
          reason,
          type: 'bonus',
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="달란트 관리" subtitle="아이들의 달란트를 관리하세요" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 학생 목록 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="학생 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/90 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div className="grid gap-3">
            {filteredStudents.map((student) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 backdrop-blur-lg rounded-2xl p-4 border border-purple-100 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={student.name} size="md" />
                    <div>
                      <p className="font-bold text-gray-800">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.grade}학년</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-3">
                    <div className="flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-amber-100 to-amber-200 rounded-xl">
                      <Star size={18} className="text-amber-500 fill-amber-400" />
                      <span className="font-bold text-amber-700">{student.talentBalance.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => openModal(student, 'add')}
                      className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      onClick={() => openModal(student, 'subtract')}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Minus size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 최근 기록 */}
        <div>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <History size={20} className="text-purple-500" />
              <h2 className="font-bold text-gray-800">최근 기록</h2>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-gray-50 hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-700">{item.studentName}</span>
                    <span className={`font-bold ${item.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{item.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(item.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 달란트 지급/차감 모달 */}
      <AnimatePresence>
        {showModal && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  modalMode === 'add' 
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-500' 
                    : 'bg-gradient-to-br from-red-400 to-red-500'
                }`}>
                  {modalMode === 'add' ? (
                    <Sparkles size={32} className="text-white" />
                  ) : (
                    <Minus size={32} className="text-white" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {modalMode === 'add' ? '달란트 지급' : '달란트 차감'}
                </h2>
                <p className="text-gray-500 mt-1">{selectedStudent.name}</p>
              </div>

              <div className="space-y-4">
                {/* 빠른 선택 버튼 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TALENT_REASONS.slice(0, 6).map((r) => (
                    <button
                      key={r.value}
                      onClick={() => {
                        setReason(r.value);
                        if (r.amount > 0) setAmount(r.amount);
                      }}
                      className={`p-2 text-sm rounded-lg transition-all ${
                        reason === r.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* 금액 입력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    달란트 수량
                  </label>
                  <div className="flex items-center gap-2">
                    {[5, 10, 20, 50].map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`flex-1 py-2 rounded-lg transition-all ${
                          amount === val
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                {/* 사유 입력 */}
                <Input
                  label="사유"
                  placeholder="지급/차감 사유를 입력하세요"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    취소
                  </Button>
                  <Button
                    variant={modalMode === 'add' ? 'primary' : 'secondary'}
                    className="flex-1"
                    onClick={handleSubmit}
                    isLoading={saving}
                    disabled={!reason || amount <= 0}
                  >
                    {modalMode === 'add' ? '지급하기' : '차감하기'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
