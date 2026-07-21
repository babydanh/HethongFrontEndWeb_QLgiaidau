'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Search, Ban, ShieldAlert, CheckCircle2, UserCheck, AlertTriangle, ShieldCheck, X, Calendar } from 'lucide-react';
import type { ApiResponse } from '@/types/api';

interface UserItem {
  id: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
  profile: {
    fullName: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  activeBan?: {
    banType: 'WARN' | 'SOFT_BAN' | 'HARD_BAN';
    reason: string;
    expiresAt?: string;
  };
}

export default function ModerationPage() {
  type BanType = 'WARN' | 'SOFT_BAN' | 'HARD_BAN';
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<BanType>('SOFT_BAN');
  const [banReason, setBanReason] = useState('');
  const [banDurationDays, setBanDurationDays] = useState('7');
  const [processing, setProcessing] = useState(false);

  const fetchUsers = async (searchTerm = '', showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Find all users from admin user endpoint
      const response = await api.get<ApiResponse<UserItem[]>>(`/users?limit=20&search=${searchTerm}`);
      // Drizzle returns items. We might need to map or check if there is an active ban in response.
      // For presentation, we will check if the user is banned.
      setUsers(response.data || []);
    } catch (error: unknown) {
      console.error(error);
      toast.error('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchUsers('', false);
    });
  }, []);

  const parseDate = (str: string): Date | null => {
    const p = str.split('/');
    if (p.length !== 3) return null;
    const d = parseInt(p[0], 10), m = parseInt(p[1], 10) - 1, y = parseInt(p[2], 10);
    return isNaN(d) || isNaN(m) || isNaN(y) ? null : new Date(y, m, d);
  };

  const filteredUsers = users.filter(u => {
    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;
    if (!fromDate && !toDate) return true;
    const itemDate = new Date(u.createdAt);
    if (fromDate && itemDate < fromDate) return false;
    if (toDate) { const end = new Date(toDate); end.setHours(23, 59, 59, 999); if (itemDate > end) return false; }
    return true;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleBanSubmit = async () => {
    if (!selectedUser || !banReason.trim()) {
      toast.error('Vui lòng nhập lý do phạt/khóa');
      return;
    }
    setProcessing(true);
    try {
      let expiresAt: string | undefined;
      if (banType === 'SOFT_BAN') {
        const days = parseInt(banDurationDays, 10);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      await api.post(`/admin/users/${selectedUser.id}/ban`, {
        reason: banReason.trim(),
        banType,
        expiresAt,
      });

      toast.success(`Đã áp dụng chế tài ${banType} thành công!`);
      setShowBanModal(false);
      setBanReason('');
      setSelectedUser(null);
      fetchUsers(search);
    } catch (error: unknown) {
      console.error(error);
      toast.error('Lỗi khi phạt/khóa tài khoản');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnban = async (userId: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      await api.post(`/admin/users/${userId}/unban`);
      toast.success('Đã mở khóa tài khoản người dùng thành công!');
      fetchUsers(search);
    } catch (error: unknown) {
      console.error(error);
      toast.error('Lỗi khi mở khóa tài khoản');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (user: UserItem) => {
    if (user.activeBan) {
      const ban = user.activeBan;
      if (ban.banType === 'HARD_BAN') {
        return <span className="bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-red-200">Khóa Vĩnh Viễn</span>;
      }
      if (ban.banType === 'SOFT_BAN') {
        return <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-200">Khóa Tạm Thời</span>;
      }
      return <span className="bg-yellow-50 text-yellow-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-yellow-200">Cảnh Cáo</span>;
    }
    return <span className="bg-emerald-50 text-emerald-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">Hoạt Động</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Bảng Điều Phối Moderation</h2>
        <p className="text-slate-500 text-sm">Quản lý vi phạm, cảnh cáo, khóa tài khoản người dùng hoặc tước Sao Uy Tín.</p>
      </div>

      {/* Search Bar + Date Filter */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-slate-200 focus:border-blue-500 rounded-lg pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors">Tìm kiếm</button>
        </form>
        <div className="flex items-center gap-2 min-w-[130px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Từ ngày (dd/mm/yyyy)" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400" />
        </div>
        <div className="flex items-center gap-2 min-w-[130px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Đến ngày (dd/mm/yyyy)" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400" />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500 space-y-1 shadow-sm">
          <p className="text-base font-medium text-slate-800">Không tìm thấy người dùng nào</p>
          <p className="text-xs text-slate-500">Hãy thử tìm với từ khóa khác.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Người dùng</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Ngày tạo</th>
                  <th className="p-4">Sao Uy Tín</th>
                  <th className="p-4 pr-6 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {filteredUsers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-all duration-150">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
                          {item.profile?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{item.profile?.fullName || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(item)}</td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-4">
                      {item.profile?.isVerified ? (
                        <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                          <ShieldCheck className="w-4 h-4" />
                          Đã xác minh
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Chưa xác minh</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.activeBan ? (
                          <Button
                            onClick={() => handleUnban(item.id)}
                            disabled={processing}
                            variant="success"
                            size="sm"
                            className="text-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Gỡ phạt
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedUser(item);
                              setShowBanModal(true);
                            }}
                            disabled={processing}
                            variant="destructive"
                            size="sm"
                            className="text-xs"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Xử phạt
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Áp Dụng Chế Tài Xử Phạt
              </h3>
              <button 
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                }}
                className="text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Người dùng</p>
                <p className="text-sm font-semibold text-slate-800">{selectedUser.profile?.fullName}</p>
                <p className="text-xs text-slate-500">{selectedUser.email}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Hình thức xử phạt</label>
                <select
                  value={banType}
                  onChange={(e) => setBanType(e.target.value as BanType)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="WARN">Cảnh cáo (Gửi thông báo)</option>
                  <option value="SOFT_BAN">Khóa tạm thời (Soft Ban)</option>
                  <option value="HARD_BAN">Khóa vĩnh viễn (Hard Ban)</option>
                </select>
              </div>

              {banType === 'SOFT_BAN' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Thời hạn khóa</label>
                  <select
                    value={banDurationDays}
                    onChange={(e) => setBanDurationDays(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="7">7 ngày</option>
                    <option value="15">15 ngày</option>
                    <option value="30">30 ngày</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Lý do vi phạm</label>
                <textarea
                  rows={4}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Mô tả hành vi vi phạm điều lệ..."
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors resize-none"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <Button
                onClick={handleBanSubmit}
                disabled={processing || !banReason.trim()}
                variant="destructive"
                className="text-xs"
              >
                Xác nhận phạt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
