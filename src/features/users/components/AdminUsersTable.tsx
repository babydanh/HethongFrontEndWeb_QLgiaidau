'use client';

import { Ban, ShieldCheck, UserCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import type { AdminUser } from '@/features/users/adminModerationApi';
import { cn } from '@/utils/cn';

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
  const translate = useTranslations('AdminModeration');
  const locale = useLocale();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" aria-label={translate('loadingUsers')}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-base font-bold text-slate-800">{translate('noUsers')}</p>
        <p className="text-xs font-medium text-slate-500">
          {translate('noUsersHint')}
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
              <th className="p-4 pl-6">{translate('usersHeader')}</th>
              <th className="p-4">{translate('statusHeader')}</th>
              <th className="p-4">{translate('rolesHeader')}</th>
              <th className="p-4">{translate('joinedHeader')}</th>
              <th className="p-4">{translate('verifiedHeader')}</th>
              <th className="p-4 pr-6 text-right">{translate('actionsHeader')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
            {users.map((user) => {
              const name = user.profile?.fullName || translate('defaultUser');
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
                    {user.activeBan ? (
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2.5 py-1 text-xs font-bold',
                          getBanBadgeClassName(user),
                        )}
                      >
                        {translate(
                          user.activeBan.banType === 'WARN'
                            ? 'warnShort'
                            : user.activeBan.banType === 'SOFT_BAN'
                              ? 'softBanShort'
                              : 'hardBanShort',
                        )}
                      </span>
                    ) : user.isOnline ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {translate('onlineStatus')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        {translate('offlineStatus')}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex max-w-[230px] flex-wrap gap-1.5">
                      {user.roles?.length ? (
                        user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"
                          >
                            {translate(
                              role === 'PLAYER'
                                ? 'rolePlayer'
                                : role === 'REFEREE'
                                  ? 'roleReferee'
                                  : role === 'ORGANIZER'
                                    ? 'roleOrganizer'
                                    : role === 'MODERATOR'
                                      ? 'roleModerator'
                                      : 'roleAdmin',
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">{translate('unassigned')}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-xs font-semibold text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                  </td>
                  <td className="p-4">
                    {user.profile?.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {translate('verified')}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">{translate('unverified')}</span>
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
                          title={isSelf ? translate('cannotUnbanSelf') : translate('unban')}
                          className="bg-emerald-600 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                        >
                          <UserCheck className="mr-1 h-3.5 w-3.5" />
                          {translate('unban')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => onBan(user)}
                          disabled={punishmentDisabled}
                          variant="destructive"
                          size="sm"
                          title={isSelf ? translate('cannotBanSelf') : translate('ban')}
                          className="bg-rose-600 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          {isSelf ? translate('cannotSelfBan') : translate('ban')}
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
                            ? translate('cannotChangeOwnRoles')
                            : canManageSystemRoles
                              ? translate('assignRoles')
                              : translate('adminOnlyRoleAssignment')
                        }
                        className="border-blue-200 text-xs font-bold text-blue-700 hover:bg-blue-50"
                      >
                        {translate('roles')}
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
