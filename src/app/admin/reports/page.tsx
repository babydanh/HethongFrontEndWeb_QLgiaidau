'use client';

import { ChevronLeft, ChevronRight, Eye, Loader2, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { reportsApi } from '@/features/reports/api';
import { ReportFiltersBar } from '@/features/reports/components/ReportFiltersBar';
import { ReportReviewModal } from '@/features/reports/components/ReportReviewModal';
import { ReportStatusBadge } from '@/features/reports/components/ReportStatusBadge';
import {
  REPORT_CATEGORY_LABELS,
  REPORT_SOURCE_LABELS,
  REPORT_TARGET_LABELS,
} from '@/features/reports/constants';
import type { ReportFilters, ViolationReport } from '@/features/reports/types';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';

const INITIAL_FILTERS: ReportFilters = { page: 1, limit: 10 };

export default function ReportsPage() {
  const { user } = useAuthStore();
  const isModeratorOnly = Boolean(user?.roles?.includes('MODERATOR')) && !user?.roles?.includes('ADMIN');
  const [filters, setFilters] = useState<ReportFilters>(INITIAL_FILTERS);
  const [reports, setReports] = useState<ViolationReport[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState<ViolationReport | null>(null);
  const cursorByPageRef = useRef<Record<number, string | null>>({ 1: null });
  const filterKeyRef = useRef('');

  useEffect(() => {
    const nextFilterKey = JSON.stringify({ ...filters, page: undefined });
    if (filterKeyRef.current !== nextFilterKey) {
      filterKeyRef.current = nextFilterKey;
      cursorByPageRef.current = { 1: null };
      if (filters.page !== 1) {
        setFilters((value) => ({ ...value, page: 1 }));
        return;
      }
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await reportsApi.list({
          ...filters,
          cursor: cursorByPageRef.current[filters.page] ?? undefined,
        });
        if (!active) return;
        setReports(response.data ?? []);
        setTotalPages(response.meta?.totalPages ?? 1);
        cursorByPageRef.current[filters.page + 1] = response.meta?.nextCursor ?? null;
      } catch (error: unknown) {
        if (active) toast.error(getErrorMessage(error) || 'Không thể tải danh sách báo cáo.');
      } finally {
        if (active) setLoading(false);
      }
    }, filters.search ? 300 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [filters, reloadKey]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Hàng đợi an toàn</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-950">
            {isModeratorOnly ? 'Điều phối báo cáo vi phạm' : 'Quản lý báo cáo vi phạm'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Phân loại, xác minh và chuyển cấp theo mức độ. Moderator không áp dụng khóa tài chính hoặc chế tài vĩnh viễn.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          {reports.length} hồ sơ trong trang này
        </div>
      </header>

      <ReportFiltersBar filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">Không có hồ sơ phù hợp</h3>
          <p className="mt-2 text-sm text-slate-500">Thử bỏ bớt bộ lọc hoặc chọn khoảng thời gian khác.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-4">Người gửi</th><th className="p-4">Đối tượng</th><th className="p-4">Phân loại</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Xử lý</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr key={report.id} onClick={() => setSelectedReport(report)} className="hover:bg-slate-50/70 cursor-pointer transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{report.reporter?.fullName ?? 'Không xác định'}</p>
                      <p className="text-xs text-slate-500">{report.reporter?.email}</p>
                      {report.source ? <p className="mt-1 text-[11px] font-semibold text-slate-400">{REPORT_SOURCE_LABELS[report.source]}</p> : null}
                    </td>
                    <td className="p-4"><p className="font-semibold text-slate-900">{report.target?.name ?? report.targetUser?.fullName ?? report.targetTournament?.name ?? report.targetId?.slice(0, 8) ?? 'N/A'}</p><p className="text-xs text-slate-500">{REPORT_TARGET_LABELS[report.targetType]}</p></td>
                    <td className="p-4"><p className="font-semibold text-slate-800">{REPORT_CATEGORY_LABELS[report.category]}</p></td>
                    <td className="p-4"><ReportStatusBadge status={report.status} /><p className="mt-2 text-xs text-slate-400">{new Date(report.createdAt).toLocaleString('vi-VN')}</p></td>
                    <td className="p-4 text-right"><Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}><Eye className="mr-2 h-4 w-4" />Xử lý</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 lg:hidden">
            {reports.map((report) => (
              <article key={report.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3"><ReportStatusBadge status={report.status} /><span className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleDateString('vi-VN')}</span></div>
                <div>
                  <p className="font-bold text-slate-950">{report.target?.name ?? report.targetUser?.fullName ?? report.targetTournament?.name ?? report.targetId?.slice(0, 8) ?? 'N/A'}</p>
                  <p className="text-xs text-slate-500">{REPORT_TARGET_LABELS[report.targetType]} · {REPORT_CATEGORY_LABELS[report.category]}</p>
                  {report.source ? <p className="mt-1 text-[11px] font-semibold text-slate-400">{REPORT_SOURCE_LABELS[report.source]}</p> : null}
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-slate-600">{report.reason}</p>
                <Button className="w-full" variant="outline" onClick={() => setSelectedReport(report)}>Mở hồ sơ xử lý</Button>
              </article>
            ))}
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" disabled={filters.page === 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-semibold text-slate-600">Trang {filters.page}/{totalPages}</span>
          <Button variant="outline" size="icon" disabled={filters.page === totalPages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      ) : null}

      <ReportReviewModal
        report={selectedReport}
        open={Boolean(selectedReport)}
        isModeratorOnly={isModeratorOnly}
        onOpenChange={(open) => { if (!open) setSelectedReport(null); }}
        onCompleted={() => setReloadKey((value) => value + 1)}
      />
    </div>
  );
}

