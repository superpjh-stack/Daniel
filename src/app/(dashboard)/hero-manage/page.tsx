'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Image, Youtube, Eye, EyeOff } from 'lucide-react';

interface HeroMedia {
  id: string;
  title: string;
  subtitle: string | null;
  mediaType: string;
  mediaUrl: string;
  youtubeId: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function HeroManagePage() {
  const [media, setMedia] = useState<HeroMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    mediaType: 'image' as 'image' | 'youtube',
    mediaUrl: '',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/hero-media?all=true');
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const resetForm = () => {
    setForm({ title: '', subtitle: '', mediaType: 'image', mediaUrl: '', sortOrder: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: HeroMedia) => {
    setForm({
      title: item.title,
      subtitle: item.subtitle || '',
      mediaType: item.mediaType as 'image' | 'youtube',
      mediaUrl: item.mediaUrl,
      sortOrder: item.sortOrder,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.mediaUrl) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/hero-media/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/hero-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      resetForm();
      fetchMedia();
    } catch {
      alert('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/hero-media/${id}`, { method: 'DELETE' });
      fetchMedia();
    } catch {
      alert('삭제 실패');
    }
  };

  const handleToggleActive = async (item: HeroMedia) => {
    try {
      await fetch(`/api/hero-media/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      fetchMedia();
    } catch {
      alert('상태 변경 실패');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">메인 미디어 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            메인 페이지 히어로 영역에 표시될 사진/동영상을 관리합니다
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          미디어 추가
        </button>
      </div>

      {/* 추가/수정 폼 */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            {editingId ? '미디어 수정' : '새 미디어 추가'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="슬라이드 제목"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">부제목</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="부제목 (선택)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">미디어 타입 *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    value="image"
                    checked={form.mediaType === 'image'}
                    onChange={(e) => setForm({ ...form, mediaType: e.target.value as 'image' | 'youtube' })}
                    className="text-indigo-600"
                  />
                  <Image size={16} className="text-slate-500" />
                  <span className="text-sm">이미지</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    value="youtube"
                    checked={form.mediaType === 'youtube'}
                    onChange={(e) => setForm({ ...form, mediaType: e.target.value as 'image' | 'youtube' })}
                    className="text-indigo-600"
                  />
                  <Youtube size={16} className="text-red-500" />
                  <span className="text-sm">YouTube</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {form.mediaType === 'image' ? '이미지 URL *' : 'YouTube URL *'}
              </label>
              <input
                type="url"
                value={form.mediaUrl}
                onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                placeholder={form.mediaType === 'image' ? 'https://example.com/image.jpg' : 'https://youtube.com/watch?v=...'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">정렬 순서</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.mediaUrl}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '저장 중...' : editingId ? '수정' : '추가'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미디어 목록 */}
      {media.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Image size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">등록된 미디어가 없습니다</p>
          <p className="text-sm text-slate-400 mt-1">위의 &quot;미디어 추가&quot; 버튼으로 첫 미디어를 등록하세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {media.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 ${
                !item.isActive ? 'opacity-50' : ''
              }`}
            >
              <GripVertical size={18} className="text-slate-300 flex-shrink-0" />

              {/* 썸네일 */}
              <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    {item.mediaType === 'youtube' ? <Youtube size={20} /> : <Image size={20} />}
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                    item.mediaType === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.mediaType === 'youtube' ? 'YouTube' : '이미지'}
                  </span>
                  <span className="text-xs text-slate-400">#{item.sortOrder}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`p-2 rounded-lg transition-colors ${
                    item.isActive ? 'hover:bg-green-50 text-green-600' : 'hover:bg-slate-100 text-slate-400'
                  }`}
                  title={item.isActive ? '활성' : '비활성'}
                >
                  {item.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                  title="수정"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
