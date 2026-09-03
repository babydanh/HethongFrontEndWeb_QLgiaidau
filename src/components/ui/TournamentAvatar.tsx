'use client';

import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { getSportLogo } from '@/constants/sports';

interface TournamentAvatarProps {
  src?: string | null;
  alt: string;
  category?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: {
    container: 'w-7 h-7',
    icon: 'w-4 h-4',
    text: 'text-[10px]',
  },
  sm: {
    container: 'w-10 h-10', // 40px
    icon: 'w-5 h-5',
    text: 'text-xs',
  },
  md: {
    container: 'w-12 h-12', // 48px Facebook standard card header
    icon: 'w-6 h-6',
    text: 'text-sm',
  },
  lg: {
    container: 'w-16 h-16', // 64px
    icon: 'w-8 h-8',
    text: 'text-lg',
  },
  xl: {
    container: 'w-20 h-20', // 80px Detail header
    icon: 'w-10 h-10',
    text: 'text-xl',
  },
};

export const TournamentAvatar: React.FC<TournamentAvatarProps> = ({
  src,
  alt,
  category,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setHasError(false);
  }

  const sportLogo = getSportLogo(category);
  const sizeConfig = sizeMap[size];

  // Clean initials (up to 2 letters)
  const initials = alt
    .replace(/^(Giải|GIẢI)\s+/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .filter(Boolean)
    .join('') || alt.slice(0, 1).toUpperCase();

  if (src && !hasError) {
    return (
      <div
        className={`relative rounded-full bg-white overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 shadow-2xs ${sizeConfig.container} ${className}`}
      >
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback chuẩn nhận diện SportO SVG khi giải không có logo hoặc lỗi ảnh
  return (
    <div
      className={`relative rounded-full bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs p-1.5 ${sizeConfig.container} ${className}`}
    >
      <img
        src="/sporto_v1.svg"
        alt="SportO"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default TournamentAvatar;
