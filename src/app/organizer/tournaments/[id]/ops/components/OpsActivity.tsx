'use client';

import type { OpsActivityItem } from '@/features/organizer/ops/types';
import { formatDateTime } from '@/utils/format';

interface OpsActivityProps {
  activityLog: OpsActivityItem[];
}

export function OpsActivity({ activityLog }: OpsActivityProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Nhật ký vận hành</h2>
        <p className="text-sm font-medium text-slate-500">
          Lưu vết thao tác trong ngày thi đấu. Nhật ký này lấy từ audit hệ thống và tự động bổ sung các cập nhật vừa xảy ra trên panel vận hành.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {activityLog.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-slate-700">Chưa có thao tác nào được ghi lại</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Khi BTC duyệt hồ sơ, điều phối trận hoặc cập nhật tỉ số, hệ thống sẽ thêm dấu vết tại đây.
            </p>
          </div>
        ) : (
          activityLog.slice(0, 12).map((item) => (
            <details key={item.id} className="group rounded-lg border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 truncate text-sm font-bold text-slate-900">{item.title}</span>
                <span className="shrink-0 text-xs font-bold text-slate-500">{formatDateTime(item.createdAt)}</span>
              </summary>
              <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {item.entityType} • {item.action}
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.detail}</p>
                <p className="mt-3 text-xs font-bold text-blue-600">Đã ghi nhận trong nhật ký hệ thống</p>
              </div>
            </details>
          ))
        )}
      </div>
    </section>
  );
}
