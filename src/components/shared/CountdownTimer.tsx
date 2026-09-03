'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  onExpired?: () => void;
  labels: {
    active: string;   // "Còn X ngày Y:Z:T"
    dayLabel: string;
    expired: string;  // "Đã hết hạn"
  };
  variant?: 'info' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function CountdownTimer({
  targetDate,
  onExpired,
  labels,
  variant = 'info',
  size = 'sm',
}: CountdownTimerProps) {
  const [display, setDisplay] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        if (!expired) {
          setExpired(true);
          onExpired?.();
        }
        setDisplay(null);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      let timeStr: string;
      if (d > 0) {
        timeStr = `${d} ${labels.dayLabel} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      } else {
        timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      setDisplay(`${labels.active} ${timeStr}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate, onExpired, labels.active, expired]);

  if (expired) {
    return (
      <div className={`flex items-center gap-1.5 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'} font-medium text-slate-400`}>
        <span>•</span>
        <span>{labels.expired}</span>
      </div>
    );
  }

  if (!display) return null;

  const colors = {
    info: 'bg-blue-50/90 border-blue-200/90 text-blue-800',
    warning: 'bg-amber-50/90 border-amber-300 text-amber-900',
    danger: 'bg-rose-50/90 border-rose-200 text-rose-800',
  };

  const dotColors = {
    info: 'bg-blue-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600 animate-pulse',
  };

  const padding = size === 'sm' ? 'py-2.5 px-3' : size === 'lg' ? 'py-4 px-4' : 'py-3 px-3.5';

  return (
    <div className={`mt-2 ${padding} border rounded-xl shadow-2xs ${colors[variant]}`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColors[variant]}`} />
        <span className={`font-black tracking-normal ${size === 'sm' ? 'text-xs sm:text-[13px]' : size === 'lg' ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
          {display}
        </span>
      </div>
    </div>
  );
}

