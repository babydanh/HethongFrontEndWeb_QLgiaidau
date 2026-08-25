import * as React from 'react';
import { cn } from '@/utils/cn';
import { getRankStyle } from '@/utils/rank-style';
import { getShortTierCode } from '@/components/ui/PlayerSportTierBadgeBar';
import { getSportAccentColor } from '@/constants/sports';
import { getTierBadgeStyle, SportBadgeIcon, getTierTheme } from '@/components/ui/RankEmblem';

export interface EloTierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  elo: number;
  tierName?: string;
  categoryName?: string;
  size?: 'sm' | 'md' | 'lg';
  showFullName?: boolean;
}

export function getEloTier(elo: number, tierName?: string, categoryName?: string) {
  const style = getRankStyle(elo, tierName, categoryName);
  const shortCode = getShortTierCode(style.name, elo);
  const theme = getTierTheme(style.name, elo, shortCode);
  return {
    name: style.name,
    shortCode,
    theme,
    color: style.badgeClass,
    icon: '',
  };
}

export function EloTierBadge({
  elo,
  tierName,
  categoryName,
  size = 'md',
  showFullName = false,
  className,
  ...props
}: EloTierBadgeProps) {
  const tier = getEloTier(elo, tierName, categoryName);
  const tierBadgeStyle = getTierBadgeStyle(tier.theme, tier.shortCode);

  const iconSizes = {
    sm: 22,
    md: 26,
    lg: 32,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 border shadow-xs transition-all select-none',
        'bg-[#090d16]',
        size === 'sm' ? 'gap-1 text-[11px]' : size === 'md' ? 'gap-1.5 text-xs' : 'gap-2 text-sm',
        className,
      )}
      style={{
        backgroundColor: '#090d16',
        borderColor: tierBadgeStyle.borderColor,
        color: tierBadgeStyle.textColor,
        boxShadow: `0 0 6px ${tier.theme.glowColor || 'rgba(0,0,0,0.3)'}`,
      }}
      title={`${categoryName ? `${categoryName}: ` : ''}${tier.name} (${tier.shortCode})`}
      {...props}
    >
      <SportBadgeIcon sportName={categoryName} sizePx={iconSizes[size]} />
      <span
        className="font-black uppercase tracking-tight leading-none"
        style={{
          color: tierBadgeStyle.textColor,
          fontWeight: tierBadgeStyle.isHigh ? 900 : 800,
          textShadow: `0 0 6px ${tier.theme.glowColor}`,
        }}
      >
        {showFullName ? tier.name : tier.shortCode}
      </span>
    </div>
  );
}
