import React from 'react';

export function UserProfileSkeleton() {
  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm animate-pulse space-y-4">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 rounded-md w-32" />
          <div className="h-3 bg-slate-200 rounded-md w-24" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
        <div className="h-10 bg-slate-200 rounded-xl" />
        <div className="h-10 bg-slate-200 rounded-xl" />
        <div className="h-10 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}

export default UserProfileSkeleton;