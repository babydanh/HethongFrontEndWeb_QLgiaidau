import * as React from 'react';
import { cn } from '@/utils/cn';

export interface EloTierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  elo: number;
  tierName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function getEloTier(elo: number, tierName?: string) {
  // The API tier wins; numeric thresholds remain a fallback for old records.
  const name = tierName?.toLowerCase() || '';
  const resolvedElo = name.includes('tier s') ? 1800
    : name.includes('high tier a') ? 1700
    : name.includes('low tier a') ? 1600
    : name.includes('high tier b') ? 1500
    : name.includes('low tier b') ? 1400
    : name.includes('high tier c') ? 1300
    : name.includes('low tier c') ? 1200
    : name.includes('high tier d') ? 1100
    : elo;
  if (resolvedElo >= 1800) {
    return {
      name: 'Tier S',
      color: 'bg-[#fff1bf] text-[#9a4d00] border-[#f59e0b] font-bold shadow-sm',
      icon: '👑',
    };
  }
  if (resolvedElo >= 1700) {
    return {
      name: 'High Tier A',
      color: 'bg-[#f7b5b1] text-[#a51d1d] border-[#ef7770] font-semibold',
      icon: '🔥',
    };
  }
  if (resolvedElo >= 1600) {
    return {
      name: 'Low Tier A',
      color: 'bg-[#ffd6d2] text-[#c52222] border-[#ffaaa3]',
      icon: '🏆',
    };
  }
  if (resolvedElo >= 1500) {
    return {
      name: 'High Tier B',
      color: 'bg-[#bdd8ff] text-[#2853a6] border-[#7dafff] font-semibold',
      icon: '⚡',
    };
  }
  if (resolvedElo >= 1400) {
    return {
      name: 'Low Tier B',
      color: 'bg-[#e8f1ff] text-[#2563eb] border-[#b9d4ff]',
      icon: '🥇',
    };
  }
  if (resolvedElo >= 1300) {
    return {
      name: 'High Tier C',
      color: 'bg-[#9cefc8] text-[#08734f] border-[#48d69d] font-semibold',
      icon: '💎',
    };
  }
  if (resolvedElo >= 1200) {
    return {
      name: 'Low Tier C',
      color: 'bg-[#dcfced] text-[#07845c] border-[#96e9c6]',
      icon: '💠',
    };
  }
  if (resolvedElo >= 1100) {
    return {
      name: 'High Tier D',
      color: 'bg-[#dbe4f0] text-[#334155] border-[#aebdce] font-semibold',
      icon: '🥈',
    };
  }
  return {
    name: 'Low Tier D',
    color: 'bg-[#f1f1f1] text-[#57534e] border-[#d1d1d1]',
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
