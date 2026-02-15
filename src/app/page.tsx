import Link from 'next/link';
import { getActiveHeroMedia, getRecentAnnouncements, getLandingStats } from '@/lib/db';
import HeroCarousel from '@/components/landing/HeroCarousel';
import AnnouncementSection from '@/components/landing/AnnouncementSection';
import StatsHighlight from '@/components/landing/StatsHighlight';

export default async function LandingPage() {
  const [media, announcements, stats] = await Promise.all([
    getActiveHeroMedia(),
    getRecentAnnouncements(5),
    getLandingStats(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 히어로 캐러셀 */}
      <HeroCarousel media={media} />

      {/* 통계 하이라이트 */}
      <StatsHighlight
        studentCount={stats.studentCount}
        attendanceRate={stats.attendanceRate}
        totalTalent={stats.totalTalent}
      />

      {/* 공지사항 */}
      <AnnouncementSection announcements={announcements} />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                <span className="text-xl">🦁</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">다니엘</h3>
                <p className="text-xs text-slate-400">동은교회 초등부</p>
              </div>
            </div>
            <Link
              href="/login"
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              로그인
            </Link>
          </div>
          <p className="text-center text-xs text-slate-400 mt-6">
            &copy; {new Date().getFullYear()} 동은교회 초등부. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
