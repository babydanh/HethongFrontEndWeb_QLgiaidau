'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import {
  adminModerationApi,
  type AdminUser,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
  type BanUserPayload,
} from '@/features/users/adminModerationApi';
import type { SystemRole } from '@/features/users/api';
import { AdminBanModal } from '@/features/users/components/AdminBanModal';
import { AdminModerationFilters } from '@/features/users/components/AdminModerationFilters';
import { AdminUsersTable } from '@/features/users/components/AdminUsersTable';
import { SystemRoleModal } from '@/features/users/components/SystemRoleModal';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';

const parseDate = (value: string): Date | null => {
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((part) => Number.parseInt(part, 10));
  if (![day, month, year].every(Number.isFinite)) return null;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    ? date
    : null;
};

const appendUniqueUsers = (current: AdminUser[], incoming: AdminUser[]): AdminUser[] => {
  const knownIds = new Set(current.map((user) => user.id));
  return [...current, ...incoming.filter((user) => !knownIds.has(user.id))];
};

export default function ModerationPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>('ALL');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [banUser, setBanUser] = useState<AdminUser | null>(null);
  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const requestSequence = useRef(0);
  const currentUser = useAuthStore((state) => state.user);
  const canManageSystemRoles = currentUser?.roles?.includes('ADMIN') === true;

  const loadUsers = useCallback(async ({
    searchTerm,
    role,
    cursor = null,
    append = false,
  }: {
    searchTerm: string;
    role: AdminUserRoleFilter;
    cursor?: string | null;
    append?: boolean;
  }) => {
    const requestId = ++requestSequence.current;
    if (append) setLoadingMore(true);
    else setInitialLoading(true);

    try {
      const result = await adminModerationApi.listUsers({
        limit: 20,
        search: searchTerm,
        role,
        cursor,
      });
      if (requestId !== requestSequence.current) return;
      setUsers((current) =>
        append ? appendUniqueUsers(current, result.users) : result.users,
      );
      setNextCursor(result.nextCursor);
      setHasMoreUsers(result.hasMore);
    } catch (error: unknown) {
      if (requestId === requestSequence.current) {
        toast.error(getErrorMessage(error, 'Không thể tải danh sách người dùng.'));
      }
    } finally {
      if (requestId === requestSequence.current) {
        if (append) setLoadingMore(false);
        else setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadUsers({ searchTerm: '', role: 'ALL' }));
  }, [loadUsers]);

  const visibleUsers = useMemo(() => {
    const start = dateFrom ? parseDate(dateFrom) : null;
    const finish = dateTo ? parseDate(dateTo) : null;
    if (finish) finish.setHours(23, 59, 59, 999);

    return users.filter((user) => {
      if (statusFilter === 'ACTIVE' && user.activeBan) return false;
      if (statusFilter === 'BANNED' && !user.activeBan) return false;
      const createdAt = new Date(user.createdAt);
      if (start && createdAt < start) return false;
      if (finish && createdAt > finish) return false;
      return true;
    });
  }, [dateFrom, dateTo, statusFilter, users]);

  const refreshUsers = () =>
    loadUsers({ searchTerm: search, role: roleFilter });

  const handleRoleFilterChange = (role: AdminUserRoleFilter) => {
    setRoleFilter(role);
    setNextCursor(null);
    void loadUsers({ searchTerm: search, role });
  };

  const handleBan = async (payload: BanUserPayload) => {
    if (!banUser || banUser.id === currentUser?.id) return;
    setProcessing(true);
    try {
      await adminModerationApi.banUser(banUser.id, payload);
      toast.success('Đã áp dụng chế tài thành công.');
      setBanUser(null);
      await refreshUsers();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể xử phạt tài khoản.'));
    } finally {
      setProcessing(false);
    }
  };

  const handleUnban = async (userId: string) => {
    if (processing || userId === currentUser?.id) return;
    setProcessing(true);
    try {
      await adminModerationApi.unbanUser(userId);
      toast.success('Đã gỡ phạt tài khoản.');
      await refreshUsers();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể gỡ phạt tài khoản.'));
    } finally {
      setProcessing(false);
    }
  };

  const handleRolesSaved = (roles: SystemRole[]) => {
    if (!roleUser) return;
    setUsers((current) => current.map((user) =>
      user.id === roleUser.id ? { ...user, roles } : user,
    ));
  };

  return (
    <div className="space-y-6">
      <AdminModerationFilters
        search={search}
        dateFrom={dateFrom}
        dateTo={dateTo}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        disabled={initialLoading || loadingMore}
        onSearchChange={setSearch}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onRoleFilterChange={handleRoleFilterChange}
        onStatusFilterChange={setStatusFilter}
        onSubmit={() => void refreshUsers()}
      />

      <AdminUsersTable
        users={visibleUsers}
        loading={initialLoading}
        processing={processing}
        currentUserId={currentUser?.id}
        canManageSystemRoles={canManageSystemRoles}
        onBan={setBanUser}
        onUnban={(userId) => void handleUnban(userId)}
        onManageRoles={setRoleUser}
      />

      {!initialLoading && hasMoreUsers && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadUsers({
              searchTerm: search,
              role: roleFilter,
              cursor: nextCursor,
              append: true,
            })}
            disabled={processing || loadingMore || !nextCursor}
            className="text-xs font-bold"
          >
            {loadingMore && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Xem thêm người dùng
          </Button>
        </div>
      )}

      {roleUser && (
        <SystemRoleModal
          key={roleUser.id}
          user={{ ...roleUser, profile: roleUser.profile ?? undefined }}
          onClose={() => setRoleUser(null)}
          onSaved={handleRolesSaved}
        />
      )}

      {banUser && (
        <AdminBanModal
          user={banUser}
          processing={processing}
          onClose={() => setBanUser(null)}
          onSubmit={handleBan}
        />
      )}
    </div>
  );
}
