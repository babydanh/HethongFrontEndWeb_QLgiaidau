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
            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <span className="text-xs font-bold text-slate-500">{formatDateTime(item.createdAt)}</span>
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                {item.entityType} • {item.action}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600">{item.detail}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
