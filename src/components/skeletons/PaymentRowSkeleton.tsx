/**
 * PaymentRowSkeleton
 * Mirrors a payment table row in /payments page.
 * Columns: date | tournament name | amount | method | status | action
 *
 * Skeleton rules (see SKILL.md §6).
 */

import { SkeletonText, SkeletonBadge } from "@/components/ui/Skeleton";

export function PaymentRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      {/* Date */}
      <td className="py-4 px-6">
        <SkeletonText className="w-24 h-3" />
      </td>
      {/* Tournament name */}
      <td className="py-4 px-6">
        <SkeletonText className="w-36" />
      </td>
      {/* Amount */}
      <td className="py-4 px-6">
        <SkeletonText className="w-16 h-3.5" />
      </td>
      {/* Method */}
      <td className="py-4 px-6">
        <SkeletonBadge className="w-14" />
      </td>
      {/* Status */}
      <td className="py-4 px-6">
        <SkeletonBadge className="w-20" />
      </td>
      {/* Action */}
      <td className="py-4 px-6 text-right">
        <div className="ml-auto h-7 w-20 rounded-lg animate-pulse bg-slate-200" />
      </td>
    </tr>
  );
}

/** Stats card skeleton — mirrors the 3 stat cards at the top of /payments */
export function PaymentStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-lg animate-pulse bg-slate-200 shrink-0" />
          <div className="space-y-2 flex-1">
            <SkeletonText className="w-2/3 h-3" />
            <SkeletonText className="w-1/2 h-6" />
          </div>
        </div>
      ))}
    </div>
  );
}
