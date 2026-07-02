'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, FileText, Loader2, RotateCcw, Scale, X } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { toast } from 'react-hot-toast';
import type { ApiResponse } from '@/types/api';

interface DisputeListItem {
  dispute: {
    id: string;
    matchId: string;
    reason: string;
    evidenceUrls: string[];
    status: 'OPEN' | 'RESOLVED';
    resolutionNote?: string | null;
    createdAt: string;
    resolvedAt?: string | null;
  };
  match: {
    id: string;
    roundNumber: number;
    matchOrder: number;
    status: string;
    p1SetsWon: number;
    p2SetsWon: number;
    scoreDetails?: Record<string, unknown> | null;
  };
  filedByUser: {
    id: string;
    email: string;
    fullName: string;
  };
}

interface MatchValuesSnapshot {
  scoreDetails?: Record<string, unknown> | null;
  p1SetsWon?: number | null;
  p2SetsWon?: number | null;
  winnerId?: string | null;
  status?: string | null;
  completedAt?: string | null;
}

interface DisputeDiffResponse {
  dispute: {
    id: string;
    reason: string;
    evidenceUrls: string[];
    status: 'OPEN' | 'RESOLVED';
    resolutionNote?: string | null;
    createdAt: string;
  };
  match: {
    id: string;
    status: string;
    p1SetsWon: number;
    p2SetsWon: number;
    scoreDetails?: Record<string, unknown> | null;
    p1Name: string;
    p2Name: string;
    roundNumber: number;
    matchOrder: number;
  };
  originalValues: MatchValuesSnapshot | null;
  modifier: {
    fullName?: string | null;
    email?: string | null;
    updatedAt: string;
  } | null;
}

interface ScoreSetRow {
  team1Score: number;
  team2Score: number;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Chưa có';
  }

  return new Date(value).toLocaleString('vi-VN');
}

function extractSetRows(scoreDetails?: Record<string, unknown> | null): ScoreSetRow[] {
  if (!scoreDetails || typeof scoreDetails !== 'object') {
    return [];
  }

  const rawSets = scoreDetails.sets;
  if (!Array.isArray(rawSets)) {
    return [];
  }

  return rawSets
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const team1Score = Number((item as { team1Score?: unknown }).team1Score);
      const team2Score = Number((item as { team2Score?: unknown }).team2Score);

      if (Number.isNaN(team1Score) || Number.isNaN(team2Score)) {
        return null;
      }

      return { team1Score, team2Score };
    })
    .filter((item): item is ScoreSetRow => item !== null);
}

function renderScoreSummary(snapshot: MatchValuesSnapshot | null | undefined, fallbackLabel = 'Chưa có tỉ số') {
  if (!snapshot) {
    return fallbackLabel;
  }

  const setRows = extractSetRows(snapshot.scoreDetails);
  if (setRows.length === 0) {
    return `${snapshot.p1SetsWon ?? 0} - ${snapshot.p2SetsWon ?? 0}`;
  }

  return setRows.map((set) => `${set.team1Score}-${set.team2Score}`).join(' • ');
}

export default function AdminDisputesPage() {
  const { user } = useAuthStore();
  const isModeratorOnly =
    Boolean(user?.roles?.includes('MODERATOR')) && !user?.roles?.includes('ADMIN');
  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<DisputeDiffResponse | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchDisputes = async (targetPage = page, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await api.get<ApiResponse<DisputeListItem[]>>(
        `/admin/disputes?page=${targetPage}&limit=10`,
      );
      setDisputes(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách tranh chấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDisputes(page, page > 1);
  }, [page]);

  const openCount = useMemo(
    () => disputes.filter((item) => item.dispute.status === 'OPEN').length,
    [disputes],
  );

  const handleOpenDiff = async (disputeId: string) => {
    setSelectedDisputeId(disputeId);
    setSelectedDiff(null);
    setResolutionNote('');
    setLoadingDiff(true);

    try {
      const response = await api.get<ApiResponse<DisputeDiffResponse>>(`/admin/disputes/${disputeId}/diff`);
      setSelectedDiff(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải chi tiết tranh chấp');
      setSelectedDisputeId(null);
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleRevert = async () => {
    if (!selectedDisputeId || !resolutionNote.trim()) {
      toast.error('Vui lòng nhập kết luận xử lý');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/admin/disputes/${selectedDisputeId}/revert`, {
        resolutionNote: resolutionNote.trim(),
      });
      toast.success('Đã khôi phục kết quả gốc và đóng tranh chấp');
      setSelectedDisputeId(null);
      setSelectedDiff(null);
      setResolutionNote('');
      void fetchDisputes(page, false);
    } catch (error) {
      console.error(error);
      toast.error('Không thể khôi phục kết quả trận');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quản lý tranh chấp trận đấu</h2>
          <p className="text-sm text-slate-500">
            {isModeratorOnly
              ? 'Người điều phối theo dõi chênh lệch kết quả để xác minh tranh chấp trước khi chuyển admin xử lý.'
              : 'Admin xem chênh lệch giữa kết quả hiện tại và dữ liệu gốc, sau đó quyết định khôi phục nếu phát hiện sai lệch.'}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-500">Đang mở</p>
          <p className="mt-1 text-2xl font-black text-rose-700">{openCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-500">Đang tải danh sách tranh chấp...</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <Scale className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-base font-semibold text-slate-800">Chưa có tranh chấp nào</p>
          <p className="mt-1 text-xs text-slate-500">Khi có trận bị khiếu nại, admin sẽ xử lý tại đây.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="p-4 pl-6">Tranh chấp</th>
                  <th className="p-4">Người gửi</th>
                  <th className="p-4">Tỉ số hiện tại</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {disputes.map((item) => (
                  <tr key={item.dispute.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">
                            Trận {item.match.roundNumber}-{item.match.matchOrder}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(item.dispute.createdAt)}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800">{item.dispute.reason}</p>
                        <p className="text-xs text-slate-500">
                          {item.dispute.evidenceUrls.length > 0
                            ? `${item.dispute.evidenceUrls.length} minh chứng đính kèm`
                            : 'Không có minh chứng đính kèm'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{item.filedByUser.fullName || 'Người dùng'}</p>
                      <p className="text-xs text-slate-500">{item.filedByUser.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">
                        {renderScoreSummary({
                          scoreDetails: item.match.scoreDetails ?? null,
                          p1SetsWon: item.match.p1SetsWon,
                          p2SetsWon: item.match.p2SetsWon,
                        })}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Trạng thái trận: {item.match.status}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                          item.dispute.status === 'OPEN'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {item.dispute.status === 'OPEN' ? 'Đang mở' : 'Đã xử lý'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => void handleOpenDiff(item.dispute.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 active:scale-95"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem chênh lệch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4">
              <button
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-xs font-medium text-slate-500">
                Trang {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          ) : null}
        </div>
      )}

      {selectedDisputeId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chi tiết tranh chấp</h3>
                <p className="text-xs text-slate-500">So sánh kết quả hiện tại với dữ liệu gốc trước khi bị chỉnh sửa.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedDisputeId(null);
                  setSelectedDiff(null);
                  setResolutionNote('');
                }}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingDiff || !selectedDiff ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-xs font-medium text-slate-500">Đang tải dữ liệu chênh lệch...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Trận đấu</p>
                      <p className="mt-2 font-semibold text-slate-800">
                        {selectedDiff.match.p1Name} vs {selectedDiff.match.p2Name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Vòng {selectedDiff.match.roundNumber} • Trận {selectedDiff.match.matchOrder}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">Kết quả hiện tại</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {renderScoreSummary({
                          scoreDetails: selectedDiff.match.scoreDetails ?? null,
                          p1SetsWon: selectedDiff.match.p1SetsWon,
                          p2SetsWon: selectedDiff.match.p2SetsWon,
                        })}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">Trạng thái: {selectedDiff.match.status}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Dữ liệu gốc</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {renderScoreSummary(selectedDiff.originalValues, 'Không tìm thấy lịch sử gốc')}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Trạng thái: {selectedDiff.originalValues?.status || 'Không có'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-bold text-slate-900">Nội dung khiếu nại</p>
                      <p className="mt-2 text-sm text-slate-700">{selectedDiff.dispute.reason}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedDiff.dispute.evidenceUrls.length > 0 ? (
                          selectedDiff.dispute.evidenceUrls.map((url, index) => (
                            <a
                              key={`${url}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Minh chứng #{index + 1}
                            </a>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">Không có minh chứng đính kèm</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-bold text-slate-900">Lịch sử sửa đổi đầu tiên</p>
                      {selectedDiff.modifier ? (
                        <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                          <p>
                            Người sửa: <span className="font-semibold">{selectedDiff.modifier.fullName || 'Không rõ'}</span>
                          </p>
                          <p>Email: {selectedDiff.modifier.email || 'Không có'}</p>
                          <p>Thời điểm: {formatDateTime(selectedDiff.modifier.updatedAt)}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">Chưa tìm thấy audit log tương ứng.</p>
                      )}
                    </div>
                  </div>

                  {isModeratorOnly ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <div>
                          <p className="font-semibold text-amber-800">Người điều phối chỉ được xem chênh lệch và xác minh hồ sơ.</p>
                          <p className="mt-1 text-sm text-amber-700">
                            Nếu cần hoàn nguyên kết quả hoặc tính lại ELO, chuyển case này cho admin xử lý.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
                          <div>
                            <p className="font-semibold text-rose-800">Khôi phục sẽ đưa trận về dữ liệu gốc và tính lại chuỗi ELO liên quan.</p>
                            <p className="mt-1 text-sm text-rose-700">
                              Chỉ thực hiện khi admin xác nhận kết quả hiện tại bị chỉnh sai hoặc xử lý tranh chấp cần hoàn nguyên.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-800">Kết luận xử lý</label>
                        <textarea
                          rows={4}
                          value={resolutionNote}
                          onChange={(event) => setResolutionNote(event.target.value)}
                          placeholder="Ví dụ: Xác nhận biên bản nhập sai, khôi phục kết quả gốc theo audit log đầu tiên."
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-6">
              <button
                onClick={() => {
                  setSelectedDisputeId(null);
                  setSelectedDiff(null);
                  setResolutionNote('');
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Đóng
              </button>
              {!isModeratorOnly ? (
                <button
                  onClick={() => void handleRevert()}
                  disabled={processing || loadingDiff || !selectedDiff || !resolutionNote.trim() || selectedDiff.dispute.status !== 'OPEN'}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {processing ? 'Đang khôi phục...' : 'Khôi phục kết quả gốc'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
