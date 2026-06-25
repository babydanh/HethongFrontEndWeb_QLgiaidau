'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/zustand/authStore';

interface RouteGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user && !allowedRoles.some(r => user.roles?.includes(r))) {
      router.push('/');
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  if (!isAuthenticated || !user) return null;
  if (!allowedRoles.some(r => user.roles?.includes(r))) return null;

  return <>{children}</>;
}
