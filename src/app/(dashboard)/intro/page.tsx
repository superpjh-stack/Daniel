'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, BookOpen, Heart, Users } from 'lucide-react';
import { Header } from '@/components/layout';
import { Card } from '@/components/ui';

const goals = [
  {
    emoji: '🙏',
    title: '예배',
    description: '온 마음으로 하나님께 예배드리는 어린이',
    gradient: 'from-indigo-400 to-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    emoji: '📖',
    title: '말씀',
    description: '하나님의 말씀을 읽고 암송하는 어린이',
    gradient: 'from-purple-400 to-purple-600',
    bg: 'bg-purple-50',
  },
  {
    emoji: '📢',
    title: '전도',
    description: '친구들에게 복음을 전하는 어린이',
    gradient: 'from-pink-400 to-pink-600',
    bg: 'bg-pink-50',
  },
  {
    emoji: '🤝',
    title: '섬김',
    description: '이웃을 사랑하고 섬기는 어린이',
    gradient: 'from-amber-400 to-amber-600',
    bg: 'bg-amber-50',
  },
];

const principles = [
  '주일 예배 중심의 신앙 교육',
  '가정과 연계한 말씀 생활화',
  '소그룹 활동을 통한 공동체 훈련',
  '말씀 암송 및 성경 읽기 장려',
  '절기별 행사와 전도 활동',
];

const staff = [
  { name: '담당 교역자', role: '교역자', initial: '교', color: 'bg-indigo-100 text-indigo-600' },
  { name: '부장 교사', role: '부장', initial: '부', color: 'bg-purple-100 text-purple-600' },
  { name: '총무 교사', role: '총무', initial: '총', color: 'bg-pink-100 text-pink-600' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function IntroPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Header title="초등부 소개" subtitle="동은교회 초등부를 소개합니다" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* 히어로 배너 */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 text-white shadow-xl"
        >
          <div className="relative z-10 text-center">
            <div className="mb-4 text-6xl">🦁</div>
            <h2 className="mb-2 text-3xl font-extrabold tracking-tight">동은교회 초등부</h2>
            <p className="text-lg font-medium text-white/90">말씀으로 자라는 하나님의 자녀들</p>
          </div>
          {/* 장식 원 */}
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 h-52 w-52 rounded-full bg-white/10" />
        </motion.div>

        {/* 비전 */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/50">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                <Heart size={20} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-indigo-500">우리의 비전</h3>
                <p className="text-xl font-bold italic leading-relaxed text-indigo-800">
                  "하나님의 말씀으로 양육받아<br />예수님을 닮아가는 어린이"
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 교육 목표 */}
        <motion.div variants={itemVariants}>
          <div className="mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-gray-600" />
            <h3 className="text-lg font-bold text-gray-800">교육 목표</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {goals.map((goal, i) => (
              <motion.div
                key={goal.title}
                variants={itemVariants}
                custom={i}
                className={`rounded-2xl bg-gradient-to-br ${goal.gradient} p-4 text-center text-white shadow-md`}
              >
                <div className="mb-2 text-3xl">{goal.emoji}</div>
                <div className="mb-1 text-base font-bold">{goal.title}</div>
                <div className="text-xs leading-relaxed text-white/85">{goal.description}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 교육 방침 */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-gray-600" />
              <h3 className="text-lg font-bold text-gray-800">교육 방침</h3>
            </div>
            <ul className="space-y-2">
              {principles.map((principle) => (
                <li
                  key={principle}
                  className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-indigo-50"
                >
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700">{principle}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        {/* 담당자 소개 */}
        <motion.div variants={itemVariants}>
          <div className="mb-4 flex items-center gap-2">
            <Users size={20} className="text-gray-600" />
            <h3 className="text-lg font-bold text-gray-800">담당자 소개</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {staff.map((member) => (
              <Card key={member.role} className="text-center">
                <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold ${member.color}`}>
                  {member.initial}
                </div>
                <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                <p className="text-xs text-gray-400">{member.role}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
