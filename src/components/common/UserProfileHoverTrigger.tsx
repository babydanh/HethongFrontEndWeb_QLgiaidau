'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import type { PopoverUserProfile } from '@/components/common/UserProfilePopover';

export interface UserProfileHoverTriggerProps {
  userId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  communityId?: string;
  user?: Partial<PopoverUserProfile>;
  children: React.ReactNode;
  className?: string;
  enableClickNavigate?: boolean; // When clicked, navigates directly to /users/[id]
  openDelayMs?: number;
  closeDelayMs?: number;
}

/**
 * Reusable wrapper component that triggers UserProfilePopover on hover/focus,
 * keeping the popover alive on mouseenter and dismissing cleanly on mouseleave.
 * Conforms to the project's Skills & UX specification.
 */
export default function UserProfileHoverTrigger({
  userId,
  fullName,
  avatarUrl,
  communityId,
  user,
  children,
  className = '',
  enableClickNavigate = false,
  openDelayMs = 200,
  closeDelayMs = 400,
}: UserProfileHoverTriggerProps) {
  const router = useRouter();
  const { openUserProfile, openUserById, keepOpen, scheduleClose, closeUserProfile } =
    useUserProfileModalStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const targetId = userId || user?.id;
  const targetName = fullName || user?.fullName || '';
  const targetAvatar = avatarUrl !== undefined ? avatarUrl : (user?.avatarUrl || null);

  if (!targetId) {
    return <div className={className}>{children}</div>;
  }

  const triggerOpen = (rect: DOMRect) => {
    if (user && Object.keys(user).length > 2) {
      openUserProfile(
        {
          id: targetId,
          fullName: targetName,
          avatarUrl: targetAvatar,
          ...user,
        } as PopoverUserProfile,
        rect,
        communityId,
      );
    } else {
      openUserById(targetId, targetName, targetAvatar, rect, communityId);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    keepOpen();
    if (timerRef.current) clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      triggerOpen(rect);
    }, openDelayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    scheduleClose(closeDelayMs);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (enableClickNavigate) {
      if (timerRef.current) clearTimeout(timerRef.current);
      closeUserProfile();
      router.push(`/users/${targetId}`);
      return;
    }

    // Otherwise click immediately opens the popover
    if (timerRef.current) clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    triggerOpen(rect);
  };

  return (
    <div
      className={`inline-flex items-center cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
