'use client';

import { RouteGuard } from '@/components/shared/RouteGuard';

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={['ORGANIZER', 'ADMIN']}>
      <section className="min-h-[calc(100vh-9rem)] bg-slate-50 py-6 md:py-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </section>
    </RouteGuard>
  );
}
