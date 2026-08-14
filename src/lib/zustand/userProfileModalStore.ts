import { create } from 'zustand';
import type { PopoverUserProfile } from '@/components/common/UserProfilePopover';

interface UserProfileModalState {
  isOpen: boolean;
  user: PopoverUserProfile | null;
  anchorRect: DOMRect | null;
  communityId?: string;
  openUserProfile: (
    user: PopoverUserProfile,
    anchorRect?: DOMRect | null,
    communityId?: string,
  ) => void;
  openUserById: (
    userId: string,
    fullName?: string,
    avatarUrl?: string | null,
    anchorRect?: DOMRect | null,
    communityId?: string,
  ) => void;
  closeUserProfile: () => void;
}

export const useUserProfileModalStore = create<UserProfileModalState>((set) => ({
  isOpen: false,
  user: null,
  anchorRect: null,
  communityId: undefined,
  openUserProfile: (user, anchorRect = null, communityId) => {
    // If no anchorRect is passed, center it nicely
    const defaultRect = anchorRect || (typeof window !== 'undefined'
      ? new DOMRect(window.innerWidth / 2 - 165, window.innerHeight / 2 - 150, 330, 300)
      : null);

    set({
      isOpen: true,
      user,
      anchorRect: defaultRect,
      communityId,
    });
  },
  openUserById: (userId, fullName = 'Thành viên', avatarUrl = null, anchorRect = null, communityId) => {
    const defaultRect = anchorRect || (typeof window !== 'undefined'
      ? new DOMRect(window.innerWidth / 2 - 165, window.innerHeight / 2 - 150, 330, 300)
      : null);

    set({
      isOpen: true,
      user: {
        id: userId,
        fullName,
        avatarUrl,
      },
      anchorRect: defaultRect,
      communityId,
    });
  },
  closeUserProfile: () => {
    set({
      isOpen: false,
      user: null,
      anchorRect: null,
      communityId: undefined,
    });
  },
}));
