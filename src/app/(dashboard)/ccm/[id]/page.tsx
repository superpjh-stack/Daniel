'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Music, Loader2 } from 'lucide-react';

interface CcmVideo {
  id: string;
  title: string;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  category: string;
  description: string | null;
  isPinned: boolean;
}

const categoryLabels: Record<string, { label: string; emoji: string }> = {
  praise: { label: '찬양', emoji: '🙏' },
  worship: { label: '워십', emoji: '✨' },
  action: { label: '율동', emoji: '💃' },
  special: { label: '특송', emoji: '🎤' },
};

export default function CcmPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [video, setVideo] = useState<CcmVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchVideo() {
      try {
        const res = await fetch(`/api/ccm/${id}`);
        if (!res.ok) {
          setError('동영상을 찾을 수 없습니다.');
          return;
        }
        const data = await res.json();
        setVideo(data);
      } catch {
        setError('동영상을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Music size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500 mb-4">{error || '동영상을 찾을 수 없습니다.'}</p>
        <Link
          href="/ccm"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm"
        >
          <ArrowLeft size={16} />
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const cat = categoryLabels[video.category];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      <Link
        href="/ccm"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        목록으로 돌아가기
      </Link>

      {/* YouTube Player */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
      >
        <div className="aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Video Info */}
        <div className="p-5">
          <h1 className="text-xl font-bold text-slate-800 mb-2">{video.title}</h1>
          {cat && (
            <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-purple-50 text-purple-600">
              {cat.emoji} {cat.label}
            </span>
          )}
          {video.description && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">{video.description}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
