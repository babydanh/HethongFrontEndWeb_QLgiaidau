'use client';

import { Ban, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import type { AdminUser } from '@/features/users/adminModerationApi';
import { cn } from '@/utils/cn';
import { roleLabel } from './SystemRoleModal';

interface AdminUsersTableProps {
  users: AdminUser[];
  loading: boolean;
  processing: boolean;
  currentUserId?: string;
  canManageSystemRoles: boolean;
  onBan: (user: AdminUser) => void;
  onUnban: (userId: string) => void;
  onManageRoles: (user: AdminUser) => void;
}

const BAN_LABELS = {
  WARN: 'Cảnh cáo',
  SOFT_BAN: 'Khóa tạm thời',
  HARD_BAN: 'Khóa vĩnh viễn',
} as const;

const getBanBadgeClassName = (user: AdminUser): string => {
  if (user.activeBan?.banType === 'HARD_BAN') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (user.activeBan?.banType === 'SOFT_BAN') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  if (user.activeBan?.banType === 'WARN') {
    return 'border-yellow-200 bg-yellow-50 text-yellow-700';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

export function AdminUsersTable({
  users,
  loading,
  processing,
  currentUserId,
  canManageSystemRoles,
  onBan,
  onUnban,
  onManageRoles,
}: AdminUsersTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" aria-label="Đang tải người dùng">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-base font-bold text-slate-800">Không tìm thấy người dùng nào</p>
        <p className="text-xs font-medium text-slate-500">
          Hãy thử tìm với từ khóa hoặc bộ lọc khác.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="p-4 pl-6">Người dùng</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Vai trò hệ thống</th>
              <th className="p-4">Ngày tham gia</th>
              <th className="p-4">Xác minh</th>
              <th className="p-4 pr-6 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
            {users.map((user) => {
              const name = user.profile?.fullName || 'Người dùng';
              const isSelf = user.id === currentUserId;
              const punishmentDisabled = processing || isSelf;

              return (
                <tr key={user.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="border border-slate-200 bg-blue-700 text-white shadow-sm">
                        {user.profile?.avatarUrl && (
                          <AvatarImage src={user.profile.avatarUrl} alt={name} />
                        )}
                        <AvatarFallback className="bg-blue-700 text-sm font-extrabold text-white">
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                        <p className="truncate text-xs font-normal text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2.5 py-1 text-xs font-bold',
                        getBanBadgeClassName(user),
                      )}
                    >
                      {user.activeBan ? BAN_LABELS[user.activeBan.banType] : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex max-w-[230px] flex-wrap gap-1.5">
                      {user.roles?.length ? (
                        user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"
                          >
                            {roleLabel(role)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Chưa gán</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-xs font-semibold text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="p-4">
                    {user.profile?.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Đã xác minh
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Chưa xác minh</span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.activeBan ? (
                        <Button
                          type="button"
                          onClick={() => onUnban(user.id)}
                          disabled={punishmentDisabled}
                          size="sm"
                          title={isSelf ? 'Không thể tự gỡ phạt tài khoản của mình' : 'Gỡ phạt'}
                          className="bg-emerald-600 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                        >
                          <UserCheck className="mr-1 h-3.5 w-3.5" />
                          Gỡ phạt
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => onBan(user)}
                          disabled={punishmentDisabled}
                          variant="destructive"
                          size="sm"
                          title={isSelf ? 'Không thể tự xử phạt tài khoản của mình' : 'Xử phạt'}
                          className="bg-rose-600 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          {isSelf ? 'Không thể tự phạt' : 'Xử phạt'}
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => onManageRoles(user)}
                        disabled={!canManageSystemRoles || processing || isSelf}
                        size="sm"
                        variant="outline"
                        title={
                          isSelf
                            ? 'Không thể tự thay đổi vai trò của mình'
                            : canManageSystemRoles
                              ? 'Gán vai trò hệ thống'
                              : 'Chỉ quản trị viên mới được gán vai trò hệ thống'
                        }
                        className="border-blue-200 text-xs font-bold text-blue-700 hover:bg-blue-50"
                      >
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
  );
}
