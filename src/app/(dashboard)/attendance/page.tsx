'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Check,
  X,
  Clock,
  Save,
  ChevronLeft,
  ChevronRight,
  Users,
  Flame,
  History,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Avatar } from '@/components/ui';
import { format, addDays, subDays, startOfWeek, isToday, isSameDay, isFuture } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Student {
  id: string;
  name: string;
  grade: number;
  className: string | null;
  attendance: {
    status: 'present' | 'absent' | 'late' | null;
    memo: string;
  };
  streak: number;
}

interface Summary {
  total: number;
  present: number;
  late: number;
  absent: number;
}

interface Class {
  id: string;
  name: string;
  grade: number;
}

interface HistoryEntry {
  date: string;
  status: string;
  memo: string | null;
  createdAt: string;
}

interface StreakBonus {
  studentId: string;
  studentName: string;
  streak: number;
  bonus: number;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, present: 0, late: 0, absent: 0 });
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceChanges, setAttendanceChanges] = useState<Record<string, { status: string; memo: string }>>({});

  // FR-03: 출석 이력 모달
  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    studentId: string;
    studentName: string;
    history: HistoryEntry[];
    streak: number;
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
  } | null>(null);

  // FR-06: 상태 변경 확인 다이얼로그
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    studentId: string;
    studentName: string;
  } | null>(null);

  // FR-04: 연속 출석 보너스 알림
  const [streakBonuses, setStreakBonuses] = useState<StreakBonus[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const hasChanges = Object.keys(attendanceChanges).length > 0;

  // FR-08: 미저장 변경 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedClass]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [studentsRes, classesRes] = await Promise.all([
        fetch(`/api/attendance?date=${dateStr}&classId=${selectedClass}`),
        fetch('/api/classes'),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    const currentStatus = getStatus(studentId);

    // FR-06: 출석/지각 → 결석 변경 시 확인 다이얼로그
    if ((currentStatus === 'present' || currentStatus === 'late') && status === 'absent') {
      const student = students.find(s => s.id === studentId);
      setConfirmDialog({
        open: true,
        studentId,
        studentName: student?.name || '',
      });
      return;
    }

    applyStatusChange(studentId, status);
  };

  const applyStatusChange = (studentId: string, status: string) => {
    setAttendanceChanges((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        memo: prev[studentId]?.memo || '',
      },
    }));
  };

  const handleMemoChange = (studentId: string, memo: string) => {
    setAttendanceChanges((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        memo,
      },
    }));
  };

  // FR-01: 일괄 출석 처리
  const handleBulkAction = (status: 'present' | 'absent') => {
    const changes: Record<string, { status: string; memo: string }> = {};
    students.forEach((student) => {
      changes[student.id] = {
        status,
        memo: attendanceChanges[student.id]?.memo || '',
      };
    });
    setAttendanceChanges(changes);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          attendance: attendanceChanges,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // FR-04: 연속 출석 보너스 알림
        if (data.streakBonuses && data.streakBonuses.length > 0) {
          setStreakBonuses(data.streakBonuses);
          setTimeout(() => setStreakBonuses([]), 5000);
        }
        setAttendanceChanges({});
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (studentId: string): string | null => {
    if (attendanceChanges[studentId]) {
      return attendanceChanges[studentId].status;
    }
    const student = students.find((s) => s.id === studentId);
    return student?.attendance?.status || null;
  };

  // FR-03: 출석 이력 조회
  const openHistory = async (studentId: string, studentName: string) => {
    try {
      const res = await fetch(`/api/attendance/history?studentId=${studentId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setHistoryModal({
          open: true,
          studentId,
          studentName,
          history: data.history,
          streak: data.streak,
          totalPresent: data.totalPresent,
          totalLate: data.totalLate,
          totalAbsent: data.totalAbsent,
        });
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  // 주간 날짜 생성
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const displayStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const presentCount = students.filter((s) => getStatus(s.id) === 'present' || getStatus(s.id) === 'late').length;

  // FR-05: 미래 날짜 선택 제한
  const isFutureDate = isFuture(selectedDate) && !isToday(selectedDate);

  return (
    <div className="max-w-7xl mx-auto">
      <Header
        title="출석 관리"
        subtitle={`${format(selectedDate, 'yyyy년 M월 d일 EEEE', { locale: ko })}`}
      />

      <div className="space-y-6">
        {/* 날짜 선택 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedDate(subDays(selectedDate, 7))}
              className="p-2 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h3 className="font-bold text-gray-800">
              {format(selectedDate, 'yyyy년 M월', { locale: ko })}
            </h3>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="p-2 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const dayOfWeek = format(day, 'E', { locale: ko });
              const isSunday = day.getDay() === 0;
              const isFutureDay = isFuture(day) && !isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !isFutureDay && setSelectedDate(day)}
                  disabled={isFutureDay}
                  className={`
                    p-2 sm:p-3 rounded-xl text-center transition-all
                    ${isFutureDay
                      ? 'opacity-30 cursor-not-allowed'
                      : isSelected
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : isTodayDate
                          ? 'bg-purple-100 text-purple-700'
                          : 'hover:bg-purple-50'}
                  `}
                >
                  <p className={`text-xs ${isSunday && !isSelected ? 'text-red-500' : ''}`}>
                    {dayOfWeek}
                  </p>
                  <p className="font-bold mt-0.5 sm:mt-1 text-sm sm:text-base">{format(day, 'd')}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* FR-07: 출석 통계 요약 */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="text-center py-3">
            <p className="text-xs text-gray-500">전체</p>
            <p className="text-xl font-bold text-gray-800">{summary.total}</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-xs text-emerald-600">출석</p>
            <p className="text-xl font-bold text-emerald-600">{summary.present}</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-xs text-amber-600">지각</p>
            <p className="text-xl font-bold text-amber-600">{summary.late}</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-xs text-red-600">결석</p>
            <p className="text-xl font-bold text-red-600">{summary.absent}</p>
          </Card>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="이름 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 w-40"
              />
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">전체 반</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-xl border border-purple-100">
              <Users size={18} className="text-purple-500" />
              <span className="text-gray-600">
                <span className="font-bold text-purple-600">{presentCount}</span>
                <span className="mx-1">/</span>
                <span>{students.length}명</span>
              </span>
            </div>

            {/* FR-01: 일괄 처리 버튼 */}
            {!isFutureDate && students.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('present')}
                  className="px-3 py-2 text-sm bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors font-medium"
                >
                  전체 출석
                </button>
                <button
                  onClick={() => handleBulkAction('absent')}
                  className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors font-medium"
                >
                  전체 결석
                </button>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            className="w-full md:w-auto"
            onClick={handleSave}
            isLoading={saving}
            disabled={!hasChanges || isFutureDate}
          >
            <Save size={18} className="mr-2" />
            저장하기
          </Button>
        </div>

        {/* FR-05: 미래 날짜 경고 */}
        {isFutureDate && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
            <AlertTriangle size={18} />
            <span>미래 날짜에는 출석을 기록할 수 없습니다.</span>
          </div>
        )}

        {/* 학생 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : students.length === 0 ? (
          <Card className="text-center py-20">
            <Users size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">등록된 학생이 없습니다</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {displayStudents.map((student) => {
              const status = getStatus(student.id);

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/90 backdrop-blur-lg rounded-2xl p-4 border border-purple-100 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => openHistory(student.id, student.name)}
                    >
                      <Avatar name={student.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{student.name}</p>
                          {/* FR-04: 연속 출석 배지 */}
                          {student.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                              <Flame size={12} />
                              {student.streak}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {student.grade}학년
                          {student.className && ` · ${student.className}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusChange(student.id, 'present')}
                        disabled={isFutureDate}
                        className={`p-2 sm:p-3 rounded-xl transition-all ${
                          isFutureDate ? 'opacity-30 cursor-not-allowed' :
                          status === 'present'
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-lg'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'late')}
                        disabled={isFutureDate}
                        className={`p-2 sm:p-3 rounded-xl transition-all ${
                          isFutureDate ? 'opacity-30 cursor-not-allowed' :
                          status === 'late'
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        }`}
                      >
                        <Clock size={18} />
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'absent')}
                        disabled={isFutureDate}
                        className={`p-2 sm:p-3 rounded-xl transition-all ${
                          isFutureDate ? 'opacity-30 cursor-not-allowed' :
                          status === 'absent'
                            ? 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* 메모 입력 (결석 또는 지각 시) */}
                  {(status === 'absent' || status === 'late') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3"
                    >
                      <input
                        type="text"
                        placeholder="사유를 입력하세요 (예: 가족여행)"
                        value={attendanceChanges[student.id]?.memo || student.attendance?.memo || ''}
                        onChange={(e) => handleMemoChange(student.id, e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* FR-06: 출석→결석 확인 다이얼로그 */}
      <AnimatePresence>
        {confirmDialog?.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">출석 상태 변경</h3>
                <p className="text-gray-600 text-sm mb-6">
                  <strong>{confirmDialog.studentName}</strong>을(를) 결석으로 변경하면<br />
                  달란트가 차감됩니다. 변경하시겠습니까?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setConfirmDialog(null)}
                  >
                    취소
                  </Button>
                  <button
                    onClick={() => {
                      applyStatusChange(confirmDialog.studentId, 'absent');
                      setConfirmDialog(null);
                    }}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                  >
                    결석 처리
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FR-03: 출석 이력 모달 */}
      <AnimatePresence>
        {historyModal?.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setHistoryModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History size={20} className="text-purple-500" />
                  <h2 className="text-lg font-bold text-gray-800">
                    {historyModal.studentName} 출석 이력
                  </h2>
                </div>
                <button
                  onClick={() => setHistoryModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 연속 출석 및 통계 */}
              <div className="flex items-center gap-4 mb-4 p-3 bg-purple-50 rounded-xl">
                {historyModal.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-500 font-bold">
                    <Flame size={18} />
                    연속 {historyModal.streak}회
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="text-emerald-600">출석 {historyModal.totalPresent}</span>
                  <span className="text-amber-600">지각 {historyModal.totalLate}</span>
                  <span className="text-red-600">결석 {historyModal.totalAbsent}</span>
                </div>
              </div>

              {/* 이력 목록 */}
              <div className="space-y-2">
                {historyModal.history.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">출석 기록이 없습니다</p>
                ) : (
                  historyModal.history.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50"
                    >
                      <span className="text-sm text-gray-600">{entry.date}</span>
                      <div className="flex items-center gap-2">
                        {entry.memo && (
                          <span className="text-xs text-gray-400">{entry.memo}</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          entry.status === 'present'
                            ? 'bg-emerald-100 text-emerald-700'
                            : entry.status === 'late'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.status === 'present' ? '출석' : entry.status === 'late' ? '지각' : '결석'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FR-04: 연속 출석 보너스 토스트 */}
      <AnimatePresence>
        {streakBonuses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 space-y-2"
          >
            {streakBonuses.map((bonus, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-2xl shadow-lg"
              >
                <Flame size={20} />
                <span className="font-medium">
                  {bonus.studentName} 연속 {bonus.streak}회 출석! 보너스 {bonus.bonus}달란트
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
