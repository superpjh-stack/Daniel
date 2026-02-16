'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  Users,
  Calendar,
  Star,
  ShoppingBag,
  BarChart3,
  Settings,
  Menu,
  X,
  Megaphone,
  Search,
  Gamepad2,
  Music,
  Trophy,
  LogOut,
  ImageIcon,
  Camera,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
  parentOnly?: boolean;
  hideForParent?: boolean;
}

interface SidebarProps {
  userName: string;
  userRole: string;
}

const navItems: NavItem[] = [
  { href: '/attendance', icon: <Calendar size={20} />, label: '출석 관리', hideForParent: true },
  { href: '/talent', icon: <Star size={20} />, label: '달란트 관리', hideForParent: true },
  { href: '/students', icon: <Users size={20} />, label: '학생 관리', hideForParent: true },
  { href: '/announcements', icon: <Megaphone size={20} />, label: '공지사항' },
  { href: '/quiz', icon: <Gamepad2 size={20} />, label: '성경퀴즈', hideForParent: true },
  { href: '/ccm', icon: <Music size={20} />, label: '추천 CCM' },
  { href: '/gallery', icon: <Camera size={20} />, label: '사진첩' },
  { href: '/games', icon: <Trophy size={20} />, label: '게임', hideForParent: true },
  { href: '/shop', icon: <ShoppingBag size={20} />, label: '달란트 시장', adminOnly: true },
  { href: '/hero-manage', icon: <ImageIcon size={20} />, label: '메인 관리', adminOnly: true },
  { href: '/stats', icon: <BarChart3 size={20} />, label: '통계', adminOnly: true },
  { href: '/settings', icon: <Settings size={20} />, label: '설정', adminOnly: true },
  { href: '/dashboard', icon: <Home size={20} />, label: '대시보드', hideForParent: true },
  { href: '/parent', icon: <Home size={20} />, label: '대시보드', parentOnly: true },
  { href: '/parent/attendance', icon: <Calendar size={20} />, label: '출석 내역', parentOnly: true },
  { href: '/parent/talent', icon: <Star size={20} />, label: '달란트 내역', parentOnly: true },
];

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = userRole === 'admin';
  const isParent = userRole === 'parent';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const filteredNavItems = navItems.filter(item => {
    if (isParent) {
      return item.parentOnly || (!item.hideForParent && !item.adminOnly);
    }
    if (item.parentOnly) return false;
    if (!item.adminOnly || isAdmin) {
      if (searchQuery) {
        return item.label.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    }
    return false;
  });

  return (
    <>
      {/* 모바일 메뉴 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-lg shadow-md border border-slate-200"
      >
        {isOpen ? <X size={22} className="text-slate-700" /> : <Menu size={22} className="text-slate-700" />}
      </button>

      {/* 오버레이 */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/20 z-40"
        />
      )}

      {/* 사이드바 */}
      <motion.aside
        initial={false}
        animate={{ x: isDesktop ? 0 : isOpen ? 0 : -280 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-[280px] h-screen bg-white border-r border-slate-200 flex flex-col"
      >
        {/* 로고 */}
        <div className="p-5 border-b border-slate-100">
          <Link href="/attendance" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
              <span className="text-xl">🦁</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">다니엘</h1>
              <p className="text-xs text-slate-400">동은교회 초등부</p>
            </div>
          </Link>
        </div>

        {/* 검색 */}
        <div className="px-4 pt-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="메뉴 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
          </div>
        </div>

        {/* 사용자 정보 */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
              {userName.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-sm text-slate-700">{userName}</p>
              <p className="text-xs text-slate-400">
                {userRole === 'admin' ? '관리자' : userRole === 'parent' ? '학부모' : '교사'}
              </p>
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 하단 */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <LogOut size={18} />
            <span>{loggingOut ? '로그아웃 중...' : '로그아웃'}</span>
          </button>
          <p className="text-xs text-slate-400 text-center">v1.0 동은교회</p>
        </div>
      </motion.aside>
    </>
  );
}
