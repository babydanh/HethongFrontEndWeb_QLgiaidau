'use client';

import { useLocale, useTranslations } from 'next-intl';
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

type Translate = (key: any, values?: any) => string;

const text = (value: unknown, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const dateText = (value: unknown, locale: string, translate: Translate) => {
  if (!value) return translate('fallback.unscheduled');
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? text(value, translate('fallback.invalidDate'))
    : date.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

const statusText: Record<string, string> = {
  REGISTERED: 'status.registered',
  UPCOMING: 'status.upcoming',
  REGISTRATION_OPEN: 'status.registrationOpen',
  IN_PROGRESS: 'status.inProgress',
  COMPLETED: 'status.completed',
  CANCELLED: 'status.cancelled',
  PAID: 'status.paid',
  UNPAID: 'status.unpaid',
  PENDING: 'status.pending',
  SCHEDULED: 'status.scheduled',
};

function statusLabel(value: unknown, translate: Translate) {
  const key = statusText[String(value)];
  return key ? translate(key) : text(value, translate('fallback.unknown'));
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

function TournamentCard({ block, onAction, translate, locale }: { block: AssistantUiBlock; onAction?: Props['onAction']; translate: Translate; locale: string }) {
  const d = block.data;
  const ranking = d.eloPoints !== undefined;
  return <CardShell block={block} onAction={onAction}>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2"><span className="rounded-lg bg-blue-50 p-1.5 text-blue-600"><Trophy className="h-4 w-4" /></span><h4 className="truncate text-xs font-bold text-slate-900">{text(block.title || d.name, translate('fallback.notUpdated'))}</h4></div>
      {ranking ? <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]"><div><p className="text-slate-400">ELO</p><p className="font-bold text-slate-900">{text(d.eloPoints, '0')}</p></div><div><p className="text-slate-400">{translate('ranking.matches')}</p><p className="font-semibold text-slate-700">{text(d.matchesPlayed, '0')}</p></div><div><p className="text-slate-400">{translate('ranking.wins')}</p><p className="font-semibold text-slate-700">{text(d.matchesWon, '0')}</p></div></div> : <div className="mt-2 space-y-1 text-[11px] text-slate-500"><p><span className="font-semibold text-slate-700">{text(d.sport, translate('fallback.notUpdated'))}</span> · {statusLabel(d.status, translate)}</p><p className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{dateText(d.startDate, locale, translate)}</p>{d.venue ? <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{text(d.venue, translate('fallback.notUpdated'))}</p> : null}{d.registrationStatus ? <p>{translate('registration')}: <span className="font-semibold text-emerald-700">{statusLabel(d.registrationStatus, translate)}</span></p> : null}</div>}
    </div>
  </CardShell>;
}

function CommunityCard({ block, onAction, translate }: { block: AssistantUiBlock; onAction?: Props['onAction']; translate: Translate }) {
  const d = block.data;
  return <CardShell block={block} onAction={onAction}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-lg bg-violet-50 p-1.5 text-violet-600"><Users className="h-4 w-4" /></span><h4 className="truncate text-xs font-bold text-slate-900">{text(block.title || d.name, translate('fallback.notUpdated'))}</h4></div><div className="mt-2 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{text(d.membershipRole, translate('community.member'))}</span>{d.visibility ? <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">{text(d.visibility, translate('fallback.notUpdated'))}</span> : null}{d.memberCount !== null && d.memberCount !== undefined ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{text(d.memberCount, '0')} {translate('community.members')}</span> : null}</div></div></CardShell>;
}

function MatchCard({ block, onAction, translate, locale }: { block: AssistantUiBlock; onAction?: Props['onAction']; translate: Translate; locale: string }) {
  const d = block.data;
  return <CardShell block={block} onAction={onAction}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-lg bg-amber-50 p-1.5 text-amber-600"><Clock3 className="h-4 w-4" /></span><h4 className="truncate text-xs font-bold text-slate-900">{text(block.title, translate('match'))}</h4></div><div className="mt-2 space-y-1 text-[11px] text-slate-500"><p>{text(d.tournamentName, translate('fallback.notUpdated'))} · {statusLabel(d.status, translate)}</p><p>{dateText(d.scheduledAt, locale, translate)}</p>{d.court ? <p>{text(d.court, translate('fallback.notUpdated'))}</p> : null}</div></div></CardShell>;
}

function InvitationCard({ block, onAction, translate, locale }: { block: AssistantUiBlock; onAction?: Props['onAction']; translate: Translate; locale: string }) {
  const d = block.data;
  return <CardShell block={block} onAction={onAction}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span><h4 className="truncate text-xs font-bold text-slate-900">{text(block.title, translate('invitation'))}</h4></div><p className="mt-2 text-[11px] text-slate-500">{translate('invitationStatus')}: <span className="font-semibold text-slate-700">{statusLabel(d.status, translate)}</span></p>{d.expiresAt ? <p className="text-[11px] text-slate-500">{translate('expires')}: {dateText(d.expiresAt, locale, translate)}</p> : null}</div></CardShell>;
}

function StateCard({ block, onAction, translate }: { block: AssistantUiBlock; onAction?: Props['onAction']; translate: Translate }) {
  const isError = block.type === 'error';
  return <CardShell block={block} onAction={onAction}><div className="flex min-w-0 items-center gap-2"><span className={`rounded-lg p-1.5 ${isError ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{isError ? <CircleAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</span><div><h4 className="text-xs font-bold text-slate-900">{text(block.title, translate(isError ? 'state.errorTitle' : 'state.emptyTitle'))}</h4><p className="mt-1 text-[11px] text-slate-500">{translate(isError ? 'state.errorDescription' : 'state.emptyDescription')}</p></div></div></CardShell>;
}

export function AssistantCardRenderer({ blocks, onAction }: Props) {
  const translate = useTranslations('AssistantCards');
  const locale = useLocale();
  if (!blocks.length) return null;
  return <div className="mt-3 space-y-2">{blocks.map((block) => {
    if (block.type === 'community') return <CommunityCard key={block.id} block={block} onAction={onAction} translate={translate} />;
    if (block.type === 'match') return <MatchCard key={block.id} block={block} onAction={onAction} translate={translate} locale={locale} />;
    if (block.type === 'invitation') return <InvitationCard key={block.id} block={block} onAction={onAction} translate={translate} locale={locale} />;
    if (block.type === 'empty' || block.type === 'error') return <StateCard key={block.id} block={block} onAction={onAction} translate={translate} />;
    return <TournamentCard key={block.id} block={block} onAction={onAction} translate={translate} locale={locale} />;
  })}</div>;
}
