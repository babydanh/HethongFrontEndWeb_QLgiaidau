'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageTransition } from '@/components/layout/PageTransition';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/zustand/authStore';
import { usersApi } from '@/features/users/api';
import { isHttpStatusError, isNetworkError } from '@/utils/error';
import AiChatAssistant from '@/components/shared/AiChatAssistant';

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setUser } = useAuthStore();

  // Sync user profile globally on mount to ensure roles/data are always up-to-date or recover session from cookies
  useEffect(() => {
    const isGuestRoute = ['/login', '/register'].some((route) => pathname.startsWith(route));
    if (isGuestRoute) {
      return;
    }

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
          });
        }
      })
      .catch((error: unknown) => {
        if (!isNetworkError(error) && !isHttpStatusError(error, 401)) {
          console.error('Failed to sync user profile globally', error);
        }
      });
  }, [pathname, setUser]);
  
  // Exclude admin & auth paths from header/footer
  const hideHeaderFooter = pathname.startsWith('/admin');
  const isGuestRoute = ['/login', '/register'].some((route) => pathname.startsWith(route));

  if (hideHeaderFooter) {
    return (
      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        {children}
      </main>
    );
  }

  // Auth pages (login / register) fill the full viewport without Header/Footer
  if (isGuestRoute) {
    return (
      <main className="flex-grow flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-grow">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <AiChatAssistant />
    </>
  );
}

