'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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

interface AdminUserPage {
  cursor: string | null;
  users: AdminUser[];
  nextCursor: string | null;
  hasMore: boolean;
}

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
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [banUser, setBanUser] = useState<AdminUser | null>(null);
  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const requestSequence = useRef(0);
  const pageCache = useRef<AdminUserPage[]>([]);
  const activeQuery = useRef<ActiveUserQuery>(INITIAL_QUERY);
  const currentUser = useAuthStore((state) => state.user);
  const canManageSystemRoles = currentUser?.roles?.includes('ADMIN') === true;

  const loadUsers = useCallback(async ({
    query,
    cursor = null,
    pageIndex = 0,
    reset = false,
  }: {
    query: ActiveUserQuery;
    cursor?: string | null;
    pageIndex?: number;
    reset?: boolean;
  }) => {
    const requestId = ++requestSequence.current;
    if (reset || pageIndex === 0) {
      pageCache.current = [];
      setInitialLoading(true);
      setLoadingMore(false);
      setCurrentPageNumber(1);
      setNextCursor(null);
      setHasMoreUsers(false);
    } else {
      setLoadingMore(true);
    }
    setPaginationError(null);

    try {
      const result = await adminModerationApi.listUsers({
        limit: 20,
        ...query,
        cursor,
      });
      if (requestId !== requestSequence.current) return;
      const page: AdminUserPage = {
        cursor,
        users: result.users,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
      pageCache.current = reset
        ? [page]
        : [...pageCache.current.slice(0, pageIndex), page];
      setUsers(page.users);
      setNextCursor(page.nextCursor);
      setHasMoreUsers(page.hasMore);
      setCurrentPageNumber(pageIndex + 1);
    } catch (error: unknown) {
      if (requestId === requestSequence.current) {
        const message = getErrorMessage(error, translate('loadUsersFailed'));
        if (pageIndex > 0) setPaginationError(message);
        else toast.error(message);
      }
    } finally {
      if (requestId === requestSequence.current) {
        if (reset || pageIndex === 0) setInitialLoading(false);
        else setLoadingMore(false);
      }
    }
  }, [translate]);

  const showCachedPage = (pageIndex: number) => {
    const page = pageCache.current[pageIndex];
    if (!page) return false;
    setUsers(page.users);
    setNextCursor(page.nextCursor);
    setHasMoreUsers(page.hasMore);
    setCurrentPageNumber(pageIndex + 1);
    setPaginationError(null);
    return true;
  };

  const goToPreviousPage = () => {
    if (currentPageNumber <= 1 || loadingMore || initialLoading) return;
    showCachedPage(currentPageNumber - 2);
  };

  const goToNextPage = () => {
    if (!hasMoreUsers || !nextCursor || loadingMore || initialLoading) return;
    const nextPageIndex = currentPageNumber;
    if (showCachedPage(nextPageIndex)) return;
    void loadUsers({
      query: activeQuery.current,
      cursor: nextCursor,
      pageIndex: nextPageIndex,
    });
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadUsers({ query: INITIAL_QUERY, reset: true }));
  }, [loadUsers]);

  const refreshUsers = () => {
    const currentPageIndex = currentPageNumber - 1;
    const currentPage = pageCache.current[currentPageIndex];
    void loadUsers({
      query: activeQuery.current,
      cursor: currentPage?.cursor ?? null,
      pageIndex: currentPageIndex,
    });
  };

  const activateQuery = (query: ActiveUserQuery) => {
    activeQuery.current = query;
    void loadUsers({ query, reset: true });
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

      {!initialLoading && (currentPageNumber > 1 || hasMoreUsers) && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousPage}
              disabled={processing || loadingMore || currentPageNumber <= 1}
              className="text-xs font-bold"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {translate('previousPage')}
            </Button>
            <span className="min-w-20 text-center text-xs font-semibold text-slate-500">
              {translate('pageLabel', { page: currentPageNumber })}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={goToNextPage}
              disabled={processing || loadingMore || !hasMoreUsers || !nextCursor}
              className="text-xs font-bold"
            >
              {loadingMore && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {translate('nextPage')}
              {!loadingMore && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
          {paginationError && (
            <div role="alert" className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-rose-600">
              <span>{paginationError}</span>
              <Button
                type="button"
                variant="outline"
                onClick={goToNextPage}
                disabled={processing || loadingMore || !nextCursor}
                className="h-7 px-2 text-[11px] font-bold"
              >
                {translate('retryPage')}
              </Button>
            </div>
          )}
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
