'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Loader2, ImagePlus, Video, Link as LinkIcon, Play } from 'lucide-react';
import { resizeImage } from '@/lib/image-utils';
import { parseVideoUrl } from '@/lib/videoParser';

const categories = [
  { value: 'worship', label: '예배' },
  { value: 'event', label: '행사' },
  { value: 'camp', label: '캠프' },
  { value: 'daily', label: '일상' },
  { value: 'etc', label: '기타' },
];

type TabType = 'image' | 'video' | 'video_link';

interface MediaItem {
  type: 'image' | 'video' | 'video_link';
  // image
  file?: File;
  preview?: string;
  // video
  videoFile?: File;
  videoPreview?: string;
  // video_link
  videoLink?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  platform?: string;
}

async function uploadViaPresigned(
  originalBlob: Blob,
  thumbBlob: Blob,
  fileName: string
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const urlRes = await fetch('/api/gallery/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileType: 'image/jpeg' }),
  });
  if (!urlRes.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, thumbUploadUrl, imageUrl, thumbnailUrl } = await urlRes.json();

  const [imgRes, thumbRes] = await Promise.all([
    fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: originalBlob }),
    fetch(thumbUploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: thumbBlob }),
  ]);
  if (!imgRes.ok || !thumbRes.ok) throw new Error('S3 direct upload failed');
  return { imageUrl, thumbnailUrl };
}

async function uploadViaProxy(originalBlob: Blob, thumbBlob: Blob): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const formData = new FormData();
  formData.append('image', originalBlob, 'image.jpg');
  formData.append('thumbnail', thumbBlob, 'thumb.jpg');
  const res = await fetch('/api/gallery/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Server upload failed');
  return res.json();
}

async function captureVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.preload = 'metadata';
    video.addEventListener('loadeddata', () => { video.currentTime = 1; });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = video.videoHeight > 0
        ? Math.round((video.videoHeight / video.videoWidth) * 400)
        : 225;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
    });
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  });
}

export default function PhotoUploadForm() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<TabType>('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('daily');

  const [imageItems, setImageItems] = useState<MediaItem[]>([]);
  const [videoItems, setVideoItems] = useState<MediaItem[]>([]);
  const [linkItems, setLinkItems] = useState<MediaItem[]>([]);

  const [videoLinkInput, setVideoLinkInput] = useState('');
  const [parsedLink, setParsedLink] = useState<{ embedUrl: string; thumbnailUrl: string; platform: string } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const totalCount = imageItems.length + videoItems.length + linkItems.length;

  // ── 이미지 선택 ──
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const remaining = 10 - imageItems.length;
    const toAdd = Array.from(selected).slice(0, remaining);
    setImageItems(prev => [
      ...prev,
      ...toAdd.map(file => ({ type: 'image' as const, file, preview: URL.createObjectURL(file) })),
    ]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImageItems(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview!);
      updated.splice(index, 1);
      return updated;
    });
  };

  // ── 동영상 파일 선택 ──
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoItems(prev => [
      ...prev,
      { type: 'video' as const, videoFile: file, videoPreview: URL.createObjectURL(file) },
    ]);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const removeVideo = (index: number) => {
    setVideoItems(prev => {
      const updated = [...prev];
      if (updated[index].videoPreview) URL.revokeObjectURL(updated[index].videoPreview!);
      updated.splice(index, 1);
      return updated;
    });
  };

  // ── 동영상 링크 파싱 ──
  const handleLinkInput = (val: string) => {
    setVideoLinkInput(val);
    if (!val.trim()) { setParsedLink(null); return; }
    const parsed = parseVideoUrl(val);
    setParsedLink(parsed ? { embedUrl: parsed.embedUrl, thumbnailUrl: parsed.thumbnailUrl, platform: parsed.platform } : null);
  };

  const addVideoLink = () => {
    if (!parsedLink) return;
    setLinkItems(prev => [
      ...prev,
      {
        type: 'video_link' as const,
        videoLink: videoLinkInput.trim(),
        embedUrl: parsedLink.embedUrl,
        thumbnailUrl: parsedLink.thumbnailUrl,
        platform: parsedLink.platform,
      },
    ]);
    setVideoLinkInput('');
    setParsedLink(null);
  };

  const removeLink = (index: number) => {
    setLinkItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── 업로드 실행 ──
  const handleUpload = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (totalCount === 0) { setError('사진 또는 동영상을 1개 이상 추가해주세요.'); return; }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const mediaResults: {
        type: string;
        imageUrl?: string;
        thumbnailUrl?: string;
        videoUrl?: string;
        videoLink?: string;
        embedUrl?: string;
        sortOrder: number;
      }[] = [];

      const totalSteps = imageItems.length + videoItems.length + linkItems.length;
      let step = 0;

      // 1. 이미지 업로드
      for (const item of imageItems) {
        const [origBlob, thumbBlob] = await Promise.all([
          resizeImage(item.file!, 1920),
          resizeImage(item.file!, 400),
        ]);
        let result: { imageUrl: string; thumbnailUrl: string };
        try {
          result = await uploadViaPresigned(origBlob, thumbBlob, item.file!.name);
        } catch {
          result = await uploadViaProxy(origBlob, thumbBlob);
        }
        mediaResults.push({ type: 'image', ...result, sortOrder: mediaResults.length });
        step++;
        setProgress(Math.round((step / totalSteps) * 85));
      }

      // 2. 동영상 파일 업로드
      for (const item of videoItems) {
        const file = item.videoFile!;

        // presigned URL 발급
        const urlRes = await fetch('/api/gallery/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });
        if (!urlRes.ok) throw new Error('동영상 URL 발급 실패');
        const { uploadUrl, videoUrl } = await urlRes.json();

        // S3 업로드
        await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

        // 썸네일 캡처
        let thumbnailUrl = '';
        try {
          const thumbBlob = await captureVideoThumbnail(file);
          if (thumbBlob) {
            const thumbUrlRes = await fetch('/api/gallery/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: 'thumb.jpg', fileType: 'image/jpeg' }),
            });
            if (thumbUrlRes.ok) {
              const { uploadUrl: tUrl, imageUrl: tImgUrl } = await thumbUrlRes.json();
              await fetch(tUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: thumbBlob });
              thumbnailUrl = tImgUrl;
            }
          }
        } catch { /* 썸네일 실패 시 빈 값 */ }

        mediaResults.push({ type: 'video', videoUrl, thumbnailUrl: thumbnailUrl || undefined, sortOrder: mediaResults.length });
        step++;
        setProgress(Math.round((step / totalSteps) * 85));
      }

      // 3. 동영상 링크 추가
      for (const item of linkItems) {
        mediaResults.push({
          type: 'video_link',
          videoLink: item.videoLink,
          embedUrl: item.embedUrl,
          thumbnailUrl: item.thumbnailUrl || undefined,
          sortOrder: mediaResults.length,
        });
        step++;
        setProgress(Math.round((step / totalSteps) * 85));
      }

      // 4. 게시글 생성
      const postRes = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, category, media: mediaResults }),
      });
      if (!postRes.ok) throw new Error('게시글 생성 실패');
      setProgress(100);

      // cleanup
      imageItems.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      videoItems.forEach(f => { if (f.videoPreview) URL.revokeObjectURL(f.videoPreview); });

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
      {/* 기본 정보 */}
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

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명을 입력해주세요 (선택)"
          rows={3}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
          disabled={uploading}
        />
      </div>

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

      {/* 탭 */}
      <div>
        <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg">
          {[
            { key: 'image', icon: <ImagePlus size={15} />, label: '사진' },
            { key: 'video', icon: <Video size={15} />, label: '동영상 파일' },
            { key: 'video_link', icon: <LinkIcon size={15} />, label: '동영상 링크' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as TabType)}
              disabled={uploading}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                tab === t.key
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* 사진 탭 */}
        {tab === 'image' && (
          <div>
            <p className="text-xs text-slate-500 mb-2">사진 선택 ({imageItems.length}/10)</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
              {imageItems.map((item, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  {!uploading && (
                    <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">{i + 1}</div>
                </div>
              ))}
              {imageItems.length < 10 && !uploading && (
                <button onClick={() => imageInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                  <ImagePlus size={24} />
                  <span className="text-xs">추가</span>
                </button>
              )}
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          </div>
        )}

        {/* 동영상 파일 탭 */}
        {tab === 'video' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">mp4, mov, avi, webm 파일을 업로드할 수 있습니다.</p>
            {videoItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-16 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                  <video src={item.videoPreview} className="w-full h-full object-cover" muted />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{item.videoFile?.name}</p>
                  <p className="text-xs text-slate-400">{item.videoFile ? (item.videoFile.size / 1024 / 1024).toFixed(1) + ' MB' : ''}</p>
                </div>
                {!uploading && (
                  <button onClick={() => removeVideo(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            {!uploading && (
              <button onClick={() => videoInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-sm">
                <Video size={20} />
                동영상 파일 선택
              </button>
            )}
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
          </div>
        )}

        {/* 동영상 링크 탭 */}
        {tab === 'video_link' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">YouTube, Vimeo 링크를 입력하세요.</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={videoLinkInput}
                onChange={(e) => handleLinkInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                disabled={uploading}
              />
              <button
                onClick={addVideoLink}
                disabled={!parsedLink || uploading}
                className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>

            {/* 링크 미리보기 */}
            {parsedLink && (
              <div className="rounded-lg overflow-hidden border border-slate-200">
                <div className="aspect-video bg-slate-900">
                  <iframe
                    src={parsedLink.embedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                    title="미리보기"
                  />
                </div>
                <div className="px-3 py-2 bg-slate-50 text-xs text-slate-500">
                  플랫폼: <span className="font-medium text-indigo-600">{parsedLink.platform === 'youtube' ? 'YouTube' : parsedLink.platform === 'vimeo' ? 'Vimeo' : '기타'}</span> ✅
                </div>
              </div>
            )}

            {/* 추가된 링크 목록 */}
            {linkItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="w-16 h-12 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="w-16 h-12 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                    <Play size={20} className="text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 truncate">{item.videoLink}</p>
                  <p className="text-xs text-indigo-500 font-medium">{item.platform === 'youtube' ? 'YouTube' : item.platform === 'vimeo' ? 'Vimeo' : '외부 링크'}</p>
                </div>
                {!uploading && (
                  <button onClick={() => removeLink(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 전체 미디어 요약 */}
      {totalCount > 0 && (
        <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
          총 {totalCount}개 미디어
          {imageItems.length > 0 && ` · 사진 ${imageItems.length}장`}
          {videoItems.length > 0 && ` · 동영상 ${videoItems.length}개`}
          {linkItems.length > 0 && ` · 링크 ${linkItems.length}개`}
        </div>
      )}

      {/* 오류 */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 진행률 */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>업로드 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* 제출 */}
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <><Loader2 className="animate-spin" size={20} /> 업로드 중...</>
        ) : (
          <><Upload size={20} /> 업로드</>
        )}
      </button>
    </div>
  );
}
