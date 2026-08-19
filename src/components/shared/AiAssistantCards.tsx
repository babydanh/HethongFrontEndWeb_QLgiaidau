'use client';

import { CalendarDays, ChevronRight, CircleAlert, Clock3, MapPin, ShieldCheck, Trophy, Users } from 'lucide-react';

type CardAction = {
  label: string;
  action: 'navigate' | 'retry' | 'confirm' | 'cancel';
  href?: string;
  intent?: 'primary' | 'secondary' | 'danger';
};

export type AssistantUiBlock = {
  type: 'registration' | 'tournament' | 'community' | 'match' | 'payment' | 'invitation' | 'confirmation' | 'empty' | 'error';
  id: string;
  title?: string;
  data: Record<string, unknown>;
  actions?: CardAction[];
};

type Props = {
  blocks: AssistantUiBlock[];
  onAction?: (action: CardAction, block: AssistantUiBlock) => void;
};

const text = (value: unknown, fallback = 'Chưa cập nhật') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const dateText = (value: unknown) => {
  if (!value) return 'Chưa xếp lịch';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? text(value) : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

const statusText: Record<string, string> = {
  REGISTERED: 'Đã đăng ký',
  UPCOMING: 'Sắp diễn ra',
  REGISTRATION_OPEN: 'Đang mở đăng ký',
  IN_PROGRESS: 'Đang thi đấu',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
  PAID: 'Đã thanh toán',
  UNPAID: 'Chưa thanh toán',
  PENDING: 'Đang chờ xử lý',
  SCHEDULED: 'Đã xếp lịch',
};

function statusLabel(value: unknown) {
  return statusText[String(value)] || text(value, 'Chưa xác định');
}

function CardActions({ block, onAction }: { block: AssistantUiBlock; onAction?: Props['onAction'] }) {
  if (!block.actions?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {block.actions.map((action) => {
        const className = action.intent === 'danger'
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
          : action.intent === 'primary'
            ? 'border-blue-200 bg-blue-600 text-white hover:bg-blue-700'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
        if (action.action === 'navigate' && action.href) {
          return <a key={`${block.id}-${action.label}`} href={action.href} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${className}`}><span>{action.label}</span><ChevronRight className="h-3 w-3" /></a>;
        }
        return <button key={`${block.id}-${action.label}`} type="button" onClick={() => onAction?.(action, block)} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${className}`}><span>{action.label}</span><ChevronRight className="h-3 w-3" /></button>;
      })}
    </div>
  );
}

function CardShell({ block, children, onAction }: { block: AssistantUiBlock; children: React.ReactNode; onAction?: Props['onAction'] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3">{children}</div><CardActions block={block} onAction={onAction} /></section>;
}

function TournamentCard({ block, onAction }: { block: AssistantUiBlock; onAction?: Props['onAction'] }) {
  const d = block.data;
  const ranking = d.eloPoints !== undefined;
  return <CardShell block={block} onAction={onAction}>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2"><span className="rounded-lg bg-blue-50 p-1.5 text-blue-600"><Trophy className="h-4 w-4" /></span><h4 className="truncate text-xs font-bold text-slate-900">{text(block.title || d.name)}</h4></div>
      {ranking ? <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]"><div><p className="text-slate-400">ELO</p><p className="font-bold text-slate-900">{text(d.eloPoints, '0')}</p></div><div><p className="text-slate-400">Trận</p><p className="font-semibold text-slate-700">{text(d.matchesPlayed, '0')}</p></div><div><p className="text-slate-400">Thắng</p><p className="font-semibold text-slate-700">{text(d.matchesWon, '0')}</p></div></div> : <div className="mt-2 space-y-1 text-[11px] text-slate-500"><p><span className="font-semibold text-slate-700">{text(d.sport)}</span> · {statusLabel(d.status)}</p><p className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{dateText(d.startDate)}</p>{d.venue ? <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{text(d.venue)}</p> : null}{d.registrationStatus ? <p>Đăng ký: <span className="font-semibold text-emerald-700">{statusLabel(d.registrationStatus)}</span></p> : null}</div>}
    </div>
  </CardShell>;
}

function CommunityCard({ block, onAction }: { block: AssistantUiBlock; onAction?: Props['onAction'] }) {
  const d = block.data;
  return <CardShell block={block} onAction={onAction}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-lg bg-violet-50 p-1.5 text-violet-600"><Users className="h-4 w-4" /></span><h4 className="truncate text-xs font-bold text-slate-900">{text(block.title || d.name)}</h4></div><div className="mt-2 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{text(d.membershipRole, 'Thành viên')}</span>{d.visibility ? <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">{text(d.visibility)}</span> : null}{d.memberCount !== null && d.memberCount !== undefined ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{text(d.memberCount, '0')} thành viên</span> : null}</div></div></CardShell>;
}

function MatchCard({ block, onAction }: { block: AssistantUiBlock; onAction?: Props['onAction'] }) {
  const d = block.data;
  return <CardShell block={block} onAction={onAction}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-lg bg-amber-50 p-1.5 text-amber-600"><Clock3 className="h-4 w-4" /></span><h4 className="truncate text-xs font-bold text-slate-900">{text(block.title, 'Trận đấu')}</h4></div><div className="mt-2 space-y-1 text-[11px] text-slate-500"><p>{text(d.tournamentName)} · {statusLabel(d.status)}</p><p>{dateText(d.scheduledAt)}</p>{d.court ? <p>{text(d.court)}</p> : null}</div></div></CardShell>;
}

function InvitationCard({ block, onAction }: { block: AssistantUiBlock; onAction?: Props['onAction'] }) {
  const d = block.data;
  return <CardShell block={block} onAction={onAction}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span><h4 className="truncate text-xs font-bold text-slate-900">{text(block.title, 'Lời mời vào CLB')}</h4></div><p className="mt-2 text-[11px] text-slate-500">Trạng thái: <span className="font-semibold text-slate-700">{statusLabel(d.status)}</span></p>{d.expiresAt ? <p className="text-[11px] text-slate-500">Hết hạn: {dateText(d.expiresAt)}</p> : null}</div></CardShell>;
}

function StateCard({ block, onAction }: { block: AssistantUiBlock; onAction?: Props['onAction'] }) {
  const isError = block.type === 'error';
  return <CardShell block={block} onAction={onAction}><div className="flex min-w-0 items-center gap-2"><span className={`rounded-lg p-1.5 ${isError ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{isError ? <CircleAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</span><div><h4 className="text-xs font-bold text-slate-900">{text(block.title, isError ? 'Không thể tải dữ liệu' : 'Không có dữ liệu')}</h4><p className="mt-1 text-[11px] text-slate-500">{isError ? 'Bạn có thể thử lại sau.' : 'Hiện chưa có bản ghi phù hợp.'}</p></div></div></CardShell>;
}

export function AssistantCardRenderer({ blocks, onAction }: Props) {
  if (!blocks.length) return null;
  return <div className="mt-3 space-y-2">{blocks.map((block) => {
    if (block.type === 'community') return <CommunityCard key={block.id} block={block} onAction={onAction} />;
    if (block.type === 'match') return <MatchCard key={block.id} block={block} onAction={onAction} />;
    if (block.type === 'invitation') return <InvitationCard key={block.id} block={block} onAction={onAction} />;
    if (block.type === 'empty' || block.type === 'error') return <StateCard key={block.id} block={block} onAction={onAction} />;
    return <TournamentCard key={block.id} block={block} onAction={onAction} />;
  })}</div>;
}
