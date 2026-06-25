'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function OrganizerTournamentOpsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/organizer/tournaments/${resolvedParams.id}/manage?tab=operations`);
  }, [resolvedParams.id, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <LoadingSpinner className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Đang chuyển tới panel vận hành của giải...</p>
      </div>
    </div>
  );
}
