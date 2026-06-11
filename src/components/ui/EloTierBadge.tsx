import * as React from 'react';
import { cn } from '@/utils/cn';

export interface EloTierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  elo: number;
  tierName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function getEloTier(elo: number, tierName?: string) {
  if (tierName) {
    const nameLower = tierName.toLowerCase();
    if (nameLower.includes('tier s')) {
      return {
        name: 'Tier S',
        color: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-amber-950 border-amber-400 font-extrabold shadow-sm animate-pulse',
        icon: '👑',
      };
    }
    if (nameLower.includes('tier a')) {
      return {
        name: 'Tier A',
        color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
        icon: '🏆',
      };
    }
    if (nameLower.includes('tier b')) {
      return {
        name: 'Tier B',
        color: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
        icon: '🥇',
      };
    }
    if (nameLower.includes('tier c (high)')) {
      return {
        name: 'Tier C (High)',
        color: 'bg-teal-500/10 text-teal-650 border-teal-500/20',
        icon: '💎',
      };
    }
    if (nameLower.includes('tier c (low)')) {
      return {
        name: 'Tier C (Low)',
        color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
        icon: '💠',
      };
    }
    if (nameLower.includes('tier d (high)')) {
      return {
        name: 'Tier D (High)',
        color: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
        icon: '🥈',
      };
    }
    if (nameLower.includes('tier d (low)')) {
      return {
        name: 'Tier D (Low)',
        color: 'bg-orange-700/10 text-orange-650 border-orange-700/20',
        icon: '🥉',
      };
    }
  }

  // Fallback to static ELO calculation if tierName is not available
  if (elo >= 2200) {
    return {
      name: 'Grand Master',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: '🏆',
    };
  }
  if (elo >= 2000) {
    return {
      name: 'Master',
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      icon: '👑',
    };
  }
  if (elo >= 1800) {
    return {
      name: 'Diamond',
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      icon: '💠',
    };
  }
  if (elo >= 1600) {
    return {
      name: 'Platinum',
      color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      icon: '💎',
    };
  }
  if (elo >= 1400) {
    return {
      name: 'Gold',
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      icon: '🥇',
    };
  }
  if (elo >= 1200) {
    return {
      name: 'Silver',
      color: 'bg-gray-400/10 text-gray-450 border-gray-400/20',
      icon: '🥈',
    };
  }
  return {
    name: 'Bronze',
    color: 'bg-orange-700/10 text-orange-600 border-orange-700/20',
    icon: '🥉',
  };
}

export function EloTierBadge({ elo, tierName, size = 'md', className, ...props }: EloTierBadgeProps) {
  const tier = getEloTier(elo, tierName);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2 font-bold',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-semibold transition-colors shadow-sm',
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
