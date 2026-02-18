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
  UserCheck,
  Bot,
  Copy,
  Unlink,
  Wifi,
  Printer,
  Download,
  FileText,
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
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'talent' | 'parents' | 'telegram' | 'export'>('users');

  // 모달 상태
  const [showUserModal, setShowUserModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
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

  // 텔레그램 상태
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [telegramLinks, setTelegramLinks] = useState<{ chatId: string; userId: string; userName: string; userRole: string; username: string | null }[]>([]);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkCodeExpiry, setLinkCodeExpiry] = useState(0);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);

  // 출력 상태
  const currentYear = new Date().getFullYear();
  const [exportType, setExportType] = useState<'attendance' | 'talent'>('attendance');
  const [exportPeriodType, setExportPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  const [exportYear, setExportYear] = useState(currentYear);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportClassId, setExportClassId] = useState('all');
  const [exportData, setExportData] = useState<Record<string, unknown>[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

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

      // Telegram 상태 로드
      try {
        const telegramRes = await fetch('/api/telegram/link');
        if (telegramRes.ok) {
          const data = await telegramRes.json();
          setTelegramConfigured(data.configured);
          setTelegramLinks(data.links || []);
        }
      } catch {
        // Telegram 로드 실패는 무시
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

  const openClassModal = (cls?: Class) => {
    if (cls) {
      setEditingClass(cls);
      const teacher = users.find(u => u.name === cls.teacherName);
      setClassForm({
        name: cls.name,
        grade: cls.grade,
        teacherId: teacher?.id || '',
      });
    } else {
      setEditingClass(null);
      setClassForm({ name: '', grade: 1, teacherId: '' });
    }
    setShowClassModal(true);
  };

  const handleSaveClass = async () => {
    if (!classForm.name) return;

    setSaving(true);
    try {
      const url = editingClass ? `/api/classes/${editingClass.id}` : '/api/classes';
      const method = editingClass ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classForm),
      });

      if (res.ok) {
        setShowClassModal(false);
        setEditingClass(null);
        setClassForm({ name: '', grade: 1, teacherId: '' });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save class:', error);
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

  // 텔레그램 핸들러
  const handleGenerateLinkCode = async () => {
    try {
      const res = await fetch('/api/telegram/link', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLinkCode(data.code);
        setLinkCodeExpiry(data.expiresIn);
        // 만료 카운트다운
        const interval = setInterval(() => {
          setLinkCodeExpiry(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setLinkCode(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const data = await res.json();
        alert(data.error || '연결코드 발급에 실패했습니다.');
      }
    } catch {
      alert('연결코드 발급에 실패했습니다.');
    }
  };

  const handleSetupWebhook = async () => {
    if (!webhookUrl) return;
    setTelegramLoading(true);
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        alert('Webhook 설정이 완료되었습니다.');
      } else {
        alert(data.description || 'Webhook 설정에 실패했습니다.');
      }
    } catch {
      alert('Webhook 설정에 실패했습니다.');
    } finally {
      setTelegramLoading(false);
    }
  };

  const fetchExportData = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({ year: String(exportYear) });
      if (exportPeriodType === 'monthly') params.set('month', String(exportMonth));
      if (exportClassId !== 'all') params.set('classId', exportClassId);

      const endpoint = exportType === 'attendance'
        ? `/api/export/attendance?${params}`
        : `/api/export/talent?${params}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setExportData(data.records || []);
      }
    } catch (error) {
      console.error('Export fetch error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    const params = new URLSearchParams({ year: String(exportYear), format: 'csv' });
    if (exportPeriodType === 'monthly') params.set('month', String(exportMonth));
    if (exportClassId !== 'all') params.set('classId', exportClassId);

    const endpoint = exportType === 'attendance'
      ? `/api/export/attendance?${params}`
      : `/api/export/talent?${params}`;

    window.open(endpoint, '_blank');
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
        <button
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'telegram'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-purple-50'
          }`}
        >
          <Bot size={18} />
          텔레그램
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'export'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-purple-50'
          }`}
        >
          <Printer size={18} />
          출력
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
            <Button variant="secondary" onClick={() => openClassModal()}>
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openClassModal(c)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(c.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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

      {/* 텔레그램 설정 */}
      {activeTab === 'telegram' && (
        <div className="space-y-4">
          {/* 봇 상태 */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${telegramConfigured ? 'bg-green-500' : 'bg-red-400'}`} />
              <h3 className="font-bold text-gray-800">
                봇 상태: {telegramConfigured ? '설정됨' : '미설정'}
              </h3>
            </div>
            {!telegramConfigured && (
              <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-700">
                <p className="font-medium mb-1">설정 방법</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Telegram에서 @BotFather를 검색하세요</li>
                  <li>/newbot 명령으로 새 봇을 만드세요</li>
                  <li>발급받은 토큰을 서버 환경변수 <code className="bg-yellow-100 px-1 rounded">TELEGRAM_BOT_TOKEN</code>에 설정하세요</li>
                  <li>아래에서 Webhook URL을 등록하세요</li>
                </ol>
              </div>
            )}
          </Card>

          {/* 연결코드 발급 */}
          {telegramConfigured && (
            <Card>
              <h3 className="font-bold text-gray-800 mb-4">연결코드 발급</h3>
              <p className="text-sm text-gray-500 mb-4">
                Telegram 봇에서 <code className="bg-gray-100 px-1 rounded">/연결 코드</code>를 입력하여 계정을 연결합니다.
              </p>

              {linkCode ? (
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-purple-600 mb-2">연결코드</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-3xl font-mono font-bold text-purple-700 tracking-widest">{linkCode}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(linkCode);
                        alert('복사되었습니다!');
                      }}
                      className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-purple-400 mt-2">
                    {Math.floor(linkCodeExpiry / 60)}분 {linkCodeExpiry % 60}초 후 만료
                  </p>
                </div>
              ) : (
                <Button variant="secondary" onClick={handleGenerateLinkCode} className="w-full">
                  <Bot size={18} className="mr-2" />
                  연결코드 발급
                </Button>
              )}
            </Card>
          )}

          {/* 연결된 기기 목록 */}
          {telegramConfigured && (
            <Card>
              <h3 className="font-bold text-gray-800 mb-4">
                연결된 기기 ({telegramLinks.length}개)
              </h3>
              {telegramLinks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  연결된 Telegram 계정이 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {telegramLinks.map((link) => (
                    <div key={link.chatId} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <Bot size={20} className="text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-800">
                            {link.userName}
                            {link.username && <span className="text-gray-400 ml-1">@{link.username}</span>}
                          </p>
                          <Badge variant={link.userRole === 'admin' ? 'gold' : 'purple'} className="text-xs">
                            {link.userRole === 'admin' ? '관리자' : '교사'}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm(`${link.userName}의 Telegram 연결을 해제하시겠습니까?`)) return;
                          try {
                            const res = await fetch('/api/telegram/unlink', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ chatId: link.chatId }),
                            });
                            if (res.ok) {
                              setTelegramLinks(prev => prev.filter(l => l.chatId !== link.chatId));
                            } else {
                              alert('연결 해제에 실패했습니다.');
                            }
                          } catch {
                            alert('연결 해제에 실패했습니다.');
                          }
                        }}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="연결 해제"
                      >
                        <Unlink size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Webhook 설정 */}
          <Card>
            <h3 className="font-bold text-gray-800 mb-4">Webhook 설정</h3>
            <div className="space-y-3">
              <Input
                label="Webhook URL"
                placeholder="https://your-domain.com/api/telegram/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <Button
                variant="primary"
                className="w-full"
                onClick={handleSetupWebhook}
                isLoading={telegramLoading}
                disabled={!webhookUrl || !telegramConfigured}
              >
                <Wifi size={18} className="mr-2" />
                Webhook 등록
              </Button>
              {!telegramConfigured && (
                <p className="text-xs text-red-400">TELEGRAM_BOT_TOKEN이 설정되어야 사용할 수 있습니다.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 출력 탭 */}
      {activeTab === 'export' && (
        <div className="space-y-6 print-content">
          {/* 필터 영역 */}
          <Card>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={20} />
              출력 설정
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {/* 출력 종류 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">출력 종류</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setExportType('attendance'); setExportData([]); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${exportType === 'attendance' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}
                  >
                    출석부
                  </button>
                  <button
                    onClick={() => { setExportType('talent'); setExportData([]); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${exportType === 'talent' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}
                  >
                    달란트
                  </button>
                </div>
              </div>

              {/* 기간 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">기간 유형</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setExportPeriodType('monthly'); setExportData([]); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${exportPeriodType === 'monthly' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}
                  >
                    월별
                  </button>
                  <button
                    onClick={() => { setExportPeriodType('yearly'); setExportData([]); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${exportPeriodType === 'yearly' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}
                  >
                    연별
                  </button>
                </div>
              </div>

              {/* 연도 + 월 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">연도</label>
                <select
                  value={exportYear}
                  onChange={(e) => { setExportYear(Number(e.target.value)); setExportData([]); }}
                  className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 text-sm"
                >
                  {Array.from({ length: 6 }, (_, i) => currentYear - 2 + i).map(y => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
              </div>

              {exportPeriodType === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">월</label>
                  <select
                    value={exportMonth}
                    onChange={(e) => { setExportMonth(Number(e.target.value)); setExportData([]); }}
                    className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">반 선택</label>
                <select
                  value={exportClassId}
                  onChange={(e) => { setExportClassId(e.target.value); setExportData([]); }}
                  className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 text-sm"
                >
                  <option value="all">전체 반</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="secondary"
                onClick={fetchExportData}
                isLoading={exportLoading}
                className="no-print"
              >
                <FileText size={18} className="mr-2" />
                조회
              </Button>
            </div>
          </Card>

          {/* 결과 테이블 */}
          {exportData.length > 0 && (
            <Card>
              <div className="flex justify-between items-center mb-4 no-print">
                <h3 className="font-bold text-gray-800">
                  {exportType === 'attendance' ? '출석부' : '달란트 내역'} — {exportYear}년{exportPeriodType === 'monthly' ? ` ${exportMonth}월` : ''}
                  {exportClassId !== 'all' && ` · ${classes.find(c => c.id === exportClassId)?.name}`}
                  <span className="ml-2 text-sm font-normal text-gray-500">({exportData.length}건)</span>
                </h3>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleDownloadCsv} className="no-print">
                    <Download size={18} className="mr-2" />
                    CSV 다운로드
                  </Button>
                  <Button variant="secondary" onClick={() => window.print()} className="no-print">
                    <Printer size={18} className="mr-2" />
                    인쇄
                  </Button>
                </div>
              </div>

              {/* 인쇄용 제목 (화면에서는 숨김) */}
              <div className="print-only hidden">
                <h2 className="text-xl font-bold text-center mb-1">
                  {exportType === 'attendance' ? '출석부' : '달란트 내역'}
                </h2>
                <p className="text-center text-sm text-gray-600 mb-4">
                  {exportYear}년{exportPeriodType === 'monthly' ? ` ${exportMonth}월` : ''}
                  {exportClassId !== 'all' && ` · ${classes.find(c => c.id === exportClassId)?.name}`}
                  {' '}· 총 {exportData.length}건
                </p>
              </div>

              <div className="overflow-x-auto">
                {exportType === 'attendance' ? (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-purple-50">
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">날짜</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">학생</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">학년</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">반</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">상태</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(exportData as Array<{ date: string; studentName: string; grade: number; className: string | null; status: string; memo: string | null }>).map((row, i) => {
                        const statusMap: Record<string, { label: string; cls: string }> = {
                          present: { label: '출석', cls: 'text-green-600 font-medium' },
                          late: { label: '지각', cls: 'text-yellow-600 font-medium' },
                          absent: { label: '결석', cls: 'text-red-600 font-medium' },
                        };
                        const s = statusMap[row.status] || { label: row.status, cls: '' };
                        return (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 border border-gray-200">{row.date}</td>
                            <td className="px-3 py-2 border border-gray-200 font-medium">{row.studentName}</td>
                            <td className="px-3 py-2 border border-gray-200">{row.grade}학년</td>
                            <td className="px-3 py-2 border border-gray-200">{row.className || '-'}</td>
                            <td className={`px-3 py-2 border border-gray-200 ${s.cls}`}>{s.label}</td>
                            <td className="px-3 py-2 border border-gray-200 text-gray-500">{row.memo || ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-purple-50">
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">날짜</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">학생</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">학년</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">반</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">유형</th>
                        <th className="px-3 py-2 text-right border border-purple-200 font-semibold">금액</th>
                        <th className="px-3 py-2 text-left border border-purple-200 font-semibold">사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(exportData as Array<{ date: string; studentName: string; grade: number; className: string | null; type: string; amount: number; reason: string }>).map((row, i) => {
                        const typeMap: Record<string, { label: string; cls: string }> = {
                          attendance: { label: '출석', cls: 'text-blue-600' },
                          bonus: { label: '보너스', cls: 'text-green-600' },
                          purchase: { label: '구매', cls: 'text-orange-600' },
                        };
                        const t = typeMap[row.type] || { label: row.type, cls: '' };
                        return (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 border border-gray-200">{row.date}</td>
                            <td className="px-3 py-2 border border-gray-200 font-medium">{row.studentName}</td>
                            <td className="px-3 py-2 border border-gray-200">{row.grade}학년</td>
                            <td className="px-3 py-2 border border-gray-200">{row.className || '-'}</td>
                            <td className={`px-3 py-2 border border-gray-200 ${t.cls}`}>{t.label}</td>
                            <td className={`px-3 py-2 border border-gray-200 text-right font-medium ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {row.amount >= 0 ? '+' : ''}{row.amount}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 text-gray-600">{row.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-purple-50 font-semibold">
                        <td colSpan={5} className="px-3 py-2 border border-purple-200 text-right">합계</td>
                        <td className={`px-3 py-2 border border-purple-200 text-right ${
                          (exportData as Array<{ amount: number }>).reduce((s, r) => s + r.amount, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(() => {
                            const total = (exportData as Array<{ amount: number }>).reduce((s, r) => s + r.amount, 0);
                            return (total >= 0 ? '+' : '') + total;
                          })()}
                        </td>
                        <td className="px-3 py-2 border border-purple-200"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </Card>
          )}

          {exportData.length === 0 && !exportLoading && (
            <Card className="text-center py-12">
              <Printer size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">필터를 선택하고 조회 버튼을 눌러주세요</p>
            </Card>
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
                <h2 className="text-xl font-bold text-gray-800">
                  {editingClass ? '반 정보 수정' : '새 반 추가'}
                </h2>
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
                    onClick={handleSaveClass}
                    isLoading={saving}
                    disabled={!classForm.name}
                  >
                    <Save size={18} className="mr-2" />
                    {editingClass ? '수정하기' : '추가하기'}
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
