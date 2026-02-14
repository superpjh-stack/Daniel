'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Edit3,
  Trash2,
  Pin,
  PinOff,
  Save,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Badge, Button, Input } from '@/components/ui';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

const categories = [
  { value: 'all', label: '전체' },
  { value: 'general', label: '일반' },
  { value: 'event', label: '행사' },
  { value: 'urgent', label: '긴급' },
];

const categoryBadge = (category: string) => {
  switch (category) {
    case 'urgent': return <Badge variant="red">긴급</Badge>;
    case 'event': return <Badge variant="gold">행사</Badge>;
    default: return <Badge variant="purple">일반</Badge>;
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'general',
    isPinned: false,
  });

  const [userRole, setUserRole] = useState<string>('teacher');

  useEffect(() => {
    fetchUserRole();
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [activeCategory, currentPage]);

  const fetchUserRole = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.set('category', activeCategory);
      params.set('page', currentPage.toString());
      params.set('limit', '10');

      const res = await fetch(`/api/announcements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setForm({
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        isPinned: announcement.isPinned === 1,
      });
    } else {
      setEditingAnnouncement(null);
      setForm({ title: '', content: '', category: 'general', isPinned: false });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    try {
      const url = editingAnnouncement
        ? `/api/announcements/${editingAnnouncement.id}`
        : '/api/announcements';
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingAnnouncement(null);
        fetchAnnouncements();
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

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAnnouncements();
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: number) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: currentPinned !== 1 }),
      });
      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading && announcements.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="공지사항" subtitle="공지사항을 관리합니다" />

      {/* 필터 + 새 공지 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setActiveCategory(cat.value); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl font-medium transition-all text-sm ${
                activeCategory === cat.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white/80 text-gray-600 hover:bg-purple-50'
              }`}
            >
              {cat.value === 'all' && <Filter size={16} />}
              {cat.label}
            </button>
          ))}
        </div>

        {isAdmin && (
          <Button variant="secondary" onClick={() => openModal()}>
            <Plus size={18} className="mr-2" />
            새 공지
          </Button>
        )}
      </div>

      {/* 공지 목록 */}
      {announcements.length === 0 ? (
        <Card className="text-center py-12">
          <Megaphone size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">공지사항이 없습니다</p>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {announcements.map((announcement) => (
            <motion.div key={announcement.id} variants={itemVariants}>
              <Card className={`relative ${announcement.category === 'urgent' ? 'border-l-4 border-l-red-400' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {announcement.isPinned === 1 && (
                        <Pin size={14} className="text-purple-500 fill-purple-500 flex-shrink-0" />
                      )}
                      {categoryBadge(announcement.category)}
                      <h3 className="font-bold text-gray-800 truncate">
                        {announcement.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {announcement.authorName} · {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true, locale: ko })}
                    </p>
                    <p className="text-gray-600 text-sm line-clamp-2 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleTogglePin(announcement.id, announcement.isPinned)}
                        className={`p-2 rounded-lg transition-colors ${
                          announcement.isPinned === 1
                            ? 'text-purple-600 hover:bg-purple-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={announcement.isPinned === 1 ? '고정 해제' : '고정'}
                      >
                        {announcement.isPinned === 1 ? <PinOff size={18} /> : <Pin size={18} />}
                      </button>
                      <button
                        onClick={() => openModal(announcement)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* 작성/수정 모달 */}
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingAnnouncement ? '공지 수정' : '새 공지 작성'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="제목 *"
                  placeholder="공지 제목을 입력하세요"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'general', label: '일반', color: 'purple' },
                      { value: 'event', label: '행사', color: 'amber' },
                      { value: 'urgent', label: '긴급', color: 'red' },
                    ].map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat.value })}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                          form.category === cat.value
                            ? cat.color === 'purple'
                              ? 'bg-purple-500 text-white shadow-lg'
                              : cat.color === 'amber'
                              ? 'bg-amber-500 text-white shadow-lg'
                              : 'bg-red-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">내용 *</label>
                  <textarea
                    placeholder="공지 내용을 입력하세요"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 resize-none"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                    className="w-5 h-5 rounded border-purple-300 text-purple-500 focus:ring-purple-400"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Pin size={14} /> 상단 고정
                  </span>
                </label>

                <div className="flex gap-3 mt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>
                    취소
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleSave}
                    isLoading={saving}
                    disabled={!form.title || !form.content}
                  >
                    <Save size={18} className="mr-2" />
                    {editingAnnouncement ? '수정하기' : '저장하기'}
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
