'use client';

import { use, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { DateTimePicker } from '@/components/ui/Input';
import { AlertTriangle, ExternalLink, Plus, X, Loader2, Trash2, Lock, Trophy, User, Users, Zap, Pencil, MapPin, CalendarDays, GitMerge, DollarSign, Download, ChevronRight, ChevronLeft, Check, Play, ChevronDown, Activity, Layers, Calendar, ArrowUpRight, Share2, Globe, Clock, ShieldCheck, Video, LayoutDashboard, Info } from 'lucide-react';
import GalleryCarousel from '@/components/ui/GalleryCarousel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import toast from 'react-hot-toast';
import { useManageState } from './components/useManageState';
import { TournamentStepper } from './components/TournamentStepper';
import { BasicInfoTab } from './components/BasicInfoTab';
import { ScheduleTab } from './components/ScheduleTab';
import { CourtWorkspace } from './components/CourtWorkspace';
import { RegistrationTab } from './components/RegistrationTab';
import { BracketTab } from './components/BracketTab';
import { mergeBracketMatches } from '@/app/(public)/tournaments/[id]/components/bracket/types';
import { FinanceTab } from './components/FinanceTab';
import { PermissionsTab } from './components/PermissionsTab';
import { LivestreamTab } from './components/LivestreamTab';
import { TournamentManageOverview } from './components/TournamentManageOverview';
import { TournamentManageSidebar, type ManageNavigationTarget, type ManageSection } from './components/TournamentManageSidebar';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { getScoreEntryGuidance, getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getTournamentStatusClassName, getTournamentStatusLabel, isTournamentCompleted, isTournamentRegistrationClosed, isTournamentUpcoming } from '@/utils/tournament-status';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { exportTournamentResultsExcel } from '@/utils/exportTournament';
import { getDivisionBracketLabel, getDivisionMatchLabel, type TournamentDisplayLabels } from '@/utils/tournament-display';

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-bold text-slate-800 text-right">{value}</span>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function getDivisionGenderMeta(
  div: { name: string; matchType?: string | null; genderRestriction?: string | null },
  labels: TournamentDisplayLabels,
) {
  const nameLower = (div.name || '').toLowerCase();
  const gender = (div.genderRestriction || '').toUpperCase();
  const isDoubles = (div.matchType || '').toUpperCase().includes('DOUBLE') || nameLower.includes('đôi');
  
  if (nameLower.includes('nam nữ') || nameLower.includes('hỗn hợp') || gender === 'MIXED') {
    return {
      badgeText: getDivisionMatchLabel(div.matchType, div.genderRestriction, labels),
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
      iconBoxClass: 'bg-purple-100/70 text-purple-600 border-purple-200',
      isDoubles: true,
    };
  }
  if (nameLower.includes('nữ') || gender === 'FEMALE') {
    return {
      badgeText: getDivisionMatchLabel(div.matchType, div.genderRestriction, labels),
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
      iconBoxClass: 'bg-rose-100/70 text-rose-600 border-rose-200',
      isDoubles,
    };
  }
  if (nameLower.includes('nam') || gender === 'MALE') {
    return {
      badgeText: getDivisionMatchLabel(div.matchType, div.genderRestriction, labels),
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
      iconBoxClass: 'bg-sky-100/70 text-sky-600 border-sky-200',
      isDoubles,
    };
  }
  return {
    badgeText: getDivisionMatchLabel(div.matchType, div.genderRestriction, labels),
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    iconBoxClass: 'bg-slate-100 text-slate-600 border-slate-200',
    isDoubles,
  };
}

function getManageSectionFromTab(tab: string | null): ManageSection | null {
  if (!tab || tab === 'operations') return null;
  if (['basic', 'schedule', 'registration', 'bracket', 'court_schedule', 'livestream', 'finance', 'permissions'].includes(tab)) {
    return tab as Exclude<ManageSection, 'overview'>;
  }
  return null;
}

export default function TournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const s = useManageState(id);
  const translate = useTranslations('OrganizerManage');
  const displayTranslate = useTranslations('TournamentDisplay');
  const ruleTranslate = useTranslations('TournamentDetail');
  const locale = useLocale();
  const displayLabels: TournamentDisplayLabels = {
    maleGender: displayTranslate('maleGender'),
    femaleGender: displayTranslate('femaleGender'),
    mixedGender: displayTranslate('mixedGender'),
    singlesFormat: displayTranslate('singlesFormat'),
    doublesFormat: displayTranslate('doublesFormat'),
    mixedDoublesFormat: displayTranslate('mixedDoublesFormat'),
    unknownFormat: displayTranslate('unknownFormat'),
    bracketSingleElimination: displayTranslate('bracketSingleElimination'),
    bracketDoubleElimination: displayTranslate('bracketDoubleElimination'),
    bracketRoundRobin: displayTranslate('bracketRoundRobin'),
    bracketGroupStageKnockout: displayTranslate('bracketGroupStageKnockout'),
    unknownBracket: displayTranslate('unknownBracket'),
  };
  const getDisplayFormatLabel = (matchType?: string | null, genderRestriction?: string | null) =>
    getDivisionMatchLabel(matchType, genderRestriction, displayLabels);
  const getDisplayBracketLabel = (bracketType?: string | null) =>
    getDivisionBracketLabel(bracketType, displayLabels);
  const getDisplayDivisionName = (division: { name: string; matchType?: string | null; genderRestriction?: string | null }) => {
    const generatedNames = new Set(['Đơn Nam', 'Đơn Nữ', 'Đôi Nam', 'Đôi Nữ', 'Đôi Nam Nữ']);
    return generatedNames.has(division.name.trim())
      ? getDisplayFormatLabel(division.matchType, division.genderRestriction)
      : division.name;
  };
  const getLocalizedFormatOptionLabel = (value: string) => translate(`createDivision.matchFormat.${value}`);
  const getDefaultDivisionName = () => {
    const option = s.availableMatchFormatOptions.find((item) => item.value === 'MALE_DOUBLES') ?? s.availableMatchFormatOptions[0];
    return option ? getLocalizedFormatOptionLabel(option.value) : '';
  };
  const getDivisionEditorName = () => {
    const option = s.availableMatchFormatOptions.find((item) => item.value === s.newDivisionMatchType);
    return option && s.newDivisionName === getLocalizedFormatOptionLabel(option.value)
      ? getLocalizedFormatOptionLabel(option.value)
      : s.newDivisionName;
  };
  const bracketSectionRef = useRef<HTMLDivElement | null>(null);
  const courtOperatingStart = '08:00';
  const courtOperatingEnd = '22:00';
  const [isCourtWorkspaceFullscreen, setIsCourtWorkspaceFullscreen] = useState(false);
  const [activeSection, setActiveSection] = useState<ManageSection>('overview');
  const [isManageSidebarOpen, setIsManageSidebarOpen] = useState(false);
  const manageMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const sidebarWasOpenRef = useRef(false);

  useEffect(() => {
    const querySection = getManageSectionFromTab(new URLSearchParams(window.location.search).get('tab'));
    // URL state is an external navigation input; sync it after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (querySection) setActiveSection(querySection);
  }, [id]);

  useEffect(() => {
    if (!isManageSidebarOpen) {
      if (sidebarWasOpenRef.current) manageMenuButtonRef.current?.focus();
      sidebarWasOpenRef.current = false;
      return undefined;
    }

    sidebarWasOpenRef.current = true;
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsManageSidebarOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const sidebar = document.querySelector<HTMLElement>('[data-manage-sidebar]');
      if (!sidebar) return;
      const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-manage-sidebar] button')?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isManageSidebarOpen]);

  useEffect(() => {
    if (!isCourtWorkspaceFullscreen) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCourtWorkspaceFullscreen(false);
    };
    document.addEventListener('keydown', handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isCourtWorkspaceFullscreen]);

  const handleChecklistNavigate = (target: {
    tab: 'basic' | 'schedule' | 'registration' | 'bracket' | 'finance' | 'permissions' | 'livestream';
    basicSubTab?: 'general' | 'branding' | 'prizes' | 'contact' | 'sponsors';
    elementId?: string;
    openCreateDivision?: boolean;
  }) => {
    setActiveSection(target.tab);
    s.setActiveTab(target.tab);
    if (target.basicSubTab) {
      s.setBasicSubTab(target.basicSubTab);
    }
    if (target.openCreateDivision && s.divisions.length === 0) {
      s.resetDivisionEditor(getDefaultDivisionName());
      s.setIsCreateDivisionModalOpen(true);
    }

    setTimeout(() => {
      if (target.elementId) {
        const el = document.getElementById(target.elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-rose-500', 'ring-offset-4', 'animate-pulse');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-rose-500', 'ring-offset-4', 'animate-pulse');
          }, 3000);

          const focusable = el.querySelector<HTMLElement>('input, textarea, button, select') || (el instanceof HTMLElement && typeof el.focus === 'function' ? el : null);
          focusable?.focus?.();
        }
      }
    }, 150);
  };

  const handleManageNavigation = (target: ManageNavigationTarget) => {
    setActiveSection(target.section);
    if (target.section !== 'overview') s.setActiveTab(target.section);
    if (target.basicSubTab) s.setBasicSubTab(target.basicSubTab);
    setIsManageSidebarOpen(false);

    // Only scroll if an explicit deep-target element (targetId) is specified, do not jump/scroll page otherwise
    if (target.targetId) {
      setTimeout(() => {
        const el = document.getElementById(target.targetId!);
        if (el) {
          const navHeight = 90;
          const rect = el.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetTop = rect.top + scrollTop - navHeight;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const sportPresets = getSportRulePresets(s.sportRuleKind, ruleTranslate);
  const selectedDivision = s.divisions.find((d) => d.id === s.selectedDivisionId);
  const lockRuleView = resolveSportRuleView(selectedDivision?.roundConfig, s.sportRuleKind);

  if (s.isLoading) return (
    <div className="min-h-screen bg-slate-50 py-3 md:py-4">
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:gap-6" aria-busy="true" aria-live="polite">
        <div className="hidden w-[272px] shrink-0 space-y-4 lg:block">
          <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="h-[320px] animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex min-h-28 items-center justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <LoadingSpinner className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-500">{translate('loading')}</p>
            </div>
          </div>
          <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
          </div>
          <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
  const pendingRefereeCount = s.referees.filter((ref) => ref.status === 'INVITED').length;
  const sportPresentation = getSportRulePresentation(s.sportRuleKind, ruleTranslate);
  const supportsTiebreakInput = s.sportRuleKind === 'TENNIS' || s.sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const isPickleballSideOut = s.sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const scoreGuidance = getScoreEntryGuidance(s.sportRuleKind, ruleTranslate);


  if (!s.tournament) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
      <div className="max-w-md bg-white p-8 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">{translate('notFoundTitle')}</h2>
        <p className="text-slate-500 mt-2">{translate('notFoundDescription')}</p>
      </div>
    </div>
  );

  const tournament = s.tournament;

  const buildPublicTournamentUrl = (tab?: 'bracket') => {
    const params = new URLSearchParams();

    if (tab) {
      params.set('tab', tab);
    }

    if (s.selectedDivisionId) {
      params.set('divisionId', s.selectedDivisionId);
    }

    const query = params.toString();
    return `/tournaments/${tournament.id}${query ? `?${query}` : ''}`;
  };

  const handleOpenManageBracket = () => {
    setActiveSection('bracket');
    if (s.activeTab !== 'bracket') {
      s.setActiveTab('bracket');
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bracketSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
  };

  const tournamentStatusLabel = getTournamentStatusLabel(tournament.status, {
    DRAFT: translate('status.statusDraft'),
    PENDING_APPROVAL: translate('status.statusPendingApproval'),
    PENDING_DELETE: translate('status.statusPendingDelete'),
    UPCOMING: translate('status.statusUpcoming'),
    REGISTRATION_OPEN: translate('status.statusRegistrationOpen'),
    REGISTRATION_CLOSED: translate('status.statusRegistrationClosed'),
    IN_PROGRESS: translate('status.statusInProgress'),
    COMPLETED: translate('status.statusCompleted'),
    CANCELLED: translate('status.statusCancelled'),
  });

  return (
    <div className="min-h-screen bg-slate-50 py-3 md:py-4">
      <div className="w-full">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <TournamentManageSidebar
            tournament={tournament}
            activeSection={activeSection}
            basicSubTab={s.basicSubTab}
            divisionCount={s.divisions.length}
            pendingRefereeCount={pendingRefereeCount}
            matchCount={s.matches.length}
            isOpen={isManageSidebarOpen}
            menuButtonRef={manageMenuButtonRef}
            onOpen={() => setIsManageSidebarOpen(true)}
            onClose={() => setIsManageSidebarOpen(false)}
            onNavigate={handleManageNavigation}
          />

          <main className="min-w-0 flex-1">
            {/* Consolidated Executive Header Card with Tournament Hero Banner */}
            <div className="mb-4 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              {/* Top Hero Banner */}
              <div className="relative w-full h-[160px] sm:h-[220px] md:h-[280px] bg-slate-100 overflow-hidden border-b border-slate-100">
                <GalleryCarousel
                  images={tournament.galleryImages && tournament.galleryImages.length > 0 ? tournament.galleryImages : []}
                  defaultBanner={tournament.bannerUrl || undefined}
                  categoryName={tournament.category?.name}
                  tournamentName={tournament.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left side: Sport + Status Pill + Title + Dot-separated meta */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-blue-700 border border-blue-200/80">
                      {tournament.category?.name || 'Pickleball'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${getTournamentStatusClassName(tournament.status)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {tournamentStatusLabel}
                    </span>
                  </div>

                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl line-clamp-1">
                    {tournament.name}
                  </h1>

                  {/* Dot-separated meta row */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {tournament.startDate ? formatDateTime(tournament.startDate) : 'Chưa xếp ngày'}
                      {tournament.endDate ? ` – ${formatDateTime(tournament.endDate)}` : ''}
                    </span>

                    {(tournament.venue?.name || tournament.locationAddress) && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1 truncate max-w-xs text-slate-700">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{tournament.venue?.name || tournament.locationAddress}</span>
                        </span>
                      </>
                    )}

                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {Number(tournament.entryFee) > 0
                        ? `${formatCurrency(tournament.entryFee)} / VĐV`
                        : 'Miễn phí tham gia'}
                    </span>
                  </div>
                </div>

                {/* Right side: Consolidated Action Buttons */}
                <div className="shrink-0 flex items-center flex-wrap gap-2 pt-1 lg:pt-0">
                  {/* Primary Operation Button */}
                  <Button
                    size="sm"
                    onClick={() => { window.location.href = `/organizer/tournaments/${tournament.id}/ops`; }}
                    className="h-8 bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    <Zap className="mr-1.5 h-3.5 w-3.5 text-blue-200" />
                    {translate('status.operations')}
                  </Button>

                  {/* Dynamic Step Transition Button */}
                  {(() => {
                    if (tournament.status === 'REGISTRATION_OPEN') {
                      return (
                        <Button
                          size="sm"
                          onClick={() => s.handleTournamentStepTransition('UPCOMING')}
                          disabled={s.isLoading}
                          className="h-8 bg-amber-500 hover:bg-amber-600 px-3 text-xs font-bold text-white shadow-sm transition-colors"
                        >
                          <ChevronRight className="mr-1 h-3.5 w-3.5" /> Khóa đăng ký
                        </Button>
                      );
                    }
                    if (isTournamentUpcoming(tournament.status) || isTournamentRegistrationClosed(tournament.status)) {
                      return (
                        <Button
                          size="sm"
                          onClick={s.handleConfirmOpen}
                          disabled={s.isLoading || s.isOpening}
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-bold text-white shadow-sm transition-colors"
                        >
                          <Play className="mr-1 h-3.5 w-3.5 fill-current" /> Khai mạc giải
                        </Button>
                      );
                    }
                    if (['IN_PROGRESS', 'ONGOING', 'LIVE', 'ACTIVE'].includes(tournament.status)) {
                      return (
                        <Button
                          size="sm"
                          onClick={() => s.setIsEndModalOpen(true)}
                          disabled={s.isLoading || s.isEnding}
                          className="h-8 bg-indigo-600 hover:bg-indigo-700 px-3 text-xs font-bold text-white shadow-sm transition-colors"
                        >
                          <Trophy className="mr-1 h-3.5 w-3.5" /> Hoàn tất giải
                        </Button>
                      );
                    }
                    return null;
                  })()}

                  {/* Single Primary Export button if completed */}
                  {isTournamentCompleted(tournament.status) && (
                    <Button
                      size="sm"
                      onClick={() => exportTournamentResultsExcel(tournament.name, s.matches, locale)}
                      disabled={s.matches.length === 0}
                      className="h-8 bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Xuất kết quả
                    </Button>
                  )}

                  {/* Secondary actions grouped into Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Khác <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={handleOpenManageBracket} className="cursor-pointer text-xs font-medium">
                        <Trophy className="mr-2 h-3.5 w-3.5 text-amber-500" /> Xem bảng đấu
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(buildPublicTournamentUrl(), '_blank')} className="cursor-pointer text-xs font-medium">
                        <ExternalLink className="mr-2 h-3.5 w-3.5 text-slate-500" /> Trang giải công khai
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Bottom Row: Inline Metrics Chip Strip & Mini Stepper */}
              {(() => {
                const totalMatches = s.tournament._summary?.matchesTotal ?? s.matches.length;
                const completedMatches = s.tournament._summary?.matchesCompleted ?? s.matches.filter((m) => m.status === 'COMPLETED').length;
                const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

                const stepIdx = isTournamentCompleted(tournament.status) ? 3 :
                  (['IN_PROGRESS', 'ONGOING', 'LIVE', 'ACTIVE'].includes(tournament.status)) ? 2 :
                  (isTournamentRegistrationClosed(tournament.status) || isTournamentUpcoming(tournament.status)) ? 1 : 0;

                const stepperSteps = [
                  { label: 'Đăng ký', icon: Users },
                  { label: 'Lịch thi đấu', icon: GitMerge },
                  { label: 'Đang diễn ra', icon: Play },
                  { label: 'Hoàn tất', icon: Trophy },
                ];

                return (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
                    {/* Compact Metrics Chips Strip */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 font-medium text-slate-700 border border-slate-200/70">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        <strong>{s.tournament._summary?.participantCount ?? s.participants.length}</strong> VĐV / đội
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 font-medium text-slate-700 border border-slate-200/70">
                        <Activity className="h-3.5 w-3.5 text-amber-600" />
                        <strong>{completedMatches}/{totalMatches}</strong> trận ({progress}%)
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 font-medium text-slate-700 border border-slate-200/70">
                        <Layers className="h-3.5 w-3.5 text-emerald-600" />
                        <strong>{s.divisions.length}</strong> nội dung
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 font-medium text-slate-700 border border-slate-200/70">
                        <MapPin className="h-3.5 w-3.5 text-violet-600" />
                        <strong>{s.courts.length}</strong> sân
                      </span>
                    </div>

                    {/* Timeline Circular Stepper Indicators */}
                    <div className="flex items-center bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      {stepperSteps.map((step, idx) => {
                        const isDone = idx < stepIdx || isTournamentCompleted(tournament.status);
                        const isCurrent = idx === stepIdx && !isTournamentCompleted(tournament.status);
                        const StepIcon = step.icon;

                        return (
                          <div key={step.label} className="flex items-center">
                            <div
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
                                isCurrent
                                  ? 'bg-white shadow-xs border border-blue-200/80'
                                  : isDone
                                  ? 'hover:bg-white/60'
                                  : 'opacity-70'
                              }`}
                            >
                              {/* Circular Step Badge */}
                              <div
                                className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-transform ${
                                  isDone
                                    ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/20'
                                    : isCurrent
                                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30 ring-3 ring-blue-500/20'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {isDone ? (
                                  <Check className="h-3 w-3 stroke-[3]" />
                                ) : (
                                  <span>{idx + 1}</span>
                                )}
                              </div>

                              {/* Label & Icon */}
                              <div className="flex items-center gap-1">
                                <StepIcon
                                  className={`h-3 w-3 ${
                                    isDone
                                      ? 'text-emerald-600'
                                      : isCurrent
                                      ? 'text-blue-600 font-semibold'
                                      : 'text-slate-400'
                                  }`}
                                />
                                <span
                                  className={`text-[11px] font-semibold whitespace-nowrap ${
                                    isCurrent
                                      ? 'text-blue-700 font-bold'
                                      : isDone
                                      ? 'text-slate-700'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            </div>

                            {/* Connecting Line Between Steps */}
                            {idx < stepperSteps.length - 1 && (
                              <div
                                className={`h-0.5 w-3 sm:w-4 mx-0.5 rounded-full transition-colors ${
                                  idx < stepIdx || isTournamentCompleted(tournament.status)
                                    ? 'bg-emerald-400'
                                    : 'bg-slate-200'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>

            {/* Checklist & Transition Controls (from Stepper) */}
            <TournamentStepper
              tournament={s.tournament}
              onPublish={s.publishFeeAmount > 0 ? s.handlePayPublishFee : s.handlePublish}
              onNextStep={s.handleTournamentStepTransition}
              publishFeeAmount={s.publishFeeAmount}
              isLoading={s.isLoading || s.isPayingPublishFee}
              onOpenTournament={s.handleConfirmOpen}
              isOpening={s.isOpening}
              isEndModalOpen={s.isEndModalOpen}
              setIsEndModalOpen={s.setIsEndModalOpen}
              handleConfirmEnd={s.handleConfirmEnd}
              isEnding={s.isEnding}
              endChecklist={s.endChecklist}
              participants={s.participants}
              divisions={s.divisions}
              matches={s.matches}
              onChecklistNavigate={handleChecklistNavigate}
            />

            {/* Divisions Selector: Sleek Horizontal Scrollable Cards */}
            <div id="manage-divisions-section" className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">{translate('divisions.title')}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200">
                    {s.divisions.length}/20
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => { s.resetDivisionEditor(getDefaultDivisionName()); s.setIsCreateDivisionModalOpen(true); }}
                  disabled={s.divisions.length >= 20 || isTournamentRegistrationClosed(s.tournament.status) || s.tournament.isRegistrationLocked || ['IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(s.tournament.status)}
                  className="font-bold text-xs flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap disabled:opacity-50"
                  title={s.divisions.length >= 20 ? translate('divisions.maxLimitTitle') : translate('divisions.addTitle')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {s.divisions.length >= 20 ? translate('divisions.maxReached') : translate('divisions.add')}
                </Button>
              </div>

              {s.divisions.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                  {s.divisions.map(div => {
                    const isActive = div.id === s.selectedDivisionId;
                    const bracketFormatLabel = getDisplayBracketLabel(div.bracketType);
                    const genderMeta = getDivisionGenderMeta(div, displayLabels);
                    const IconComponent = genderMeta.isDoubles ? Users : User;
                    const divMatches = s.matches.filter((m) => m.divisionId === div.id);
                    const divCompleted = divMatches.filter((m) => m.status === 'COMPLETED').length;
                    const divTotal = divMatches.length;

                    return (
                      <div
                        key={div.id}
                        className={`group relative flex min-w-[240px] max-w-[280px] shrink-0 items-stretch justify-between rounded-xl border transition-all duration-150 ${
                          isActive
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <button 
                          type="button" 
                          onClick={() => s.setSelectedDivisionId(div.id)}
                          className="flex items-start gap-2.5 p-3 text-left cursor-pointer flex-1 min-w-0"
                          title={translate('divisions.cardClickTitle')}
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${genderMeta.iconBoxClass}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className={`block truncate text-xs font-bold tracking-tight ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>
                              {getDisplayDivisionName(div)}
                            </span>

                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${genderMeta.badgeClass}`}>
                                {genderMeta.badgeText}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 truncate">
                                {bracketFormatLabel}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                              <span>{div.maxParticipants ? `${div.maxParticipants} VĐV` : 'VĐV tự do'}</span>
                              <span className="font-bold text-slate-700">
                                {divTotal > 0 ? `${divCompleted}/${divTotal} trận` : 'Chưa có trận'}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Action buttons (Edit / Delete) */}
                        <div className="flex flex-col justify-between border-l border-slate-100 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button" 
                            onClick={() => s.openDivisionEditor(div)}
                            disabled={!s.tournament || isTournamentRegistrationClosed(s.tournament?.status ?? '') || s.tournament?.isRegistrationLocked || ['IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(s.tournament?.status ?? '')}
                            className="p-1 rounded transition-colors cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-30"
                            title={translate('divisions.editTitle')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            type="button" 
                            onClick={() => { s.requestDeleteDivision(div); }}
                            className="p-1 rounded transition-colors cursor-pointer text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title={translate('divisions.deleteTitle')}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Horizontal Tabs Bar (Chuẩn phong cách trực quan như trang chi tiết nhưng trang bị đầy đủ nghiệp vụ BTC) */}
            <div className="flex overflow-x-auto gap-1.5 sm:gap-2 mb-4 no-scrollbar pb-1">
              {[
                { id: 'overview' as const, label: 'Tổng quan', icon: LayoutDashboard },
                { id: 'registration' as const, label: 'Đăng ký & VĐV', icon: Users, badge: s.participants.length },
                { id: 'bracket' as const, label: 'Sơ đồ & Bảng đấu', icon: Trophy },
                { id: 'court_schedule' as const, label: 'Lịch thi đấu & Sân', icon: CalendarDays },
                { id: 'basic' as const, label: 'Thông tin & Điều lệ', icon: Info },
                { id: 'schedule' as const, label: 'Địa điểm & Cụm sân', icon: MapPin },
                { id: 'finance' as const, label: 'Tài chính & Lệ phí', icon: DollarSign },
                { id: 'permissions' as const, label: 'Trọng tài & Phân quyền', icon: ShieldCheck, badge: pendingRefereeCount > 0 ? pendingRefereeCount : undefined },
                { id: 'livestream' as const, label: 'Livestream', icon: Video },
              ].map((tab) => {
                const isActive = activeSection === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleManageNavigation({ section: tab.id })}
                    className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <TabIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    {tab.badge != null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div id="manage-content-area" className="scroll-mt-24">
            {activeSection === 'overview' ? (
          <TournamentManageOverview
            tournament={tournament}
            divisions={s.divisions}
            selectedDivisionId={s.selectedDivisionId}
            participants={s.participants}
            matches={s.matches}
            courts={s.courts}
            statusLabel={tournamentStatusLabel}
            onOpenOperations={() => { window.location.href = `/organizer/tournaments/${tournament.id}/ops`; }}
            onOpenRegistration={() => handleManageNavigation({ section: 'registration' })}
            onOpenSchedule={() => handleManageNavigation({ section: 'court_schedule' })}
            onSelectDivision={(divisionId) => s.setSelectedDivisionId(divisionId)}
            onOpenBracket={handleOpenManageBracket}
          />
        ) : (
          <div className="space-y-6">
        {/* Detail content */}
        {activeSection === 'basic' && <BasicInfoTab id={id} tournament={s.tournament} categories={s.categories}
          validationField={s.validationField}
          basicSubTab={s.basicSubTab} setBasicSubTab={s.setBasicSubTab}
          name={s.name} setName={s.setName} categoryId={s.categoryId} setCategoryId={s.setCategoryId}
          description={s.description} setDescription={s.setDescription}
          logoUrl={s.logoUrl} setLogoUrl={s.setLogoUrl} bannerUrl={s.bannerUrl} setBannerUrl={s.setBannerUrl}
          hideFeaturedCardText={s.hideFeaturedCardText} setHideFeaturedCardText={s.setHideFeaturedCardText}
          newGalleryUrl={s.newGalleryUrl} setNewGalleryUrl={s.setNewGalleryUrl}
          isAddingImage={s.isAddingImage} setIsAddingImage={s.setIsAddingImage}
          prizeDescription={s.prizeDescription} setPrizeDescription={s.setPrizeDescription}
          contactInfo={s.contactInfo} setContactInfo={s.setContactInfo}
          isSavingConfig={s.isSavingConfig} isDeleting={s.isDeleting}
          handleDeleteTournament={s.handleDeleteTournament} handleSaveBasicInfo={s.handleSaveBasicInfo}
          fetchTournamentData={s.fetchTournamentData}
          divisions={s.divisions} selectedDivisionId={s.selectedDivisionId}
          isLimitEnabled={s.isLimitEnabled} setIsLimitEnabled={s.setIsLimitEnabled}
          maxParticipants={s.maxParticipants} setMaxParticipants={s.setMaxParticipants}
          matchType={s.matchType} setMatchType={s.setMatchType}
          setsToWin={s.setsToWin} setSetsToWin={s.setSetsToWin}
          pointsPerSet={s.pointsPerSet} setPointsPerSet={s.setPointsPerSet}
          winByTwo={s.winByTwo} setWinByTwo={s.setWinByTwo} />}

        {activeSection === 'schedule' && (
          <div className="space-y-6">
            <ScheduleTab
              tournament={s.tournament}
              bracket={s.bracket}
              venues={s.venues}
              tournamentVenues={s.tournamentVenues}
              handleCreateTournamentVenue={s.handleCreateTournamentVenue}
              handleUpdateTournamentVenue={s.handleUpdateTournamentVenue}
              handleSetDefaultTournamentVenue={s.handleSetDefaultTournamentVenue}
              handleDeleteTournamentVenue={s.handleDeleteTournamentVenue}
              handleAddVenueCourtDirect={s.handleAddVenueCourtDirect}
              handleAddVenueCourtsBatchDirect={s.handleAddVenueCourtsBatchDirect}
              handleRemoveVenueCourtDirect={s.handleRemoveVenueCourtDirect}
              validationField={s.validationField}
              customVenueName={s.customVenueName}
              setCustomVenueName={s.setCustomVenueName}
              customVenueAddress={s.customVenueAddress}
              setCustomVenueAddress={s.setCustomVenueAddress}
              provinceCode={s.provinceCode}
              setProvinceCode={s.setProvinceCode}
              wardCode={s.wardCode}
              setWardCode={s.setWardCode}
              provinces={s.provinces}
              wards={s.wards}
              setWards={s.setWards}
              startDate={s.startDate}
              setStartDate={s.setStartDate}
              endDate={s.endDate}
              setEndDate={s.setEndDate}
              isSavingConfig={s.isSavingConfig}
              handleSaveScheduleDetails={s.handleSaveScheduleDetails}
            />
          </div>
        )}

        {activeSection === 'registration' && <RegistrationTab tournament={s.tournament}
          inviteLink={s.inviteLink}
          mockNamesText={s.mockNamesText} setMockNamesText={s.setMockNamesText}
          isSeedingMock={s.isSeedingMock} isClearingMock={s.isClearingMock}
          wildcardEmailOrPhone={s.wildcardEmailOrPhone} setWildcardEmailOrPhone={s.setWildcardEmailOrPhone}
          wildcardTeamName={s.wildcardTeamName} setWildcardTeamName={s.setWildcardTeamName}
          wildcardPartnerEmailOrPhone={s.wildcardPartnerEmailOrPhone} setWildcardPartnerEmailOrPhone={s.setWildcardPartnerEmailOrPhone}
          isAssigningWildcard={s.isAssigningWildcard}
          divisions={s.divisions} selectedDivisionId={s.selectedDivisionId} setSelectedDivisionId={s.setSelectedDivisionId}
          participants={s.participants}
          activeParticipantActionId={s.activeParticipantActionId}
          visibility={s.visibility}
          setVisibility={s.setVisibility}
          registrationMode={s.registrationMode}
          setRegistrationMode={s.setRegistrationMode}
          registrationStartDate={s.registrationStartDate} setRegistrationStartDate={s.setRegistrationStartDate}
          registrationEndDate={s.registrationEndDate} setRegistrationEndDate={s.setRegistrationEndDate}
          isSavingConfig={s.isSavingConfig}
          publishFeeAmount={s.publishFeeAmount}
          handlePublish={s.publishFeeAmount > 0 ? s.handlePayPublishFee : s.handlePublish}
          handleOpenLockModal={s.handleOpenLockModal}
          handleSaveRegistrationSettings={s.handleSaveRegistrationSettings}
          handleRegenerateInviteCode={s.handleRegenerateInviteCode}
          handleApproveParticipant={s.handleApproveParticipant}
          handleRejectParticipant={s.handleRejectParticipant}
          handleKickParticipant={s.handleKickParticipant}
          handleSeedMockData={s.handleSeedMockData} handleClearMockData={s.handleClearMockData}
          handleAssignWildcard={s.handleAssignWildcard}
          eloEnabled={s.eloEnabled} setEloEnabled={s.setEloEnabled}
          eloMin={s.eloMin} setEloMin={s.setEloMin}
          eloMax={s.eloMax} setEloMax={s.setEloMax}
          eloMaxCombined={s.eloMaxCombined} setEloMaxCombined={s.setEloMaxCombined}
          eloMaxGap={s.eloMaxGap} setEloMaxGap={s.setEloMaxGap}
          seedingMethod={s.seedingMethod} setSeedingMethod={s.setSeedingMethod}
          isAutoSeeding={s.isAutoSeeding}
          handleAutoSeed={s.handleAutoSeed}
          handleSwapSeeds={s.handleSwapSeeds}
          handleReorderSeeds={s.handleReorderSeeds}
          refetchDivisionData={s.refetchDivisionData}
          onCopyInviteLink={() => { navigator.clipboard.writeText(s.inviteLink); toast.success(translate('toast.copiedInvite')); }} />}

        {activeSection === 'bracket' && (
          <div ref={bracketSectionRef} className="space-y-6">
            <BracketTab key={s.selectedDivisionId || 'no-division'} tournament={s.tournament} bracket={s.bracket}
              selectedDivisionId={s.selectedDivisionId} participants={s.participants}
              isGeneratingBracket={s.isGeneratingBracket} handleGenerateBracket={s.handleGenerateBracket}
              handleOpenScheduling={s.handleOpenScheduling} handleOpenRoundModal={s.handleOpenRoundModal}
              refetchDivisionData={s.refetchDivisionData}
              onBracketPersisted={(updatedMatches) => s.setBracket((current) => mergeBracketMatches(current, updatedMatches) ?? current)}
              isLimitEnabled={s.isLimitEnabled} setIsLimitEnabled={s.setIsLimitEnabled}
              maxParticipants={s.maxParticipants} setMaxParticipants={s.setMaxParticipants}
              matchType={s.matchType} setMatchType={s.setMatchType}
              availableMatchFormatOptions={s.availableMatchFormatOptions}
              selectedCategory={s.selectedCategory}
              sportRuleKind={s.sportRuleKind} setSportRuleKind={s.setSportRuleKind}
              setsToWin={s.setsToWin} setSetsToWin={s.setSetsToWin}
              pointsPerSet={s.pointsPerSet} setPointsPerSet={s.setPointsPerSet}
              winByTwo={s.winByTwo} setWinByTwo={s.setWinByTwo}
              maxDeucePoints={s.maxDeucePoints} setMaxDeucePoints={s.setMaxDeucePoints}
              superTiebreakEnabled={s.superTiebreakEnabled} setSuperTiebreakEnabled={s.setSuperTiebreakEnabled}
              superTiebreakSetIndex={s.superTiebreakSetIndex} setSuperTiebreakSetIndex={s.setSuperTiebreakSetIndex}
              superTiebreakPoints={s.superTiebreakPoints} setSuperTiebreakPoints={s.setSuperTiebreakPoints}
              tiebreakerMode={s.tiebreakerMode} setTiebreakerMode={s.setTiebreakerMode}
              roundsToPlay={s.roundsToPlay} setRoundsToPlay={s.setRoundsToPlay}
              bracketType={s.bracketTypeState}
              setBracketTypeState={s.setBracketTypeState}
              tournamentFormat={s.bracketType ?? undefined}
              rrWinPoints={s.rrWinPoints} setRrWinPoints={s.setRrWinPoints}
              rrLossPoints={s.rrLossPoints} setRrLossPoints={s.setRrLossPoints}
              rrTiebreakerRule={s.rrTiebreakerRule} setRrTiebreakerRule={s.setRrTiebreakerRule}
              numGroups={s.numGroups} setNumGroups={s.setNumGroups}
              teamsPerGroup={s.teamsPerGroup} setTeamsPerGroup={s.setTeamsPerGroup}
              teamsAdvancing={s.teamsAdvancing} setTeamsAdvancing={s.setTeamsAdvancing}
              divisionRoundConfig={s.divisions.find((division) => division.id === s.selectedDivisionId)?.roundConfig ?? null}
              gskPlayoffType={s.gskPlayoffType} setGskPlayoffType={s.setGskPlayoffType}
              gskSeedingType={s.gskSeedingType} setGskSeedingType={s.setGskSeedingType}
              gskRoundsToPlay={s.gskRoundsToPlay} setGskRoundsToPlay={s.setGskRoundsToPlay}
              handleAdvanceStandings={s.handleAdvanceStandings}
              isAdvancingStandings={s.isAdvancingStandings}
              isLiteMode={s.isLiteMode}
              setIsLiteMode={s.setIsLiteMode}
              courts={s.courts}
              divisions={s.divisions}
              venues={s.venues}
              currentVenueId={s.tournament?.venueId || undefined}
              defaultDate={s.startDate}
              onRefetchData={s.refetchDivisionData}
            />
          </div>
        )}

        {/* Tab Lịch thi đấu & Xếp sân độc lập */}
        {activeSection === 'court_schedule' && (
          <div className="space-y-6">
            {s.courts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <MapPin className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <h4 className="text-base font-bold text-slate-800">Chưa có sân thi đấu</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Vui lòng qua tab &quot;Địa điểm & Sân&quot; để thiết lập ít nhất 1 sân thi đấu trước khi xếp lịch.
                </p>
                <Button
                  type="button"
                  onClick={() => handleManageNavigation({ section: 'schedule' })}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  Thiết lập sân bãi ngay
                </Button>
              </div>
            ) : (
              <CourtWorkspace
                tournamentStatus={s.tournament?.status}
                venueName={s.venues.find((venue) => venue.id === s.tournament?.venueId)?.name}
                courts={s.courts}
                divisions={s.divisions}
                matches={s.matches}
                defaultDivisionId="all"
                defaultDate={s.startDate}
                defaultOperatingStart={courtOperatingStart}
                defaultOperatingEnd={courtOperatingEnd}
                sportRuleKind={s.sportRuleKind}
                setsToWin={s.divisions.find((division) => division.id === s.selectedDivisionId)?.roundConfig?.max_sets ?? s.setsToWin}
                preview={s.schedulePlanPreview}
                isPreviewing={s.isPreviewingSchedulePlan}
                onPreview={s.handlePreviewSchedulePlan}
                onPreviewWithAi={s.handlePreviewScheduleWithAi}
                aiScheduleIntent={s.aiScheduleIntent}
                isPlanningScheduleWithAi={s.isPlanningScheduleWithAi}
                onOpenMatch={(matchId) => {
                  const fullMatch = s.matches.find((candidate: (typeof s.matches)[number]) => candidate.id === matchId);
                  if (fullMatch) s.handleOpenScheduling(fullMatch);
                }}
                onSaveScheduleDirect={s.handleSaveScheduleDirect}
                onRefetchData={s.refetchDivisionData}
              />
            )}
          </div>
        )}

        {/* Global Fullscreen Workspace Dialog */}
        {s.courts.length > 0 && isCourtWorkspaceFullscreen && (
          <div className="fixed inset-0 z-[70] flex min-h-screen flex-col overflow-hidden bg-slate-100" role="dialog" aria-modal="true" aria-labelledby="fullscreen-workspace-title">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">{translate('workspaceFullscreen')}</p>
                <h2 id="fullscreen-workspace-title" className="truncate text-base font-bold text-slate-900 md:text-lg">{s.venues.find((venue) => venue.id === s.tournament?.venueId)?.name || translate('venueNotSet')}</h2>
              </div>
              <Button type="button" variant="outline" onClick={() => setIsCourtWorkspaceFullscreen(false)} className="shrink-0 border-slate-300 bg-white text-slate-800">
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                {translate('exitWorkspace')}
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-4 md:py-6">
              <div className="w-full">
                <CourtWorkspace
                  tournamentStatus={s.tournament?.status}
                  bracket={s.bracket}
                  venueName={s.venues.find((venue) => venue.id === s.tournament?.venueId)?.name}
                  courts={s.courts}
                  divisions={s.divisions}
                  matches={s.matches}
                  defaultDivisionId="all"
                  defaultDate={s.startDate}
                  defaultOperatingStart={courtOperatingStart}
                  defaultOperatingEnd={courtOperatingEnd}
                  sportRuleKind={s.sportRuleKind}
                  setsToWin={s.divisions.find((division) => division.id === s.selectedDivisionId)?.roundConfig?.max_sets ?? s.setsToWin}
                  preview={s.schedulePlanPreview}
                  isPreviewing={s.isPreviewingSchedulePlan}
                  onPreview={s.handlePreviewSchedulePlan}
                  onPreviewWithAi={s.handlePreviewScheduleWithAi}
                  aiScheduleIntent={s.aiScheduleIntent}
                  isPlanningScheduleWithAi={s.isPlanningScheduleWithAi}
                  onOpenMatch={(matchId) => {
                    const fullMatch = s.matches.find((candidate: (typeof s.matches)[number]) => candidate.id === matchId);
                    if (fullMatch) s.handleOpenScheduling(fullMatch);
                  }}
                  onSaveScheduleDirect={s.handleSaveScheduleDirect}
                  onRefetchData={s.refetchDivisionData}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'finance' && <FinanceTab tournament={s.tournament} participants={s.participants}
          entryFee={s.entryFee} setEntryFee={s.setEntryFee}
          allowEntryFees={s.feesConfig?.allowEntryFees !== false}
          isSavingConfig={s.isSavingConfig} handleSaveFinanceConfig={s.handleSaveFinanceConfig}
          handlePayPlatformFee={s.handlePayPlatformFee} isPayingPlatformFee={s.isPayingPlatformFee}
          handleRequestPayout={s.handleRequestPayout} />}

        {activeSection === 'livestream' && <LivestreamTab tournament={s.tournament} bracket={s.bracket} />}

        {activeSection === 'permissions' && <PermissionsTab id={id} tournament={s.tournament} />}
          </div>
        )}
        </div>

        {/* Stage config modal */}
        {s.selectedStage && s.selectedRoundNumber !== null && (
          <Modal open={!!s.selectedStage} onOpenChange={(open) => { if (!open) { s.setSelectedStage(null); s.setSelectedRoundNumber(null); } }}>
            <ModalContent className="bg-white rounded-lg p-6">
              <ModalHeader><ModalTitle className="text-xl font-bold text-slate-900">{translate('roundModal.title')}</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                {s.isLiteMode ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">{translate('roundModal.liteTitle')}</p>
                      <p className="mt-0.5 text-amber-800">
                        {translate('roundModal.liteDescription')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">{sportPresentation.sportLabel}: {sportPresentation.scoringLabel}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{sportPresentation.roundConfigHint}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">{translate('roundModal.quickPresetTitle')}</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {sportPresets.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              s.setStageMaxSets(preset.setsToWin * 2 - 1);
                              s.setStagePointsPerSet(preset.pointsPerSet);
                              s.setStageWinBy2Points(preset.winByTwo);
                              s.setStageMaxDeucePoints(preset.maxPoints);
                              s.setStageSuperTiebreakEnabled(preset.tiebreakPoints !== null);
                              s.setStageSuperTiebreakPoints(preset.tiebreakPoints ?? preset.pointsPerSet);
                            }}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-100"
                          >
                            <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{preset.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500">{translate('roundModal.courtLabel')}</label>
                    <input
                      type="text"
                      value={s.stageVenueId}
                      onChange={(e) => s.setStageVenueId(e.target.value)}
                      placeholder={translate('roundModal.courtPlaceholder')}
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">{translate('roundModal.defaultTimeLabel')}</label>
                    <DateTimePicker value={s.stageScheduledDate} onChange={s.setStageScheduledDate} />
                  </div>

                  {!s.isLiteMode && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500">{translate('roundModal.maxSetsLabel')}</label>
                        <select value={s.stageMaxSets} onChange={e => s.setStageMaxSets(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm">
                          <option value={1}>{translate('roundModal.oneSet')}</option><option value={3}>{translate('roundModal.threeSets')}</option><option value={5}>{translate('roundModal.fiveSets')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">{sportPresentation.setUnitLabel}</label>
                        <input type="number" value={s.stagePointsPerSet} onChange={e => s.setStagePointsPerSet(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={s.stageWinBy2Points} onChange={e => s.setStageWinBy2Points(e.target.checked)} />
                        <label className="text-xs font-bold text-slate-500">{sportPresentation.winByTwoLabel}</label>
                      </div>
                      {s.stageWinBy2Points && (
                        <div>
                          <label className="text-xs font-bold text-slate-500">{sportPresentation.maxScoreLabel}</label>
                          <input type="number" value={s.stageMaxDeucePoints} onChange={e => s.setStageMaxDeucePoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                      )}
                      {supportsTiebreakInput && (
                        <div>
                          <label className="text-xs font-bold text-slate-500">{sportPresentation.tiebreakLabel}</label>
                          <input type="number" value={s.stageSuperTiebreakPoints} onChange={e => s.setStageSuperTiebreakPoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                      )}
                      <div className="col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                        {translate('roundModal.summary', {
                          sets: Math.ceil(s.stageMaxSets / 2),
                          unit: s.sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set',
                          points: s.stagePointsPerSet,
                          pointUnit: s.sportRuleKind === 'TENNIS' ? 'game/set' : translate('roundModal.points'),
                          margin: s.stageWinBy2Points ? translate('roundModal.marginWinByTwo') : translate('roundModal.marginTarget'),
                          tiebreak: supportsTiebreakInput ? ` • ${sportPresentation.tiebreakLabel.toLowerCase()}: ${s.stageSuperTiebreakPoints}` : '',
                        })}
                      </div>
                      {isPickleballSideOut && (
                        <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          {translate('roundModal.sideOutSummary')}
                        </div>
                      )}
                      <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        {translate('roundModal.scoreGuidance', { target: scoreGuidance.targetSummary, examples: scoreGuidance.examples.join(' • ') })}
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500">{translate('roundModal.noteLabel')}</label>
                    <textarea value={s.stageNotificationNote} onChange={e => s.setStageNotificationNote(e.target.value)} className="min-h-20 w-full border rounded-lg p-2 text-sm" placeholder={translate('roundModal.notePlaceholder')} />
                  </div>
                </div>
                <Button onClick={s.handleSaveStageDetails} disabled={s.isSavingStage} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
                  {s.isSavingStage ? translate('roundModal.saving') : translate('roundModal.save')}
                </Button>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Lock modal */}
        {s.isLockModalOpen && (
          <Modal open={s.isLockModalOpen} onOpenChange={(open) => { if (!open) s.setIsLockModalOpen(false); }}>
            <ModalContent className="bg-white rounded-lg p-6">
              <ModalHeader><ModalTitle className="text-xl font-bold text-slate-900">{translate('lockModal.title')}</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 font-semibold">
                  {translate('lockModal.warning')}
                </div>
                {s.lockSummary && (
                  <div className="space-y-3">
                    <SummarySection title={translate('lockModal.registrationSummary')}>
                      <SummaryRow
                        label={translate('lockModal.visibilityFound')}
                        value={s.visibility === 'PRIVATE' ? translate('lockModal.privateVisibility') : translate('lockModal.publicVisibility')}
                      />
                      <SummaryRow
                        label={translate('lockModal.registrationMode')}
                        value={
                          s.registrationMode === 'APPROVAL' ? translate('lockModal.approvalMode') :
                          s.registrationMode === 'INVITE_ONLY' ? translate('lockModal.inviteOnlyMode') :
                          translate('lockModal.openMode')
                        }
                      />
                      <SummaryRow
                        label={translate('lockModal.format')}
                        value={
                          selectedDivision
                            ? getDisplayFormatLabel(selectedDivision.matchType, selectedDivision.genderRestriction)
                            : s.matchType.startsWith('SINGLES') ? translate('lockModal.singles')
                              : s.matchType.startsWith('MIXED') ? translate('lockModal.mixedDoubles')
                                : translate('lockModal.doubles')
                        }
                      />
                    <SummaryRow label={translate('lockModal.teamCountLabel')} value={translate('lockModal.teamCount', { count: s.lockSummary.totalParticipants })} />
                      <SummaryRow label={translate('lockModal.playerCountLabel')} value={translate('lockModal.playerCount', { count: s.lockSummary.totalPlayers })} />
                    </SummarySection>

                    <SummarySection title={translate('lockModal.bracketSummary')}>
                    <SummaryRow label={translate('lockModal.divisionLabel')} value={selectedDivision ? getDisplayDivisionName(selectedDivision) : '—'} />
                    <SummaryRow
                        label={translate('lockModal.bracketType')}
                        value={getDisplayBracketLabel(selectedDivision?.bracketType ?? s.bracketType)}
                      />
                    </SummarySection>

                    <SummarySection title={translate('lockModal.scoringSummary')}>
                      <SummaryRow
                        label={translate('lockModal.sportAndScoring')}
                        value={`${sportPresentation.sportLabel} – ${sportPresentation.scoringLabel}`}
                      />
                      <SummaryRow label={translate('lockModal.sets')} value={translate('lockModal.win', { sets: lockRuleView.setsToWin, bestOf: lockRuleView.bestOf })} />
                      <SummaryRow label={sportPresentation.setUnitLabel} value={`${lockRuleView.pointsPerSet}`} />
                      <SummaryRow
                        label={sportPresentation.winByTwoLabel}
                        value={lockRuleView.winByTwo ? translate('lockModal.applies') : translate('lockModal.doesNotApply')}
                      />
                      <SummaryRow label={sportPresentation.maxScoreLabel} value={`${lockRuleView.maxPoints}`} />
                      <SummaryRow label={sportPresentation.tiebreakLabel} value={`${lockRuleView.tiebreakPoints}`} />
                    </SummarySection>

                    <SummarySection title={translate('lockModal.feesSummary')}>
                      <SummaryRow
                        label={translate('lockModal.entryFee')}
                        value={
                          (selectedDivision?.entryFee ?? s.entryFee) > 0
                            ? `${(selectedDivision?.entryFee ?? s.entryFee).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN')}₫`
                            : translate('lockModal.free')
                        }
                      />
                      <SummaryRow
                        label={translate('lockModal.courtFeePerPlayer')}
                        value={`${s.lockSummary.platformFeePerPlayer.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN')}₫${translate('lockModal.perPerson')}`}
                      />
                      <SummaryRow
                        label={translate('lockModal.feeRule')}
                        value={
                          s.lockSummary.platformFeeRuleType === 'FREE'
                            ? translate('lockModal.freeServiceFee')
                            : s.lockSummary.platformFeeRuleType === 'FIXED'
                              ? translate('lockModal.fixedFeeRule')
                              : translate('lockModal.percentFeeRule', {
                                  percentage: s.tournament?.platformFeePercentage ?? 0,
                                })
                        }
                      />
                      <SummaryRow
                        label={translate('lockModal.totalCourtFee')}
                        value={`${s.lockSummary.totalPlatformFee.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN')}₫`}
                      />
                    </SummarySection>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => s.setIsLockModalOpen(false)}>{translate('lockModal.cancel')}</Button>
                  <Button onClick={s.handleConfirmLock} disabled={s.isLocking} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg">
                    {s.isLocking ? <><Loader2 className="w-4 h-4 animate-spin" /> {translate('lockModal.confirming')}</> : <><Lock className="w-4 h-4" /> {translate('lockModal.confirm')}</>}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Division delete confirm modal */}
        {s.divisionPendingDelete && (
          <Modal open={!!s.divisionPendingDelete} onOpenChange={() => s.setDivisionPendingDelete(null)}>
            <ModalContent className="bg-white rounded-lg p-6">
              <ModalHeader><ModalTitle className="text-lg font-bold">{translate('deleteModal.title')}</ModalTitle></ModalHeader>
              <p className="text-sm text-slate-600 mt-2">{translate('deleteModal.description')}</p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => s.setDivisionPendingDelete(null)}>{translate('deleteModal.cancel')}</Button>
                <Button onClick={s.handleConfirmDeleteDivision} disabled={s.isDeletingDivision} className="bg-rose-600 text-white px-4 py-2 rounded-lg">
                  {s.isDeletingDivision ? <><Loader2 className="w-4 h-4 animate-spin" /> {translate('deleteModal.deleting')}</> : <><Trash2 className="w-4 h-4" /> {translate('deleteModal.delete')}</>}
                </Button>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Create Division Modal */}
        {s.isCreateDivisionModalOpen && (
          <Modal open={s.isCreateDivisionModalOpen} onOpenChange={s.setIsCreateDivisionModalOpen}>
            <ModalContent className="bg-white rounded-lg p-6">
            <ModalHeader><ModalTitle className="text-lg font-bold">{s.editingDivision ? translate('createDivision.editTitle') : translate('createDivision.addTitle')}</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div><label className="text-xs font-bold text-slate-500">{translate('createDivision.typeLabel')}</label>
                  <select value={s.newDivisionMatchType} onChange={e => { const value = e.target.value; const option = s.availableMatchFormatOptions.find((item) => item.value === value); s.setNewDivisionMatchType(value); s.setNewDivisionName(option ? getLocalizedFormatOptionLabel(option.value) : ''); }} className="w-full border rounded-lg p-2 text-sm">
                    {s.availableMatchFormatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {translate(`createDivision.matchFormat.${option.value}`)}
                      </option>
                    ))}
                  </select></div>
                <div>
                  <label className="text-xs font-bold text-slate-500">{translate('createDivision.nameLabel')}</label>
                  <input
                    value={getDivisionEditorName()}
                    onChange={(e) => {
                      const option = s.availableMatchFormatOptions.find((item) => item.value === s.newDivisionMatchType);
                      const localizedDefault = option ? getLocalizedFormatOptionLabel(option.value) : '';
                      s.setNewDivisionName(option && e.target.value === localizedDefault ? localizedDefault : e.target.value);
                    }}
                    placeholder={translate('createDivision.namePlaceholder')}
                    maxLength={255}
                    className="w-full border rounded-lg p-2 text-sm mt-1"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{translate('createDivision.nameHint')}</p>
                </div>
                <div><label className="text-xs font-bold text-slate-500">{translate('createDivision.bracketLabel')}</label>
                  <select value={s.newDivisionBracketType} onChange={e => s.setNewDivisionBracketType(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
<option value="SINGLE_ELIMINATION">{translate('createDivision.singleElimination')}</option>
                    <option value="DOUBLE_ELIMINATION">{translate('createDivision.doubleElimination')}</option>
                    <option value="ROUND_ROBIN">{translate('createDivision.roundRobin')}</option>
                    <option value="GROUP_STAGE_KNOCKOUT">{translate('createDivision.groupStageKnockout')}</option>
                  </select></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={s.newDivisionLimitEnabled}
                      onChange={(e) => s.setNewDivisionLimitEnabled(e.target.checked)}
                    />
                    {translate('createDivision.participantLimit')}
                  </label>
                  {s.newDivisionLimitEnabled && (
                    <>
                      <label className="text-xs font-semibold text-slate-600">{translate('createDivision.maxCount')}
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={s.newDivisionMaxParticipants}
                          onChange={(e) => s.setNewDivisionMaxParticipants(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                          onBlur={() => {
                            const parsed = Number(s.newDivisionMaxParticipants);
                            const normalized = Number.isFinite(parsed) && parsed > 0
                              ? Math.min(128, Math.max(2, parsed))
                              : 2;
                            s.setNewDivisionMaxParticipants(String(normalized));
                          }}
                          className="mt-1 w-full border rounded-lg p-2 text-sm"
                          placeholder="16"
                        />
                      </label>
                      <p className="text-[11px] text-slate-500">{translate('createDivision.participantLimitHint')}</p>
                    </>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <input type="checkbox" checked={s.newDivisionEloEnabled} onChange={(e) => s.setNewDivisionEloEnabled(e.target.checked)} />
                    {translate('createDivision.eloLimit')}
                  </label>
                  {s.newDivisionEloEnabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-slate-600">{translate('createDivision.minElo')}
                        <input type="number" min={0} max={3000} value={s.newDivisionMinElo ?? ''} onChange={(e) => s.setNewDivisionMinElo(e.target.value === '' ? null : Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2 text-sm" placeholder={translate('createDivision.noLimit')} />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">{translate('createDivision.maxElo')}
                        <input type="number" min={0} max={3000} value={s.newDivisionMaxElo ?? ''} onChange={(e) => s.setNewDivisionMaxElo(e.target.value === '' ? null : Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2 text-sm" placeholder={translate('createDivision.noLimit')} />
                      </label>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">{translate('createDivision.eloHint')}</p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { s.setIsCreateDivisionModalOpen(false); s.resetDivisionEditor(); }}>{translate('createDivision.cancel')}</Button>
                  <Button onClick={s.handleCreateDivision} disabled={s.isCreatingDivision} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    {s.isCreatingDivision ? <Loader2 className="w-4 h-4 animate-spin" /> : s.editingDivision ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {s.editingDivision ? translate('createDivision.saveChanges') : translate('createDivision.add')}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Match Schedule Modal */}
        {s.selectedMatch && (
          <Modal open={!!s.selectedMatch} onOpenChange={() => s.setSelectedMatch(null)}>
            <ModalContent className="bg-white rounded-lg p-6 max-w-lg">
              <ModalHeader><ModalTitle className="text-lg font-bold">{translate('matchSchedule.title')}</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{sportPresentation.sportLabel}: {s.isLiteMode ? translate('matchSchedule.liteRule') : translate('matchSchedule.standardRule')}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {s.isCustomMatchConfig
                      ? translate('matchSchedule.customSaved')
                      : translate('matchSchedule.inherited')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">{translate('matchSchedule.court')}</label>
                  <select
                    value={s.matchCourtId}
                    onChange={(e) => {
                      const courtId = e.target.value;
                      const court = s.courts.find((item) => item.id === courtId);
                      s.setMatchCourtId(courtId);
                      if (court) {
                        s.setMatchCourtName(court.courtName);
                        s.setMatchCourtAddress(s.tournament?.venue?.locationAddress || s.customVenueAddress);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  >
                    <option value="">{translate('roundModal.courtPlaceholder')}</option>
                    {s.courts.filter((court) => court.status !== 'MAINTENANCE').map((court) => (
                      <option key={court.id} value={court.id}>{court.courtName}</option>
                    ))}
                  </select>
                  <input
                    value={s.matchCourtName}
                    onChange={(e) => { s.setMatchCourtId(''); s.setMatchCourtName(e.target.value); }}
                    disabled={Boolean(s.matchCourtId)}
                    placeholder={translate('matchSchedule.courtName')}
                    className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm disabled:bg-slate-100"
                  />
                </div>
                <div><label className="text-xs font-bold text-slate-500">{translate('matchSchedule.courtAddress')}</label>
                  <input value={s.matchCourtAddress} onChange={e => s.setMatchCourtAddress(e.target.value)} placeholder={translate('matchSchedule.courtAddress')} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-bold text-slate-500">{translate('matchSchedule.scheduleTime')}</label>
                  <DateTimePicker value={s.matchScheduledAt} onChange={s.setMatchScheduledAt} /></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold text-slate-600">{translate('matchSchedule.referee')}</p>
                  <p className="mt-1 text-xs text-slate-500">{translate('matchSchedule.refereeMissing')}</p>
                </div>
                <div><label className="text-xs font-bold text-slate-500">{translate('matchSchedule.camera')}</label>
                  <select value={s.matchCameraId} onChange={e => s.setMatchCameraId(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-white text-slate-800">
                    <option value="">{translate('matchSchedule.cameraUnassigned')}</option>
                    {s.cameras?.map((cam) => (
                      <option key={cam.id} value={cam.id}>📷 {cam.name} ({cam.protocol}) - [{cam.status}]</option>
                    ))}
                  </select></div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <input type="checkbox" checked={s.isCustomMatchConfig} onChange={e => s.setIsCustomMatchConfig(e.target.checked)} />
                  {translate('matchSchedule.customMatchConfig')}
                </label>
                {s.isCustomMatchConfig && (
                  <>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">{translate('matchSchedule.customRules')}</p>
                      <div className="mt-3 grid gap-3">
                        {sportPresets.map((preset) => (
                          <button
                            key={`match-preset-${preset.id}`}
                            type="button"
                            onClick={() => {
                              s.setMatchSetsToWin(preset.setsToWin);
                              s.setMatchPointsPerSet(preset.pointsPerSet);
                              s.setMatchDeuceEnabled(preset.winByTwo);
                              s.setMatchMaxPoints(preset.maxPoints);
                              s.setMatchSuperTiebreakEnabled(preset.tiebreakPoints !== null);
                              s.setMatchSuperTiebreakPoints(preset.tiebreakPoints ?? preset.pointsPerSet);
                            }}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-100"
                          >
                            <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{preset.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs text-slate-500">{translate('matchSchedule.setsToWin')}</label><input type="number" value={s.matchSetsToWin} onChange={e => s.setMatchSetsToWin(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                      <div><label className="text-xs text-slate-500">{sportPresentation.setUnitLabel}</label><input type="number" value={s.matchPointsPerSet} onChange={e => s.setMatchPointsPerSet(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input type="checkbox" checked={s.matchDeuceEnabled} onChange={e => s.setMatchDeuceEnabled(e.target.checked)} />
                        <label className="text-xs font-bold text-slate-500">{sportPresentation.winByTwoLabel}</label>
                      </div>
                      {s.matchDeuceEnabled && <div><label className="text-xs text-slate-500">{sportPresentation.maxScoreLabel}</label><input type="number" value={s.matchMaxPoints} onChange={e => s.setMatchMaxPoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>}
                      {supportsTiebreakInput && <div><label className="text-xs text-slate-500">{sportPresentation.tiebreakLabel}</label><input type="number" value={s.matchSuperTiebreakPoints} onChange={e => s.setMatchSuperTiebreakPoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>}
                      <div className="col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                        {translate('matchSchedule.summary', {
                          sets: s.matchSetsToWin,
                          unit: s.sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set',
                          points: s.matchPointsPerSet,
                          pointUnit: s.sportRuleKind === 'TENNIS' ? 'game/set' : translate('roundModal.points'),
                          margin: s.matchDeuceEnabled ? translate('roundModal.marginWinByTwo') : translate('roundModal.marginTarget'),
                          tiebreak: supportsTiebreakInput ? ` • ${sportPresentation.tiebreakLabel.toLowerCase()}: ${s.matchSuperTiebreakPoints}` : '',
                        })}
                      </div>
                      <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        {translate('matchSchedule.scoreGuidance', { target: scoreGuidance.targetSummary, examples: scoreGuidance.examples.join(' • ') })}
                      </div>
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => s.setSelectedMatch(null)}>{translate('matchSchedule.cancel')}</Button>
                  <Button onClick={s.handleSaveSchedule} disabled={s.isScheduling} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    {s.isScheduling ? <><Loader2 className="w-4 h-4 animate-spin" /> {translate('matchSchedule.saving')}</> : translate('matchSchedule.save')}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}
          </main>
        </div>
      </div>
    </div>
  );
}
