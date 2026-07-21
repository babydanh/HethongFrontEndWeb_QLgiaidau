import * as React from 'react';
import { cn } from '@/utils/cn';

export interface EloTierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  elo: number;
  tierName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function getEloTier(elo: number, tierName?: string) {
  // Determine tier based on ELO points (source of truth)
  if (elo >= 1800) {
    return {
      name: 'Tier S',
      color: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-amber-950 border-amber-400 font-bold shadow-sm animate-pulse',
      icon: '👑',
    };
  }
  if (elo >= 1700) {
    return {
      name: 'High Tier A',
      color: 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-semibold',
      icon: '🔥',
    };
  }
  if (elo >= 1600) {
    return {
      name: 'Low Tier A',
      color: 'bg-rose-500/10 text-rose-500/90 border-rose-500/20',
      icon: '🏆',
    };
  }
  if (elo >= 1500) {
    return {
      name: 'High Tier B',
      color: 'bg-violet-500/15 text-violet-650 border-violet-550/30 font-semibold',
      icon: '⚡',
    };
  }
  if (elo >= 1400) {
    return {
      name: 'Low Tier B',
      color: 'bg-violet-500/10 text-violet-550 border-violet-500/20',
      icon: '🥇',
    };
  }
  if (elo >= 1300) {
    return {
      name: 'High Tier C',
      color: 'bg-teal-500/15 text-teal-650 border-teal-500/30 font-semibold',
      icon: '💎',
    };
  }
  if (elo >= 1200) {
    return {
      name: 'Low Tier C',
      color: 'bg-cyan-500/10 text-cyan-650 border-cyan-500/20',
      icon: '💠',
    };
  }
  if (elo >= 1100) {
    return {
      name: 'High Tier D',
      color: 'bg-slate-500/15 text-slate-700 border-slate-550/25 font-semibold',
      icon: '🥈',
    };
  }
  return {
    name: 'Low Tier D',
    color: 'bg-orange-700/10 text-orange-650 border-orange-700/20',
    icon: '🥉',
  };
}

export function EloTierBadge({ elo, tierName, size = 'md', className, ...props }: EloTierBadgeProps) {
  const tier = getEloTier(elo, tierName);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2 font-semibold',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-colors shadow-sm',
        tier.color,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span>{tier.icon}</span>
      <span>
        {tier.name} <span className="opacity-70">({elo})</span>
      </span>
    </div>
  );
}
