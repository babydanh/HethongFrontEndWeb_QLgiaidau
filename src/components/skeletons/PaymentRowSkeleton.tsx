import React from 'react';

export function PaymentStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
          <div className="h-7 bg-slate-200 rounded w-32" />
        </div>
      ))}
    </div>
  );
}

export function PaymentRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="space-y-1.5">
          <div className="h-4 bg-slate-200 rounded-md w-36" />
          <div className="h-3 bg-slate-200 rounded-md w-24" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-5 bg-slate-200 rounded-md w-20" />
        <div className="h-6 bg-slate-200 rounded-full w-24" />
      </div>
    </div>
  );
}

export default PaymentRowSkeleton;