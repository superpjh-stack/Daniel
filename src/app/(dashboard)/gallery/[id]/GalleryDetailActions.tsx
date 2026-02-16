'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

interface GalleryDetailActionsProps {
  postId: string;
}

export default function GalleryDetailActions({ postId }: GalleryDetailActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('이 게시글을 삭제하시겠습니까?\n사진과 댓글이 모두 삭제됩니다.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/gallery/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/gallery');
        router.refresh();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
      title="삭제"
    >
      {deleting ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        <Trash2 size={18} />
      )}
    </button>
  );
}
