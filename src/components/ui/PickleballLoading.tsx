import React from 'react';
import { cn } from '@/utils/cn';

interface PickleballLoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
  xl: 'w-44 h-44',
};

export function PickleballLoading({
  size = 'md',
  text,
  className,
}: PickleballLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 select-none', className)}>
      <div className={cn('relative rounded-2xl overflow-hidden shadow-md ring-1 ring-slate-200/80 bg-slate-900', sizeMap[size])}>
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/pickleball-loading-poster.jpg"
          className="w-full h-full object-cover pointer-events-none"
        >
          <source src="/pickleball-loading.webm" type="video/webm" />
          <source src="/pickleball-loading.mp4" type="video/mp4" />
        </video>
        {/* Subtle glowing ring overlay */}
        <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none" />
      </div>

      {text !== undefined ? (
        text ? (
          <p className="text-xs font-semibold text-slate-500 tracking-wide animate-pulse">
            {text}
          </p>
        ) : null
      ) : (
        <p className="text-xs font-semibold text-slate-500 tracking-wide animate-pulse">
          Đang tải dữ liệu...
        </p>
      )}
    </div>
  );
}

export default PickleballLoading;
