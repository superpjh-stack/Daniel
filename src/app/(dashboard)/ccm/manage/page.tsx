'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Edit2, Trash2, Pin, PinOff, Music, Loader2, X } from 'lucide-react';

interface CcmVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  thumbnailUrl: string;
  category: string;
  description: string | null;
  isPinned: boolean;
  isActive: boolean;
}

const categoryOptions = [
  { value: 'praise', label: '찬양' },
  { value: 'worship', label: '워십' },
  { value: 'action', label: '율동' },
  { value: 'special', label: '특송' },
];

const categoryLabels: Record<string, string> = {
  praise: '🙏 찬양',
  worship: '✨ 워십',
  action: '💃 율동',
  special: '🎤 특송',
};

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function CcmManagePage() {
  const [videos, setVideos] = useState<CcmVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<CcmVideo | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState('praise');
  const [formDescription, setFormDescription] = useState('');
  const [formPinned, setFormPinned] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, [filterCategory]);

  async function fetchVideos() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ccm?category=${filterCategory}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingVideo(null);
    setFormTitle('');
    setFormUrl('');
    setFormCategory('praise');
    setFormDescription('');
    setFormPinned(false);
    setPreviewId(null);
    setShowModal(true);
  }

  function openEditModal(video: CcmVideo) {
    setEditingVideo(video);
    setFormTitle(video.title);
    setFormUrl(video.youtubeUrl);
    setFormCategory(video.category);
    setFormDescription(video.description || '');
    setFormPinned(video.isPinned);
    setPreviewId(video.youtubeId);
    setShowModal(true);
  }

  function handleUrlChange(url: string) {
    setFormUrl(url);
    const id = extractYoutubeId(url);
    setPreviewId(id);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formUrl.trim()) {
      alert('제목과 YouTube URL은 필수입니다.');
      return;
    }
    if (!previewId) {
      alert('유효하지 않은 YouTube URL입니다.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: formTitle,
        youtubeUrl: formUrl,
        category: formCategory,
        description: formDescription || undefined,
        isPinned: formPinned,
      };

      let res;
      if (editingVideo) {
        res = await fetch(`/api/ccm/${editingVideo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/ccm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '저장에 실패했습니다.');
        return;
      }

      setShowModal(false);
      fetchVideos();
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 동영상을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/ccm/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVideos();
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    }
  }

  async function handleTogglePin(video: CcmVideo) {
    try {
      const res = await fetch(`/api/ccm/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !video.isPinned }),
      });
      if (res.ok) {
        fetchVideos();
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/ccm"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <ArrowLeft size={16} />
          목록으로
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Music className="text-white" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">CCM 관리</h1>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
          >
            <Plus size={16} />
            동영상 추가
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-slate-500">카테고리:</span>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">전체</option>
          {categoryOptions.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <span className="text-sm text-slate-400 ml-auto">총 {total}개</span>
      </div>

      {/* Video List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Music size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">등록된 동영상이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4"
            >
              {/* Thumbnail */}
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-24 h-16 rounded-lg object-cover flex-shrink-0"
                loading="lazy"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm truncate">{video.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                    {categoryLabels[video.category]}
                  </span>
                  {video.isPinned && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 flex items-center gap-1">
                      <Pin size={10} /> 고정
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleTogglePin(video)}
                  className={`p-2 rounded-lg transition-colors ${
                    video.isPinned
                      ? 'text-pink-500 hover:bg-pink-50'
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                  title={video.isPinned ? '고정 해제' : '고정'}
                >
                  {video.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
                <button
                  onClick={() => openEditModal(video)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-500 transition-colors"
                  title="수정"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(video.id, video.title)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingVideo ? '동영상 수정' : '동영상 추가'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="CCM 제목을 입력하세요"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
                />
              </div>

              {/* YouTube URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  YouTube URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={e => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
                />
                {/* Thumbnail Preview */}
                {previewId && (
                  <div className="mt-2">
                    <img
                      src={`https://img.youtube.com/vi/${previewId}/mqdefault.jpg`}
                      alt="미리보기"
                      className="w-40 h-auto rounded-lg border border-slate-200"
                    />
                  </div>
                )}
                {formUrl && !previewId && (
                  <p className="mt-1 text-xs text-red-500">유효하지 않은 YouTube URL입니다.</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
                >
                  {categoryOptions.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="동영상에 대한 간단한 설명"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 resize-none"
                />
              </div>

              {/* Pinned */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formPinned}
                  onChange={e => setFormPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-purple-500 focus:ring-purple-200"
                />
                <span className="text-sm text-slate-700">상단 고정 (추천)</span>
              </label>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
