'use client';

import type { LucideIcon } from 'lucide-react';
import type { RefObject } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  DollarSign,
  ExternalLink,
  Info,
  LayoutDashboard,
  MapPin,
  Menu,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  UserPlus,
  Video,
  X,
} from 'lucide-react';
import type { Tournament } from '@/types/tournament';
import { getSportLogo } from '@/constants/sports';
import { getTournamentStatusClassName, getTournamentStatusLabel } from '@/utils/tournament-status';
import { cn } from '@/utils/cn';
import { useTranslations } from 'next-intl';

export type ManageSection =
  | 'overview'
  | 'basic'
  | 'schedule'
  | 'registration'
  | 'bracket'
  | 'court_schedule'
  | 'livestream'
  | 'finance'
  | 'permissions';

export type ManageBasicSubTab = 'general' | 'branding' | 'prizes' | 'contact' | 'sponsors';

export interface ManageNavigationTarget {
  section: ManageSection;
  basicSubTab?: ManageBasicSubTab;
}

interface TournamentManageSidebarProps {
  tournament: Tournament;
  activeSection: ManageSection;
  basicSubTab: ManageBasicSubTab;
  divisionCount: number;
  pendingRefereeCount: number;
  matchCount: number;
  isOpen: boolean;
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onNavigate: (target: ManageNavigationTarget) => void;
}

interface SidebarItem {
  key: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  target: ManageNavigationTarget;
  badge?: number;
  children?: Array<{
    key: string;
    label: string;
    target: ManageNavigationTarget;
  }>;
}

function getStatusLabels(t: ReturnType<typeof useTranslations>) {
  return {
    DRAFT: t('status.statusDraft'),
    PENDING_APPROVAL: t('status.statusPendingApproval'),
    PENDING_DELETE: t('status.statusPendingDelete'),
    UPCOMING: t('status.statusUpcoming'),
    REGISTRATION_OPEN: t('status.statusRegistrationOpen'),
    REGISTRATION_CLOSED: t('status.statusRegistrationClosed'),
    IN_PROGRESS: t('status.statusInProgress'),
    COMPLETED: t('status.statusCompleted'),
    CANCELLED: t('status.statusCancelled'),
  };
}

function NavButton({
  item,
  activeSection,
  basicSubTab,
  onNavigate,
  nested = false,
}: {
  item: SidebarItem;
  activeSection: ManageSection;
  basicSubTab: ManageBasicSubTab;
  onNavigate: (target: ManageNavigationTarget) => void;
  nested?: boolean;
}) {
  const isParentActive = activeSection === item.target.section;
  const isChildActive = item.children?.some((child) =>
    child.target.section === activeSection &&
    (child.target.section !== 'basic' || child.target.basicSubTab === basicSubTab),
  ) ?? false;
  const isActive = isParentActive || isChildActive;

  return (
    <div>
      <button
        type="button"
        data-testid={`tab-${item.target.section}`}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => onNavigate(item.target)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
          nested ? 'pl-9 text-[13px]' : 'font-semibold',
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        )}
      >
        <item.icon className={cn('shrink-0', nested ? 'h-3.5 w-3.5' : 'h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-400')} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <span className={cn('min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold', isActive ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
            {item.badge}
          </span>
        ) : null}
        {item.children?.length ? (
          isParentActive ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        ) : null}
      </button>

      {item.children?.length && isParentActive ? (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => {
            const childActive = child.target.section === activeSection &&
              (child.target.section !== 'basic' || child.target.basicSubTab === basicSubTab);
            return (
              <button
                key={child.key}
                type="button"
                aria-current={childActive ? 'page' : undefined}
                onClick={() => onNavigate(child.target)}
                className={cn(
                  'flex w-full items-center rounded-lg py-1.5 pl-9 pr-2.5 text-left text-[12px] transition-colors',
                  childActive ? 'font-semibold text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                )}
              >
                <span className={cn('mr-2 h-1.5 w-1.5 rounded-full', childActive ? 'bg-blue-600' : 'bg-slate-300')} aria-hidden="true" />
                <span className="truncate">{child.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function TournamentManageSidebar({
  tournament,
  activeSection,
  basicSubTab,
  divisionCount,
  pendingRefereeCount,
  matchCount,
  isOpen,
  menuButtonRef,
  onOpen,
  onClose,
  onNavigate,
}: TournamentManageSidebarProps) {
  const t = useTranslations('OrganizerManage');
  const statusLabels = getStatusLabels(t);
  const sportLogo = getSportLogo(tournament.category?.name);
  const statusLabel = getTournamentStatusLabel(tournament.status, statusLabels);

  const managementItems: SidebarItem[] = [
    {
      key: 'overview',
      label: t('sidebar.overview'),
      icon: LayoutDashboard,
      target: { section: 'overview' },
    },
    {
      key: 'basic',
      label: t('sidebar.information'),
      icon: Info,
      target: { section: 'basic', basicSubTab: 'general' },
      children: [
        { key: 'general', label: t('sidebar.general'), target: { section: 'basic', basicSubTab: 'general' } },
        { key: 'branding', label: t('sidebar.branding'), target: { section: 'basic', basicSubTab: 'branding' } },
        { key: 'prizes', label: t('sidebar.prizes'), target: { section: 'basic', basicSubTab: 'prizes' } },
        { key: 'contact', label: t('sidebar.contact'), target: { section: 'basic', basicSubTab: 'contact' } },
        { key: 'sponsors', label: t('sidebar.sponsors'), target: { section: 'basic', basicSubTab: 'sponsors' } },
      ],
    },
    {
      key: 'schedule',
      label: t('sidebar.venues'),
      icon: MapPin,
      target: { section: 'schedule' },
    },
    {
      key: 'registration',
      label: t('sidebar.registration'),
      icon: UserPlus,
      target: { section: 'registration' },
      children: [
        { key: 'participants', label: t('sidebar.participants'), target: { section: 'registration' } },
        { key: 'approval', label: t('sidebar.approval'), target: { section: 'registration' } },
        { key: 'elo', label: t('sidebar.elo'), target: { section: 'registration' } },
      ],
    },
    {
      key: 'format',
      label: t('sidebar.format'),
      icon: Trophy,
      target: { section: 'bracket' },
      children: [
        { key: 'content', label: t('sidebar.content'), target: { section: 'bracket' } },
        { key: 'rules', label: t('sidebar.rules'), target: { section: 'bracket' } },
        { key: 'bracket', label: t('sidebar.bracket'), target: { section: 'bracket' } },
      ],
    },
    {
      key: 'court_schedule',
      label: t('sidebar.matchSchedule'),
      icon: CalendarDays,
      target: { section: 'court_schedule' },
    },
  ];

  const advancedItems: SidebarItem[] = [
    {
      key: 'livestream',
      label: t('sidebar.livestream'),
      icon: Video,
      target: { section: 'livestream' },
    },
    {
      key: 'finance',
      label: t('sidebar.finance'),
      icon: DollarSign,
      target: { section: 'finance' },
    },
    {
      key: 'permissions',
      label: t('sidebar.permissions'),
      icon: ShieldCheck,
      target: { section: 'permissions' },
      badge: pendingRefereeCount,
    },
  ];

  const renderNavGroup = (groupId: string, title: string, items: SidebarItem[]) => (
    <section aria-labelledby={`manage-nav-${groupId}`}>
      <p id={`manage-nav-${groupId}`} className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            activeSection={activeSection}
            basicSubTab={basicSubTab}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <span className="truncate text-sm font-bold text-slate-900">{t('sidebar.manageMenu')}</span>
        </div>
        <button ref={menuButtonRef} type="button" onClick={onOpen} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label={t('sidebar.openMenu')}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {isOpen ? <button type="button" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" aria-label={t('sidebar.closeMenu')} /> : null}

      <aside
        aria-label={t('sidebar.manageMenu')}
        data-manage-sidebar
        className={cn(
          'z-50 flex-col gap-4 lg:sticky lg:top-[calc(var(--app-header-height)+1rem)] lg:z-auto lg:flex lg:w-[272px] lg:shrink-0',
          isOpen
            ? 'fixed inset-y-0 left-0 flex w-[min(88vw,320px)] overflow-y-auto bg-white p-4 shadow-2xl'
            : 'hidden',
        )}
      >
        <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {sportLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sportLogo} alt="" className="h-7 w-7 object-contain" />
              ) : <ClipboardList className="h-5 w-5 text-blue-600" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{tournament.category?.name || t('status.sportFallback')}</p>
              <h1 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-900">{tournament.name}</h1>
              <span className={cn('mt-2 inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-bold', getTournamentStatusClassName(tournament.status))}>
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                <span className="truncate">{statusLabel}</span>
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden" aria-label={t('sidebar.closeMenu')}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {renderNavGroup('management', t('sidebar.managementGroup'), managementItems)}
          <div className="my-4 border-t border-slate-100" />
          {renderNavGroup('advanced', t('sidebar.advancedGroup'), advancedItems)}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold">
            <BarChart3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
            {t('sidebar.snapshotTitle')}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
              <p className="text-[10px] text-slate-500">{t('sidebar.divisions')}</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{divisionCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
              <p className="text-[10px] text-slate-500">{t('sidebar.matches')}</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{matchCount}</p>
            </div>
          </div>
          <a href={`/tournaments/${tournament.id}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
            {t('sidebar.openPublicPage')} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </aside>
    </>
  );
}
