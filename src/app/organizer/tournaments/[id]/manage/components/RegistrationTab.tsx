'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { DateTimePicker, Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import {
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  CheckCircle,
  Check,
  X,
  Lock,
  Users,
  Search,
  Mail,
  Phone,
  Shuffle,
  GripVertical,
  FileSpreadsheet,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Settings,
  SlidersHorizontal,
  MoreVertical,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu';
import { Tournament, TournamentParticipant } from '@/types/tournament';
import { Division, tournamentsApi } from '@/features/tournaments/api';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import {
  exportParticipantsExcel,
  downloadParticipantsTemplateExcel,
  parseParticipantsExcel,
} from '@/utils/exportTournament';
import SmartFormImportModal from './SmartFormImportModal';
import { RegistrationFormBuilder } from './RegistrationFormBuilder';
import { MockDataModal } from './MockDataModal';
import CountdownTimer from '@/components/shared/CountdownTimer';
import {
  getParticipantStatusClassName,
  getParticipantStatusLabel,
  isParticipantApproved,
  isParticipantPendingApproval,
  isParticipantPendingPartner,
} from '@/utils/tournament-display';
import {
  isTournamentDraft,
  isTournamentPendingApproval,
  isTournamentRegistrationClosed,
  isTournamentRegistrationOpen,
} from '@/utils/tournament-status';
import { readRegistrationFormConfig } from '@/features/tournaments/registration-form';
import toast from 'react-hot-toast';
import { LiteInviteQr } from '@/components/tournaments/LiteInviteQr';

interface RegistrationProfileAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}

function formatRegistrationAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').join(', ');
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '';
}

function RegistrationProfileAvatar({ name, avatarUrl, size = 'sm' }: RegistrationProfileAvatarProps) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
  const sizeClass = size === 'md' ? 'h-11 w-11 text-sm' : 'h-8 w-8 text-xs';

  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={name || 'Profile'}
      className={cn('shrink-0 rounded-full object-cover ring-1 ring-slate-200', sizeClass)}
    />
  ) : (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 ring-1 ring-blue-200', sizeClass)}>
      {initials}
    </span>
  );
}

interface RegistrationTabProps {
  tournament: Tournament;
  inviteLink: string;
  mockNamesText: string;
  setMockNamesText: (val: string) => void;
  isSeedingMock: boolean;
  isClearingMock: boolean;
  wildcardEmailOrPhone: string;
  setWildcardEmailOrPhone: (val: string) => void;
  wildcardPartnerEmailOrPhone: string;
  setWildcardPartnerEmailOrPhone: (val: string) => void;
  wildcardTeamName: string;
  setWildcardTeamName: (val: string) => void;
  isAssigningWildcard: boolean;
  participants: TournamentParticipant[];
  activeParticipantActionId: string | null;
  divisions: Division[];
  selectedDivisionId: string;
  setSelectedDivisionId: (val: string) => void;
  visibility: 'PUBLIC' | 'PRIVATE';
  setVisibility: (val: 'PUBLIC' | 'PRIVATE') => void;
  registrationMode: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  setRegistrationMode: (val: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY') => void;
  registrationStartDate: string;
  setRegistrationStartDate: (val: string) => void;
  registrationEndDate: string;
  setRegistrationEndDate: (val: string) => void;
  isSavingConfig: boolean;
  publishFeeAmount: number;
  handlePublish: () => void;
  handleOpenLockModal: () => void;
  handleSaveRegistrationSettings: () => void;
  handleRegenerateInviteCode: () => void;
  handleApproveParticipant: (participantId: string) => Promise<void>;
  handleRejectParticipant: (participantId: string) => Promise<void>;
  handleKickParticipant?: (participantId: string, reason?: string) => Promise<void>;
  handleSeedMockData: () => void;
  handleClearMockData: () => void;
  handleAssignWildcard: () => void;
  handleRemoveWildcard?: (participantId: string) => Promise<void>;
  onCopyInviteLink: () => void;
  // ELO Constraints
  eloEnabled: boolean;
  setEloEnabled: (val: boolean) => void;
  eloMin: number;
  setEloMin: (val: number) => void;
  eloMax: number;
  setEloMax: (val: number) => void;
  eloMaxCombined: number;
  setEloMaxCombined: (val: number) => void;
  eloMaxGap: number;
  setEloMaxGap: (val: number) => void;
  // Seeding
  seedingMethod: 'ELO' | 'RANDOM' | 'MANUAL';
  setSeedingMethod: (val: 'ELO' | 'RANDOM' | 'MANUAL') => void;
  isAutoSeeding: boolean;
  handleAutoSeed: () => Promise<void>;
  handleSwapSeeds: (participantId1: string, participantId2: string) => Promise<void>;
  handleReorderSeeds?: (reorderedSeeds: { participantId: string; seed: number }[]) => Promise<void>;
  refetchDivisionData?: () => Promise<unknown> | void;
}



export function RegistrationTab({
  tournament,
  inviteLink,
  mockNamesText,
  setMockNamesText,
  isSeedingMock,
  isClearingMock,
  wildcardEmailOrPhone,
  setWildcardEmailOrPhone,
  wildcardPartnerEmailOrPhone,
  setWildcardPartnerEmailOrPhone,
  wildcardTeamName,
  setWildcardTeamName,
  isAssigningWildcard,
  participants,
  activeParticipantActionId,
  divisions,
  selectedDivisionId,
  setSelectedDivisionId,
  visibility,
  setVisibility,
  registrationMode,
  setRegistrationMode,
  registrationStartDate,
  setRegistrationStartDate,
  registrationEndDate,
  setRegistrationEndDate,
  isSavingConfig,
  publishFeeAmount,
  handlePublish,
  handleOpenLockModal,
  handleSaveRegistrationSettings,
  handleRegenerateInviteCode,
  handleApproveParticipant,
  handleRejectParticipant,
  handleSeedMockData,
  handleClearMockData,
  handleAssignWildcard,
  onCopyInviteLink,
  eloEnabled,
  setEloEnabled,
  eloMin,
  setEloMin,
  eloMax,
  setEloMax,
  eloMaxCombined,
  setEloMaxCombined,
  eloMaxGap,
  setEloMaxGap,
  seedingMethod,
  setSeedingMethod,
  isAutoSeeding,
  handleAutoSeed,
  handleSwapSeeds,
  handleReorderSeeds,
  refetchDivisionData,
}: RegistrationTabProps) {
  const [isSmartImportOpen, setIsSmartImportOpen] = React.useState(false);
  const [isMockDataModalOpen, setIsMockDataModalOpen] = React.useState(false);
  const [isWildcardModalOpen, setIsWildcardModalOpen] = React.useState(false);
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  const [selectedParticipant, setSelectedParticipant] = React.useState<TournamentParticipant | null>(null);
  const registrationFormFields = React.useMemo(
    () => readRegistrationFormConfig(tournament.tournamentConfig?.registrationForm, divisions.map((division) => division.id)).fields,
    [tournament.tournamentConfig?.registrationForm, divisions],
  );
  const selectedDivisionName = selectedParticipant
    ? divisions.find((division) => division.id === selectedParticipant.tournamentDivisionId)?.name || ''
    : '';
  const selectedDivision = selectedParticipant
    ? divisions.find((division) => division.id === selectedParticipant.tournamentDivisionId)
    : undefined;
  const selectedIsPair = Boolean(
    selectedParticipant &&
      (selectedDivision?.matchType === 'DOUBLES' || selectedDivision?.matchType === 'MIXED_DOUBLES' || selectedParticipant.members.length > 1),
  );
  const selectedLeader = selectedParticipant?.members.find((member) => member.role === 'MAIN') ?? selectedParticipant?.members[0];
  const selectedDisplayName = selectedParticipant
    ? selectedIsPair && selectedParticipant.members.length > 1 && selectedParticipant.teamName === selectedLeader?.fullName
      ? selectedParticipant.members.map((member) => member.fullName).filter(Boolean).join(' & ')
      : selectedParticipant.teamName
    : '';
  const selectedParticipantFee = selectedParticipant
    ? (divisions.find((division) => division.id === selectedParticipant.tournamentDivisionId)?.entryFee ?? tournament.entryFee ?? 0)
    : 0;
  const locale = useLocale();
  const translate = useTranslations('TournamentDetail');
  const commonTranslate = useTranslations('Common');
  const displayTranslate = useTranslations('TournamentDisplay');
  const registrationTranslate = useTranslations('OrganizerRegistration');
  const participantStatusLabels = {
    participantComplete: displayTranslate('participantComplete'),
    participantPendingPartner: displayTranslate('participantPendingPartner'),
    participantPendingApproval: displayTranslate('participantPendingApproval'),
    participantWaitlisted: displayTranslate('participantWaitlisted'),
    participantRejected: displayTranslate('participantRejected'),
    participantWithdrawn: displayTranslate('participantWithdrawn'),
    participantKicked: displayTranslate('participantKicked'),
    participantDisqualified: displayTranslate('participantDisqualified'),
    participantNoShow: displayTranslate('participantNoShow'),
    participantReplaced: displayTranslate('participantReplaced'),
    unknownParticipant: displayTranslate('unknownParticipant'),
  };
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'ALL' | 'PENDING' | 'COMPLETE' | 'UNPAID' | 'REJECTED'>('ALL');
  const [editingSeed, setEditingSeed] = React.useState<string | null>(null);
  const [seedInputValue, setSeedInputValue] = React.useState('');
  const [rosterActionId, setRosterActionId] = React.useState<string | null>(null);
  const [locallyLockedRosterIds, setLocallyLockedRosterIds] = React.useState<Set<string>>(new Set());
  const [isReopeningRegistration, setIsReopeningRegistration] = React.useState(false);
  const registrationLocked = isTournamentRegistrationClosed(tournament.status) || Boolean(tournament.isRegistrationLocked);

  const handleReopenRegistration = async () => {
    if (isReopeningRegistration) return;
    if (!window.confirm(registrationTranslate('reopenRegistrationConfirm'))) return;

    setIsReopeningRegistration(true);
    try {
      await tournamentsApi.reopenRegistration(tournament.id);
      toast.success(registrationTranslate('reopenRegistrationSuccess'));
      window.location.reload();
    } catch (error) {
      const { getErrorMessage } = await import('@/utils/error');
      toast.error(getErrorMessage(error));
    } finally {
      setIsReopeningRegistration(false);
    }
  };

  const participantSummary = React.useMemo(() => ({
    total: participants.length,
    pending: participants.filter((participant) => isParticipantPendingApproval(participant.teamStatus)).length,
    approved: participants.filter((participant) => isParticipantApproved(participant.teamStatus)).length,
    unpaid: participants.filter((participant) => !participant.isPaid).length,
    rejected: participants.filter((participant) => participant.teamStatus === 'REJECTED').length,
    partnerInvite: participants.filter((participant) => Boolean(participant.teamInviteToken)).length,
  }), [participants]);

  const filteredParticipants = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesFilter =
        filter === 'ALL' ? true :
        filter === 'PENDING'
          ? isParticipantPendingApproval(participant.teamStatus) || isParticipantPendingPartner(participant.teamStatus)
          :
        filter === 'COMPLETE' ? isParticipantApproved(participant.teamStatus) :
        filter === 'UNPAID' ? !participant.isPaid :
        participant.teamStatus === 'REJECTED';

      const matchesSearch =
        !normalizedSearch ||
        participant.teamName.toLowerCase().includes(normalizedSearch) ||
        (participant.members || []).some((member) => (member.fullName || '').toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [filter, participants, search]);

  const handleSeedEditStart = (participantId: string, currentSeed: number | null) => {
    setEditingSeed(participantId);
    setSeedInputValue(currentSeed != null ? String(currentSeed) : '');
  };

  const handleSeedEditSave = async (participantId: string) => {
    if (!seedInputValue.trim()) {
      setEditingSeed(null);
      return;
    }
    const seed = Number(seedInputValue);
    if (isNaN(seed) || seed < 1) return;
    try {
      const { tournamentsApi } = await import('@/features/tournaments/api');
      await tournamentsApi.updateParticipantSeed(tournament.id, participantId, seed);
      await refetchDivisionData?.();
      toast.success(registrationTranslate('seedUpdated'));
      setEditingSeed(null);
    } catch (err) {
      const { getErrorMessage } = await import('@/utils/error');
      toast.error(getErrorMessage(err));
    }
  };

  const handleRosterLock = async (participant: TournamentParticipant) => {
    if (!participant.footballTeamId || rosterActionId) return;
    const isLocked = Boolean(participant.rosterLockedAt) || locallyLockedRosterIds.has(participant.id);
    setRosterActionId(participant.id);
    try {
      if (isLocked) {
        await tournamentsApi.unlockFootballRoster(tournament.id, participant.id);
        setLocallyLockedRosterIds((current) => {
          const next = new Set(current);
          next.delete(participant.id);
          return next;
        });
        toast.success(registrationTranslate('rosterUnlocked'));
      } else {
        await tournamentsApi.lockFootballRoster(tournament.id, participant.id);
        setLocallyLockedRosterIds((current) => new Set(current).add(participant.id));
        toast.success(registrationTranslate('rosterLocked'));
      }
    } catch (error) {
      const { getErrorMessage } = await import('@/utils/error');
      toast.error(getErrorMessage(error));
    } finally {
      setRosterActionId(null);
    }
  };

  const selectedMockDivision = divisions.find((division) => division.id === selectedDivisionId);
  const canSeedMock = divisions.length === 0 || Boolean(selectedMockDivision);
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* REGISTRATION MAIN CONTENT */}
      <div id="manage-participants-section" className="w-full space-y-4 min-w-0 max-w-full overflow-hidden transition-all">
          {/* Control Bar: Bên trái là Filter & Search, Bên phải là nút cài đặt (3-dots) */}
          <div className="flex items-center justify-between gap-3 pb-1">
            {/* Bên trái: Filter lọc và Search */}
            <div className="flex items-center gap-2">
              {/* Filter Dropdown (borderless, không khung) */}
              {(() => {
                const filterOptions = [
                  { value: 'ALL', label: registrationTranslate('filterAll'), count: participantSummary.total },
                  { value: 'PENDING', label: registrationTranslate('filterPending'), count: participantSummary.pending },
                  { value: 'COMPLETE', label: registrationTranslate('filterApproved'), count: participantSummary.approved },
                  { value: 'UNPAID', label: registrationTranslate('unpaidStatus'), count: participantSummary.unpaid },
                  { value: 'REJECTED', label: registrationTranslate('filterRejected'), count: participantSummary.rejected },
                ] as const;

                const currentOption = filterOptions.find((opt) => opt.value === filter) || filterOptions[0];

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 px-2.5 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer shrink-0"
                      >
                        <span>{currentOption.label}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {currentOption.count}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52 bg-white border border-slate-200 shadow-lg rounded-xl p-1.5 z-50">
                      {filterOptions.map((opt) => (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => setFilter(opt.value as typeof filter)}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors',
                            filter === opt.value
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {filter === opt.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            <span className={filter === opt.value ? 'font-bold' : 'font-medium'}>{opt.label}</span>
                          </span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                              filter === opt.value ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                            )}
                          >
                            {opt.count}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}

              {/* Search Input: bo tròn & height thấp */}
              <div className="w-full sm:w-60 md:w-64">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={registrationTranslate('searchTeamMembers')}
                  icon={<Search className="h-3.5 w-3.5" />}
                  className="h-8 rounded-full text-xs pl-8 border-slate-200 focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Bên phải: 3-dots Dropdown Menu (Cài đặt / Thao tác - borderless, không khung) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Tùy chọn thao tác"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-lg rounded-xl p-1.5 z-50">
                <DropdownMenuItem
                  disabled={registrationLocked}
                  onClick={() => setIsWildcardModalOpen(true)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="h-4 w-4 text-blue-600" />
                  <span>{registrationTranslate('assignWildcard')}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={isAutoSeeding || registrationLocked}
                  onClick={() => void handleAutoSeed()}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAutoSeeding ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <Shuffle className="h-4 w-4 text-slate-500" />
                  )}
                  <span>{isAutoSeeding ? registrationTranslate('seedingInProgress') : registrationTranslate('autoSeed')}</span>
                </DropdownMenuItem>

                <div className="my-1 border-t border-slate-100" />

                <DropdownMenuItem
                  onClick={() => downloadParticipantsTemplateExcel(locale)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer hover:bg-slate-100"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  <span>{registrationTranslate('excelTemplate')}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={registrationLocked}
                  onClick={() => setIsSmartImportOpen(true)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span>{registrationTranslate('importExcel')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[680px] divide-y divide-slate-100">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700 border-b border-slate-200">
                  <th className="min-w-[160px] pb-3 pr-4 text-left">{registrationTranslate('teamPairHeader')}</th>
                  <th className="min-w-[180px] pb-3 pr-4 text-left">{registrationTranslate('membersHeader')}</th>
                  <th className="min-w-[100px] pb-3 pr-4 text-center">{registrationTranslate('statusHeader')}</th>
                  <th className="min-w-[130px] pb-3 text-center">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <span>{registrationTranslate('paymentHeader')}</span>
                      <button
                        type="button"
                        onClick={() => setIsMockDataModalOpen(true)}
                        title="Thử nghiệm VĐV ảo (chỉ dùng để test)"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors border border-blue-200/80 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12">
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                        <Users className="h-8 w-8 text-slate-300" />
                        <p className="mt-3 text-sm font-bold text-slate-700">{registrationTranslate('noMatchingProfiles')}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {registrationTranslate('changeFilterHint')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((participant) => {
                    const isBusy = activeParticipantActionId === participant.id;
                    const isMockParticipant = (participant.members || []).some((member) => member.isMock);
                    const canApprove = isParticipantPendingApproval(participant.teamStatus);
                    const canReject = isParticipantPendingApproval(participant.teamStatus) || isMockParticipant;
                    const canManageSeed = isMockParticipant || (isParticipantApproved(participant.teamStatus) && participant.isPaid);
                    const paymentAmount = participant.payment?.amount;
                    const paymentCurrency = participant.payment?.currency || 'VND';

                    return (
                      <tr
                        key={participant.id}
                        tabIndex={0}
                        className="cursor-pointer transition-colors hover:bg-slate-50 focus:bg-blue-50/40 focus:outline-none"
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest('button, input, select, textarea, a')) return;
                          setSelectedParticipant(participant);
                        }}
                        onKeyDown={(event) => {
                          if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
                            event.preventDefault();
                            setSelectedParticipant(participant);
                          }
                        }}
                      >
                        <td className="py-4 pr-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              {participant.seed != null && (
                                <span
                                  className="inline-flex items-center justify-center min-w-[28px] h-[22px] rounded-full border border-blue-300 bg-blue-50 text-blue-700 text-[11px] font-bold cursor-pointer hover:bg-blue-100 transition-colors px-2"
                                  title={registrationTranslate('clickToEditSeed')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSeedEditStart(participant.id, participant.seed);
                                  }}
                                >
                                  #{participant.seed}
                                </span>
                              )}
                              <button type="button" onClick={() => setSelectedParticipant(participant)} className="text-left hover:text-blue-700 hover:underline">
                                {participant.teamName}
                              </button>
                            </p>
                            {editingSeed === participant.id && (
                              <div className="flex items-center gap-1 ml-1">
                                <input
                                  type="number"
                                  min={1}
                                  value={seedInputValue}
                                  onChange={(e) => setSeedInputValue(e.target.value)}
                                  className="w-16 h-7 border border-blue-400 rounded px-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { void handleSeedEditSave(participant.id); }
                                    if (e.key === 'Escape') { setEditingSeed(null); }
                                  }}
                                  onBlur={() => { void handleSeedEditSave(participant.id); }}
                                />
                                <span className="text-[10px] text-slate-400 font-medium">#</span>
                              </div>
                            )}
                            {participant.isWildcard ? (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                                {registrationTranslate('wildcardLabel')}
                              </span>
                            ) : participant.teamInviteToken ? (
                              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                                {registrationTranslate('waitingForPartner')}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {registrationTranslate('registeredAt')} {formatDate(participant.registeredAt)}
                            {participant.seed != null ? '' : ` • ${registrationTranslate('seedMissing')}`}
                          </p>
                        </td>
                        <td className="py-4 pr-4 align-top">
                          <div className="space-y-2">
                            {(participant.members || []).map((member) => {
                              const memberName = member.isMock
                                ? registrationTranslate('virtualAthlete')
                                : (member.fullName || registrationTranslate('unknownMemberName'));
                              return (
                                <div key={member.userId} className="flex items-center gap-2">
                                  <RegistrationProfileAvatar name={memberName} avatarUrl={member.avatarUrl} />
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-700">
                                      {memberName}
                                      {member.role === 'RESERVE' && (
                                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                                          {registrationTranslate('reserveRole')}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-4 pr-4 align-top text-center">
                          {(() => {
                            const statusLabel = getParticipantStatusLabel(participant.teamStatus, participantStatusLabels);
                            const status = participant.teamStatus;
                            if (isParticipantApproved(status)) {
                              return (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                                  title={statusLabel}
                                >
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                </span>
                              );
                            }
                            if (isParticipantPendingApproval(status)) {
                              return (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs"
                                  title={statusLabel}
                                >
                                  <Clock className="w-4 h-4 stroke-[2]" />
                                </span>
                              );
                            }
                            if (isParticipantPendingPartner(status)) {
                              return (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                                  title={statusLabel}
                                >
                                  <Users className="w-4 h-4 stroke-[2]" />
                                </span>
                              );
                            }
                            if (status === 'REJECTED' || status === 'KICKED' || status === 'DISQUALIFIED') {
                              return (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs"
                                  title={statusLabel}
                                >
                                  <X className="w-4 h-4 stroke-[2.5]" />
                                </span>
                              );
                            }
                            return (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs"
                                title={statusLabel}
                              >
                                <AlertCircle className="w-4 h-4 stroke-[2]" />
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 align-top text-center">
                          <div className="inline-flex items-center justify-center">
                            {participant.isPaid ? (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                                title={
                                  paymentAmount != null
                                    ? `Đã thanh toán: ${Number(paymentAmount).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} ${paymentCurrency}`
                                    : registrationTranslate('paidStatus')
                                }
                              >
                                <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-400 border border-slate-200 shadow-2xs"
                                title={registrationTranslate('unpaidStatus')}
                              >
                                <X className="w-4 h-4 stroke-[2]" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Discreet footer action area for Excel export */}
          {participants.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 bg-slate-50/50 rounded-b-xl">
              <span className="text-xs text-slate-400 font-medium">
                {registrationTranslate('totalProfiles')}: {participants.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  const selDiv = divisions.find((d) => d.id === selectedDivisionId);
                  exportParticipantsExcel(
                    tournament.name,
                    selDiv?.name || translate('allDivisions'),
                    participants,
                    locale,
                  );
                  toast.success(registrationTranslate('exportParticipantsSuccess'));
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1 px-2 rounded hover:bg-slate-100 font-medium cursor-pointer"
                title={registrationTranslate('exportExcel')}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                <span>{registrationTranslate('exportExcel')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wildcard and Seeding are now rendered in the main right column of the manage page */}

        {selectedParticipant && (
          <Modal open={true} onOpenChange={(open) => { if (!open) setSelectedParticipant(null); }}>
            <ModalContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white p-0">
              <div className="border-b border-slate-200 px-5 py-4">
                <ModalHeader><ModalTitle className="text-lg font-bold">{registrationTranslate('profileDetailsTitle')}</ModalTitle></ModalHeader>
                <p className="mt-1 text-xs text-slate-500">{registrationTranslate('profileSubmittedFrom')}</p>
              </div>
              <div className="space-y-5 p-5">
                {/* Thông tin hồ sơ & VĐV (Tối ưu tránh lặp tên) */}
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {selectedIsPair && <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">{registrationTranslate('pairBadge')}</span>}
                        <h3 className="text-base font-bold text-slate-900">{selectedDisplayName}</h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{selectedDivisionName || registrationTranslate('unassignedDivision')} · {formatDate(selectedParticipant.registeredAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">{getParticipantStatusLabel(selectedParticipant.teamStatus, participantStatusLabels)}</span>
                      <span className={`rounded-full border px-2.5 py-1 ${selectedParticipant.isPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                        {selectedParticipant.isPaid ? registrationTranslate('paidStatusDetail') : registrationTranslate('unpaidStatusDetail')}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách thành viên (Hiển thị rõ ràng Leader / Người đăng ký & Partner) */}
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {selectedIsPair ? registrationTranslate('pairMembersHeading') : registrationTranslate('membersHeading')}
                    </p>
                    <div className="divide-y divide-slate-200/60 rounded-lg border border-slate-200 bg-white">
                      {selectedParticipant.members.length > 0 ? selectedParticipant.members.map((member, index) => {
                        const isLeader = member.role === 'CAPTAIN' || member.role === 'MAIN' || index === 0;
                        const isRegisteredUser = selectedParticipant.registeredBy?.id && selectedParticipant.registeredBy.id === member.userId;
                        return (
                          <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <RegistrationProfileAvatar name={member.fullName} avatarUrl={member.avatarUrl} size="md" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="truncate text-sm font-bold text-slate-800">{member.fullName || registrationTranslate('noNameUpdated')}</p>
                                  {isLeader && (
                                    <span className="rounded bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold">
                                      {isRegisteredUser ? registrationTranslate('leaderCreated') : registrationTranslate('leader')}
                                    </span>
                                  )}
                                  {!isLeader && selectedIsPair && (
                                    <span className="rounded bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold">
                                      {registrationTranslate('partner')}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {member.email || selectedParticipant.registeredBy?.email || registrationTranslate('hiddenEmail')}
                                  {member.phoneNumber ? <><Phone className="ml-1 h-3 w-3 shrink-0" /> {member.phoneNumber}</> : null}
                                </p>
                              </div>
                            </div>
                            <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 border border-slate-200/60">
                              ELO {member.elo?.eloPoints ?? '—'}
                            </span>
                          </div>
                        );
                      }) : selectedParticipant.registeredBy ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <RegistrationProfileAvatar name={selectedParticipant.registeredBy.fullName} avatarUrl={selectedParticipant.registeredBy.avatarUrl} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-sm font-bold text-slate-800">{selectedParticipant.registeredBy.fullName || registrationTranslate('noNameUpdated')}</p>
                                <span className="rounded bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold">{registrationTranslate('leaderCreated')}</span>
                              </div>
                              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                                <Mail className="h-3 w-3 shrink-0" />
                                {selectedParticipant.registeredBy.email || registrationTranslate('hiddenEmail')}
                                {selectedParticipant.registeredBy.phoneNumber ? <><Phone className="ml-1 h-3 w-3 shrink-0" /> {selectedParticipant.registeredBy.phoneNumber}</> : null}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="px-4 py-3 text-xs text-slate-500">{registrationTranslate('noMembers')}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{registrationTranslate('formAnswers')}</h3>
                  {registrationFormFields.length > 0 || (selectedParticipant.customResponses && Object.keys(selectedParticipant.customResponses).length > 0) ? (
                    <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      {registrationFormFields.map((field) => {
                        const value = selectedParticipant.customResponses?.[field.id];
                        const hasValue = value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
                        const fileValue = value && typeof value === 'object' && !Array.isArray(value)
                          ? value as { url?: unknown; originalName?: unknown }
                          : null;
                        const fileUrl = field.type === 'FILE' && typeof fileValue?.url === 'string' && /^https?:\/\//i.test(fileValue.url)
                          ? fileValue.url
                          : null;
                        const textValue = hasValue
                          ? fileUrl
                            ? (typeof fileValue?.originalName === 'string' ? fileValue.originalName : registrationTranslate('openFileLink'))
                            : formatRegistrationAnswer(value)
                          : registrationTranslate('unanswered');
                        return <div key={field.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"><span className="text-xs font-bold text-slate-500">{field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}</span>{fileUrl ? <a href={fileUrl} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold text-blue-700 underline">{textValue}</a> : hasValue && typeof textValue === 'string' && /^https?:\/\//i.test(textValue) ? <a href={textValue} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold text-blue-700 underline">{registrationTranslate('openFileLink')}</a> : <span className={`whitespace-pre-wrap break-words text-sm ${hasValue ? 'text-slate-800' : 'text-slate-400'}`}>{textValue}</span>}</div>;
                      })}
                      {Object.entries(selectedParticipant.customResponses ?? {}).filter(([fieldId]) => !registrationFormFields.some((field) => field.id === fieldId)).map(([fieldId, value]) => <div key={fieldId} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"><span className="text-xs font-bold text-slate-500">{fieldId}</span><span className="whitespace-pre-wrap break-words text-sm text-slate-800">{formatRegistrationAnswer(value)}</span></div>)}
                    </div>
                  ) : <p className="mt-2 rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">{registrationTranslate('noCustomAnswers')}</p>}
                </section>

                <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">{registrationTranslate('payment')}</h3>
                  {Number(selectedParticipantFee) > 0 || selectedParticipant.payment ? (
                    <div className="mt-2 space-y-2 text-sm text-blue-950">
                      {Number(selectedParticipantFee) > 0 ? (
                        <p><span className="font-semibold">{registrationTranslate('feeDue')}</span> {Number(selectedParticipantFee).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}₫</p>
                      ) : null}
                      <p><span className="font-semibold">{registrationTranslate('paymentStatus')}</span> {selectedParticipant.isPaid ? registrationTranslate('paidStatusDetail') : registrationTranslate('unpaidStatusDetail')}</p>
                      {selectedParticipant.payment ? (
                        <div className="rounded-lg border border-blue-100 bg-white/70 p-3 text-xs text-slate-700">
                          <p><span className="font-semibold">{registrationTranslate('transactionAmount')}</span> {Number(selectedParticipant.payment.amount) > 0 ? `${Number(selectedParticipant.payment.amount).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} ${selectedParticipant.payment.currency === 'VND' || !selectedParticipant.payment.currency ? '₫' : selectedParticipant.payment.currency}` : registrationTranslate('amountUnavailable')}</p>
                          {selectedParticipant.payment.status && <p><span className="font-semibold">{registrationTranslate('statusCode')}</span> {selectedParticipant.payment.status}</p>}
                          {(selectedParticipant.payment.transactionReference || selectedParticipant.payment.providerTransactionId || selectedParticipant.payment.providerOrderCode) && <p><span className="font-semibold">{registrationTranslate('transactionCode')}</span> {selectedParticipant.payment.transactionReference || selectedParticipant.payment.providerTransactionId || selectedParticipant.payment.providerOrderCode}</p>}
                          {selectedParticipant.payment.receiptNumber && <p><span className="font-semibold">{registrationTranslate('receiptNumber')}</span> {selectedParticipant.payment.receiptNumber}</p>}
                          {selectedParticipant.payment.paidAt && <p><span className="font-semibold">{registrationTranslate('paymentTime')}</span> {formatDate(selectedParticipant.payment.paidAt)}</p>}
                        </div>
                      ) : <p className="text-xs text-blue-800">{registrationTranslate('noLinkedPayment')}</p>}
                    </div>
                  ) : <p className="mt-1 text-sm text-blue-900">{registrationTranslate('freeCompetition')}</p>}
                </section>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  {isParticipantPendingApproval(selectedParticipant.teamStatus) && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          await handleApproveParticipant(selectedParticipant.id);
                          setSelectedParticipant(null);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        {registrationTranslate('approve')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (confirm(registrationTranslate('rejectConfirm', { name: selectedParticipant.teamName }))) {
                            await handleRejectParticipant(selectedParticipant.id);
                            setSelectedParticipant(null);
                          }
                        }}
                        className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-xs"
                      >
                        {registrationTranslate('rejectParticipant')}
                      </Button>
                    </>
                  )}
                  {selectedParticipant.footballTeamId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => { void handleRosterLock(selectedParticipant); }}
                      disabled={rosterActionId === selectedParticipant.id || !isParticipantApproved(selectedParticipant.teamStatus)}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-xs"
                    >
                      {selectedParticipant.rosterLockedAt || locallyLockedRosterIds.has(selectedParticipant.id) ? registrationTranslate('unlockRoster') : registrationTranslate('lockRoster')}
                    </Button>
                  )}
                  {selectedParticipant.seed == null && canSeedMock && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleSeedEditStart(selectedParticipant.id, null);
                        setSelectedParticipant(null);
                      }}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-xs"
                    >
                      {registrationTranslate('assignSeed')}
                    </Button>
                  )}
                  {(selectedParticipant.members || []).some((m) => m.isMock) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (confirm(registrationTranslate('mockDeleteConfirm', { name: selectedParticipant.teamName }))) {
                          await handleRejectParticipant(selectedParticipant.id);
                          setSelectedParticipant(null);
                        }
                      }}
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                    >
                      {registrationTranslate('deleteMock')}
                    </Button>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedParticipant(null)}>{registrationTranslate('close')}</Button>
              </div>
            </ModalContent>
          </Modal>
        )}

        <SmartFormImportModal
          open={isSmartImportOpen}
          onOpenChange={setIsSmartImportOpen}
          tournament={tournament}
          divisions={divisions}
          selectedDivisionId={selectedDivisionId}
          onSuccess={async () => { await refetchDivisionData?.(); }}
        />

        <MockDataModal
          isOpen={isMockDataModalOpen}
          onClose={() => setIsMockDataModalOpen(false)}
          tournament={tournament}
          divisions={divisions}
          selectedDivisionId={selectedDivisionId}
          setSelectedDivisionId={setSelectedDivisionId}
          mockNamesText={mockNamesText}
          setMockNamesText={setMockNamesText}
          isSeedingMock={isSeedingMock}
          isClearingMock={isClearingMock}
          handleSeedMockData={handleSeedMockData}
          handleClearMockData={handleClearMockData}
        />

        {/* Wildcard Assignment Modal */}
        {isWildcardModalOpen && (
          <Modal open={isWildcardModalOpen} onOpenChange={setIsWildcardModalOpen}>
            <ModalContent className="max-w-md bg-white p-0">
              <div className="border-b border-slate-200 px-5 py-4">
                <ModalHeader>
                  <ModalTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    {registrationTranslate('wildcardTitle')}
                  </ModalTitle>
                </ModalHeader>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {registrationTranslate('wildcardDescription')}
                </p>
              </div>

              <div className="p-5 space-y-4">
                {/* Division selector if multiple */}
                {divisions.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {registrationTranslate('contentSelectionLabel')}
                    </label>
                    <select
                      value={selectedDivisionId}
                      onChange={(e) => {
                        setSelectedDivisionId(e.target.value);
                        setWildcardPartnerEmailOrPhone('');
                      }}
                      className="w-full h-10 px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d._count?.participants ?? 0} VĐV)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(() => {
                  const currentDivision = divisions.find((d) => d.id === selectedDivisionId);
                  const isDoubles = currentDivision?.matchType === 'DOUBLES' || currentDivision?.matchType === 'MIXED_DOUBLES';
                  return (
                    <div className="space-y-3">
                      <Input
                        label={registrationTranslate('playerEmailPhoneLabel')}
                        placeholder={registrationTranslate('playerEmailPhonePlaceholder')}
                        value={wildcardEmailOrPhone}
                        onChange={(e) => setWildcardEmailOrPhone(e.target.value)}
                        className="bg-white text-xs h-10"
                        disabled={isAssigningWildcard}
                      />

                      {isDoubles && (
                        <Input
                          label={registrationTranslate('teammateLabel')}
                          placeholder={registrationTranslate('teammatePlaceholder')}
                          value={wildcardPartnerEmailOrPhone}
                          onChange={(e) => setWildcardPartnerEmailOrPhone(e.target.value)}
                          className="bg-white text-xs h-10"
                          disabled={isAssigningWildcard}
                        />
                      )}

                      <Input
                        label={registrationTranslate('wildcardTeamNameLabel')}
                        placeholder={registrationTranslate('wildcardTeamNamePlaceholder')}
                        value={wildcardTeamName}
                        onChange={(e) => setWildcardTeamName(e.target.value)}
                        className="bg-white text-xs h-10"
                        disabled={isAssigningWildcard}
                      />
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5 bg-slate-50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWildcardModalOpen(false)}
                  disabled={isAssigningWildcard}
                  className="border-slate-200 text-slate-700 hover:bg-white text-xs font-bold"
                >
                  {registrationTranslate('close')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    try {
                      await handleAssignWildcard();
                      setIsWildcardModalOpen(false);
                    } catch {
                      // Keep modal open if error
                    }
                  }}
                  disabled={isAssigningWildcard || !wildcardEmailOrPhone.trim() || !wildcardTeamName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {isAssigningWildcard ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {registrationTranslate('assigningWildcard')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      {registrationTranslate('assignWildcard')}
                    </>
                  )}
                </Button>
              </div>
            </ModalContent>
          </Modal>
        )}

      </div>
  );
}
