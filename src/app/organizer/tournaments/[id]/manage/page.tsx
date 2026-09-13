'use client';

import { use, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { DateTimePicker } from '@/components/ui/Input';
import { AlertTriangle, ExternalLink, Plus, X, Loader2, Trash2, Lock, Trophy, User, Users, Zap, Pencil, MapPin, CalendarDays, GitMerge, GitBranch, GitFork, RotateCw, DollarSign, Download, ChevronRight, ChevronLeft, Check, Play, ChevronDown, Activity, Layers, Calendar, ArrowUpRight, Share2, Globe, Clock, ShieldCheck, Video, LayoutDashboard, Info, Phone, Mail, Camera, ImagePlus, Save, Edit3 } from 'lucide-react';
import GalleryCarousel from '@/components/ui/GalleryCarousel';
import CircularImageCropModal from '@/components/common/CircularImageCropModal';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { uploadApi } from '@/features/upload/api';
import { tournamentsApi } from '@/features/tournaments/api';
import { getErrorMessage } from '@/utils/error';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
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
import { type ManageSection } from './components/TournamentManageSidebar';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { getScoreEntryGuidance, getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getTournamentStatusClassName, getTournamentStatusLabel, isTournamentCompleted, isTournamentRegistrationClosed, isTournamentUpcoming, isTournamentInProgress } from '@/utils/tournament-status';
import { formatCurrency, formatDateTime, formatDate } from '@/utils/format';
import { exportTournamentResultsExcel } from '@/utils/exportTournament';
import { getDivisionBracketLabel, getDivisionMatchLabel, type TournamentDisplayLabels } from '@/utils/tournament-display';
import { getTournamentLocationLabel } from '@/utils/tournament-location';
import ShareModal from '@/components/common/ShareModal';
import { triggerShare } from '@/utils/share.util';
import CountdownTimer from '@/components/shared/CountdownTimer';

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const ZaloIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <text x="7.5" y="15" fill="currentColor" fontSize="10" fontWeight="900" style={{ fontFamily: 'system-ui' }}>z</text>
  </svg>
);

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

const getBracketFormatIcon = (format?: string | null) => {
  const normalized = String(format || '').toUpperCase();
  if (normalized.includes('ROUND_ROBIN')) {
    return RotateCw;
  }
  if (normalized.includes('GROUP_STAGE') || normalized.includes('GROUP')) {
    return GitFork;
  }
  if (normalized.includes('DOUBLE_ELIMINATION') || normalized.includes('DOUBLE_ELIM')) {
    return GitMerge;
  }
  return GitBranch;
};

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
  const router = useRouter();
  const translate = useTranslations('OrganizerManage');
  const commonTranslate = useTranslations('Common');
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Direct Interactive Editing States for Banner, Logo, and Description
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingLogoSrc, setPendingLogoSrc] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSavingDescInline, setIsSavingDescInline] = useState(false);

  const handleDirectBannerFileChange = async (file: File) => {
    try {
      setIsUploadingBanner(true);
      toast.loading('Đang tải ảnh bìa lên...', { id: 'direct-banner-upload' });
      const res = await uploadApi.uploadImage(file);
      if (res && res.url) {
        s.setBannerUrl(res.url);
        await tournamentsApi.updateTournament(id, { bannerUrl: res.url });
        if (s.tournament?.parentId) {
          await tournamentsApi.updateParentTournament(s.tournament.parentId, { bannerUrl: res.url });
        }
        toast.success('Đã cập nhật ảnh bìa giải đấu!', { id: 'direct-banner-upload' });
        await s.fetchTournamentData();
      }
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'direct-banner-upload' });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleDirectLogoFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingLogoSrc(reader.result);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDirectLogoCropConfirm = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    try {
      toast.loading('Đang cập nhật logo...', { id: 'direct-logo-upload' });
      const file = new File([croppedBlob], 'tournament_logo.png', { type: 'image/png' });
      const res = await uploadApi.uploadImage(file);
      if (res && res.url) {
        s.setLogoUrl(res.url);
        await tournamentsApi.updateTournament(id, { logoUrl: res.url });
        if (s.tournament?.parentId) {
          await tournamentsApi.updateParentTournament(s.tournament.parentId, { logoUrl: res.url });
        }
        toast.success('Đã cập nhật logo giải đấu thành công!', { id: 'direct-logo-upload' });
        await s.fetchTournamentData();
      }
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'direct-logo-upload' });
    }
  };

  const handleSaveDescriptionInline = async () => {
    try {
      setIsSavingDescInline(true);
      toast.loading('Đang lưu nội dung giới thiệu...', { id: 'inline-desc-save' });
      await tournamentsApi.updateTournament(id, {
        description: s.description,
        prizeDescription: s.prizeDescription || null,
      });
      toast.success('Lưu nội dung giới thiệu thành công!', { id: 'inline-desc-save' });
      setIsEditingDescription(false);
      await s.fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'inline-desc-save' });
    } finally {
      setIsSavingDescInline(false);
    }
  };

  useEffect(() => {
    const querySection = getManageSectionFromTab(new URLSearchParams(window.location.search).get('tab'));
    if (querySection) setActiveSection(querySection);
  }, [id]);

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

  const handleManageNavigation = (sectionId: ManageSection) => {
    setActiveSection(sectionId);
    if (sectionId !== 'overview') s.setActiveTab(sectionId);
    const nextParams = new URLSearchParams(window.location.search);
    if (sectionId === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', sectionId);
    }
    window.history.replaceState(null, '', `/organizer/tournaments/${id}/manage?${nextParams.toString()}`);
  };

  const handleShareClick = async () => {
    if (!s.tournament) return;
    const shareData = {
      title: s.tournament.name,
      text: translate('toast.shareTournament', { name: s.tournament.name }),
      url: typeof window !== 'undefined' ? `${window.location.origin}/tournaments/${s.tournament.id}` : '',
    };
    const sharedNative = await triggerShare(shareData);
    if (!sharedNative) {
      setIsShareModalOpen(true);
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

  const renderOrganizerBlock = () => {
    const orgAvatar = tournament.organizer?.avatarUrl || '/sporto_v1_with_text.svg';
    const orgName = tournament.organizer?.fullName || 'Ban Tổ Chức';
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
          <img src={orgAvatar} alt={orgName} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Người sáng lập giải đấu</p>
          <p className="text-sm font-bold text-slate-900 truncate">{orgName}</p>
        </div>
      </div>
    );
  };

  const renderMetadataCard = () => {
    const rawLogo = tournament.logoUrl || tournament.organizer?.avatarUrl;
    const hasTournamentLogo = Boolean(rawLogo && !rawLogo.includes('.svg'));
    const logoUrl = hasTournamentLogo ? rawLogo : null;

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col gap-4 shadow-xs">
        {/* Header / Brand with Logo */}
        <div className="flex items-start gap-3.5">
          {/* Logo Circle with Interactive Edit Overlay */}
          <div className="relative group shrink-0">
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleDirectLogoFileSelect(file);
                  e.target.value = '';
                }
              }}
            />
            <div
              onClick={() => logoFileInputRef.current?.click()}
              title="Nhấn để đổi logo giải đấu"
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-white shadow-md p-0.5 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-slate-200/80 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            >
              {hasTournamentLogo ? (
                <img src={logoUrl || ''} alt={tournament.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Trophy className="w-6 h-6 text-slate-400" />
                </div>
              )}

              {/* Hover Camera Overlay */}
              <div className="absolute inset-0 bg-black/45 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow" />
                <span className="text-[8px] sm:text-[9px] font-extrabold text-white leading-none mt-0.5">Đổi logo</span>
              </div>
            </div>

            {/* Quick Badge Button */}
            <button
              type="button"
              onClick={() => logoFileInputRef.current?.click()}
              title="Đổi logo giải đấu"
              className="absolute -bottom-1 -right-1 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-110"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md shadow-2xs ${
                isLive ? 'bg-rose-600 text-white' : isCompleted ? 'bg-slate-700 text-white' : 'bg-emerald-600 text-white'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-white'}`} />
                {tournamentStatusLabel}
              </span>

              {tournament.category?.name && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-600 text-white shadow-2xs">
                  {tournament.category.name}
                </span>
              )}

              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md shadow-2xs ${
                tournament.isRanked ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'
              }`}>
                {tournament.isRanked ? '⭐ Có xếp hạng' : 'Giải phong trào'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight line-clamp-2">
              {tournament.name}
            </h1>
          </div>
        </div>

        {/* Key Tournament Details Rows */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100 text-slate-900 text-xs sm:text-sm">
          {/* Dates */}
          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <p className="font-extrabold text-slate-900 text-xs sm:text-[13px] leading-snug">
              {tournament.startDate ? (
                <>
                  {formatDate(tournament.startDate)}
                  {tournament.endDate && ` - ${formatDate(tournament.endDate)}`}
                </>
              ) : 'Chưa xếp ngày'}
            </p>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <p className="font-semibold text-slate-800 text-xs sm:text-[13px] leading-relaxed break-words">
              {locationLabel || 'Chưa cập nhật địa điểm'}
            </p>
          </div>

          {/* Divisions Count */}
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-slate-700 shrink-0" />
            <p className="font-extrabold text-slate-900 text-xs sm:text-[13px]">
              {s.divisions.length} <span className="font-semibold text-slate-700">Nội dung thi đấu</span>
            </p>
          </div>

          {/* Participants Count */}
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-slate-700 shrink-0" />
            <p className="font-extrabold text-slate-900 text-xs sm:text-[13px]">
              {s.participants.length} <span className="font-semibold text-slate-700">Số lượng hồ sơ</span>
            </p>
          </div>
        </div>

        {/* Sequential Countdown Timer */}
        {(() => {
          const now = new Date();
          const regStart = tournament.registrationStartDate ? new Date(tournament.registrationStartDate) : null;
          const regEnd = tournament.registrationEndDate ? new Date(tournament.registrationEndDate) : null;
          const tourStart = tournament.startDate ? new Date(tournament.startDate) : null;
          const tourEnd = tournament.endDate ? new Date(tournament.endDate) : null;

          if (regStart && now < regStart) {
            return (
              <div className="pt-2 border-t border-slate-100">
                <CountdownTimer
                  targetDate={tournament.registrationStartDate!}
                  labels={{
                    active: 'Mở đăng ký sau',
                    expired: 'Đã mở đăng ký',
                    dayLabel: commonTranslate('countdownDay') || 'ngày',
                  }}
                  variant="info"
                  size="sm"
                />
              </div>
            );
          }
          if (regEnd && now < regEnd && !tournament.isRegistrationLocked) {
            return (
              <div className="pt-2 border-t border-slate-100">
                <CountdownTimer
                  targetDate={tournament.registrationEndDate!}
                  labels={{
                    active: 'Đóng đăng ký sau',
                    expired: 'Đã đóng đăng ký',
                    dayLabel: commonTranslate('countdownDay') || 'ngày',
                  }}
                  variant="warning"
                  size="sm"
                />
              </div>
            );
          }
          if (tourStart && now < tourStart) {
            return (
              <div className="pt-2 border-t border-slate-100">
                <CountdownTimer
                  targetDate={tournament.startDate!}
                  labels={{
                    active: 'Khởi tranh sau',
                    expired: 'Đã khởi tranh',
                    dayLabel: commonTranslate('countdownDay') || 'ngày',
                  }}
                  variant="danger"
                  size="sm"
                />
              </div>
            );
          }
          if (isTournamentInProgress(tournament.status) && tourEnd && now < tourEnd) {
            return (
              <div className="pt-2 border-t border-slate-100">
                <CountdownTimer
                  targetDate={tournament.endDate!}
                  labels={{
                    active: 'Kết thúc sau',
                    expired: 'Đã kết thúc',
                    dayLabel: commonTranslate('countdownDay') || 'ngày',
                  }}
                  variant="danger"
                  size="sm"
                />
              </div>
            );
          }
          return null;
        })()}

        {/* Action Row - EXACTLY matching Image 1: Main Button + Bookmark Icon + Share Icon */}
        <div className="pt-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => { window.location.href = `/organizer/tournaments/${tournament.id}/ops`; }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-xs text-sm cursor-pointer flex items-center justify-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{translate('status.operations') || 'Vận hành giải đấu'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => window.open(`/tournaments/${tournament.id}`, '_blank')}
              title="Xem trang công khai"
              aria-label="Xem trang công khai"
              className="shrink-0 w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-slate-900 shadow-xs rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleShareClick}
              title="Chia sẻ giải đấu"
              aria-label="Chia sẻ giải đấu"
              className="shrink-0 w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-slate-900 shadow-xs rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick status transition bar if needed */}
          {(tournament.status === 'REGISTRATION_OPEN' || isTournamentUpcoming(tournament.status) || isTournamentRegistrationClosed(tournament.status) || ['IN_PROGRESS', 'ONGOING', 'LIVE', 'ACTIVE'].includes(tournament.status) || isCompleted) && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
              {tournament.status === 'REGISTRATION_OPEN' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => s.handleTournamentStepTransition('UPCOMING')}
                  disabled={s.isLoading}
                  className="flex-1 text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 h-8"
                >
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  Khóa đăng ký
                </Button>
              )}

              {(isTournamentUpcoming(tournament.status) || isTournamentRegistrationClosed(tournament.status)) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={s.handleConfirmOpen}
                  disabled={s.isLoading || s.isOpening}
                  className="flex-1 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
                >
                  {s.isOpening ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Play className="w-3.5 h-3.5 fill-current mr-1" />}
                  Khai mạc giải
                </Button>
              )}

              {['IN_PROGRESS', 'ONGOING', 'LIVE', 'ACTIVE'].includes(tournament.status) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => s.setIsEndModalOpen(true)}
                  disabled={s.isLoading || s.isEnding}
                  className="flex-1 text-xs font-bold text-indigo-700 border-indigo-300 hover:bg-indigo-50 h-8"
                >
                  {s.isEnding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trophy className="w-3.5 h-3.5 mr-1" />}
                  Hoàn tất giải
                </Button>
              )}

              {isCompleted && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportTournamentResultsExcel(tournament.name, s.matches, locale)}
                  disabled={s.matches.length === 0}
                  className="flex-1 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Xuất Excel
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Entry Fee Row - Matching Image 1 format */}
        {Number(tournament.entryFee) > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-slate-700 pt-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">LỆ PHÍ THAM GIA:</span>
              <span className="font-black text-blue-600 text-base sm:text-lg tracking-tight">
                {formatCurrency(tournament.entryFee)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContactCard = () => {
    const hasContact = Boolean(
      tournament.contactInfo &&
      Object.values(tournament.contactInfo).some((v) => typeof v === 'string' && v.trim().length > 0)
    );

    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
        {hasContact && (
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">THÔNG TIN LIÊN HỆ</span>
            {tournament.contactInfo?.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700">{tournament.contactInfo.phone}</span>
              </div>
            )}
            {tournament.contactInfo?.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">{tournament.contactInfo.email}</span>
              </div>
            )}
            {Object.entries(tournament.contactInfo || {})
              .filter(([key]) => key !== 'phone' && key !== 'email')
              .map(([key, val]) => {
                if (!val) return null;
                const lowercaseKey = key.toLowerCase();
                const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
                let IconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>> = Globe;
                let iconColor = 'text-slate-400';
                if (lowercaseKey.includes('instagram')) {
                  IconComponent = InstagramIcon;
                  iconColor = 'text-pink-600';
                } else if (lowercaseKey.includes('zalo')) {
                  IconComponent = ZaloIcon;
                  iconColor = 'text-blue-600';
                }
                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 shrink-0 ${iconColor}`} />
                    <span className="text-xs font-bold text-slate-500">{key}:</span>
                    {isUrl ? (
                      <a href={val as string} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline truncate">
                        {val}
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-700 truncate">{val}</span>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* ALWAYS show Organizer Block (Người sáng lập giải đấu) at bottom under contact info just like Image 1 */}
        <div className={hasContact ? "pt-3 border-t border-slate-100" : ""}>
          {renderOrganizerBlock()}
        </div>
      </div>
    );
  };

  const isCompleted = isTournamentCompleted(tournament.status);
  const isLive = isTournamentInProgress(tournament.status);
  const locationLabel = getTournamentLocationLabel(tournament);

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-screen-2xl mx-auto px-3.5 sm:px-4 md:px-8 pt-3 sm:pt-4 md:pt-6">

        {/* Back navigation */}
        <div className="mb-2.5 sm:mb-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-200/70 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{translate('back') || 'Quay lại'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200/80 text-[11px] font-bold text-blue-800 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Khu Vực Quản Lý Ban Tổ Chức
            </span>
          </div>
        </div>

        {/* Main 2-Column Grid (Laptop/Desktop: 2 columns, Mobile: 1 column) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* Left Column: Hero Banner + Mobile Metadata + Stepper + Tabs + Tab Content */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-4 min-w-0 max-w-full overflow-hidden">
            {/* Banner Container with Direct Interactive Change Overlay */}
            <div className="relative group w-full h-[175px] sm:h-[240px] md:h-[380px] lg:h-[440px] rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleDirectBannerFileChange(file);
                    e.target.value = '';
                  }
                }}
              />

              <GalleryCarousel
                images={tournament.galleryImages && tournament.galleryImages.length > 0 ? tournament.galleryImages : []}
                defaultBanner={tournament.bannerUrl || undefined}
                categoryName={tournament.category?.name}
                tournamentName={tournament.name}
                className="w-full h-full object-cover"
              />

              {/* Floating Camera Button on Top-Right of Banner */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  disabled={isUploadingBanner}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 hover:bg-black/80 active:scale-95 text-white text-xs font-bold shadow-lg backdrop-blur-md border border-white/20 transition-all cursor-pointer"
                  title="Thay đổi ảnh bìa giải đấu"
                >
                  {isUploadingBanner ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      <span>Đổi ảnh bìa</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sub-bar hint on hover at bottom */}
              <div
                onClick={() => bannerFileInputRef.current?.click()}
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              >
                <div className="flex items-center gap-2 text-white text-xs font-semibold">
                  <ImagePlus className="w-4 h-4 text-white drop-shadow" />
                  <span className="drop-shadow">Nhấp vào bất kỳ đâu trên ảnh để đổi ảnh bìa giải đấu</span>
                </div>
                <span className="text-[11px] font-bold text-white bg-blue-600/90 px-2.5 py-1 rounded-lg border border-blue-400/50 shadow-xs">
                  Chọn ảnh mới
                </span>
              </div>
            </div>

            {/* Mobile Metadata Container */}
            <div className="block lg:hidden space-y-3 sm:space-y-4">
              {renderMetadataCard()}
            </div>

            {/* Horizontal Tabs Bar (Đặt ngay dưới banner chuẩn phong cách Hình 1) */}
            <div className="flex overflow-x-auto gap-1.5 sm:gap-2 mb-3 no-scrollbar pb-1">
              {[
                { id: 'overview' as const, label: 'Giới thiệu', icon: LayoutDashboard },
                { id: 'registration' as const, label: 'Vận động viên', icon: Users, badge: s.participants.length },
                { id: 'bracket' as const, label: 'Bảng đấu', icon: Trophy },
                { id: 'court_schedule' as const, label: 'Lịch thi đấu', icon: CalendarDays },
                { id: 'basic' as const, label: 'Cài đặt giải', icon: Info },
                { id: 'schedule' as const, label: 'Sân & Địa điểm', icon: MapPin },
                { id: 'finance' as const, label: 'Tài chính', icon: DollarSign },
                { id: 'permissions' as const, label: 'Trọng tài', icon: ShieldCheck, badge: pendingRefereeCount > 0 ? pendingRefereeCount : undefined },
                { id: 'livestream' as const, label: 'Livestream', icon: Video },
              ].map((tab) => {
                const isActive = activeSection === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleManageNavigation(tab.id)}
                    className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
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

            {/* Tab Content Container - Exact white rounded card from Image 1 */}
            <div id="manage-content-area" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-6 md:p-7 min-h-[400px] min-w-0 max-w-full overflow-hidden scroll-mt-24">
              {/* "NỘI DUNG THI ĐẤU" Accordion / Vertical List - EXACTLY matching Image 1 */}
              <div className="mb-4" aria-label={translate('divisions.title') || 'Nội dung thi đấu'}>
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {translate('divisions.title') || 'Nội dung thi đấu'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { s.resetDivisionEditor(getDefaultDivisionName()); s.setIsCreateDivisionModalOpen(true); }}
                    disabled={s.divisions.length >= 20 || isTournamentRegistrationClosed(s.tournament.status) || s.tournament.isRegistrationLocked || ['IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(s.tournament.status)}
                    className="font-bold text-xs flex items-center gap-1 h-7 px-2.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer disabled:opacity-50 shadow-2xs"
                    title={s.divisions.length >= 20 ? translate('divisions.maxLimitTitle') : translate('divisions.addTitle')}
                  >
                    <Plus className="w-3 h-3 text-blue-600" />
                    <span>Thêm nội dung</span>
                  </Button>
                </div>

                {s.divisions.length > 0 && (
                  <div className="flex flex-col overflow-hidden divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/40">
                    {s.divisions.map((div) => {
                      const isActive = div.id === s.selectedDivisionId;
                      const divMatches = s.matches.filter((m) => m.divisionId === div.id);
                      const divCompleted = divMatches.filter((m) => m.status === 'COMPLETED').length;
                      const divTotal = divMatches.length;
                      const divParticipantsCount = s.participants.filter(p => p.tournamentDivisionId === div.id || (p as any).divisionId === div.id).length;
                      const capacityLabel = div.maxParticipants ? `${divParticipantsCount}/${div.maxParticipants}` : `${divParticipantsCount}`;
                      const BracketIcon = getBracketFormatIcon(div.bracketType);

                      return (
                        <div
                          key={div.id}
                          className="flex items-center justify-between transition-colors hover:bg-slate-100/60 group"
                        >
                          <button
                            type="button"
                            onClick={() => s.setSelectedDivisionId(div.id)}
                            className={`flex min-h-[44px] flex-1 items-center gap-2.5 px-3 py-2 text-left transition-all sm:px-3.5 sm:py-2.5 cursor-pointer ${
                              isActive
                                ? 'bg-blue-50/80 text-blue-950 font-bold'
                                : 'text-slate-700'
                            }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white text-slate-500 border border-slate-200/80 group-hover:text-blue-600 group-hover:border-blue-200'
                            }`}>
                              <BracketIcon className="h-4 w-4" aria-hidden="true" />
                            </span>

                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-xs sm:text-sm font-bold">
                                {getDisplayDivisionName(div)}
                              </span>
                            </div>

                            {divTotal > 0 && (
                              <span className="inline-flex shrink-0 items-center text-[10px] font-semibold text-slate-500 mr-1">
                                {divCompleted}/{divTotal} trận
                              </span>
                            )}

                            <span
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors ${
                                isActive ? 'bg-white text-blue-700 shadow-2xs' : 'bg-white/80 text-slate-600 border border-slate-200/60'
                              }`}
                            >
                              <Users className="h-3.5 w-3.5" aria-hidden="true" />
                              {capacityLabel}
                            </span>
                          </button>

                          {/* Quick Edit / Delete Controls for Organizer */}
                          <div className="flex items-center gap-0.5 px-2">
                            <button
                              type="button"
                              onClick={() => s.openDivisionEditor(div)}
                              disabled={!s.tournament || isTournamentRegistrationClosed(s.tournament?.status ?? '') || s.tournament?.isRegistrationLocked || ['IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(s.tournament?.status ?? '')}
                              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Sửa nội dung"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => s.requestDeleteDivision(div)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa nội dung"
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

              {/* Tournament Stepper checklist collapsible if in overview */}
              {activeSection === 'overview' && (
                <div className="mb-6">
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
                </div>
              )}
            {activeSection === 'overview' ? (
              <div className="space-y-6">
                {/* Introduction & Description Interactive Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">Bài viết giới thiệu giải đấu</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Nội dung hiển thị công khai cho vận động viên và khán giả</p>
                      </div>
                    </div>

                    {!isEditingDescription ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingDescription(true)}
                        className="font-bold text-xs flex items-center gap-1.5 h-8 px-3 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Sửa bài viết</span>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            s.setDescription(tournament.description || '');
                            s.setPrizeDescription(tournament.prizeDescription || '');
                            setIsEditingDescription(false);
                          }}
                          disabled={isSavingDescInline}
                          className="text-xs h-8 px-3"
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveDescriptionInline}
                          disabled={isSavingDescInline}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 h-8 px-3.5 rounded-lg shadow-sm"
                        >
                          {isSavingDescInline ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang lưu...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Lưu giới thiệu</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingDescription ? (
                    <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Mô tả & Giới thiệu chi tiết giải
                        </label>
                        <RichTextEditor
                          value={s.description}
                          onChange={s.setDescription}
                          placeholder="Nhập thông tin giới thiệu, thể lệ, quy định giải đấu..."
                        />
                      </div>

                      <div className="space-y-1.5 pt-3 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Cơ cấu giải thưởng
                        </label>
                        <RichTextEditor
                          value={s.prizeDescription}
                          onChange={s.setPrizeDescription}
                          placeholder="Mô tả các giải thưởng Nhất, Nhì, Ba, hiện kim, huy chương..."
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={handleSaveDescriptionInline}
                          disabled={isSavingDescInline}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2 rounded-xl shadow-md flex items-center gap-2"
                        >
                          {isSavingDescInline ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Đang lưu thay đổi...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Lưu bài viết giới thiệu</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <section className="prose prose-slate max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed editorjs-content-view">
                        {s.description || tournament.description ? (
                          <div dangerouslySetInnerHTML={{ __html: s.description || tournament.description || '' }} />
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                            <p className="text-xs text-slate-400 font-medium">
                              Chưa có nội dung giới thiệu giải đấu.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsEditingDescription(true)}
                              className="mt-2.5 font-bold text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Thêm bài viết giới thiệu
                            </Button>
                          </div>
                        )}
                      </section>

                      {(s.prizeDescription || tournament.prizeDescription) && (
                        <section className="border-t border-slate-100 pt-4">
                          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-900">
                            Cơ cấu giải thưởng
                          </h4>
                          <div
                            className="prose prose-slate max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed editorjs-content-view"
                            dangerouslySetInnerHTML={{ __html: s.prizeDescription || tournament.prizeDescription || '' }}
                          />
                        </section>
                      )}
                    </div>
                  )}
                </div>

                {/* Tournament Quick Manage Dashboard Overview */}
                <TournamentManageOverview
                  tournament={tournament}
                  divisions={s.divisions}
                  selectedDivisionId={s.selectedDivisionId}
                  participants={s.participants}
                  matches={s.matches}
                  courts={s.courts}
                  statusLabel={tournamentStatusLabel}
                  onOpenOperations={() => { window.location.href = `/organizer/tournaments/${tournament.id}/ops`; }}
                  onOpenRegistration={() => handleManageNavigation('registration')}
                  onOpenSchedule={() => handleManageNavigation('court_schedule')}
                  onSelectDivision={(divisionId) => s.setSelectedDivisionId(divisionId)}
                  onOpenBracket={handleOpenManageBracket}
                />
              </div>
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
                  onClick={() => handleManageNavigation('schedule')}
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

        {/* Mobile Contact Container */}
        <div className="block lg:hidden">
          {renderContactCard()}
        </div>
      </div>

      {/* Right Column: Organizer, Title, Metadata Card & Actions (Sticky on Desktop) */}
      <div className="hidden lg:block lg:col-span-5 xl:col-span-4 lg:sticky lg:top-[calc(var(--app-header-height)+1rem)] space-y-4 min-w-0">
        {renderMetadataCard()}
        {renderContactCard()}
      </div>
    </div>
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

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={typeof window !== 'undefined' ? `${window.location.origin}/tournaments/${tournament.id}` : ''}
        title={tournament.name}
      />

      {/* Direct Interactive Logo Crop Modal */}
      <CircularImageCropModal
        isOpen={cropModalOpen}
        imageSrc={pendingLogoSrc}
        onClose={() => setCropModalOpen(false)}
        onConfirm={handleDirectLogoCropConfirm}
      />
    </div>
  );
}
