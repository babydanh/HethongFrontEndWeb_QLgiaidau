'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import {
  adminModerationApi,
  type AdminUser,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
  type BanUserPayload,
  type ListAdminUsersParams,
} from '@/features/users/adminModerationApi';
import type { SystemRole } from '@/features/users/api';
import { AdminBanModal } from '@/features/users/components/AdminBanModal';
import { AdminModerationFilters } from '@/features/users/components/AdminModerationFilters';
import { AdminUsersTable } from '@/features/users/components/AdminUsersTable';
import { SystemRoleModal } from '@/features/users/components/SystemRoleModal';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { parseDateInputToIso } from '@/utils/format';

type ActiveUserQuery = Pick<
  ListAdminUsersParams,
  'search' | 'role' | 'status' | 'from' | 'to'
>;

const INITIAL_QUERY: ActiveUserQuery = {
  search: '',
  role: 'ALL',
  status: 'ALL',
};

const appendUniqueUsers = (current: AdminUser[], incoming: AdminUser[]): AdminUser[] => {
  const knownIds = new Set(current.map((user) => user.id));
  return [...current, ...incoming.filter((user) => !knownIds.has(user.id))];
};

export default function ModerationPage() {
  const translate = useTranslations('AdminModeration');
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
  const activeQuery = useRef<ActiveUserQuery>(INITIAL_QUERY);
  const currentUser = useAuthStore((state) => state.user);
  const canManageSystemRoles = currentUser?.roles?.includes('ADMIN') === true;

  const loadUsers = useCallback(async ({
    query,
    cursor = null,
    append = false,
  }: {
    query: ActiveUserQuery;
    cursor?: string | null;
    append?: boolean;
  }) => {
    const requestId = ++requestSequence.current;
    if (append) setLoadingMore(true);
    else {
      setInitialLoading(true);
      setLoadingMore(false);
      setNextCursor(null);
      setHasMoreUsers(false);
    }

    try {
      const result = await adminModerationApi.listUsers({
        limit: 20,
        ...query,
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
        toast.error(getErrorMessage(error, translate('loadUsersFailed')));
      }
    } finally {
      if (requestId === requestSequence.current) {
        if (append) setLoadingMore(false);
        else setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadUsers({ query: INITIAL_QUERY }));
  }, [loadUsers]);

  const refreshUsers = () =>
    loadUsers({ query: activeQuery.current });

  const activateQuery = (query: ActiveUserQuery) => {
    activeQuery.current = query;
    void loadUsers({ query });
  };

  const handleRoleFilterChange = (role: AdminUserRoleFilter) => {
    setRoleFilter(role);
    activateQuery({ ...activeQuery.current, role });
  };

  const handleStatusFilterChange = (status: AdminUserStatusFilter) => {
    setStatusFilter(status);
    activateQuery({ ...activeQuery.current, status });
  };

  const handleSubmitFilters = () => {
    const parsedFrom = dateFrom.trim() ? parseDateInputToIso(dateFrom) : undefined;
    const parsedTo = dateTo.trim() ? parseDateInputToIso(dateTo) : undefined;
    if (parsedFrom === null) {
      toast.error(translate('invalidStartDate'));
      return;
    }
    if (parsedTo === null) {
      toast.error(translate('invalidEndDate'));
      return;
    }
    const from = parsedFrom ?? undefined;
    const to = parsedTo ?? undefined;
    if (from && to && from > to) {
      toast.error(translate('startAfterEnd'));
      return;
    }

    activateQuery({ search, role: roleFilter, status: statusFilter, from, to });
  };

  const handleBan = async (payload: BanUserPayload) => {
    if (!banUser || banUser.id === currentUser?.id) return;
    setProcessing(true);
    try {
      await adminModerationApi.banUser(banUser.id, payload);
      toast.success(translate('banSuccess'));
      setBanUser(null);
      await refreshUsers();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('banError')));
    } finally {
      setProcessing(false);
    }
  };

  const handleUnban = async (userId: string) => {
    if (processing || userId === currentUser?.id) return;
    setProcessing(true);
    try {
      await adminModerationApi.unbanUser(userId);
      toast.success(translate('unbanSuccess'));
      await refreshUsers();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('unbanError')));
    } finally {
      setProcessing(false);
    }
  };

  const handleRolesSaved = (roles: SystemRole[]) => {
    if (!roleUser) return;
    setUsers((current) => current.map((user) =>
      user.id === roleUser.id ? { ...user, roles } : user,
    ));
    void refreshUsers();
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
        onStatusFilterChange={handleStatusFilterChange}
        onSubmit={handleSubmitFilters}
      />

      <AdminUsersTable
        users={users}
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
              query: activeQuery.current,
              cursor: nextCursor,
              append: true,
            })}
            disabled={processing || loadingMore || !nextCursor}
            className="text-xs font-bold"
          >
            {loadingMore && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {translate('loadMoreUsers')}
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
