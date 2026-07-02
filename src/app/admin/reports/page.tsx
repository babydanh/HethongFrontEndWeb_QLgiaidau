'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { toast } from 'react-hot-toast';
import type { ApiResponse } from '@/types/api';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  User, 
  Trophy, 
  ExternalLink,
  Loader2,
  Lock,
  Unlock,
  AlertOctagon,
  Calendar,
  FileText
} from 'lucide-react';

interface ReporterInfo {
  id: string;
  email: string;
  fullName: string;
}

interface TargetUserInfo {
  id: string;
  email: string;
  fullName: string;
}

interface TargetTournamentInfo {
  id: string;
  name: string;
  status: string;
}

interface ReportItem {
  id: string;
  targetType: 'USER' | 'TOURNAMENT';
  targetId: string;
  reason: string;
  evidenceUrls: string[];
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
  reporter: ReporterInfo;
  targetUser?: TargetUserInfo;
  targetTournament?: TargetTournamentInfo;
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const isModeratorOnly =
    Boolean(user?.roles?.includes('MODERATOR')) && !user?.roles?.includes('ADMIN');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  
  // Modal states
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchReports = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await api.get<ApiResponse<ReportItem[]>>(`/admin/reports?page=${page}&limit=10`);
      setReports(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error) {
      console.error(error);
      toast.error('Không thể lấy danh sách báo cáo vi phạm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReports(page === 1 ? false : true);
    }, 0);
    return () => clearTimeout(timer);
  }, [page]);

  const handleResolveSubmit = async (status: 'RESOLVED' | 'REJECTED') => {
    if (!selectedReport) return;
    if (!resolutionNote.trim()) {
      toast.error('Vui lòng nhập ghi chú giải quyết');
      return;
    }
    
    setProcessing(true);
    try {
      await api.post(`/admin/reports/${selectedReport.id}/resolve`, {
        status,
        resolutionNote: resolutionNote.trim(),
      });
      toast.success(status === 'RESOLVED' ? 'Đã phê duyệt báo cáo!' : 'Đã bác bỏ báo cáo!');
      setShowResolveModal(false);
      setResolutionNote('');
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật trạng thái báo cáo');
    } finally {
      setProcessing(false);
    }
  };

  const handleTournamentAction = async (action: 'suspend' | 'unsuspend' | 'ban') => {
    if (!selectedReport || selectedReport.targetType !== 'TOURNAMENT') return;
    
    const confirmMsg = 
      action === 'suspend' ? 'Bạn có chắc chắn muốn tạm đình chỉ giải đấu này?' :
      action === 'unsuspend' ? 'Bạn có chắc chắn muốn khôi phục hoạt động giải đấu này?' :
      'CẢNH BÁO: Bạn có chắc chắn muốn HỦY và CẤM vĩnh viễn giải đấu này? Hành động này không thể hoàn tác!';
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post<ApiResponse<{ status: string }>>(
        `/admin/tournaments/${selectedReport.targetId}/${action}`,
      );
      toast.success(
        action === 'suspend' ? 'Đã tạm đình chỉ giải đấu!' :
        action === 'unsuspend' ? 'Đã khôi phục hoạt động giải đấu!' : 
        'Đã cấm/hủy giải đấu vĩnh viễn!'
      );
      
      // Update local state for the tournament status if listed
      if (selectedReport.targetTournament) {
        const newStatus =
          response.data?.status ||
          (action === 'suspend' ? 'SUSPENDED' : action === 'unsuspend' ? 'ONGOING' : 'CANCELLED');

        setSelectedReport(prev => prev ? {
          ...prev,
          targetTournament: prev.targetTournament ? {
            ...prev.targetTournament,
            status: newStatus
          } : undefined
        } : null);

        setReports(prev => prev.map(report => {
          if (report.id === selectedReport.id && report.targetTournament) {
            return {
              ...report,
              targetTournament: {
                ...report.targetTournament,
                status: newStatus
              }
            };
          }
          return report;
        }));
      }
      
      fetchReports();
    } catch (error) {
      console.error(error);
      toast.error('Không thể thực hiện hành động trên giải đấu');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-200">Đang chờ xử lý</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">Đã phê duyệt</span>;
      case 'REJECTED':
        return <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">Đã bác bỏ</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">{status}</span>;
    }
  };

  const getTournamentStatusBadge = (status: string) => {
    switch (status) {
      case 'SUSPENDED':
        return <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-medium border border-red-200">Tạm đình chỉ</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-medium border border-rose-200">Đã cấm/hủy</span>;
      case 'ONGOING':
        return <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-medium border border-emerald-200">Đang diễn ra</span>;
      default:
        return <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-medium border border-blue-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {isModeratorOnly ? 'Điều phối báo cáo vi phạm' : 'Quản lý báo cáo vi phạm'}
        </h2>
        <p className="text-slate-500 text-sm">
          {isModeratorOnly
            ? 'Người điều phối đọc hồ sơ tố cáo, chốt kết luận ban đầu và chuyển admin khi cần chế tài nặng.'
            : 'Xem và xử lý báo cáo tố cáo từ người dùng đối với các tài khoản vi phạm hoặc giải đấu không hợp lệ.'}
        </p>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách báo cáo...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-slate-800">Không có báo cáo vi phạm nào</p>
          <p className="text-xs text-slate-500">Hệ thống đang hoạt động ổn định và an toàn.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Người tố cáo</th>
                  <th className="p-4">Đối tượng bị tố cáo</th>
                  <th className="p-4">Lý do</th>
                  <th className="p-4">Minh chứng</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {reports.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div>
                        <p className="font-semibold text-slate-800">{item.reporter?.fullName || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{item.reporter?.email}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      {item.targetType === 'USER' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase">Thành viên</span>
                            <p className="font-semibold text-slate-800 mt-0.5">{item.targetUser?.fullName || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{item.targetUser?.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <Trophy className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="bg-purple-50 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase">Giải đấu</span>
                            <p className="font-semibold text-slate-800 mt-0.5">{item.targetTournament?.name || 'N/A'}</p>
                            {item.targetTournament && (
                              <div className="mt-1">
                                {getTournamentStatusBadge(item.targetTournament.status)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="text-slate-700 font-medium line-clamp-2">{item.reason}</p>
                    </td>
                    <td className="p-4">
                      {item.evidenceUrls && item.evidenceUrls.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {item.evidenceUrls.map((url, idx) => (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-8 h-8 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 hover:border-blue-400 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Không đính kèm</span>
                      )}
                    </td>
                    <td className="p-4">{getStatusBadge(item.status)}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(item);
                          setResolutionNote(item.resolutionNote || '');
                          setShowResolveModal(true);
                        }}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Chi tiết / Xử lý
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Trước
              </button>
              <span className="text-xs text-slate-500 font-medium">Trang {page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail & Resolve Modal */}
      {showResolveModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-500" />
                Chi Tiết Báo Cáo Vi Phạm
              </h3>
              <button 
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedReport(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <EyeOff className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Reporter and Target info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Người tố cáo</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selectedReport.reporter?.fullName}</p>
                  <p className="text-xs text-slate-500">{selectedReport.reporter?.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đối tượng bị tố cáo</p>
                  {selectedReport.targetType === 'USER' ? (
                    <>
                      <p className="text-sm font-bold text-slate-800 mt-1">{selectedReport.targetUser?.fullName}</p>
                      <p className="text-xs text-slate-500">{selectedReport.targetUser?.email}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-800 mt-1">{selectedReport.targetTournament?.name}</p>
                      {selectedReport.targetTournament && (
                        <div className="mt-1">
                          {getTournamentStatusBadge(selectedReport.targetTournament.status)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lý do báo cáo</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedReport.reason}
                </div>
              </div>

              {/* Evidence Urls */}
              {selectedReport.evidenceUrls && selectedReport.evidenceUrls.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Minh chứng đính kèm</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.evidenceUrls.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 font-medium bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ảnh bằng chứng #{idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tournament Special Moderation Actions */}
              {!isModeratorOnly && selectedReport.targetType === 'TOURNAMENT' && selectedReport.status === 'PENDING' && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Chế tài khẩn cấp đối với giải đấu
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedReport.targetTournament?.status !== 'SUSPENDED' ? (
                      <button
                        onClick={() => handleTournamentAction('suspend')}
                        disabled={processing}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Đình chỉ
                      </button>
                    ) : (
                      <button
                        onClick={() => handleTournamentAction('unsuspend')}
                        disabled={processing}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Mở đình chỉ
                      </button>
                    )}

                    <button
                      onClick={() => handleTournamentAction('ban')}
                      disabled={processing || selectedReport.targetTournament?.status === 'CANCELLED'}
                      className="col-span-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cấm / Hủy giải vĩnh viễn
                    </button>
                  </div>
                </div>
              )}

              {/* Resolution Form or Saved resolution details */}
              {selectedReport.status === 'PENDING' ? (
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biên bản xử lý báo cáo</label>
                  <textarea
                    rows={3}
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder={
                      isModeratorOnly
                        ? 'Ghi rõ kết luận xác minh, mức độ vi phạm và đề xuất chuyển admin nếu cần chế tài nặng...'
                        : 'Ghi rõ hành động xử lý (Cảnh cáo, Đóng giải đấu, khóa tài khoản người tố cáo hay bỏ qua báo cáo)...'
                    }
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-3 border-t border-slate-100 pt-4 bg-slate-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2">
                    {selectedReport.status === 'RESOLVED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-xs font-bold text-slate-800">
                      {selectedReport.status === 'RESOLVED' ? 'Báo cáo được PHÊ DUYỆT' : 'Báo cáo bị BÁC BỎ'}
                    </span>
                  </div>
                  {selectedReport.resolutionNote && (
                    <div className="text-xs text-slate-600 italic">
                      Ghi chú: &quot;{selectedReport.resolutionNote}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedReport.status === 'PENDING' && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedReport(null);
                  }}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleResolveSubmit('REJECTED')}
                  disabled={processing || !resolutionNote.trim()}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  Bác bỏ báo cáo
                </button>
                <button
                  onClick={() => handleResolveSubmit('RESOLVED')}
                  disabled={processing || !resolutionNote.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  Xác nhận vi phạm
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
