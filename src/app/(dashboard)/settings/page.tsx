'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Users,
  Building2,
  Plus,
  Trash2,
  Edit3,
  UserPlus,
  Save,
  X,
  Coins,
  UserCheck
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Avatar, Input } from '@/components/ui';

interface User {
  id: string;
  loginId: string;
  name: string;
  role: string;
  phone: string | null;
}

interface Class {
  id: string;
  name: string;
  grade: number;
  teacherName: string | null;
  studentCount: number;
}

interface ParentWithChildren {
  id: string;
  loginId: string;
  name: string;
  phone: string | null;
  children: { id: string; name: string; grade: number; className: string | null }[];
}

interface StudentOption {
  id: string;
  name: string;
  grade: number;
  className: string | null;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'talent' | 'parents'>('users');

  // 모달 상태
  const [showUserModal, setShowUserModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [userForm, setUserForm] = useState({
    loginId: '',
    password: '',
    name: '',
    role: 'teacher',
    phone: '',
  });

  const [classForm, setClassForm] = useState({
    name: '',
    grade: 1,
    teacherId: '',
  });

  // 학부모 관련 상태
  const [parents, setParents] = useState<ParentWithChildren[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [showParentModal, setShowParentModal] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentWithChildren | null>(null);
  const [parentForm, setParentForm] = useState({
    loginId: '',
    password: '',
    name: '',
    phone: '',
    studentIds: [] as string[],
  });

  // 달란트 설정 상태
  const [talentSettings, setTalentSettings] = useState({
    attendance_talent_points: '5',
    streak_bonus_threshold: '4',
    streak_bonus_points: '10',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, classesRes, settingsRes, parentsRes, studentsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/classes'),
        fetch('/api/settings'),
        fetch('/api/parents'),
        fetch('/api/students'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data);
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setTalentSettings({
          attendance_talent_points: data.attendance_talent_points || '5',
          streak_bonus_threshold: data.streak_bonus_threshold || '4',
          streak_bonus_points: data.streak_bonus_points || '10',
        });
      }
      if (parentsRes.ok) {
        const data = await parentsRes.json();
        setParents(data);
      }
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setAllStudents(data.map((s: StudentOption & { className?: string }) => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          className: s.className || null,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(talentSettings),
      });

      if (res.ok) {
        alert('설정이 저장되었습니다.');
      } else {
        const data = await res.json();
        alert(data.error || '설정 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        loginId: user.loginId,
        password: '', // 비밀번호는 수정 시 빈값
        name: user.name,
        role: user.role,
        phone: user.phone || '',
      });
    } else {
      setEditingUser(null);
      setUserForm({ loginId: '', password: '', name: '', role: 'teacher', phone: '' });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.loginId) return;
    if (!editingUser && !userForm.password) return; // 새 사용자는 비밀번호 필수

    setSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const body: Record<string, string> = {
        loginId: userForm.loginId,
        name: userForm.name,
        role: userForm.role,
        phone: userForm.phone,
      };

      // 비밀번호가 입력된 경우에만 포함
      if (userForm.password) {
        body.password = userForm.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowUserModal(false);
        setEditingUser(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddClass = async () => {
    if (!classForm.name) return;

    setSaving(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classForm),
      });

      if (res.ok) {
        setShowClassModal(false);
        setClassForm({ name: '', grade: 1, teacherId: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add class:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // 학부모 관련 핸들러
  const openParentModal = (parent?: ParentWithChildren) => {
    if (parent) {
      setEditingParent(parent);
      setParentForm({
        loginId: parent.loginId,
        password: '',
        name: parent.name,
        phone: parent.phone || '',
        studentIds: parent.children.map(c => c.id),
      });
    } else {
      setEditingParent(null);
      setParentForm({ loginId: '', password: '', name: '', phone: '', studentIds: [] });
    }
    setShowParentModal(true);
  };

  const handleSaveParent = async () => {
    if (!parentForm.name || !parentForm.loginId || parentForm.studentIds.length === 0) return;
    if (!editingParent && !parentForm.password) return;

    setSaving(true);
    try {
      const url = editingParent ? `/api/parents/${editingParent.id}` : '/api/parents';
      const method = editingParent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parentForm),
      });

      if (res.ok) {
        setShowParentModal(false);
        setEditingParent(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save parent:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParent = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/parents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete parent:', error);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setParentForm(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId],
    }));
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="설정" subtitle="시스템 설정을 관리합니다" />

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-purple-50'
          }`}
        >
          <Users size={18} />
          교사 관리
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'classes'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-purple-50'
          }`}
        >
          <Building2 size={18} />
          반 관리
        </button>
        <button
          onClick={() => setActiveTab('talent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'talent'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-purple-50'
          }`}
        >
          <Coins size={18} />
          달란트 설정
        </button>
        <button
          onClick={() => setActiveTab('parents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'parents'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-purple-50'
          }`}
        >
          <UserCheck size={18} />
          학부모 관리
        </button>
      </div>

      {/* 교사 관리 */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">총 {users.length}명의 사용자</p>
            <Button variant="secondary" onClick={() => openUserModal()}>
              <UserPlus size={18} className="mr-2" />
              교사 추가
            </Button>
          </div>

          {users.length === 0 ? (
            <Card className="text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">등록된 사용자가 없습니다</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar name={user.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{user.name}</p>
                          <Badge variant={user.role === 'admin' ? 'gold' : 'purple'}>
                            {user.role === 'admin' ? '👑 관리자' : '📚 교사'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{user.loginId}</p>
                        {user.phone && (
                          <p className="text-xs text-gray-400">📞 {user.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openUserModal(user)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 반 관리 */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">총 {classes.length}개의 반</p>
            <Button variant="secondary" onClick={() => setShowClassModal(true)}>
              <Plus size={18} className="mr-2" />
              반 추가
            </Button>
          </div>

          {classes.length === 0 ? (
            <Card className="text-center py-12">
              <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">등록된 반이 없습니다</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {classes.map((c) => (
                <Card key={c.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="purple">{c.grade}학년</Badge>
                      <h3 className="font-bold text-gray-800">{c.name}</h3>
                    </div>
                    <button
                      onClick={() => handleDeleteClass(c.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>👨‍🏫 {c.teacherName || '미배정'}</p>
                    <p>👦 {c.studentCount}명</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 달란트 설정 */}
      {activeTab === 'talent' && (
        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-gray-800 mb-4">출석 달란트 설정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  출석 지급 달란트 (점)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={talentSettings.attendance_talent_points}
                  onChange={(e) => setTalentSettings({ ...talentSettings, attendance_talent_points: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                />
                <p className="text-xs text-gray-400 mt-1">출석 또는 지각 시 지급되는 달란트</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연속 출석 보너스 기준 (회)
                </label>
                <input
                  type="number"
                  min="0"
                  max="52"
                  value={talentSettings.streak_bonus_threshold}
                  onChange={(e) => setTalentSettings({ ...talentSettings, streak_bonus_threshold: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                />
                <p className="text-xs text-gray-400 mt-1">0으로 설정하면 연속 출석 보너스가 비활성화됩니다</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연속 출석 보너스 달란트 (점)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={talentSettings.streak_bonus_points}
                  onChange={(e) => setTalentSettings({ ...talentSettings, streak_bonus_points: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                />
                <p className="text-xs text-gray-400 mt-1">기준 횟수의 배수마다 지급 (예: 4회, 8회, 12회...)</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700">
                <p className="font-medium mb-1">현재 설정 요약</p>
                <p>출석/지각 시 {talentSettings.attendance_talent_points}점 지급</p>
                {parseInt(talentSettings.streak_bonus_threshold) > 0 ? (
                  <p>{talentSettings.streak_bonus_threshold}회 연속 출석마다 보너스 {talentSettings.streak_bonus_points}점 추가 지급</p>
                ) : (
                  <p>연속 출석 보너스 비활성화</p>
                )}
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleSaveSettings}
                isLoading={savingSettings}
              >
                <Save size={18} className="mr-2" />
                저장하기
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 학부모 관리 */}
      {activeTab === 'parents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">총 {parents.length}명의 학부모</p>
            <Button variant="secondary" onClick={() => openParentModal()}>
              <UserPlus size={18} className="mr-2" />
              학부모 추가
            </Button>
          </div>

          {parents.length === 0 ? (
            <Card className="text-center py-12">
              <UserCheck size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">등록된 학부모가 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">학부모 계정을 추가하고 자녀를 연결하세요</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {parents.map((parent) => (
                <motion.div
                  key={parent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar name={parent.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{parent.name}</p>
                          <Badge variant="purple">🏠 학부모</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{parent.loginId}</p>
                        {parent.phone && (
                          <p className="text-xs text-gray-400">📞 {parent.phone}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {parent.children.map(child => (
                            <Badge key={child.id} variant="gold" className="text-xs">
                              {child.name} ({child.grade}학년)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openParentModal(parent)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteParent(parent.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 학부모 추가/수정 모달 */}
      <AnimatePresence>
        {showParentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowParentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingParent ? '학부모 정보 수정' : '학부모 추가'}
                </h2>
                <button
                  onClick={() => setShowParentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="이름 *"
                  placeholder="김철수 부모"
                  value={parentForm.name}
                  onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
                />
                <Input
                  label="아이디 *"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={parentForm.loginId}
                  onChange={(e) => setParentForm({ ...parentForm, loginId: e.target.value })}
                  disabled={!!editingParent}
                />
                <div>
                  <Input
                    label={editingParent ? "비밀번호 (변경 시에만 입력)" : "비밀번호 *"}
                    type="password"
                    placeholder="••••••••"
                    value={parentForm.password}
                    onChange={(e) => setParentForm({ ...parentForm, password: e.target.value })}
                  />
                  {editingParent && (
                    <p className="text-xs text-gray-400 mt-1">비워두면 기존 비밀번호가 유지됩니다</p>
                  )}
                </div>
                <Input
                  label="연락처"
                  placeholder="010-1234-5678"
                  value={parentForm.phone}
                  onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                />

                {/* 자녀 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">자녀 선택 *</label>
                  <div className="max-h-48 overflow-y-auto border-2 border-purple-200 rounded-xl p-3 space-y-2">
                    {allStudents.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">등록된 학생이 없습니다</p>
                    ) : (
                      allStudents.map((student) => (
                        <label
                          key={student.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            parentForm.studentIds.includes(student.id)
                              ? 'bg-purple-50 border border-purple-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={parentForm.studentIds.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-400"
                          />
                          <span className="text-sm text-gray-700">
                            {student.name} ({student.grade}학년{student.className ? `, ${student.className}` : ''})
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {parentForm.studentIds.length === 0 && (
                    <p className="text-xs text-red-400 mt-1">자녀를 1명 이상 선택해주세요</p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowParentModal(false)}>
                    취소
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleSaveParent}
                    isLoading={saving}
                    disabled={!parentForm.loginId || !parentForm.name || parentForm.studentIds.length === 0 || (!editingParent && !parentForm.password)}
                  >
                    <Save size={18} className="mr-2" />
                    {editingParent ? '수정하기' : '추가하기'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 교사 추가/수정 모달 */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUserModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingUser ? '교사 정보 수정' : '새 교사 추가'}
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="이름 *"
                  placeholder="홍길동"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
                <Input
                  label="아이디 *"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={userForm.loginId}
                  onChange={(e) => setUserForm({ ...userForm, loginId: e.target.value })}
                />
                <div>
                  <Input
                    label={editingUser ? "비밀번호 (변경 시에만 입력)" : "비밀번호 *"}
                    type="password"
                    placeholder="••••••••"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                  {editingUser && (
                    <p className="text-xs text-gray-400 mt-1">비워두면 기존 비밀번호가 유지됩니다</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">역할</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                  >
                    <option value="teacher">📚 교사</option>
                    <option value="admin">👑 관리자</option>
                  </select>
                </div>
                <Input
                  label="연락처"
                  placeholder="010-1234-5678"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />

                <div className="flex gap-3 mt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowUserModal(false)}>
                    취소
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleSaveUser}
                    isLoading={saving}
                    disabled={!userForm.loginId || !userForm.name || (!editingUser && !userForm.password)}
                  >
                    <Save size={18} className="mr-2" />
                    {editingUser ? '수정하기' : '추가하기'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 반 추가 모달 */}
      <AnimatePresence>
        {showClassModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowClassModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">새 반 추가</h2>
                <button
                  onClick={() => setShowClassModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="반 이름 *"
                  placeholder="다윗반"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">학년</label>
                  <select
                    value={classForm.grade}
                    onChange={(e) => setClassForm({ ...classForm, grade: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <option key={g} value={g}>{g}학년</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">담당 교사</label>
                  <select
                    value={classForm.teacherId}
                    onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
                  >
                    <option value="">선택 안함</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowClassModal(false)}>
                    취소
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleAddClass}
                    isLoading={saving}
                    disabled={!classForm.name}
                  >
                    추가하기
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
