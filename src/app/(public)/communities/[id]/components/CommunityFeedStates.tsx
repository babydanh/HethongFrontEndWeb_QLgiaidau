import { MessageCircle, RefreshCw } from "lucide-react";

export function CommunityFeedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-52 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-52 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export function CommunityFeedError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-600"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Thử lại
      </button>
    </div>
  );
}

export function CommunityFeedEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
      <MessageCircle className="mx-auto h-12 w-12 text-slate-400" strokeWidth={1.5} />
      <p className="mt-3 text-sm font-semibold text-slate-800">
        Chưa có bài viết nào
      </p>
    </div>
  );
}
