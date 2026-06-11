import React from 'react';
import { TicketStatus } from '@/types/series';
import { cn } from '@/utils/cn';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status, className }) => {
  const configs = {
    DIRECT_ENTRY: {
      text: '🎫 Vé Thẳng',
      classes: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    },
    WILDCARD: {
      text: '🎫 Vé Vớt',
      classes: 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
    },
    IN_CONTENTION: {
      text: '⏳ Đang chờ',
      classes: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    },
    LOCKED_OUT: {
      text: '🔒 Đã khóa',
      classes: 'bg-slate-800/80 text-slate-400 border border-slate-700/50 line-through'
    },
    NOT_QUALIFIED: {
      text: '—',
      classes: 'text-slate-500 border border-transparent'
    }
  };

  const current = configs[status] || configs.NOT_QUALIFIED;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm transition-all duration-200',
        current.classes,
        className
      )}
    >
      {current.text}
    </span>
  );
};
