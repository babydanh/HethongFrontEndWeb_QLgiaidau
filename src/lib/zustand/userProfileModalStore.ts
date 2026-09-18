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
  keepOpen: () => void;
  scheduleClose: (delayMs?: number) => void;
}

let closeTimeout: NodeJS.Timeout | null = null;

export const useUserProfileModalStore = create<UserProfileModalState>((set, get) => ({
  isOpen: false,
  user: null,
  anchorRect: null,
  communityId: undefined,
  openUserProfile: (user, anchorRect = null, communityId) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
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
  openUserById: (userId, fullName = '', avatarUrl = null, anchorRect = null, communityId) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
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
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
    set({
      isOpen: false,
      user: null,
      anchorRect: null,
      communityId: undefined,
    });
  },
  keepOpen: () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
  },
  scheduleClose: (delayMs = 1500) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    closeTimeout = setTimeout(() => {
      get().closeUserProfile();
    }, delayMs);
  },
}));
