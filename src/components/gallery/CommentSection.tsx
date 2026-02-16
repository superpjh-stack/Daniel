'use client';

import { useState } from 'react';
import { Trash2, Send, Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  currentUserId: string;
  currentUserRole: string;
}

export default function CommentSection({
  postId,
  initialComments,
  currentUserId,
  currentUserRole,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/gallery/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments([comment, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/gallery/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        댓글 {comments.length}개
      </h3>

      {/* Comment Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="댓글을 입력하세요..."
          className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          disabled={submitting}
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !newComment.trim()}
          className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {/* Comment List */}
      {comments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">첫 댓글을 남겨보세요!</p>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0 mt-0.5">
                {comment.authorName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{comment.authorName}</span>
                  <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5 break-words">{comment.content}</p>
              </div>
              {(comment.authorId === currentUserId || currentUserRole === 'admin') && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  {deletingId === comment.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
