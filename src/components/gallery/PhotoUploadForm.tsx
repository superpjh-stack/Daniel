'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { resizeImage } from '@/lib/image-utils';

const categories = [
  { value: 'worship', label: '예배' },
  { value: 'event', label: '행사' },
  { value: 'camp', label: '캠프' },
  { value: 'daily', label: '일상' },
  { value: 'etc', label: '기타' },
];

interface PreviewFile {
  file: File;
  preview: string;
}

export default function PhotoUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('daily');
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const maxTotal = 10;
    const remaining = maxTotal - files.length;
    const toAdd = Array.from(selected).slice(0, remaining);

    const newFiles = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (files.length === 0) {
      setError('사진을 1장 이상 선택해주세요.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const photos: { imageUrl: string; thumbnailUrl: string; sortOrder: number }[] = [];
      const totalSteps = files.length;

      for (let i = 0; i < files.length; i++) {
        const { file } = files[i];

        // 1. Resize images
        const [originalBlob, thumbBlob] = await Promise.all([
          resizeImage(file, 1920),
          resizeImage(file, 400),
        ]);

        // 2. Get presigned URLs
        const urlRes = await fetch('/api/gallery/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: 'image/jpeg',
          }),
        });

        if (!urlRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, thumbUploadUrl, imageUrl, thumbnailUrl } = await urlRes.json();

        // 3. Upload to S3
        await Promise.all([
          fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: originalBlob,
          }),
          fetch(thumbUploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: thumbBlob,
          }),
        ]);

        photos.push({ imageUrl, thumbnailUrl, sortOrder: i });
        setProgress(Math.round(((i + 1) / totalSteps) * 90));
      }

      // 4. Create post
      const postRes = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          photos,
        }),
      });

      if (!postRes.ok) throw new Error('Failed to create post');
      setProgress(100);

      // Cleanup previews
      files.forEach(f => URL.revokeObjectURL(f.preview));

      router.push('/gallery');
      router.refresh();
    } catch (err) {
      console.error('Upload error:', err);
      setError('업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">제목 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 여름캠프 첫째날"
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          disabled={uploading}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="사진에 대한 설명을 입력해주세요 (선택)"
          rows={3}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
          disabled={uploading}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          disabled={uploading}
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Photo Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          사진 * <span className="text-slate-400">({files.length}/10)</span>
        </label>

        {/* Photo Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
              <img
                src={f.preview}
                alt={`Preview ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {!uploading && (
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                {i + 1}
              </div>
            </div>
          ))}

          {files.length < 10 && !uploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              <ImagePlus size={24} />
              <span className="text-xs">추가</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>업로드 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            업로드 중...
          </>
        ) : (
          <>
            <Upload size={20} />
            업로드
          </>
        )}
      </button>
    </div>
  );
}
