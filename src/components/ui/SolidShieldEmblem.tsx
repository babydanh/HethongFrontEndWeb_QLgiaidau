'use client';

import React from 'react';
import { cn } from '@/utils/cn';

export type ShieldState = 'active' | 'broken' | 'onboarding';

interface SolidShieldEmblemProps {
  state: ShieldState;
  size?: number;
  className?: string;
  title?: string;
}

export function SolidShieldEmblem({
  state,
  size = 20,
  className,
  title,
}: SolidShieldEmblemProps) {
  if (state === 'active') {
    return (
      <span
        className={cn('inline-flex items-center justify-center shrink-0 rounded-full transition-transform hover:scale-110 drop-shadow-xs', className)}
        title={title || 'Khiên bảo vệ đang hoạt động (Ngăn rớt rank 1 lần)'}
        aria-label="Khiên bảo vệ hoạt động"
      >
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
            fill="url(#shield-active-grad)"
            stroke="#059669"
            strokeWidth="1.2"
          />
          {/* Inner 3D specular highlight */}
          <path
            d="M12 3.5L5.5 5.9V11.09C5.5 15.3 8.3 19.3 12 20.4C12 20.4 12 3.5 12 3.5Z"
            fill="#FFFFFF"
            fillOpacity="0.2"
          />
          {/* Solid White Checkmark */}
          <path
            d="M8.5 11.5L11 14L15.5 9"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="shield-active-grad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>
      </span>
    );
  }

  if (state === 'broken') {
    return (
      <span
        className={cn('inline-flex items-center justify-center shrink-0 rounded-full transition-transform hover:scale-110 drop-shadow-xs', className)}
        title={title || 'Khiên bảo vệ đã vỡ'}
        aria-label="Khiên bảo vệ đã vỡ"
      >
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
            fill="url(#shield-broken-grad)"
            stroke="#B91C1C"
            strokeWidth="1.2"
          />
          {/* Jagged / Shattered Crack Line */}
          <path
            d="M12 3.5L10 8.5L13.5 12L10.5 15.5L12 20"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="shield-broken-grad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F87171" />
              <stop offset="1" stopColor="#DC2626" />
            </linearGradient>
          </defs>
        </svg>
      </span>
    );
  }

  // Onboarding / Inactive shield
  return (
    <span
      className={cn('inline-flex items-center justify-center shrink-0 rounded-full drop-shadow-xs', className)}
      title={title || 'Chưa mở khóa khiên rank'}
      aria-label="Khiên chưa mở khóa"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
          fill="url(#shield-onboarding-grad)"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />
        <circle cx="12" cy="12" r="3" fill="#FFFFFF" fillOpacity="0.85" />
        <defs>
          <linearGradient id="shield-onboarding-grad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E2E8F0" />
            <stop offset="1" stopColor="#94A3B8" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

export default SolidShieldEmblem;
