/**
 * UserProfileSkeleton
 * Mirrors the layout of UserProfilePopover so the popover doesn't shift/jump
 * when extra profile details arrive from getPublicProfile().
 *
 * Skeleton rules (see SKILL.md §6):
 * - animate-pulse, bg-slate-200 base / bg-slate-100 lighter areas
 * - Shape-matched to the real layout
 * - No spinner
 */

import { SkeletonText, SkeletonAvatar, SkeletonBadge } from "@/components/ui/Skeleton";

export function UserProfileSkeleton() {
  return (
    <div className="w-full">
      {/* Cover header */}
      <div className="h-20 animate-pulse rounded-t-none bg-slate-200" />

      {/* Body */}
      <div className="relative px-4 pb-4 pt-0">
        {/* Avatar + badge row */}
        <div className="-mt-10 mb-3 flex items-end justify-between">
          <div className="rounded-full shadow-md">
            <SkeletonAvatar size="lg" className="ring-2 ring-white" />
          </div>
          <div className="flex gap-1.5">
            <SkeletonBadge className="w-16" />
            <SkeletonBadge className="w-10" />
          </div>
        </div>

        {/* Name */}
        <SkeletonText className="mb-1.5 w-2/5" />
        {/* Sub-line (community role) */}
        <SkeletonText className="mb-4 w-1/4 h-3" />

        {/* Bio */}
        <div className="space-y-1.5 mb-4">
          <SkeletonText className="w-full" />
          <SkeletonText className="w-4/5" />
        </div>

        {/* Stats / rank row */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-lg bg-slate-100 animate-pulse h-14" />
          <div className="flex-1 rounded-lg bg-slate-100 animate-pulse h-14" />
          <div className="flex-1 rounded-lg bg-slate-100 animate-pulse h-14" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <div className="flex-1 h-9 rounded-lg animate-pulse bg-slate-200" />
          <div className="flex-1 h-9 rounded-lg animate-pulse bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
