'use client';

import UserProfilePopover from '@/components/common/UserProfilePopover';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';

export default function GlobalUserProfileModal() {
  const { isOpen, user, anchorRect, communityId, closeUserProfile } = useUserProfileModalStore();

  if (!isOpen || !user) return null;

  return (
    <UserProfilePopover
      user={user}
      anchorRect={anchorRect}
      isOpen={isOpen}
      onClose={closeUserProfile}
      communityId={communityId}
    />
  );
}
