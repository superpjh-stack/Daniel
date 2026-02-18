import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getPhotoPostById } from '@/lib/db';
import PhotoViewer from '@/components/gallery/PhotoViewer';
import CommentSection from '@/components/gallery/CommentSection';
import GalleryShareButtons from '@/components/gallery/GalleryShareButtons';
import GalleryDetailActions from './GalleryDetailActions';

const categoryLabels: Record<string, string> = {
  worship: '예배',
  event: '행사',
  camp: '캠프',
  daily: '일상',
  etc: '기타',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPhotoPostById(id);

  if (!post) {
    return { title: '사진첩 - 다니엘' };
  }

  const firstMedia = post.photos[0];
  const imageUrl = firstMedia?.thumbnailUrl || firstMedia?.imageUrl || '';
  const description = post.description || `동은교회 초등부 사진첩 - ${post.title}`;

  return {
    title: `${post.title} - 다니엘 사진첩`,
    description,
    openGraph: {
      title: post.title,
      description,
      siteName: '다니엘 - 동은교회 초등부',
      locale: 'ko_KR',
      type: 'article',
      images: imageUrl
        ? [{ url: imageUrl, width: 1200, height: 630, alt: post.title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) notFound();

  const { id } = await params;
  const post = await getPhotoPostById(id);
  if (!post) notFound();

  const isTeacher = session.role === 'admin' || session.role === 'teacher';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/gallery"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        사진첩으로
      </Link>

      {/* Photo Viewer */}
      <PhotoViewer photos={post.photos} />

      {/* Info */}
      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-teal-50 text-teal-600 rounded mb-1.5">
              {categoryLabels[post.category] || post.category}
            </span>
            <h1 className="text-xl font-bold text-slate-800">{post.title}</h1>
          </div>
          {isTeacher && <GalleryDetailActions postId={post.id} />}
        </div>

        {post.description && (
          <p className="text-sm text-slate-600">{post.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {post.authorName} &middot; {formatDate(post.createdAt)}
          </div>
          <GalleryShareButtons
            title={post.title}
            imageUrl={post.photos[0]?.thumbnailUrl || post.photos[0]?.imageUrl || ''}
          />
        </div>
      </div>

      {/* Divider */}
      <hr className="my-4 border-slate-200" />

      {/* Comments */}
      <CommentSection
        postId={post.id}
        initialComments={post.comments}
        currentUserId={session.id}
        currentUserRole={session.role}
      />
    </div>
  );
}
