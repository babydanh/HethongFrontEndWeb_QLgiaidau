import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import { trimAndNormalizeSpaces } from '@/utils/string';
import type { SystemRole } from './api';

export type BanType = 'WARN' | 'SOFT_BAN' | 'HARD_BAN';
export type AdminUserStatusFilter = 'ALL' | 'ACTIVE' | 'BANNED';
export type AdminUserRoleFilter = SystemRole | 'ALL';

export interface UserBan {
  banType: BanType;
  reason: string;
  expiresAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
  isOnline?: boolean;
  roles?: SystemRole[];
  profile?: {
    fullName?: string;
    avatarUrl?: string;
    isVerified?: boolean;
  } | null;
  activeBan?: UserBan;
}

export interface ListAdminUsersParams {
  limit?: number;
  search?: string;
  role?: AdminUserRoleFilter;
  status?: AdminUserStatusFilter;
  from?: string;
  to?: string;
  cursor?: string | null;
}

export interface AdminUserListResult {
  users: AdminUser[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface BanUserPayload {
  reason: string;
  banType: BanType;
  expiresAt?: string;
}

const listUsers = async ({
  limit = 20,
  search = '',
  role = 'ALL',
  status = 'ALL',
  from,
  to,
  cursor,
}: ListAdminUsersParams = {}): Promise<AdminUserListResult> => {
  const normalizedSearch = trimAndNormalizeSpaces(search);
  const response = await api.get<ApiResponse<AdminUser[]>>('/users', {
    params: {
      limit,
      ...(normalizedSearch ? { search: normalizedSearch } : {}),
      ...(role !== 'ALL' ? { role } : {}),
      ...(status !== 'ALL' ? { status } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(cursor ? { cursor } : {}),
    },
  });

  return {
    users: response.data ?? [],
    nextCursor: response.meta?.nextCursor ?? null,
    hasMore: response.meta?.hasMore === true,
  };
};

const banUser = (userId: string, payload: BanUserPayload) =>
  api.post<ApiResponse<unknown>>(`/admin/users/${userId}/ban`, payload);

const unbanUser = (userId: string) =>
  api.post<ApiResponse<unknown>>(`/admin/users/${userId}/unban`);

export const adminModerationApi = {
  listUsers,
  banUser,
  unbanUser,
};
