'use client';

import { useEffect, useRef, useState } from 'react';

interface StatsHighlightProps {
  studentCount: number;
  attendanceRate: number;
  totalTalent: number;
}

function useCountUp(target: number, duration: number = 1500) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

export default function StatsHighlight({ studentCount, attendanceRate, totalTalent }: StatsHighlightProps) {
  const s1 = useCountUp(studentCount);
  const s2 = useCountUp(attendanceRate);
  const s3 = useCountUp(totalTalent);

  const stats = [
    { label: '전체 학생', value: s1.value, ref: s1.ref, suffix: '명', icon: '👨‍👩‍👧‍👦' },
    { label: '출석률', value: s2.value, ref: s2.ref, suffix: '%', icon: '📅' },
    { label: '누적 달란트', value: s3.value, ref: s3.ref, suffix: '', icon: '⭐' },
  ];

  return (
    <section className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            ref={stat.ref}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 text-center"
          >
            <span className="text-2xl md:text-3xl mb-2 block">{stat.icon}</span>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600 tabular-nums">
              {stat.value.toLocaleString()}{stat.suffix}
            </div>
            <div className="text-xs md:text-sm text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
