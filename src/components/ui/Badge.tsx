'use client';

import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'purple' | 'pink' | 'green' | 'red' | 'blue';
}

const Badge = ({ className = '', variant = 'purple', children, ...props }: BadgeProps) => {
  const variants = {
    gold: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800',
    purple: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800',
    pink: 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800',
    green: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800',
    red: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800',
    blue: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
