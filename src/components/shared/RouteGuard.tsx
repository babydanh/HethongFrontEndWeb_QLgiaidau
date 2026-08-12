'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/zustand/authStore';

interface RouteGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

// React 18 standard client-side mount detector
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.push('/login');
    } else if (user && !allowedRoles.some(r => user.roles?.includes(r))) {
      router.push('/');
    }
  }, [mounted, isAuthenticated, user, allowedRoles, router]);

  if (!mounted || !isAuthenticated || !user) return null;
  if (!allowedRoles.some(r => user.roles?.includes(r))) return null;

  return <>{children}</>;
}



