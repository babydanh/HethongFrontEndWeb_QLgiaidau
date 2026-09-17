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
    info: 'bg-sky-50/70 border-sky-200/60 text-sky-800',
    warning: 'bg-amber-50/70 border-amber-200/60 text-amber-800',
    danger: 'bg-rose-50/70 border-rose-200/60 text-rose-800',
  };

  const dotColors = {
    info: 'bg-sky-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500 animate-pulse',
  };

  const padding = size === 'sm' ? 'py-1 px-2' : size === 'lg' ? 'py-2 px-3.5' : 'py-1.5 px-2.5';

  return (
    <div className={`mt-2 ${padding} border rounded-lg ${colors[variant]}`}>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
        <span className={`font-semibold tracking-normal ${size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-xs sm:text-xs'}`}>
          {display}
        </span>
      </div>
    </div>
  );
}

