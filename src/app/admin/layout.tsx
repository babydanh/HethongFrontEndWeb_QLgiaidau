'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/zustand/authStore';
import { api } from '@/lib/axios';
import { RouteGuard } from '@/components/shared/RouteGuard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import {
  ArrowLeft,
  Bell,
  Building,
  CreditCard,
  HandCoins,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessagesSquare,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/constants/brand';
import { getErrorMessage } from '@/utils/error';

const MODERATOR_ALLOWED_PATHS = [
  '/admin',
  '/admin/notifications',
  '/admin/verification',
  '/admin/reports',
  '/admin/tournaments',
  '/admin/support',
] as const;

const isPathAllowed = (pathname: string, allowedPath: string) =>
  allowedPath === '/admin'
    ? pathname === '/admin'
    : pathname === allowedPath || pathname.startsWith(`${allowedPath}/`);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const layoutTranslate = useTranslations('AdminLayout');
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const allMenuItems = useMemo(
    () => [
      { labelKey: 'overview', path: '/admin', icon: LayoutDashboard },
      { labelKey: 'notifications', path: '/admin/notifications', icon: Bell },
      { labelKey: 'verification', path: '/admin/verification', icon: ShieldCheck },
      { labelKey: 'moderation', path: '/admin/moderation', icon: Users },
      { labelKey: 'reports', path: '/admin/reports', icon: ShieldAlert },
      { labelKey: 'tournaments', path: '/admin/tournaments', icon: Trophy },
      { labelKey: 'categories', path: '/admin/categories', icon: Layers },
      { labelKey: 'communities', path: '/admin/communities', icon: Building },
      { labelKey: 'banners', path: '/admin/banners', icon: Megaphone },
      { labelKey: 'payouts', path: '/admin/payouts', icon: CreditCard },
      { labelKey: 'transactions', path: '/admin/transactions', icon: HandCoins },
      { labelKey: 'support', path: '/admin/support', icon: MessagesSquare },
      { labelKey: 'changeRequests', path: '/admin/change-requests', icon: ShieldAlert },
      { labelKey: 'configs', path: '/admin/configs', icon: Settings },
    ] as const,
    [],
  );
  const isAdmin = Boolean(user?.roles?.includes('ADMIN'));
  const menuItems = isAdmin
    ? allMenuItems
    : allMenuItems.filter((item) =>
        MODERATOR_ALLOWED_PATHS.includes(item.path as (typeof MODERATOR_ALLOWED_PATHS)[number]),
      );

  const activeItem = [...menuItems]
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  const pageTitle = activeItem ? layoutTranslate(activeItem.labelKey) : layoutTranslate('defaultTitle');
  const canRenderCurrentRoute = isAdmin || MODERATOR_ALLOWED_PATHS.some((allowedPath) =>
    isPathAllowed(pathname, allowedPath),
  );

  useEffect(() => {
    if (isAdmin) return;
    const isAllowedPath = MODERATOR_ALLOWED_PATHS.some((allowedPath) =>
      isPathAllowed(pathname, allowedPath),
    );
    if (!isAllowedPath) router.replace('/admin');
  }, [isAdmin, pathname, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSidebarOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const handleLogout = async () => {
    logout();
    try {
      await api.post('/auth/logout');
    } catch (error: unknown) {
      console.error('Admin logout failed:', getErrorMessage(error, 'logout request failed'));
    }
    window.location.href = '/login';
  };

  return (
    <RouteGuard allowedRoles={['ADMIN', 'MODERATOR']}>
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
        {isSidebarOpen ? (
          <button
            type="button"
            aria-label={layoutTranslate('closeNavigation')}
            className="fixed inset-0 z-30 bg-slate-950/30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col justify-between border-r border-slate-200 bg-white transition-transform duration-300 md:static md:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="min-h-0 overflow-y-auto">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <Link href="/" className="flex min-w-0 items-center gap-2 py-2" aria-label={`${BRAND.name} - ${layoutTranslate('backHome')}`}>
                <Image
                  src={BRAND.assets.logoFull}
                  alt={`${BRAND.name} Logo`}
                  width={150}
                  height={36}
                  className="h-8 w-auto max-w-[142px] object-contain"
                  priority
                />
                <span className="border-l border-slate-300 pl-2 text-sm font-bold text-slate-800">Admin</span>
              </Link>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
                aria-label={layoutTranslate('closeNavigation')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-1 p-4" aria-label={layoutTranslate('adminNavigation')}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={cn('h-5 w-5', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-950')} />
                    {layoutTranslate(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-1 border-t border-slate-200 p-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ArrowLeft className="h-5 w-5" />
              {layoutTranslate('backHome')}
            </Link>
            <Button
              onClick={() => void handleLogout()}
              variant="ghost"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-5 w-5" />
              {layoutTranslate('logout')}
            </Button>
          </div>
        </aside>

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <AdminHeader title={pageTitle} onOpenSidebar={() => setIsSidebarOpen(true)} />
          <main className="relative z-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">{canRenderCurrentRoute ? children : null}</div>
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
