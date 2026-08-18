'use client';

import { ChevronLeft, ChevronRight, ExternalLink, FileWarning, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ReportStatusBadge } from '@/features/reports/components/ReportStatusBadge';
import { REPORT_CATEGORY_LABELS, REPORT_TARGET_LABELS } from '@/features/reports/constants';
import { reportsApi } from '@/features/reports/api';
import type { ViolationReport } from '@/features/reports/types';
import { getErrorMessage } from '@/utils/error';

function targetHref(report: ViolationReport): string | null {
  if (report.targetType === 'USER') return `/users/${report.targetId}`;
  if (report.targetType === 'TOURNAMENT') return `/tournaments/${report.targetId}`;
  if (report.targetType === 'MATCH') return `/live/${report.targetId}`;
  if (report.targetType === 'COMMUNITY') return `/communities/${report.targetId}`;
  return null;
}

export default function MyReportsPage() {
  const translate = useTranslations('Common');
  const [reports, setReports] = useState<ViolationReport[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const cursorByPageRef = useRef<Record<number, string | null>>({ 1: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadReports = async () => {
      setLoading(true);
      try {
        const response = await reportsApi.getMine({ limit: 10, cursor: cursorByPageRef.current[page] ?? null });
        if (!active) return;
        setReports(response.data ?? []);
        setTotalPages(response.meta?.totalPages ?? 1);
        cursorByPageRef.current[page + 1] = response.meta?.nextCursor ?? null;
      } catch (error: unknown) {
        if (active) toast.error(getErrorMessage(error) || translate('loadReportsFailed'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadReports();
    return () => { active = false; };
  }, [page, translate]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">{translate('myReportsKicker')}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">{translate('myReportsTitle')}</h1>
            <p className="mt-2 text-sm text-slate-600">{translate('myReportsSubtitle')}</p>
          </div>
          <Button asChild variant="outline"><Link href="/dashboard">{translate('backToProfile')}</Link></Button>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <FileWarning className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">Bạn chưa gửi báo cáo nào</h2>
            <p className="mt-2 text-sm text-slate-500">Nút Báo cáo có tại hồ sơ thành viên, giải đấu, trận đấu và câu lạc bộ.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const href = targetHref(report);
              return (
                <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ReportStatusBadge status={report.status} />
                        <span className="text-xs font-semibold text-slate-500">{REPORT_TARGET_LABELS[report.targetType]}</span>
                        <span className="text-xs font-semibold text-slate-500">{REPORT_CATEGORY_LABELS[report.category]}</span>
                      </div>
                      <h2 className="mt-3 font-bold text-slate-950">{report.target?.name ?? `Mã đối tượng ${report.targetId?.slice(0, 8) ?? 'N/A'}`}</h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{report.reason}</p>
                      <p className="mt-3 text-xs text-slate-400">Gửi lúc {new Date(report.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    {href ? (
                      <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800">
                        Xem đối tượng <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                  {report.resolutionNote ? (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <strong>Kết luận:</strong> {report.resolutionNote}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((value) => value - 1)} aria-label="Trang trước">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-600">{translate('reportPageCount', { page, totalPages })}</span>
            <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} aria-label="Trang sau">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

