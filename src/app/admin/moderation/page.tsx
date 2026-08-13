'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { usersApi } from '@/features/users/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Search, Ban, UserCheck, AlertTriangle, ShieldCheck, X, Calendar, KeyRound, Loader2 } from 'lucide-react';
import type { ApiResponse } from '@/types/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { SystemRole } from '@/features/users/api';
import { getErrorMessage } from '@/utils/error';
import { useWatch } from 'react-hook-form';

interface UserItem {
  id: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
  roles?: SystemRole[];
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

const SYSTEM_ROLE_OPTIONS: ReadonlyArray<{ value: SystemRole; label: string }> = [
  { value: 'PLAYER', label: 'Vận động viên' },
  { value: 'REFEREE', label: 'Trọng tài' },
  { value: 'ORGANIZER', label: 'Ban tổ chức' },
  { value: 'MODERATOR', label: 'Điều phối viên' },
  { value: 'ADMIN', label: 'Quản trị viên' },
];
const systemRoleSchema = z.object({ roles: z.array(z.enum(['PLAYER', 'REFEREE', 'ORGANIZER', 'MODERATOR', 'ADMIN'])).min(1, 'Phải giữ ít nhất một vai trò.'), acknowledgeSensitive: z.boolean() });
type SystemRoleForm = z.infer<typeof systemRoleSchema>;

const roleLabel = (role: SystemRole): string =>
  SYSTEM_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

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
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleUser, setRoleUser] = useState<UserItem | null>(null);
  const [roleProcessing, setRoleProcessing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<SystemRole | 'ALL'>('ALL');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const { user: currentUser } = useAuthStore();
  const canManageSystemRoles = currentUser?.roles?.includes('ADMIN') === true;
  const roleForm = useForm<SystemRoleForm>({
    resolver: zodResolver(systemRoleSchema),
    defaultValues: { roles: ['PLAYER'], acknowledgeSensitive: false },
  });
  const selectedRoles = useWatch({ control: roleForm.control, name: 'roles' });

  const fetchUsers = async (searchTerm = '', showLoading = true, requestedRole: SystemRole | 'ALL' = roleFilter, append = false, cursor: string | null = null) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Find all users from admin user endpoint
      const params = new URLSearchParams({ limit: '20' });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (requestedRole !== 'ALL') params.set('role', requestedRole);
      if (append && cursor) params.set('cursor', cursor);
      const response = await api.get<ApiResponse<UserItem[]>>(`/users?${params.toString()}`);
      // Drizzle returns items. We might need to map or check if there is an active ban in response.
      // For presentation, we will check if the user is banned.
      const incoming = response.data || [];
      setUsers((current) => append ? [...current, ...incoming.filter((item) => !current.some((existing) => existing.id === item.id))] : incoming);
      setNextCursor(response.meta?.nextCursor ?? null);
      setHasMoreUsers(response.meta?.hasMore === true);
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
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNextCursor(null);
    fetchUsers(search, true, roleFilter);
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

  const openRoleModal = (user: UserItem) => {
    setRoleUser(user);
    roleForm.reset({ roles: Array.from(new Set(['PLAYER', ...(user.roles ?? [])])) as SystemRole[], acknowledgeSensitive: false });
    setShowRoleModal(true);
  };

  const handleRoleSubmit = roleForm.handleSubmit(async (values) => {
    if (!roleUser || !canManageSystemRoles) return;
    setRoleProcessing(true);
    try {
      const nextRoles = Array.from(new Set(['PLAYER', ...values.roles])) as SystemRole[];
      const currentRoles = Array.from(new Set(['PLAYER', ...(roleUser.roles ?? [])])).sort();
      if (JSON.stringify(nextRoles.slice().sort()) === JSON.stringify(currentRoles)) {
        setShowRoleModal(false);
        return;
      }
      const touchesPrivileged = (['ADMIN', 'MODERATOR'] as const).some((role) => nextRoles.includes(role) !== currentRoles.includes(role));
      if (touchesPrivileged && !roleForm.getValues('acknowledgeSensitive')) {
        roleForm.setError('acknowledgeSensitive', { message: 'Vui lòng xác nhận quyền nhạy cảm trước khi lưu.' });
        return;
      }
      const updated = await usersApi.updateSystemRoles(roleUser.id, nextRoles);
      const savedRoles = updated.roles ?? nextRoles;
      setUsers((current) => current.map((item) => item.id === roleUser.id ? { ...item, roles: savedRoles } : item));
      toast.success('Đã cập nhật vai trò hệ thống.');
      setShowRoleModal(false);
      setRoleUser(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật vai trò.'));
    } finally {
      setRoleProcessing(false);
    }
  });

  type FilterStatus = 'ALL' | 'ACTIVE' | 'BANNED';
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');

  const getStatusBadge = (user: UserItem) => {
    if (user.activeBan) {
      const ban = user.activeBan;
      if (ban.banType === 'HARD_BAN') {
        return <span className="bg-rose-50 text-rose-700 text-xs px-2.5 py-1 rounded-full font-bold border border-rose-200">Khóa Vĩnh Viễn</span>;
      }
      if (ban.banType === 'SOFT_BAN') {
        return <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-bold border border-amber-200">Khóa Tạm Thời</span>;
      }
      return <span className="bg-yellow-50 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-bold border border-yellow-200">Cảnh Cáo</span>;
    }
    return <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold border border-emerald-200">Hoạt Động</span>;
  };

  const filteredUsers = users.filter((u) => {
    if (filterStatus === 'ACTIVE' && u.activeBan) return false;
    if (filterStatus === 'BANNED' && !u.activeBan) return false;
    if (roleFilter !== 'ALL' && !u.roles?.includes(roleFilter)) return false;

    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;
    if (!fromDate && !toDate) return true;
    const itemDate = new Date(u.createdAt);
    if (fromDate && itemDate < fromDate) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Người dùng &amp; phân quyền</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Quản lý vi phạm, cảnh cáo, khóa tài khoản người dùng hoặc cấp bậc uy tín hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['ALL', 'ACTIVE', 'BANNED'] as FilterStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL' && 'Tất cả'}
              {st === 'ACTIVE' && 'Hoạt động'}
              {st === 'BANNED' && 'Đã xử phạt'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar + Date Filter */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all font-medium"
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm">
            Tìm kiếm
          </button>
        </form>
        <div className="flex items-center gap-2 min-w-[140px]">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Từ ngày (dd/mm/yyyy)"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 min-w-[140px]">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Đến ngày (dd/mm/yyyy)"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 placeholder-slate-400"
          />
        </div>
        <label className="flex items-center gap-2 min-w-[170px]">
          <span className="sr-only">Lọc theo vai trò hệ thống</span>
          <select
            aria-label="Lọc theo vai trò hệ thống"
            value={roleFilter}
            onChange={(event) => {
              const nextRole = event.target.value as SystemRole | 'ALL';
              setRoleFilter(nextRole);
              setNextCursor(null);
              void fetchUsers(search, true, nextRole, false);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả vai trò</option>
            {SYSTEM_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-1 shadow-sm">
          <p className="text-base font-bold text-slate-800">Không tìm thấy người dùng nào</p>
          <p className="text-xs text-slate-500 font-medium">Hãy thử tìm với từ khóa hoặc bộ lọc khác.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Người dùng</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Vai trò hệ thống</th>
                  <th className="p-4">Ngày tham gia</th>
                  <th className="p-4">Xác minh</th>
                  <th className="p-4 pr-6 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                {filteredUsers.map((item) => {
                  const name = item.profile?.fullName || 'Người dùng';
                  const initial = name.charAt(0).toUpperCase();

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-slate-200 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-extrabold text-sm shadow-sm shrink-0 overflow-hidden">
                            {item.profile?.avatarUrl ? (
                              <img src={item.profile.avatarUrl} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{name}</p>
                            <p className="text-xs text-slate-500 font-normal truncate">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(item)}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[230px]">
                          {item.roles?.length ? item.roles.map((role) => (
                            <span key={role} className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                              {roleLabel(role)}
                            </span>
                          )) : <span className="text-xs font-semibold text-slate-400">Chưa gán</span>}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-4">
                        {item.profile?.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Đã xác minh
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">Chưa xác minh</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.activeBan ? (
                            <Button
                              onClick={() => handleUnban(item.id)}
                              disabled={processing || item.id === currentUser?.id}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1" />
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
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              {item.id === currentUser?.id ? 'Không thể tự phạt' : 'Xử phạt'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            onClick={() => openRoleModal(item)}
                            disabled={!canManageSystemRoles || processing || roleProcessing || item.id === currentUser?.id}
                            size="sm"
                            variant="outline"
                            title={item.id === currentUser?.id ? 'Không thể tự thay đổi vai trò của mình' : canManageSystemRoles ? 'Gán vai trò hệ thống' : 'Chỉ quản trị viên mới được gán vai trò hệ thống'}
                            className="text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1" />
                            Vai trò
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && hasMoreUsers && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={() => void fetchUsers(search, true, roleFilter, true, nextCursor)} disabled={processing} className="text-xs font-bold">
            Xem thêm người dùng
          </Button>
        </div>
      )}

      {showRoleModal && roleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="presentation">
          <form
            onSubmit={handleRoleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="system-role-title"
            className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 id="system-role-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                  Gán vai trò hệ thống
                </h3>
                <p className="text-xs text-slate-500 mt-1">Các vai trò có sẵn của nền tảng, không ảnh hưởng vai trò CLB.</p>
              </div>
              <button type="button" aria-label="Đóng cửa sổ gán vai trò" onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{roleUser.profile?.fullName || 'Người dùng'}</p>
                <p className="text-xs text-slate-500">{roleUser.email}</p>
              </div>
              <fieldset>
                <legend className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Vai trò được áp dụng</legend>
                <p className="mb-3 text-xs text-slate-500">Vận động viên luôn được giữ làm vai trò nền. ADMIN/MODERATOR là quyền nhạy cảm, chỉ cấp khi đã xác minh trách nhiệm.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SYSTEM_ROLE_OPTIONS.map((option) => {
                            const selected = selectedRoles.includes(option.value);
                    return (
                      <label key={option.value} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${selected ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={option.value === 'PLAYER' || selected}
                          disabled={option.value === 'PLAYER'}
                          onChange={(event) => {
                            const current = roleForm.getValues('roles');
                            const next = event.target.checked ? [...current, option.value] : current.filter((role) => role !== option.value && role !== 'PLAYER');
                            roleForm.setValue('roles', next as SystemRole[], { shouldValidate: true });
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
                {roleForm.formState.errors.roles?.message && <p className="mt-2 text-xs font-semibold text-rose-600">{roleForm.formState.errors.roles.message}</p>}
                <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                  <input type="checkbox" {...roleForm.register('acknowledgeSensitive')} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" />
                  <span>Tôi xác nhận việc cấp/gỡ ADMIN hoặc MODERATOR là quyền nhạy cảm và đã kiểm tra trách nhiệm người dùng.</span>
                </label>
                {roleForm.formState.errors.acknowledgeSensitive?.message && <p className="mt-2 text-xs font-semibold text-rose-600">{roleForm.formState.errors.acknowledgeSensitive.message}</p>}
              </fieldset>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowRoleModal(false)} className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold">Hủy</button>
              <Button type="submit" disabled={roleProcessing || !canManageSystemRoles} className="text-xs">
                {roleProcessing && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Lưu vai trò
              </Button>
            </div>
          </form>
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

