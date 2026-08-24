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
  const hasAllowedRole = Boolean(user?.roles?.some((role) => allowedRoles.includes(role)));

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (user && !hasAllowedRole) {
      router.replace('/');
    }
  }, [hasAllowedRole, mounted, isAuthenticated, user, router]);

  if (!mounted || !isAuthenticated || !user || !hasAllowedRole) return null;

  return <>{children}</>;
}



