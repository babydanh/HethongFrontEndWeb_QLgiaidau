'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  onExpired?: () => void;
  labels: {
    active: string;   // "Còn X ngày Y:Z:T"
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
        timeStr = `${d} ngày ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
  };

  const dotColors = {
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500 animate-pulse',
  };

  const padding = size === 'sm' ? 'p-2.5' : 'p-3';

  return (
    <div className={`mt-2 ${padding} border rounded-lg ${colors[variant]}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotColors[variant]}`} />
        <span className={`font-semibold ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          {display}
        </span>
      </div>
    </div>
  );
}
