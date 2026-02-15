import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
}

interface AnnouncementSectionProps {
  announcements: Announcement[];
}

const categoryLabel: Record<string, string> = {
  urgent: '긴급',
  event: '행사',
  general: '일반',
};

const categoryColor: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  event: 'bg-blue-100 text-blue-700',
  general: 'bg-slate-100 text-slate-600',
};

export default function AnnouncementSection({ announcements }: AnnouncementSectionProps) {
  if (announcements.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 md:px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">
          공지사항
        </h2>
        <Link
          href="/login"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          더보기 &rarr;
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
        {announcements.map((ann) => (
          <div key={ann.id} className="flex items-center gap-3 px-4 md:px-6 py-4">
            {ann.isPinned && (
              <span className="text-amber-500 text-sm flex-shrink-0">📌</span>
            )}
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${categoryColor[ann.category] || categoryColor.general}`}>
              {categoryLabel[ann.category] || ann.category}
            </span>
            <span className="text-sm md:text-base text-slate-700 truncate flex-1">
              {ann.title}
            </span>
            <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
              {new Date(ann.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
