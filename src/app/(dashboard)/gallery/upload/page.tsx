import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera } from 'lucide-react';
import { getSession } from '@/lib/auth';
import PhotoUploadForm from '@/components/gallery/PhotoUploadForm';

export default async function GalleryUploadPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin' && session.role !== 'teacher') redirect('/gallery');

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

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Camera className="text-white" size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">미디어 업로드</h1>
          <p className="text-sm text-slate-500">사진과 동영상을 공유해주세요</p>
        </div>
      </div>

      <PhotoUploadForm />
    </div>
  );
}
