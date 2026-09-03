'use client';

import { useSyncExternalStore, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, Home, LogIn } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const mounted = useMounted();
  const translate = useTranslations('OrganizerTournaments');

  const hasOrganizerRole = Boolean(
    user?.roles?.some((role) => role === 'ORGANIZER' || role === 'ADMIN'),
  );

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center bg-slate-50">
        <LoadingSpinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <section className="min-h-[calc(100vh-9rem)] bg-slate-50 py-16 px-4">
        <div className="mx-auto max-w-md text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-4">
            <LogIn className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{translate('loginRequiredTitle')}</h2>
          <p className="mt-2 text-sm text-slate-500">{translate('loginRequiredDesc')}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
            >
              {translate('loginAction')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Nếu user chưa có role ORGANIZER và chưa xác thực email, hiển thị giao diện kích hoạt thay vì đá văng
  if (!hasOrganizerRole && !user.isEmailVerified) {
    return (
      <section className="min-h-[calc(100vh-9rem)] bg-slate-50 py-16 px-4">
        <div className="mx-auto max-w-lg text-center bg-white p-8 rounded-2xl border border-amber-200 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white mb-4 shadow-sm">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">{translate('roleOrganizerRequiredTitle')}</h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {translate('roleOrganizerRequiredDesc')}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/verify-email"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition shadow-sm"
            >
              {translate('upgradeToOrganizerAction')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Home className="h-4 w-4" />
              {translate('backToHomeAction')}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-9rem)] bg-slate-50 py-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}
