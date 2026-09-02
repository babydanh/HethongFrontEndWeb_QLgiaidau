/**
 * PublicProfileSkeleton
 * Matches the layout of /users/[id] public profile page.
 * Includes Cover + Avatar + Info + Stat Grid + Match History.
 */

import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonBadge } from "@/components/ui/Skeleton";

export function PublicProfileSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Cover */}
      <div className="h-48 md:h-64 bg-slate-200 animate-pulse w-full relative" />

      {/* Main container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-10 space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="rounded-full ring-4 ring-white shadow-md shrink-0">
              <SkeletonAvatar size="xl" className="w-24 h-24 sm:w-28 sm:h-28" />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <SkeletonText className="w-44 h-7" />
                <SkeletonBadge className="w-16 h-5" />
              </div>
              <SkeletonText className="w-32 h-3.5 mx-auto sm:mx-0" />
            </div>

            <div className="flex gap-2.5 shrink-0">
              <div className="w-28 h-10 rounded-xl bg-slate-200 animate-pulse" />
            </div>
          </div>

          {/* Bio skeleton */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
            <SkeletonText className="w-full max-w-xl h-3.5" />
            <SkeletonText className="w-3/4 max-w-md h-3.5" />
          </div>
        </div>

        {/* Stats Grid (4 Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-2">
              <SkeletonText className="w-20 h-3" />
              <SkeletonText className="w-16 h-6 font-bold" />
              <SkeletonText className="w-24 h-3 text-slate-400" />
            </div>
          ))}
        </div>

        {/* Recent Matches Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <SkeletonText className="w-36 h-5 font-bold" />
            <SkeletonBadge className="w-16 h-4" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="space-y-1.5">
                    <SkeletonText className="w-40 h-4" />
                    <SkeletonText className="w-24 h-3" />
                  </div>
                </div>
                <SkeletonText className="w-16 h-5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
