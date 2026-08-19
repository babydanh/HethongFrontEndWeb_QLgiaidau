'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageTransition } from '@/components/layout/PageTransition';
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
  const { user, setUser } = useAuthStore();
  const hasFetchedRef = useRef(false);

  // Sync user profile only ONCE on mount, not on every route change
  useEffect(() => {
    const isGuestRoute = ['/login', '/register', '/auth'].some((route) => pathname.startsWith(route));
    if (isGuestRoute) return;

    // Skip chỉ khi user trong store đã ĐẦY ĐỦ (có trạng thái xác minh email).
    // Bản persist cũ từ login chỉ có {id, email, roles} thiếu isEmailVerified → vẫn fetch để chữa.
    if (user?.id && user?.email && user.isEmailVerified !== undefined) return;

    // Only fetch once
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

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
        if (!isNetworkError(error) && !isHttpStatusError(error, 401)) {
          console.error('Failed to sync user profile globally', error);
        }
      });
  }, [pathname, setUser, user?.id, user?.email, user?.isEmailVerified]);
  
  // Exclude admin & auth paths from header/footer
  const hideHeaderFooter = pathname.startsWith('/admin');
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


