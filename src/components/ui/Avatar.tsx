'use client';

import { HTMLAttributes } from 'react';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  image?: string | null;
}

const Avatar = ({ className = '', name, size = 'md', image, ...props }: AvatarProps) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  // 이름의 첫 글자 또는 두 글자 추출
  const initials = name.length >= 2 ? name.substring(0, 2) : name;

  // 이름 기반 랜덤 그라디언트 색상
  const gradients = [
    'from-purple-400 to-pink-400',
    'from-amber-400 to-orange-400',
    'from-emerald-400 to-teal-400',
    'from-blue-400 to-indigo-400',
    'from-rose-400 to-red-400',
    'from-violet-400 to-purple-400',
  ];
  
  const gradientIndex = name.charCodeAt(0) % gradients.length;

  if (image) {
    return (
      <div
        className={`${sizes[size]} rounded-full overflow-hidden ring-2 ring-white shadow-lg ${className}`}
        {...props}
      >
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`
        ${sizes[size]} rounded-full 
        bg-gradient-to-br ${gradients[gradientIndex]}
        flex items-center justify-center
        text-white font-bold
        ring-2 ring-white shadow-lg
        ${className}
      `}
      {...props}
    >
      {initials}
    </div>
  );
};

export default Avatar;
