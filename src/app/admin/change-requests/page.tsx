'use client';

import { useEffect, useState } from 'react';
import { usersApi } from '@/features/users/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { toast } from 'react-hot-toast';
import { Check, X, Calendar, Mail, User, ClipboardList, Loader2 } from 'lucide-react';
import type { UserChangeRequest } from '@/types/user';
import { getErrorMessage } from '@/utils/error';

export default function AdminChangeRequestsPage() {
  const { user } = useAuthStore();
  const isModeratorOnly =
    Boolean(user?.roles?.includes('MODERATOR')) && !user?.roles?.includes('ADMIN');
  const [requests, setRequests] = useState<UserChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<UserChangeRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async (status = filterStatus) => {
    try {
      const res = await usersApi.getAdminChangeRequests({ status });
      setRequests(res || []);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách yêu cầu thay đổi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(filterStatus);
  }, [filterStatus]);

  const parseDate = (str: string): Date | null => {
    const p = str.split('/');
    if (p.length !== 3) return null;
    const d = parseInt(p[0], 10), m = parseInt(p[1], 10) - 1, y = parseInt(p[2], 10);
    return isNaN(d) || isNaN(m) || isNaN(y) ? null : new Date(y, m, d);
  };

  const filteredRequests = requests.filter(r => {
    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;
    if (!fromDate && !toDate) return true;
    const itemDate = new Date(r.createdAt);
    if (fromDate && itemDate < fromDate) return false;
    if (toDate) { const end = new Date(toDate); end.setHours(23, 59, 59, 999); if (itemDate > end) return false; }
    return true;
  });

  const handleFilterChange = (status: string) => {
    setLoading(true);
    setFilterStatus(status);
  };

  const handleOpenActionModal = (req: UserChangeRequest, type: 'APPROVE' | 'REJECT') => {
    setSelectedRequest(req);
    setActionType(type);
    setAdminNote('');
    setIsNoteModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      if (actionType === 'APPROVE') {
        await usersApi.approveChangeRequest(selectedRequest.id, { adminNote: adminNote.trim() || undefined });
        toast.success('Đã phê duyệt yêu cầu thành công');
      } else {
        await usersApi.rejectChangeRequest(selectedRequest.id, { adminNote: adminNote.trim() || undefined });
        toast.success('Đã từ chối yêu cầu thành công');
      }
      setIsNoteModalOpen(false);
      setSelectedRequest(null);
      setLoading(true);
      fetchRequests();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi xử lý yêu cầu'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Duyệt thay đổi thông tin</h2>
          <p className="text-slate-500 text-sm">
            {isModeratorOnly
              ? 'Người điều phối xác minh các yêu cầu thay đổi giới tính hoặc email nhạy cảm của người chơi.'
              : 'Xem xét và phê duyệt các yêu cầu thay đổi giới tính hoặc email nhạy cảm của người chơi.'}
          </p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 self-start">
          <button
            onClick={() => handleFilterChange('PENDING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all ${
              filterStatus === 'PENDING' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Đang chờ
          </button>
          <button
            onClick={() => handleFilterChange('APPROVED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all ${
              filterStatus === 'APPROVED' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Đã duyệt
          </button>
          <button
            onClick={() => handleFilterChange('REJECTED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all ${
              filterStatus === 'REJECTED' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Đã từ chối
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 min-w-[140px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Từ ngày (dd/mm/yyyy)" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400" />
        </div>
        <div className="flex items-center gap-2 min-w-[140px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Đến ngày (dd/mm/yyyy)" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2">
          <ClipboardList className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-medium text-slate-800">Không có yêu cầu nào được tìm thấy</p>
          <p className="text-xs text-slate-500">Các yêu cầu thay đổi thông tin của người chơi hiện đang trống.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Người chơi</th>
                  <th className="p-4">Loại yêu cầu</th>
                  <th className="p-4">Giá trị cũ</th>
                  <th className="p-4">Giá trị mới</th>
                  <th className="p-4">Ngày gửi</th>
                  {filterStatus !== 'PENDING' && (
                    <th className="p-4">{isModeratorOnly ? 'Ghi chú xử lý' : 'Ghi chú admin'}</th>
                  )}
                  {filterStatus === 'PENDING' && <th className="p-4 pr-6 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-all duration-150">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase overflow-hidden">
                          {req.user?.profile?.avatarUrl ? (
                            <img src={req.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{req.user?.profile?.fullName || 'Người chơi'}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {req.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        req.requestType === 'GENDER' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {req.requestType === 'GENDER' ? 'Giới tính' : 'Email'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700">{req.oldValue}</td>
                    <td className="p-4 font-bold text-slate-900 bg-blue-50/20">{req.newValue}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    {filterStatus !== 'PENDING' && (
                      <td className="p-4">
                        <span className="text-xs text-slate-500 italic">{req.adminNote || 'Không có ghi chú'}</span>
                      </td>
                    )}
                    {filterStatus === 'PENDING' && (
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenActionModal(req, 'APPROVE')}
                            className="bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(req, 'REJECT')}
                            className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            Từ chối
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve/Reject Confirmation Modal with optional note */}
      {isNoteModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {actionType === 'APPROVE' ? 'Duyệt yêu cầu thay đổi' : 'Từ chối yêu cầu thay đổi'}
              </h3>
              <button 
                onClick={() => {
                  setIsNoteModalOpen(false);
                  setSelectedRequest(null);
                }}
                className="text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 space-y-1">
                <p><strong>Người gửi:</strong> {selectedRequest.user?.profile?.fullName || 'Người chơi'} ({selectedRequest.user?.email})</p>
                <p><strong>Loại:</strong> {selectedRequest.requestType === 'GENDER' ? 'Thay đổi giới tính' : 'Thay đổi Email'}</p>
                <p><strong>Giá trị cũ:</strong> {selectedRequest.oldValue}</p>
                <p><strong>Giá trị mới:</strong> {selectedRequest.newValue}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {isModeratorOnly ? 'Ghi chú xử lý (Tùy chọn)' : 'Ghi chú của admin (Tùy chọn)'}
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    isModeratorOnly ? 'Nhập phản hồi xử lý...' : 'Nhập phản hồi của admin...'
                  }
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors resize-none"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsNoteModalOpen(false);
                  setSelectedRequest(null);
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={processing}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition-all ${
                  actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 inline" /> : null}
                {actionType === 'APPROVE' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
