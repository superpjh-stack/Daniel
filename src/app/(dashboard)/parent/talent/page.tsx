'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import KakaoShareButton from '@/components/KakaoShareButton';
import { buildTalentShareOptions } from '@/lib/kakao';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StudentSummary {
  id: string;
  name: string;
  grade: number;
  className: string | null;
}

interface StudentInfo {
  id: string;
  name: string;
  grade: number;
  talentBalance: number;
}

interface TalentTransaction {
  id: string;
  amount: number;
  reason: string;
  type: string;
  createdAt: string;
}

const typeConfig: Record<string, { label: string; icon: string; badgeClass: string }> = {
  attendance: { label: '출석', icon: '✅', badgeClass: 'bg-green-100 text-green-700' },
  bonus: { label: '보너스', icon: '🎯', badgeClass: 'bg-amber-100 text-amber-700' },
  purchase: { label: '구매', icon: '🛒', badgeClass: 'bg-red-100 text-red-700' },
};

export default function ParentTalentPage() {
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<StudentSummary[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>(searchParams.get('studentId') || '');
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [transactions, setTransactions] = useState<TalentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTalent = useCallback(async (studentId?: string) => {
    setLoading(true);
    try {
      const url = studentId
        ? `/api/parent/talent?studentId=${studentId}`
        : '/api/parent/talent';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children || []);
        setStudent(data.student || null);
        setTransactions(data.transactions || []);
        if (!selectedChild && data.student) {
          setSelectedChild(data.student.id);
        }
      }
    } catch (error) {
      console.error('Talent fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    fetchTalent(selectedChild || undefined);
  }, [fetchTalent, selectedChild]);

  const handleChildChange = (childId: string) => {
    setSelectedChild(childId);
    fetchTalent(childId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Star className="text-amber-500" /> 달란트 내역
          </h1>
          <p className="text-gray-500 mt-1">자녀의 달란트 현황을 확인하세요</p>
        </div>
        {student && (() => {
          const now = new Date();
          const monthEarned = transactions
            .filter(t => {
              const d = new Date(t.createdAt);
              return d.getFullYear() === now.getFullYear()
                && d.getMonth() === now.getMonth()
                && t.amount > 0;
            })
            .reduce((sum, t) => sum + t.amount, 0);
          return (
            <KakaoShareButton
              options={buildTalentShareOptions({
                studentName: student.name,
                grade: student.grade,
                talentBalance: student.talentBalance,
                monthEarned,
                appUrl: typeof window !== 'undefined' ? window.location.origin : '',
              })}
            />
          );
        })()}
      </motion.div>

      {/* 자녀 선택 */}
      {children.length > 1 && (
        <select
          value={selectedChild}
          onChange={(e) => handleChildChange(e.target.value)}
          className="w-full p-3 rounded-xl border border-purple-200 bg-white/80 backdrop-blur-lg text-gray-700 font-medium focus:ring-2 focus:ring-purple-400 focus:border-transparent"
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              🎒 {child.name} ({child.grade}학년{child.className ? `, ${child.className}` : ''})
            </option>
          ))}
        </select>
      )}

      {/* 잔액 카드 */}
      {student && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 text-center">
            <Star className="w-12 h-12 mx-auto mb-3 text-amber-500" />
            <p className="text-sm text-amber-600 mb-1">현재 달란트 잔액</p>
            <p className="text-4xl font-bold text-amber-700">{student.talentBalance}</p>
            <p className="text-sm text-amber-500 mt-2">{student.name} ({student.grade}학년)</p>
          </Card>
        </motion.div>
      )}

      {/* 거래 내역 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-bold text-gray-800 mb-3">거래 내역</h2>
        <Card className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">달란트 내역이 없습니다</div>
          ) : (
            transactions.map((t, i) => {
              const config = typeConfig[t.type] || typeConfig.bonus;
              return (
                <motion.div
                  key={t.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{config.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{t.reason}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(t.createdAt), 'M/d (EEE)', { locale: ko })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={config.badgeClass}>{config.label}</Badge>
                    <span className={`font-bold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </Card>
      </motion.div>
    </div>
  );
}
