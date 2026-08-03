'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/zustand/authStore';

export default function ModerationChangeRequestsRedirect() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    router.replace(user.roles?.includes('ADMIN') ? '/admin/change-requests' : '/moderation');
  }, [router, user]);

  return null;
}

