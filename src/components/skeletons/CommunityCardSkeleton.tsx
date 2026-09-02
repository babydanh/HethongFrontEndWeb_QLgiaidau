/**
 * CommunityCardSkeleton
 * Matches the layout of a club card in /communities page.
 * Includes banner area, avatar offset, title, location, category badge, and member count.
 */

import { Skeleton, SkeletonText, SkeletonBadge } from "@/components/ui/Skeleton";

export function CommunityCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col justify-between">
      {/* Banner */}
      <div className="h-48 sm:h-52 bg-slate-200 animate-pulse relative shrink-0" />

      {/* Card Info */}
      <div className="p-4 pt-2.5 flex flex-col justify-between bg-white">
        <div className="flex items-start gap-3 relative">
          {/* Club Logo Avatar overlapping banner */}
          <div className="-mt-9 sm:-mt-10 shrink-0">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-300 animate-pulse border-4 border-white shadow-md" />
          </div>

          <div className="flex-1 min-w-0 pt-0.5 space-y-1.5">
            <SkeletonText className="w-3/4 h-4 font-bold" />
            <SkeletonText className="w-1/2 h-3" />
          </div>
        </div>

        {/* Description line */}
        <div className="mt-3 space-y-1.5">
          <SkeletonText className="w-full h-3" />
          <SkeletonText className="w-4/5 h-3" />
        </div>

        {/* Footer meta (Category + Member count) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <SkeletonBadge className="w-16 h-5" />
          <SkeletonText className="w-20 h-3" />
        </div>
      </div>
    </div>
  );
}

export function CommunityGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <CommunityCardSkeleton key={i} />
      ))}
    </div>
  );
}
