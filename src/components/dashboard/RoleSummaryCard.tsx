'use client';

import Link from 'next/link';
import { Trophy, UserCheck, Shield, Bell } from 'lucide-react';

interface Props {
  registeredCount: number;
  organizerCount: number;
  refereeCount: number;
  inviteCount: number;
}

const ROLES: Array<{
  key: string;
  label: string;
  href: string;
  icon: any;
  color: string;
  iconColor: string;
  urgent?: boolean;
}> = [
  {
    key: 'player',
    label: 'Giải đã đăng ký',
    href: '/profile',
    icon: Trophy,
    color: 'bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-300',
    iconColor: 'text-sky-600',
  },
  {
    key: 'btc',
    label: 'Vai trò BTC',
    href: '#section-btc',
    icon: UserCheck,
    color: 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-300',
    iconColor: 'text-violet-600',
  },
  {
    key: 'referee',
    label: 'Giải làm TT',
    href: '#section-referee',
    icon: Shield,
    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300',
    iconColor: 'text-amber-600',
  },
  {
    key: 'invite',
    label: 'Lời mời chờ',
    href: '#section-invites',
    icon: Bell,
    color: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300',
    iconColor: 'text-rose-600',
    urgent: true,
  },
];

export default function RoleSummaryCard(props: Props) {
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
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map(role => {
          const count = getValue(role.key);
          const Icon = role.icon;
          return (
            <Link
              key={role.key}
              href={role.href}
              className={`rounded-lg border p-3 flex flex-col gap-1.5 transition-all ${role.color}`}
            >
              <Icon className={`w-4 h-4 ${role.iconColor}`} strokeWidth={2} />
              <span className="text-[22px] font-bold tabular-nums leading-none text-inherit">{count}</span>
              <span className="text-[10px] font-medium opacity-80 leading-tight">{role.label}</span>
              {role.urgent && count > 0 && (
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
