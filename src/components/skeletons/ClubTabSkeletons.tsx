/**
 * ClubTabSkeletons
 * Skeletons for the tabs inside /communities/[id]
 * - ClubMembersSkeleton
 * - ClubRankingsSkeleton
 * - ClubTournamentsSkeleton
 */

import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonBadge } from "@/components/ui/Skeleton";

/** Skeleton for MembersTab */
export function ClubMembersSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-8">
      {/* Admins section */}
      <div>
        <div className="flex items-center gap-2 border-b pb-2 mb-4">
          <SkeletonBadge className="w-28 h-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/40">
              <SkeletonAvatar size="md" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <SkeletonText className="w-32 h-4" />
                <SkeletonText className="w-20 h-3" />
              </div>
              <SkeletonBadge className="w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Members section */}
      <div>
        <div className="flex items-center gap-2 border-b pb-2 mb-4">
          <SkeletonBadge className="w-32 h-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
              <SkeletonAvatar size="md" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <SkeletonText className="w-28 h-4" />
                <SkeletonText className="w-16 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for RankingsTab */
export function ClubRankingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Skeleton className="w-7 h-4 rounded" />
          <SkeletonAvatar size="md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonText className="w-36 h-4" />
            <SkeletonText className="w-24 h-3" />
          </div>
          <div className="text-right space-y-1">
            <SkeletonText className="w-16 h-4 font-bold" />
            <SkeletonText className="w-12 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for TournamentsTab */
export function ClubTournamentsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <SkeletonBadge className="w-20" />
            <SkeletonText className="w-16 h-3" />
          </div>
          <SkeletonText className="w-3/4 h-5 font-bold" />
          <div className="space-y-1.5">
            <SkeletonText className="w-1/2 h-3" />
            <SkeletonText className="w-2/3 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
