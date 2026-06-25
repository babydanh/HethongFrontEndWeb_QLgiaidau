'use client';

import { Calendar, CheckCircle2, Clock3, ShieldAlert, Users } from 'lucide-react';

interface OpsOverviewProps {
  summary: {
    totalParticipants: number;
    approvedParticipants: number;
    pendingParticipants: number;
    kickedParticipants: number;
    unpaidParticipants: number;
    scheduledMatches: number;
    ongoingMatches: number;
    completedMatches: number;
  };
}

const cards = [
  { key: 'totalParticipants', label: 'Tổng cặp/đội', icon: Users, tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  { key: 'pendingParticipants', label: 'Chờ xử lý', icon: ShieldAlert, tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  { key: 'ongoingMatches', label: 'Trận đang diễn ra', icon: Clock3, tone: 'bg-rose-50 text-rose-700 border-rose-100' },
  { key: 'completedMatches', label: 'Trận đã xong', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { key: 'scheduledMatches', label: 'Trận chờ bắt đầu', icon: Calendar, tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'unpaidParticipants', label: 'Chưa thanh toán', icon: ShieldAlert, tone: 'bg-orange-50 text-orange-700 border-orange-100' },
] as const;

export function OpsOverview({ summary }: OpsOverviewProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">Tổng quan vận hành</h2>
        <p className="text-sm font-medium text-slate-500">Một màn nhìn nhanh số cặp, số trận và các điểm cần xử lý của BTC.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = summary[card.key];

          return (
            <div key={card.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
                </div>
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
