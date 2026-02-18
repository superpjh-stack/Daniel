'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, ArrowLeft } from 'lucide-react';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        return;
      }

      router.push(data.user?.role === 'parent' ? '/parent' : '/dashboard');
      router.refresh();
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
          {/* 뒤로가기 */}
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span>홈으로</span>
          </Link>

          {/* 헤더 */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center shadow-lg"
            >
              <span className="text-4xl">🦁</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-800">환영합니다!</h1>
            <p className="text-gray-500 mt-1">다니엘 출석부에 로그인하세요</p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="text"
              label="아이디"
              placeholder="아이디를 입력하세요"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              icon={<User size={18} />}
              required
            />

            <Input
              type="password"
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={18} />}
              required
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2"
              >
                <span>⚠️</span>
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인 ✨'}
            </Button>
          </form>

          {/* 테스트 계정 안내 */}
          <div className="mt-8 p-4 rounded-xl bg-purple-50 border border-purple-100">
            <p className="text-sm text-purple-700 font-medium mb-2">📌 테스트 계정</p>
            <div className="text-xs text-purple-600 space-y-1">
              <p><span className="font-medium">관리자:</span> admin / admin123</p>
              <p><span className="font-medium">교사:</span> teacher / teacher123</p>
              <p><span className="font-medium">학부모:</span> parent / parent123</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
