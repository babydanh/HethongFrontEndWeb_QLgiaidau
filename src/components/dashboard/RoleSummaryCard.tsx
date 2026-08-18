'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
interface Props {
  registeredCount: number;
  organizerCount: number;
  refereeCount: number;
  inviteCount: number;
}

interface RoleDef {
  key: string;
  labelKey: 'roleRegistered' | 'roleOrganizer' | 'roleReferee' | 'roleInvites';
  href: string;
  urgent?: boolean;
}

const ROLES: RoleDef[] = [
  { key: 'player', labelKey: 'roleRegistered', href: '/profile' },
  { key: 'btc', labelKey: 'roleOrganizer', href: '#section-btc' },
  { key: 'referee', labelKey: 'roleReferee', href: '#section-referee' },
  { key: 'invite', labelKey: 'roleInvites', href: '#section-invites', urgent: true },
];

export default function RoleSummaryCard(props: Props) {
  const translate = useTranslations('PlayerDashboard');
  const getValue = (k: string): number => {
    switch (k) {
      case 'player': return props.registeredCount;
      case 'btc': return props.organizerCount;
      case 'referee': return props.refereeCount;
      case 'invite': return props.inviteCount;
      default: return 0;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Vai trò của tôi</h3>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60">
        {ROLES.map(role => {
          const label = translate(role.labelKey);
          const count = getValue(role.key);
          const ariaLabel = role.urgent && count > 0
            ? `${count} ${label} — ${translate('pendingRefereeResponse')}`
            : undefined;
          return (
            <Link
              key={role.key}
              href={role.href}
              aria-label={ariaLabel}
              className="flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-white"
            >
              <span className="text-xs font-medium text-slate-600">{label}</span>
              <span className="flex items-center gap-2 text-lg font-bold tabular-nums text-slate-900">
                {count}
                {role.urgent && count > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
