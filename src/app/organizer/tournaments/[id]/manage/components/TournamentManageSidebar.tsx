'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { RefObject } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  DollarSign,
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
  targetId?: string;
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

function NavButton({
  item,
  activeSection,
  basicSubTab,
  isExpanded,
  onToggleExpand,
  onNavigate,
  nested = false,
}: {
  item: SidebarItem;
  activeSection: ManageSection;
  basicSubTab: ManageBasicSubTab;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (target: ManageNavigationTarget) => void;
  nested?: boolean;
}) {
  const isParentActive = activeSection === item.target.section;
  const isChildActive = item.children?.some((child) =>
    child.target.section === activeSection &&
    (child.target.section !== 'basic' || child.target.basicSubTab === basicSubTab),
  ) ?? false;
  const isActive = isParentActive || isChildActive;
  const hasChildren = Boolean(item.children?.length);

  const handleParentClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      // Toggle dropdown if clicked and navigate if not active
      onToggleExpand();
      onNavigate(item.target);
    } else {
      onNavigate(item.target);
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };

  return (
    <div>
      <button
        type="button"
        data-testid={`tab-${item.target.section}`}
        aria-current={isActive ? 'page' : undefined}
        onClick={handleParentClick}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer',
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
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleChevronClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onToggleExpand(); } }}
            className="rounded p-0.5 hover:bg-slate-200/50 transition-colors"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-600" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-600" aria-hidden="true" />
            )}
          </span>
        ) : null}
      </button>

      {hasChildren && isExpanded ? (
        <div className="mt-0.5 space-y-0.5 animate-in fade-in duration-150">
          {item.children!.map((child) => {
            const childActive = child.target.section === activeSection &&
              (child.target.section !== 'basic' || child.target.basicSubTab === basicSubTab);
            return (
              <button
                key={child.key}
                type="button"
                aria-current={childActive ? 'page' : undefined}
                onClick={() => onNavigate(child.target)}
                className={cn(
                  'flex w-full items-center rounded-lg py-1.5 pl-9 pr-2.5 text-left text-[12px] transition-colors cursor-pointer',
                  childActive ? 'font-semibold text-blue-700 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                )}
              >
                <span className={cn('mr-2 h-1.5 w-1.5 rounded-full', childActive ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-slate-300')} aria-hidden="true" />
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

  // Track expanded state for menu groups with submenus.
  // Defaults to expanded for the currently active section or commonly accessed ones.
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({
    basic: true,
    registration: true,
    bracket: true,
  });

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setupItems: SidebarItem[] = [
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
        { key: 'contact', label: t('sidebar.contact'), target: { section: 'basic', basicSubTab: 'contact', targetId: 'manage-contact-info-section' } },
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
      target: { section: 'registration', targetId: 'manage-registration-status-card' },
      children: [
        { key: 'participants', label: t('sidebar.participants'), target: { section: 'registration', targetId: 'manage-participants-section' } },
        { key: 'approval', label: t('sidebar.approval'), target: { section: 'registration', targetId: 'manage-participants-section' } },
        { key: 'elo', label: t('sidebar.elo'), target: { section: 'registration', targetId: 'manage-registration-elo-section' } },
      ],
    },
  ];

  const operationsItems: SidebarItem[] = [
    {
      key: 'court_schedule',
      label: t('sidebar.matchSchedule'),
      icon: CalendarDays,
      target: { section: 'court_schedule' },
    },
    {
      key: 'bracket',
      label: t('sidebar.bracket'),
      icon: Trophy,
      target: { section: 'bracket', targetId: 'manage-bracket-workspace' },
      children: [
        { key: 'content', label: t('sidebar.content'), target: { section: 'bracket', targetId: 'manage-bracket-workspace' } },
        { key: 'rules', label: t('sidebar.rules'), target: { section: 'bracket', targetId: 'manage-bracket-workspace' } },
        { key: 'bracket_tree', label: t('sidebar.bracket'), target: { section: 'bracket', targetId: 'manage-bracket-tree-section' } },
      ],
    },
  ];

  const resultsItems: SidebarItem[] = [
    {
      key: 'results_overview',
      label: t('sidebar.standings'),
      icon: Trophy,
      target: { section: 'overview' },
    },
  ];

  const systemItems: SidebarItem[] = [
    {
      key: 'permissions',
      label: t('sidebar.permissions'),
      icon: ShieldCheck,
      target: { section: 'permissions' },
      badge: pendingRefereeCount,
    },
    {
      key: 'finance',
      label: t('sidebar.finance'),
      icon: DollarSign,
      target: { section: 'finance' },
    },
    {
      key: 'livestream',
      label: t('sidebar.livestream'),
      icon: Video,
      target: { section: 'livestream' },
    },
  ];

  const renderNavGroup = (groupId: string, title: string, items: SidebarItem[]) => (
    <section aria-labelledby={`manage-nav-${groupId}`} className="mb-3 last:mb-0">
      <p id={`manage-nav-${groupId}`} className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            activeSection={activeSection}
            basicSubTab={basicSubTab}
            isExpanded={expandedKeys[item.key] ?? (activeSection === item.target.section)}
            onToggleExpand={() => toggleExpand(item.key)}
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
          'z-50 flex-col gap-3 lg:sticky lg:top-[calc(var(--app-header-height)+1rem)] lg:z-auto lg:flex lg:w-[250px] lg:shrink-0',
          isOpen
            ? 'fixed inset-y-0 left-0 flex w-[min(88vw,300px)] overflow-y-auto bg-white p-3 shadow-2xl'
            : 'hidden',
        )}
      >
        <div className="mb-1 flex items-center justify-between lg:hidden">
          <span className="text-sm font-bold tracking-tight text-slate-900">{t('sidebar.manageMenu')}</span>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t('sidebar.closeMenu')}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* 4 Navigation Groups */}
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
          {renderNavGroup('setup', t('sidebar.setupGroup'), setupItems)}
          <div className="my-2.5 border-t border-slate-100" />
          {renderNavGroup('operations', t('sidebar.operationsGroup'), operationsItems)}
          <div className="my-2.5 border-t border-slate-100" />
          {renderNavGroup('results', t('sidebar.resultsGroup'), resultsItems)}
          <div className="my-2.5 border-t border-slate-100" />
          {renderNavGroup('system', t('sidebar.systemGroup'), systemItems)}
        </div>
      </aside>
    </>
  );
}
