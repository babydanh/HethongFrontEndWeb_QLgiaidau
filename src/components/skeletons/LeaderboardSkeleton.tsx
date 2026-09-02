/**
 * LeaderboardSkeleton
 * Matches the layout of /leaderboard page.
 * Includes Top 3 Podium Cards + Ranking List rows.
 */

import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonBadge } from "@/components/ui/Skeleton";

export function LeaderboardPodiumSkeleton() {
  return (
    <div className="bg-gradient-to-b from-blue-50/70 via-sky-50/40 to-white rounded-xl border border-blue-100 shadow-sm p-6 md:p-8 text-slate-800 relative overflow-hidden mb-8">
      <div className="text-center mb-8">
        <SkeletonBadge className="mx-auto w-32 h-6" />
      </div>

      {/* 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-4">
        {/* Rank 2 (Left) */}
        <div className="bg-white/80 rounded-xl border border-slate-200/80 p-5 flex flex-col items-center text-center space-y-3 shadow-xs order-2 md:order-1">
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse -mt-9 border-2 border-white" />
          <SkeletonAvatar size="lg" />
          <SkeletonText className="w-24 h-4" />
          <SkeletonBadge className="w-16 h-4" />
          <SkeletonText className="w-20 h-5 font-bold" />
        </div>

        {/* Rank 1 (Center, taller) */}
        <div className="bg-white rounded-xl border-2 border-amber-200 p-6 flex flex-col items-center text-center space-y-3 shadow-md order-1 md:order-2 -mt-4">
          <div className="w-9 h-9 rounded-full bg-amber-200 animate-pulse -mt-10 border-2 border-white" />
          <SkeletonAvatar size="xl" className="border-2 border-amber-200" />
          <SkeletonText className="w-28 h-5 font-bold" />
          <SkeletonBadge className="w-20 h-4 bg-amber-100" />
          <SkeletonText className="w-24 h-6 font-bold" />
        </div>

        {/* Rank 3 (Right) */}
        <div className="bg-white/80 rounded-xl border border-slate-200/80 p-5 flex flex-col items-center text-center space-y-3 shadow-xs order-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse -mt-9 border-2 border-white" />
          <SkeletonAvatar size="lg" />
          <SkeletonText className="w-24 h-4" />
          <SkeletonBadge className="w-16 h-4" />
          <SkeletonText className="w-20 h-5 font-bold" />
        </div>
      </div>
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <Skeleton className="w-7 h-5 rounded" />
        <SkeletonAvatar size="md" />
        <div className="space-y-1.5 min-w-0">
          <SkeletonText className="w-32 h-4" />
          <SkeletonText className="w-20 h-3" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <SkeletonBadge className="hidden sm:inline-block w-16" />
        <div className="text-right space-y-1">
          <SkeletonText className="w-16 h-4" />
          <SkeletonText className="w-12 h-3" />
        </div>
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      <LeaderboardPodiumSkeleton />
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <LeaderboardRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
