'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users,
  Calendar,
  Star,
  Award,
  Trophy
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Badge, Avatar } from '@/components/ui';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StatsData {
  weeklyAttendance: {
    week: string;
    present: number;
    absent: number;
    late: number;
  }[];
  attendanceRanking: {
    id: string;
    name: string;
    grade: number;
    attendanceRate: number;
    totalPresent: number;
  }[];
  talentRanking: {
    id: string;
    name: string;
    grade: number;
    talentBalance: number;
  }[];
  gradeStats: {
    grade: number;
    count: number;
    averageAttendance: number;
    averageTalent: number;
  }[];
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/stats?period=${period}`);
      if (res.ok) {
        const statsData = await res.json();
        setData(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }

  const maxAttendance = Math.max(
    ...(data?.weeklyAttendance?.map((w) => w.present + w.absent + w.late) || [1])
  );

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="통계" subtitle="출석 및 달란트 현황을 확인하세요" />

      {/* 기간 선택 */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'month', label: '최근 1개월' },
          { value: 'quarter', label: '최근 3개월' },
          { value: 'year', label: '최근 1년' },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value as 'month' | 'quarter' | 'year')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              period === p.value
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white/80 text-gray-600 hover:bg-purple-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* 주간 출석 차트 */}
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-purple-500" />
            <h2 className="font-bold text-gray-800">주간 출석 현황</h2>
          </div>

          <div className="space-y-4">
            {data?.weeklyAttendance?.map((week, index) => {
              const total = week.present + week.absent + week.late;
              const presentPercent = total > 0 ? (week.present / total) * 100 : 0;
              const latePercent = total > 0 ? (week.late / total) * 100 : 0;
              const absentPercent = total > 0 ? (week.absent / total) * 100 : 0;

              return (
                <motion.div
                  key={week.week}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <span className="w-24 text-sm text-gray-500">{week.week}</span>
                  <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${presentPercent}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-gradient-to-r from-emerald-400 to-emerald-500"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${latePercent}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-gradient-to-r from-amber-400 to-amber-500"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${absentPercent}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-gradient-to-r from-red-400 to-red-500"
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-medium">
                    {week.present + week.late}/{total}
                  </span>
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-gray-600">출석</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-gray-600">지각</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-gray-600">결석</span>
            </div>
          </div>
        </Card>

        {/* 랭킹 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 출석왕 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-emerald-500" />
                <h2 className="font-bold text-gray-800">출석왕</h2>
              </div>
              <Badge variant="green">TOP 5</Badge>
            </div>

            <div className="space-y-3">
              {data?.attendanceRanking?.slice(0, 5).map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' : 
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                      index === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400 text-white' :
                      'bg-gray-200 text-gray-600'}
                  `}>
                    {index + 1}
                  </div>
                  <Avatar name={student.name} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-700">{student.name}</p>
                    <p className="text-xs text-gray-400">{student.grade}학년</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{student.attendanceRate}%</p>
                    <p className="text-xs text-gray-400">{student.totalPresent}회</p>
                  </div>
                </motion.div>
              )) || (
                <div className="text-center py-8 text-gray-400">
                  <Users size={48} className="mx-auto mb-3 opacity-50" />
                  <p>데이터가 없습니다</p>
                </div>
              )}
            </div>
          </Card>

          {/* 달란트왕 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-500" />
                <h2 className="font-bold text-gray-800">달란트왕</h2>
              </div>
              <Badge variant="gold">TOP 5</Badge>
            </div>

            <div className="space-y-3">
              {data?.talentRanking?.slice(0, 5).map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' : 
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                      index === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400 text-white' :
                      'bg-gray-200 text-gray-600'}
                  `}>
                    {index + 1}
                  </div>
                  <Avatar name={student.name} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-700">{student.name}</p>
                    <p className="text-xs text-gray-400">{student.grade}학년</p>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-amber-600">
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                    {student.talentBalance.toLocaleString()}
                  </div>
                </motion.div>
              )) || (
                <div className="text-center py-8 text-gray-400">
                  <Star size={48} className="mx-auto mb-3 opacity-50" />
                  <p>데이터가 없습니다</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 학년별 통계 */}
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <Users size={20} className="text-purple-500" />
            <h2 className="font-bold text-gray-800">학년별 통계</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {data?.gradeStats?.map((grade) => (
              <motion.div
                key={grade.grade}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 text-center"
              >
                <Badge variant="purple" className="mb-2">{grade.grade}학년</Badge>
                <p className="text-2xl font-bold text-gray-800">{grade.count}명</p>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="text-gray-500">
                    출석률 <span className="font-medium text-emerald-600">{grade.averageAttendance}%</span>
                  </p>
                  <p className="text-gray-500">
                    평균 달란트 <span className="font-medium text-amber-600">{grade.averageTalent}</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
