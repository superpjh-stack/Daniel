'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  Phone,
  Cake,
  Star,
  AlertTriangle,
  X,
  ChevronRight,
  Flame,
  UserCheck,
  BarChart3
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Avatar, Input } from '@/components/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StudentWithAttendance {
  id: string;
  name: string;
  grade: number;
  birthday: string | null;
  parentPhone: string | null;
  parentName: string | null;
  note: string | null;
  profileImage: string | null;
  talentBalance: number;
  className: string | null;
  classId: string | null;
  recentAttendance: { date: string; status: string }[];
}

interface StudentDetail {
  id: string;
  name: string;
  grade: number;
  birthday: string | null;
  parentPhone: string | null;
  parentName: string | null;
  note: string | null;
  profileImage: string | null;
  talentBalance: number;
  className: string | null;
  classId: string | null;
  attendanceStats: { totalPresent: number; totalLate: number; totalAbsent: number };
  attendanceStreak: number;
  recentAttendance: { date: string; status: string; memo: string | null }[];
  recentTalents: { amount: number; reason: string; type: string; createdAt: string }[];
}

interface StudentStats {
  total: number;
  byGrade: { grade: number; count: number }[];
  assignedToClass: number;
}

interface Class {
  id: string;
  name: string;
  grade: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'talent' | 'recent'>('name');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithAttendance | null>(null);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<StudentStats | null>(null);

  // 상세 모달
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailStudent, setDetailStudent] = useState<StudentDetail | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'attendance' | 'talent'>('info');
  const [detailLoading, setDetailLoading] = useState(false);

  // 삭제 확인
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<StudentWithAttendance | null>(null);

  // 중복 경고
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    grade: 1,
    birthday: '',
    parentPhone: '',
    parentName: '',
    note: '',
    classId: '',
    profileImage: '',
  });

  useEffect(() => {
    fetchData();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.role === 'admin');
      }
    } catch {
      // ignore
    }
  };

  const fetchData = async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        fetch('/api/students?stats=true'),
        fetch('/api/classes'),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        if (data.students) {
          setStudents(data.students);
          setStats(data.stats);
        } else {
          setStudents(data);
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

  const openModal = (student?: StudentWithAttendance) => {
    setDuplicateWarning(null);
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        grade: student.grade,
        birthday: student.birthday ? format(new Date(student.birthday), 'yyyy-MM-dd') : '',
        parentPhone: student.parentPhone || '',
        parentName: student.parentName || '',
        note: student.note || '',
        classId: student.classId || '',
        profileImage: student.profileImage || '',
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        grade: 1,
        birthday: '',
        parentPhone: '',
        parentName: '',
        note: '',
        classId: '',
        profileImage: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return;

    setSaving(true);
    setDuplicateWarning(null);
    try {
      const url = editingStudent
        ? `/api/students/${editingStudent.id}`
        : '/api/students';

      const res = await fetch(url, {
        method: editingStudent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.duplicateWarning) {
          setDuplicateWarning(data.duplicateWarning);
        }
        setShowModal(false);
        fetchData();
      } else if (res.status === 403) {
        alert('권한이 없습니다.');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (student: StudentWithAttendance) => {
    setDeletingStudent(student);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;

    try {
      const res = await fetch(`/api/students/${deletingStudent.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowDeleteConfirm(false);
        setDeletingStudent(null);
        fetchData();
      } else if (res.status === 403) {
        alert('관리자만 학생을 삭제할 수 있습니다.');
        setShowDeleteConfirm(false);
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const openDetailModal = async (studentId: string) => {
    setDetailLoading(true);
    setDetailTab('info');
    setShowDetailModal(true);
    try {
      const res = await fetch(`/api/students/${studentId}?detail=true`);
      if (res.ok) {
        const data = await res.json();
        setDetailStudent(data);
      }
    } catch (error) {
      console.error('Failed to fetch detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  // 반 필터: 선택한 학년에 해당하는 반만 표시
  const filteredClasses = selectedGrade === 'all'
    ? classes
    : classes.filter(c => c.grade === parseInt(selectedGrade));

  // 필터링 + 정렬
  const filteredStudents = students
    .filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = selectedGrade === 'all' || s.grade === parseInt(selectedGrade);
      const matchesClass = selectedClass === 'all' || s.classId === selectedClass;
      return matchesSearch && matchesGrade && matchesClass;
    })
    .sort((a, b) => {
      if (sortBy === 'talent') return b.talentBalance - a.talentBalance;
      if (sortBy === 'recent') return 0; // DB에서 이미 정렬됨
      return a.name.localeCompare(b.name, 'ko');
    });

  const groupedByGrade = filteredStudents.reduce((acc, student) => {
    if (!acc[student.grade]) acc[student.grade] = [];
    acc[student.grade].push(student);
    return acc;
  }, {} as Record<number, StudentWithAttendance[]>);

  // 출석 미니 인디케이터 색상
  const getAttendanceDotColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-emerald-400';
      case 'late': return 'bg-amber-400';
      case 'absent': return 'bg-red-400';
      default: return 'bg-gray-300';
    }
  };

  // 평균 달란트 계산
  const avgTalent = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.talentBalance, 0) / students.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="학생 관리" subtitle={`총 ${students.length}명의 학생`} />

      {/* 통계 카드 (FR-09) */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center">
            <Users size={20} className="mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-500">전체 학생</p>
          </Card>
          <Card className="p-4 text-center">
            <UserCheck size={20} className="mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-gray-800">
              {stats.total > 0 ? Math.round((stats.assignedToClass / stats.total) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500">반 배정률</p>
          </Card>
          <Card className="p-4 text-center">
            <Star size={20} className="mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-gray-800">{avgTalent}</p>
            <p className="text-xs text-gray-500">평균 달란트</p>
          </Card>
        </div>
      )}

      {/* 필터 및 추가 버튼 (FR-01, FR-02) */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="학생 이름 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/90 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <select
          value={selectedGrade}
          onChange={(e) => {
            setSelectedGrade(e.target.value);
            setSelectedClass('all');
          }}
          className="px-4 py-3 bg-white/90 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="all">전체 학년</option>
          {[1, 2, 3, 4, 5, 6].map((grade) => (
            <option key={grade} value={grade}>{grade}학년</option>
          ))}
        </select>

        {/* 반 필터 (FR-01) */}
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-3 bg-white/90 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="all">전체 반</option>
          {filteredClasses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* 정렬 (FR-02) */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'talent' | 'recent')}
          className="px-4 py-3 bg-white/90 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="name">이름순</option>
          <option value="talent">달란트순</option>
          <option value="recent">등록순</option>
        </select>

        <Button variant="secondary" onClick={() => openModal()}>
          <Plus size={18} className="mr-2" />
          학생 추가
        </Button>
      </div>

      {/* 학생 목록 */}
      {Object.keys(groupedByGrade).length === 0 ? (
        <Card className="text-center py-20">
          <Users size={64} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">등록된 학생이 없습니다</p>
          <Button variant="primary" className="mt-4" onClick={() => openModal()}>
            첫 학생 추가하기
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByGrade)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([grade, gradeStudents]) => (
              <div key={grade}>
                <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Badge variant="purple">{grade}학년</Badge>
                  <span className="text-gray-400 text-sm font-normal">{gradeStudents.length}명</span>
                </h2>

                <div className="grid gap-3">
                  {gradeStudents.map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/90 backdrop-blur-lg rounded-2xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => openDetailModal(student.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                          {/* FR-06: 프로필 이미지 */}
                          <Avatar name={student.name} size="md" image={student.profileImage} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-800 text-base sm:text-lg">{student.name}</p>
                              {student.className && (
                                <Badge variant="blue">{student.className}</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                              {student.birthday && (
                                <span className="flex items-center gap-1">
                                  <Cake size={14} />
                                  {format(new Date(student.birthday), 'M월 d일', { locale: ko })}
                                </span>
                              )}
                              {student.parentPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={14} />
                                  {student.parentPhone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Star size={14} className="text-amber-500" />
                                {student.talentBalance.toLocaleString()}
                              </span>
                              {/* FR-04: 출석 미니 인디케이터 */}
                              <span className="flex items-center gap-1">
                                {[0, 1, 2, 3].map((i) => (
                                  <span
                                    key={i}
                                    className={`w-2.5 h-2.5 rounded-full ${
                                      student.recentAttendance[i]
                                        ? getAttendanceDotColor(student.recentAttendance[i].status)
                                        : 'bg-gray-200'
                                    }`}
                                    title={student.recentAttendance[i]?.date || '기록 없음'}
                                  />
                                ))}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openModal(student)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Edit3 size={18} />
                          </button>
                          {/* FR-07: admin만 삭제 버튼 */}
                          {isAdmin && (
                            <button
                              onClick={() => openDeleteConfirm(student)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <ChevronRight size={18} className="text-gray-300" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 학생 추가/수정 모달 (+ FR-06 profileImage, FR-08 중복경고) */}
      <AnimatePresence>
        {showModal && (
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
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {editingStudent ? '학생 정보 수정' : '새 학생 추가'}
              </h2>

              {/* FR-08: 중복 경고 */}
              {duplicateWarning && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">{duplicateWarning}</p>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="이름 *"
                  placeholder="학생 이름"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">학년 *</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                    >
                      {[1, 2, 3, 4, 5, 6].map((g) => (
                        <option key={g} value={g}>{g}학년</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">반</label>
                    <select
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                    >
                      <option value="">선택 안함</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="생년월일"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="보호자 이름"
                    placeholder="홍길동"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  />
                  <Input
                    label="보호자 연락처"
                    placeholder="010-1234-5678"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  />
                </div>

                {/* FR-06: 프로필 이미지 URL */}
                <Input
                  label="프로필 이미지 URL"
                  placeholder="https://example.com/photo.jpg"
                  value={formData.profileImage}
                  onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">특이사항</label>
                  <textarea
                    placeholder="알레르기, 주의사항 등"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 resize-none h-24"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    취소
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleSubmit}
                    isLoading={saving}
                    disabled={!formData.name}
                  >
                    {editingStudent ? '수정하기' : '추가하기'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FR-03: 커스텀 삭제 확인 다이얼로그 */}
      <AnimatePresence>
        {showDeleteConfirm && deletingStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={28} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">학생 삭제</h3>
                <p className="text-gray-600 mb-2">
                  <strong>&apos;{deletingStudent.name}&apos;</strong> 학생을 정말 삭제하시겠습니까?
                </p>
                <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3 mb-6">
                  해당 학생의 출석 기록과 달란트 내역이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    취소
                  </Button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FR-05: 학생 상세 보기 모달 */}
      <AnimatePresence>
        {showDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="spinner" />
                </div>
              ) : detailStudent ? (
                <>
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar name={detailStudent.name} size="lg" image={detailStudent.profileImage} />
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{detailStudent.name}</h2>
                        <p className="text-sm text-gray-500">
                          {detailStudent.grade}학년 {detailStudent.className || '미배정'}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-sm text-amber-600">
                            <Star size={14} /> {detailStudent.talentBalance.toLocaleString()}
                          </span>
                          {detailStudent.attendanceStreak > 0 && (
                            <span className="flex items-center gap-1 text-sm text-orange-500">
                              <Flame size={14} /> 연속 {detailStudent.attendanceStreak}주
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* 탭 */}
                  <div className="flex border-b border-gray-200 mb-4">
                    {(['info', 'attendance', 'talent'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setDetailTab(tab)}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                          detailTab === tab
                            ? 'border-purple-500 text-purple-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {tab === 'info' ? '기본정보' : tab === 'attendance' ? '출석이력' : '달란트내역'}
                      </button>
                    ))}
                  </div>

                  {/* 기본정보 탭 */}
                  {detailTab === 'info' && (
                    <div className="space-y-3">
                      {detailStudent.birthday && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <Cake size={18} className="text-pink-500" />
                          <div>
                            <p className="text-xs text-gray-400">생일</p>
                            <p className="text-sm font-medium">{format(new Date(detailStudent.birthday), 'yyyy년 M월 d일', { locale: ko })}</p>
                          </div>
                        </div>
                      )}
                      {detailStudent.parentName && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <Users size={18} className="text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-400">보호자</p>
                            <p className="text-sm font-medium">
                              {detailStudent.parentName}
                              {detailStudent.parentPhone && ` (${detailStudent.parentPhone})`}
                            </p>
                          </div>
                        </div>
                      )}
                      {detailStudent.note && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                          <Edit3 size={18} className="text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-400">특이사항</p>
                            <p className="text-sm">{detailStudent.note}</p>
                          </div>
                        </div>
                      )}
                      {/* 출석 통계 바 */}
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 size={18} className="text-purple-500" />
                          <p className="text-xs text-gray-400">출석 통계</p>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-emerald-600">출석 {detailStudent.attendanceStats.totalPresent}</span>
                          <span className="text-amber-600">지각 {detailStudent.attendanceStats.totalLate}</span>
                          <span className="text-red-500">결석 {detailStudent.attendanceStats.totalAbsent}</span>
                        </div>
                        {(detailStudent.attendanceStats.totalPresent + detailStudent.attendanceStats.totalLate + detailStudent.attendanceStats.totalAbsent) > 0 && (
                          <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-gray-200">
                            <div
                              className="bg-emerald-400"
                              style={{
                                width: `${(detailStudent.attendanceStats.totalPresent / (detailStudent.attendanceStats.totalPresent + detailStudent.attendanceStats.totalLate + detailStudent.attendanceStats.totalAbsent)) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-amber-400"
                              style={{
                                width: `${(detailStudent.attendanceStats.totalLate / (detailStudent.attendanceStats.totalPresent + detailStudent.attendanceStats.totalLate + detailStudent.attendanceStats.totalAbsent)) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-red-400"
                              style={{
                                width: `${(detailStudent.attendanceStats.totalAbsent / (detailStudent.attendanceStats.totalPresent + detailStudent.attendanceStats.totalLate + detailStudent.attendanceStats.totalAbsent)) * 100}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 출석이력 탭 */}
                  {detailTab === 'attendance' && (
                    <div className="space-y-2">
                      {detailStudent.recentAttendance.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">출석 기록이 없습니다</p>
                      ) : (
                        detailStudent.recentAttendance.map((a, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <span className="text-sm text-gray-600">
                              {format(new Date(a.date), 'M월 d일 (EEE)', { locale: ko })}
                            </span>
                            <Badge
                              variant={a.status === 'present' ? 'green' : a.status === 'late' ? 'gold' : 'red'}
                            >
                              {a.status === 'present' ? '출석' : a.status === 'late' ? '지각' : '결석'}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 달란트내역 탭 */}
                  {detailTab === 'talent' && (
                    <div className="space-y-2">
                      {detailStudent.recentTalents.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">달란트 내역이 없습니다</p>
                      ) : (
                        detailStudent.recentTalents.map((t, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-gray-700">{t.reason}</p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(t.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                              </p>
                            </div>
                            <span className={`text-sm font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {t.amount >= 0 ? '+' : ''}{t.amount}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-400 py-10">학생 정보를 불러올 수 없습니다.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
