'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import KakaoShareButton from '@/components/KakaoShareButton';
import { buildAttendanceShareOptions } from '@/lib/kakao';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StudentSummary {
  id: string;
  name: string;
  grade: number;
  className: string | null;
}

interface AttendanceRecord {
  date: string;
  status: string;
  memo: string | null;
}

interface AttendanceStats {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; bgColor: string; textColor: string }> = {
  present: { label: '출석', icon: <CheckCircle size={16} />, bgColor: 'bg-green-50 border-green-200', textColor: 'text-green-600' },
  late: { label: '지각', icon: <Clock size={16} />, bgColor: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-600' },
  absent: { label: '결석', icon: <XCircle size={16} />, bgColor: 'bg-red-50 border-red-200', textColor: 'text-red-600' },
};

export default function ParentAttendancePage() {
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<StudentSummary[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>(searchParams.get('studentId') || '');
  const [selectedChildInfo, setSelectedChildInfo] = useState<StudentSummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = useCallback(async (studentId?: string) => {
    setLoading(true);
    try {
      const url = studentId
        ? `/api/parent/attendance?studentId=${studentId}`
        : '/api/parent/attendance';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children || []);
        setAttendance(data.attendance || []);
        setStats(data.stats || null);
        setStreak(data.streak || 0);
        if (!selectedChild && data.student) {
          setSelectedChild(data.student.id);
        }
        if (data.student) {
          setSelectedChildInfo(data.student);
        }
      }
    } catch (error) {
      console.error('Attendance fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    fetchAttendance(selectedChild || undefined);
  }, [fetchAttendance, selectedChild]);

  const handleChildChange = (childId: string) => {
    setSelectedChild(childId);
    setSelectedChildInfo(children.find(c => c.id === childId) || null);
    fetchAttendance(childId);
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
            <Calendar className="text-blue-500" /> 출석 내역
          </h1>
          <p className="text-gray-500 mt-1">자녀의 출석 기록을 확인하세요</p>
        </div>
        {stats && selectedChildInfo && (
          <KakaoShareButton
            options={buildAttendanceShareOptions({
              studentName: selectedChildInfo.name,
              grade: selectedChildInfo.grade,
              className: selectedChildInfo.className,
              presentCount: stats.totalPresent,
              lateCount: stats.totalLate,
              absentCount: stats.totalAbsent,
              streak,
              appUrl: typeof window !== 'undefined' ? window.location.origin : '',
            })}
          />
        )}
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

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="text-center p-4 bg-green-50 border-green-200">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="font-bold text-2xl text-green-700">{stats.totalPresent}</p>
              <p className="text-sm text-green-600">출석</p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="text-center p-4 bg-yellow-50 border-yellow-200">
              <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="font-bold text-2xl text-yellow-700">{stats.totalLate}</p>
              <p className="text-sm text-yellow-600">지각</p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="text-center p-4 bg-red-50 border-red-200">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="font-bold text-2xl text-red-700">{stats.totalAbsent}</p>
              <p className="text-sm text-red-600">결석</p>
            </Card>
          </motion.div>
        </div>
      )}

      {/* 연속 출석 */}
      {streak > 0 && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <p className="font-bold text-green-700">🔥 연속 출석 {streak}주!</p>
        </Card>
      )}

      {/* 출석 목록 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="divide-y divide-gray-100">
          {attendance.length === 0 ? (
            <div className="p-8 text-center text-gray-400">출석 기록이 없습니다</div>
          ) : (
            attendance.map((att, i) => {
              const config = statusConfig[att.status] || statusConfig.present;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24">
                      {format(new Date(att.date), 'M/d (EEE)', { locale: ko })}
                    </span>
                    {att.memo && (
                      <span className="text-xs text-gray-400">| {att.memo}</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${config.bgColor} ${config.textColor}`}>
                    {config.icon}
                    <span className="text-sm font-medium">{config.label}</span>
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
