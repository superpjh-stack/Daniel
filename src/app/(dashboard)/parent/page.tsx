'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Star, TrendingUp, Megaphone, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StudentSummary {
  id: string;
  name: string;
  grade: number;
  talentBalance: number;
  className: string | null;
}

interface DashboardData {
  children: StudentSummary[];
  student: StudentSummary;
  attendanceSummary: {
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
    streak: number;
  };
  recentAttendance: { date: string; status: string }[];
  recentTalent: { amount: number; reason: string; type: string; createdAt: string }[];
  announcements: { id: string; title: string; category: string; createdAt: string }[];
}

const statusMap: Record<string, { label: string; icon: string; color: string }> = {
  present: { label: '출석', icon: '✅', color: 'text-green-600' },
  late: { label: '지각', icon: '⏰', color: 'text-yellow-600' },
  absent: { label: '결석', icon: '❌', color: 'text-red-600' },
};

const talentTypeMap: Record<string, { icon: string; color: string }> = {
  attendance: { icon: '✅', color: 'text-green-600' },
  bonus: { icon: '🎯', color: 'text-amber-600' },
  purchase: { icon: '🛒', color: 'text-red-600' },
};

export default function ParentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (studentId?: string) => {
    setLoading(true);
    try {
      const url = studentId
        ? `/api/parent/dashboard?studentId=${studentId}`
        : '/api/parent/dashboard';
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        if (!selectedChild && result.student) {
          setSelectedChild(result.student.id);
        }
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleChildChange = (childId: string) => {
    setSelectedChild(childId);
    fetchDashboard(childId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">연결된 자녀 정보가 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">관리자에게 문의해주세요.</p>
      </div>
    );
  }

  const { student, attendanceSummary, recentAttendance, recentTalent, announcements, children } = data;
  const totalAttendance = attendanceSummary.totalPresent + attendanceSummary.totalLate + attendanceSummary.totalAbsent;
  const attendanceRate = totalAttendance > 0
    ? Math.round(((attendanceSummary.totalPresent + attendanceSummary.totalLate) / totalAttendance) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-800">학부모 대시보드</h1>
        <p className="text-gray-500 mt-1">자녀의 활동을 한눈에 확인하세요</p>
      </motion.div>

      {/* 자녀 선택 */}
      {children.length > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
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
        </motion.div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="text-center p-4">
            <div className="text-3xl mb-2">🎒</div>
            <p className="font-bold text-lg text-gray-800">{student.name}</p>
            <p className="text-sm text-gray-500">{student.grade}학년{student.className ? ` ${student.className}` : ''}</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="text-center p-4">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="font-bold text-lg text-gray-800">{attendanceRate}%</p>
            <p className="text-sm text-gray-500">출석률 ({attendanceSummary.totalPresent + attendanceSummary.totalLate}/{totalAttendance})</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="text-center p-4">
            <Star className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="font-bold text-lg text-gray-800">{student.talentBalance}</p>
            <p className="text-sm text-gray-500">달란트 잔액</p>
          </Card>
        </motion.div>
      </div>

      {/* 연속 출석 */}
      {attendanceSummary.streak > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-500" size={24} />
              <div>
                <p className="font-bold text-green-700">연속 출석 {attendanceSummary.streak}주!</p>
                <p className="text-sm text-green-600">대단해요! 계속 힘내세요</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* 최근 출석 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" /> 최근 출석
          </h2>
          <Link href={`/parent/attendance?studentId=${selectedChild}`} className="text-sm text-purple-600 flex items-center gap-1 hover:text-purple-800">
            더보기 <ChevronRight size={14} />
          </Link>
        </div>
        <Card className="divide-y divide-gray-100">
          {recentAttendance.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">출석 기록이 없습니다</div>
          ) : (
            recentAttendance.map((att, i) => {
              const info = statusMap[att.status] || statusMap.present;
              return (
                <div key={i} className="flex items-center justify-between p-3">
                  <span className="text-sm text-gray-600">
                    {format(new Date(att.date), 'M/d (EEE)', { locale: ko })}
                  </span>
                  <span className={`text-sm font-medium ${info.color}`}>
                    {info.icon} {info.label}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </motion.div>

      {/* 최근 달란트 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Star size={20} className="text-amber-500" /> 최근 달란트
          </h2>
          <Link href={`/parent/talent?studentId=${selectedChild}`} className="text-sm text-purple-600 flex items-center gap-1 hover:text-purple-800">
            더보기 <ChevronRight size={14} />
          </Link>
        </div>
        <Card className="divide-y divide-gray-100">
          {recentTalent.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">달란트 내역이 없습니다</div>
          ) : (
            recentTalent.map((t, i) => {
              const typeInfo = talentTypeMap[t.type] || talentTypeMap.bonus;
              return (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <span>{typeInfo.icon}</span>
                    <span className="text-sm text-gray-700">{t.reason}</span>
                  </div>
                  <span className={`text-sm font-bold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </motion.div>

      {/* 공지사항 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Megaphone size={20} className="text-purple-500" /> 공지사항
          </h2>
          <Link href="/announcements" className="text-sm text-purple-600 flex items-center gap-1 hover:text-purple-800">
            더보기 <ChevronRight size={14} />
          </Link>
        </div>
        <Card className="divide-y divide-gray-100">
          {announcements.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">공지사항이 없습니다</div>
          ) : (
            announcements.map((ann) => {
              const categoryColors: Record<string, string> = {
                urgent: 'bg-red-100 text-red-700',
                event: 'bg-blue-100 text-blue-700',
                general: 'bg-gray-100 text-gray-700',
              };
              const categoryLabels: Record<string, string> = {
                urgent: '긴급',
                event: '행사',
                general: '일반',
              };
              return (
                <Link key={ann.id} href={`/announcements/${ann.id}`} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Badge className={categoryColors[ann.category] || categoryColors.general}>
                      {categoryLabels[ann.category] || '일반'}
                    </Badge>
                    <span className="text-sm text-gray-700">{ann.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(ann.createdAt), 'M/d')}
                  </span>
                </Link>
              );
            })
          )}
        </Card>
      </motion.div>
    </div>
  );
}
