'use client';

import { Bell, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const today = format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko });

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{title}</h1>
        {subtitle ? (
          <p className="text-gray-500 mt-1">{subtitle}</p>
        ) : (
          <p className="text-purple-500 mt-1 flex items-center gap-2">
            <span>📅</span> {today}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* 검색 */}
        <div className="relative hidden md:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="검색..."
            className="pl-10 pr-4 py-2.5 bg-white/80 border border-purple-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all w-64"
          />
        </div>

        {/* 알림 */}
        <button className="relative p-3 bg-white/80 rounded-xl border border-purple-100 hover:bg-purple-50 transition-all">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
        </button>
      </div>
    </header>
  );
}
