'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/zustand/authStore';
import { usersApi } from '@/features/users/api';
import { isHttpStatusError, isNetworkError } from '@/utils/error';
import { cn } from '@/utils/cn';
import UnifiedChatWidget from '@/components/shared/UnifiedChatWidget';
import GlobalUserProfileModal from '@/components/common/GlobalUserProfileModal';

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const hasFetchedRef = useRef(false);
  const fetchedUserIdRef = useRef<string | null>(null);

  // Sync user profile once per authenticated user, not on every route change
  useEffect(() => {
    const isGuestRoute = ['/login', '/register', '/auth'].some((route) => pathname.startsWith(route));
    if (isGuestRoute || !isAuthenticated || !user?.id) {
      hasFetchedRef.current = false;
      fetchedUserIdRef.current = null;
      return;
    }

    // Rehydrate once per authenticated user so avatar/name/email are not stale
    // after a profile edit while route changes do not duplicate the request.
    if (hasFetchedRef.current && fetchedUserIdRef.current === user.id) return;
    hasFetchedRef.current = true;
    fetchedUserIdRef.current = user.id;

    usersApi.getProfile()
      .then((data) => {
        if (data) {
          setUser({
            id: data.id,
            email: data.email,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl || undefined,
            coverUrl: data.coverUrl || undefined,
            roles: data.roles || (data.role ? [data.role] : []),
            phoneNumber: data.phoneNumber || undefined,
            dateOfBirth: data.dateOfBirth || undefined,
            gender: data.gender || undefined,
            address: data.address || undefined,
            bio: data.bio || undefined,
            provinceCode: data.provinceCode || undefined,
            isEmailVerified: data.isEmailVerified,
            isPhoneVerified: data.isPhoneVerified,
            isGenderLocked: data.isGenderLocked,
          });
        }
      })
      .catch((error: unknown) => {
        if (isHttpStatusError(error, 401)) {
          // A persisted Zustand session can outlive the access/refresh cookies.
          // Clear it so global chat does not keep issuing protected requests.
          logout();
          return;
        }
        if (!isNetworkError(error)) {
          console.error('Failed to sync user profile globally', error);
        }
      });
  }, [pathname, isAuthenticated, setUser, logout, user?.id]);
  
  // Exclude admin, moderation & auth paths from header/footer
  const hideHeaderFooter = pathname.startsWith('/admin') || pathname.startsWith('/moderation');
  const isGuestRoute = ['/login', '/register'].some((route) => pathname.startsWith(route));

  return (
    <>
      {!hideHeaderFooter && !isGuestRoute && <Header />}
      <main className={cn(
        "flex-grow flex flex-col",
        hideHeaderFooter && "h-screen overflow-hidden",
      )}>
        {children}
      </main>
      {!hideHeaderFooter && !isGuestRoute && <Footer />}
      {!hideHeaderFooter && !isGuestRoute && <UnifiedChatWidget />}
      <GlobalUserProfileModal />
    </>
  );
}


