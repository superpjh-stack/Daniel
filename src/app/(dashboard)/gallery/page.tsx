'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Camera, Plus, Loader2, MessageCircle, ImageIcon } from 'lucide-react';

interface PhotoPostSummary {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  photoCount: number;
  commentCount: number;
  authorName: string;
  createdAt: string;
}

const categories = [
  { value: 'all', label: '전체' },
  { value: 'worship', label: '예배' },
  { value: 'event', label: '행사' },
  { value: 'camp', label: '캠프' },
  { value: 'daily', label: '일상' },
  { value: 'etc', label: '기타' },
];

const categoryLabels: Record<string, string> = {
  worship: '예배',
  event: '행사',
  camp: '캠프',
  daily: '일상',
  etc: '기타',
};

export default function GalleryPage() {
  const [posts, setPosts] = useState<PhotoPostSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
    setPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, page]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/gallery?category=${selectedCategory}&page=${page}&limit=12`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  }

  const isTeacher = userRole === 'admin' || userRole === 'teacher';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Camera className="text-white" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">사진첩</h1>
          </div>
          <p className="text-sm text-slate-500 ml-[52px]">소중한 추억을 함께 나눠요!</p>
        </div>
        {isTeacher && (
          <Link
            href="/gallery/upload"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus size={18} />
            업로드
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
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${selectedCategory === cat.value
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-500" size={32} />
        </div>
      )}

      {/* Empty */}
      {!loading && posts.length === 0 && (
        <div className="text-center py-20">
          <Camera size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">등록된 사진이 없습니다.</p>
          {isTeacher && (
            <Link
              href="/gallery/upload"
              className="inline-block mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm"
            >
              첫 사진 업로드하기
            </Link>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && posts.length > 0 && (
        <>
          <p className="text-sm text-slate-500 mb-4">총 {total}개의 게시글</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/gallery/${post.id}`}>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group">
                    {/* Thumbnail */}
                    <div className="relative aspect-square bg-slate-100">
                      {post.thumbnailUrl ? (
                        <img
                          src={post.thumbnailUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={40} className="text-slate-300" />
                        </div>
                      )}
                      {post.photoCount > 1 && (
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                          +{post.photoCount}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-white/90 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium">
                        {categoryLabels[post.category] || post.category}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2.5 sm:p-3">
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">{post.title}</h3>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <MessageCircle size={12} />
                          {post.commentCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                이전
              </button>
              <span className="text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
