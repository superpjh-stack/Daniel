'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Music, Pin, Settings, Loader2 } from 'lucide-react';

interface CcmVideo {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl: string;
  category: string;
  description: string | null;
  isPinned: boolean;
}

const categories = [
  { value: 'all', label: '전체', emoji: '🎵' },
  { value: 'praise', label: '찬양', emoji: '🙏' },
  { value: 'worship', label: '워십', emoji: '✨' },
  { value: 'action', label: '율동', emoji: '💃' },
  { value: 'special', label: '특송', emoji: '🎤' },
];

const categoryLabels: Record<string, { label: string; emoji: string }> = {
  praise: { label: '찬양', emoji: '🙏' },
  worship: { label: '워십', emoji: '✨' },
  action: { label: '율동', emoji: '💃' },
  special: { label: '특송', emoji: '🎤' },
};

export default function CcmListPage() {
  const [videos, setVideos] = useState<CcmVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const cookieRole = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_role='))
      ?.split('=')[1];
    setUserRole(cookieRole || '');
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [selectedCategory]);

  async function fetchVideos() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ccm?category=${selectedCategory}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch CCM videos:', error);
    } finally {
      setLoading(false);
    }
  }

  const isTeacher = userRole === 'admin' || userRole === 'teacher';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Music className="text-white" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">추천 CCM</h1>
          </div>
          <p className="text-sm text-slate-500 ml-[52px]">찬양으로 하나님을 만나요!</p>
        </div>
        {isTeacher && (
          <Link
            href="/ccm/manage"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            title="CCM 관리"
          >
            <Settings size={20} className="text-slate-600" />
          </Link>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${selectedCategory === cat.value
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
            `}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
        <div className="text-center py-20">
          <Music size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">등록된 CCM 동영상이 없습니다.</p>
          {isTeacher && (
            <Link
              href="/ccm/manage"
              className="inline-block mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm"
            >
              동영상 추가하기
            </Link>
          )}
        </div>
      )}

      {/* Video Grid */}
      {!loading && videos.length > 0 && (
        <>
          <p className="text-sm text-slate-500 mb-4">총 {total}개의 CCM</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/ccm/${video.id}`}>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-slate-100">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {video.isPinned && (
                        <div className="absolute top-2 left-2 bg-pink-500 text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                          <Pin size={10} />
                          추천
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-0 h-0 border-l-[16px] border-l-purple-600 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
                        </div>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">{video.title}</h3>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                          {categoryLabels[video.category]?.emoji} {categoryLabels[video.category]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
