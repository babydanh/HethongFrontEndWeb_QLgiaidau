import React from 'react';

export function MatchCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs animate-pulse">
      <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-2.5">
        <div className="h-4 bg-slate-200 rounded-md w-28" />
        <div className="h-4 bg-slate-200 rounded-md w-16" />
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-200 rounded-full" />
            <div className="h-4 bg-slate-200 rounded-md w-36" />
          </div>
          <div className="h-6 bg-slate-200 rounded-md w-8" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-200 rounded-full" />
            <div className="h-4 bg-slate-200 rounded-md w-32" />
          </div>
          <div className="h-6 bg-slate-200 rounded-md w-8" />
        </div>
      </div>
    </div>
  );
}

export default MatchCardSkeleton;