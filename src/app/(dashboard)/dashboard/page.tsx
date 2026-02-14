'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  Star,
  TrendingUp,
  Cake,
  Award,
  Clock,
  Megaphone,
  Pin,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { Card, Badge, Avatar } from '@/components/ui';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DashboardData {
  stats: {
    totalStudents: number;
    todayAttendance: number;
    totalTalent: number;
    averageAttendance: number;
  };
  recentAttendance: {
    id: string;
    name: string;
    status: string;
    time: string;
  }[];
  topStudents: {
    id: string;
    name: string;
    talentBalance: number;
    grade: number;
  }[];
  birthdays: {
    id: string;
    name: string;
    birthday: string;
    grade: number;
  }[];
  announcements: {
    id: string;
    title: string;
    content: string;
    category: string;
    isPinned: number;
    authorName: string;
    createdAt: string;
  }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  const stats = [
    {
      icon: <Users size={24} />,
      label: '전체 학생',
      value: data?.stats.totalStudents || 0,
      suffix: '명',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: <Calendar size={24} />,
      label: '오늘 출석',
      value: data?.stats.todayAttendance || 0,
      suffix: '명',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: <Star size={24} />,
      label: '총 달란트',
      value: data?.stats.totalTalent || 0,
      suffix: '',
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
    },
    {
      icon: <TrendingUp size={24} />,
      label: '출석률',
      value: data?.stats.averageAttendance || 0,
      suffix: '%',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="대시보드" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* 통계 카드들 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-20 h-20 ${stat.bgColor} rounded-full -translate-y-1/2 translate-x-1/2 opacity-50`} />
                <div className={`inline-flex p-2 sm:p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white mb-3`}>
                  {stat.icon}
                </div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
                  {stat.value.toLocaleString()}<span className="text-lg">{stat.suffix}</span>
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 공지사항 위젯 */}
        {data?.announcements?.length ? (
          <motion.div variants={itemVariants}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Megaphone size={20} className="text-indigo-500" />
                  공지사항
                </h2>
                <Link
                  href="/announcements"
                  className="flex items-center gap-1 text-sm text-purple-500 hover:text-purple-700 font-medium transition-colors"
                >
                  더보기 <ChevronRight size={16} />
                </Link>
              </div>
              <div className="space-y-3">
                {data.announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors ${
                      ann.category === 'urgent' ? 'border-l-4 border-l-red-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {ann.isPinned === 1 && (
                        <Pin size={12} className="text-purple-500 fill-purple-500" />
                      )}
                      <Badge variant={ann.category === 'urgent' ? 'red' : ann.category === 'event' ? 'gold' : 'purple'}>
                        {ann.category === 'urgent' ? '긴급' : ann.category === 'event' ? '행사' : '일반'}
                      </Badge>
                      <span className="font-medium text-gray-800 text-sm truncate">{ann.title}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {ann.authorName} · {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true, locale: ko })}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ) : null}

        {/* 두 번째 행 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 최근 출석 */}
          <motion.div variants={itemVariants}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Clock size={20} className="text-purple-500" />
                  최근 출석
                </h2>
                <Badge variant="purple">오늘</Badge>
              </div>
              
              <div className="space-y-3">
                {data?.recentAttendance?.length ? (
                  data.recentAttendance.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <span className="font-medium text-gray-700">{student.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={student.status === 'present' ? 'green' : student.status === 'late' ? 'gold' : 'red'}>
                          {student.status === 'present' ? '출석' : student.status === 'late' ? '지각' : '결석'}
                        </Badge>
                        <span className="text-xs text-gray-400">{student.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                    <p>오늘 출석 기록이 없습니다</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* 달란트 랭킹 */}
          <motion.div variants={itemVariants}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Award size={20} className="text-amber-500" />
                  달란트 랭킹
                </h2>
                <Badge variant="gold">TOP 5</Badge>
              </div>
              
              <div className="space-y-3">
                {data?.topStudents?.length ? (
                  data.topStudents.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' : 
                            index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                            index === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400 text-white' :
                            'bg-gray-200 text-gray-600'}
                        `}>
                          {index + 1}
                        </div>
                        <Avatar name={student.name} size="sm" />
                        <div>
                          <span className="font-medium text-gray-700">{student.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{student.grade}학년</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Star size={16} className="fill-amber-400 text-amber-400" />
                        {student.talentBalance.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Star size={48} className="mx-auto mb-3 opacity-50" />
                    <p>달란트 기록이 없습니다</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* 이번 주 생일 */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Cake size={20} className="text-pink-500" />
                이번 주 생일
              </h2>
              <Badge variant="pink">🎂 축하해요!</Badge>
            </div>
            
            {data?.birthdays?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.birthdays.map((student) => (
                  <motion.div
                    key={student.id}
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 text-center"
                  >
                    <Avatar name={student.name} size="lg" className="mx-auto mb-2" />
                    <p className="font-bold text-gray-800">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.grade}학년</p>
                    <p className="text-sm text-pink-500 mt-1">
                      {format(new Date(student.birthday), 'M월 d일', { locale: ko })}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Cake size={48} className="mx-auto mb-3 opacity-50" />
                <p>이번 주 생일인 친구가 없습니다</p>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
