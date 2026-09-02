/**
 * MatchCardSkeleton
 * Mirrors the layout of a single match card in MatchesTab (list view).
 * Rendered in a grid-cols-2 gap-4 container.
 *
 * Skeleton rules (see SKILL.md §6).
 */

import { SkeletonText, SkeletonBadge } from "@/components/ui/Skeleton";

export function MatchCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Header bar — round label + status badge */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
        <SkeletonText className="w-24 h-3" />
        <SkeletonBadge className="w-12 h-3.5" />
      </div>

      {/* Body — 2 participants */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Participant 1 */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full animate-pulse bg-slate-200 shrink-0" />
            <SkeletonText className="w-28" />
          </div>
          <div className="flex gap-1 shrink-0">
            <div className="w-7 h-6 rounded animate-pulse bg-slate-100" />
            <div className="w-7 h-6 rounded animate-pulse bg-slate-100" />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100" />

        {/* Participant 2 */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full animate-pulse bg-slate-200 shrink-0" />
            <SkeletonText className="w-24" />
          </div>
          <div className="flex gap-1 shrink-0">
            <div className="w-7 h-6 rounded animate-pulse bg-slate-100" />
            <div className="w-7 h-6 rounded animate-pulse bg-slate-100" />
          </div>
        </div>
      </div>

      {/* Footer — action button */}
      <div className="px-4 py-2.5 border-t border-slate-100 flex justify-between items-center bg-slate-50/40">
        <SkeletonText className="w-20 h-3" />
        <div className="h-7 w-20 rounded-lg animate-pulse bg-slate-200" />
      </div>
    </div>
  );
}
