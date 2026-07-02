'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { toast } from 'react-hot-toast';
import type { ApiResponse } from '@/types/api';
import { Check, X, ShieldAlert, Eye, Calendar, Phone, Mail, User } from 'lucide-react';

interface VerificationTicket {
  id: string;
  userId: string;
  evidenceUrls: string[];
  contactPhone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
  createdAt: string;
}

interface TicketData {
  ticket: VerificationTicket;
  user: {
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export default function VerificationPage() {
  const { user } = useAuthStore();
  const isModeratorOnly =
    Boolean(user?.roles?.includes('MODERATOR')) && !user?.roles?.includes('ADMIN');
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await api.get<ApiResponse<TicketData[]>>('/admin/verification-tickets?status=PENDING');
      setTickets(response.data || []);
    } catch (error: unknown) {
      console.error(error);
      toast.error('Không thể lấy danh sách đơn xác minh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTickets(false);
    });
  }, []);

  const handleApprove = async (id: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      await api.patch(`/admin/verification-tickets/${id}/approve`);
      toast.success('Đã phê duyệt tài khoản thành công!');
      fetchTickets();
    } catch (error: unknown) {
      console.error(error);
      toast.error('Lỗi khi phê duyệt yêu cầu');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedTicket || !rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setProcessing(true);
    try {
      await api.patch(`/admin/verification-tickets/${selectedTicket.ticket.id}/reject`, {
        rejectReason: rejectReason.trim(),
      });
      toast.success('Đã từ chối yêu cầu xác minh');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error: unknown) {
      console.error(error);
      toast.error('Lỗi khi từ chối yêu cầu');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Duyệt Đơn &quot;Sao Uy Tín&quot;</h2>
          <p className="text-slate-500 text-sm">
            {isModeratorOnly
              ? 'Người điều phối kiểm tra hồ sơ minh chứng hoạt động và xử lý đơn xác minh đang chờ.'
              : 'Xem xét hồ sơ minh chứng hoạt động và cấp chứng nhận tài khoản uy tín.'}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 text-blue-600 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
          <ShieldAlert className="w-3.5 h-3.5" />
          Chỉ xem đơn PENDING
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2">
          <ShieldAlert className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-medium text-slate-800">Không có đơn xác minh nào cần duyệt</p>
          <p className="text-xs text-slate-500">Tất cả các đơn xin xác minh của người dùng đã được xử lý xong.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Người gửi</th>
                  <th className="p-4">Số điện thoại</th>
                  <th className="p-4">Ngày gửi</th>
                  <th className="p-4">Tài liệu minh chứng</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {tickets.map((item) => (
                  <tr key={item.ticket.id} className="hover:bg-slate-50 transition-all duration-150">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase overflow-hidden">
                          {item.user.avatarUrl ? (
                            <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{item.user.fullName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {item.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-xs font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {item.ticket.contactPhone}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.ticket.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2.5">
                        {item.ticket.evidenceUrls.map((url, index) => (
                          <a 
                            key={index} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Link #{index + 1}</span>
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(item.ticket.id)}
                          disabled={processing}
                          className="bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Duyệt
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTicket(item);
                            setShowRejectModal(true);
                          }}
                          disabled={processing}
                          className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Từ Chối Yêu Cầu Xác Minh</h3>
              <button 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Người gửi</p>
                <p className="text-sm font-semibold text-slate-800">{selectedTicket.user.fullName}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Lý do từ chối</label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết (ví dụ: Tài liệu minh chứng không đúng, ảnh bị lỗi...)"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors resize-none"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={processing || !rejectReason.trim()}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Gửi từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
