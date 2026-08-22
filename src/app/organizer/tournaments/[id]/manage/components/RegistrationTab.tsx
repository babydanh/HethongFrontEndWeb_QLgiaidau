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
} from 'lucide-react';
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  refetchDivisionData?: () => Promise<void>;
}

// ─── SortableSeedItem (Declared outside to avoid recreation & re-mounting on each parent render) ───
const SortableSeedItem = React.memo(function SortableSeedItem({ p, dragTitle }: { p: TournamentParticipant; dragTitle: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors select-none ${
        isDragging
          ? 'border-blue-300 bg-blue-50/40 shadow-sm'
          : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors touch-none"
          title={dragTitle}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
          #{p.seed}
        </span>
        <span className="text-sm font-bold text-slate-900 truncate">{p.teamName}</span>
      </div>
    </div>
  );
});

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
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
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

  // ─── Seed drag and drop ─────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleSeedDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleSeedDragCancel = () => {
    setActiveDragId(null);
  };

  const handleSeedDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const seeded = [...participants]
      .filter((p) => p.seed != null)
      .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));

    const oldIdx = seeded.findIndex((p) => p.id === active.id);
    const newIdx = seeded.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(seeded, oldIdx, newIdx).map((p, idx) => ({
      participantId: p.id,
      seed: idx + 1,
    }));

    if (handleReorderSeeds) {
      void handleReorderSeeds(reordered);
    } else {
      const dragged = seeded[oldIdx];
      const target = seeded[newIdx];
      void handleSwapSeeds(dragged.id, target.id);
    }
  };

  const selectedMockDivision = divisions.find((division) => division.id === selectedDivisionId);
  const canSeedMock = divisions.length === 0 || Boolean(selectedMockDivision);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
      
      {/* LEFT COLUMN: PUBLISH STATUS & REGISTRATION CONTROL (span-2) */}
      <div className="lg:col-span-2 space-y-6 min-w-0">
        
        {/* Publish Status Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">{registrationTranslate('publicationStatus')}</h3>
          
          {isTournamentDraft(tournament.status) ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400">ℹ</span>
                <p className="text-xs leading-relaxed font-medium">
                  {registrationTranslate('draftDescription', { status: registrationTranslate('draftStatus') })}
                </p>
              </div>
              {publishFeeAmount > 0 && (
                <div className="text-xs font-semibold text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  {registrationTranslate('publishFeeDescription', { amount: publishFeeAmount.toLocaleString('vi-VN') })}
                </div>
              )}
              <Button
                onClick={handlePublish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full md:w-auto flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> {publishFeeAmount > 0 ? registrationTranslate('payAndPublish') : registrationTranslate('publishTournament')}
              </Button>
            </div>
          ) : isTournamentPendingApproval(tournament.status) ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <span className="mt-0.5 text-lg text-amber-600" aria-hidden="true">⏳</span>
              <div>
                <p className="font-bold text-amber-900 text-sm">{registrationTranslate('pendingApprovalTitle')}</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">{registrationTranslate('pendingApprovalDescription')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50/60 rounded-lg border border-slate-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-950 text-sm">{registrationTranslate('publishedSuccess')}</p>
                    <p className="text-emerald-700 text-xs mt-1">{registrationTranslate('publishedParticipantDescription')}</p>
                  </div>
                </div>
                
                {/* Lock list button */}
                {(isTournamentRegistrationOpen(tournament.status) || registrationLocked) && (
                  registrationLocked ? (
                    <Button
                      onClick={handleReopenRegistration}
                      disabled={isReopeningRegistration}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                    >
                      {isReopeningRegistration ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {registrationTranslate('reopenRegistration')}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleOpenLockModal}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <Lock className="w-4 h-4" /> {registrationTranslate('lockListAndCreateBracket')}
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-4 justify-between border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{registrationTranslate('registrationInfoTitle')}</h3>
              <p className="mt-1.5 text-xs font-semibold text-slate-455">
                {registrationTranslate('registrationInfoDescription')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Mode and access */}
            <div className="space-y-4 bg-slate-50/60 border border-slate-100 p-5 rounded-lg">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{registrationTranslate('accessApprovalTitle')}</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{registrationTranslate('visibilityLabel')}</label>
                  <select
                    value={visibility}
                    disabled={registrationLocked}
                    onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PUBLIC">{registrationTranslate('publicVisibilityOption')}</option>
                    <option value="PRIVATE">{registrationTranslate('privateVisibilityOption')}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{registrationTranslate('registrationModeLabel')}</label>
                  <select
                    value={registrationMode}
                    disabled={registrationLocked}
                    onChange={(e) => setRegistrationMode(e.target.value as 'OPEN' | 'APPROVAL' | 'INVITE_ONLY')}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="OPEN">{registrationTranslate('openRegistrationOption')}</option>
                    <option value="APPROVAL">{registrationTranslate('approvalRegistrationOption')}</option>
                    <option value="INVITE_ONLY">{registrationTranslate('inviteOnlyRegistrationOption')}</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    registrationMode === 'INVITE_ONLY' ? 'bg-amber-500 animate-pulse' :
                    registrationMode === 'APPROVAL' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`} />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {registrationMode === 'INVITE_ONLY' && registrationTranslate('inviteOnlyStatus')}
                    {registrationMode === 'APPROVAL' && registrationTranslate('manualApprovalStatus')}
                    {registrationMode === 'OPEN' && registrationTranslate('openStatus')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  {registrationMode === 'OPEN' && registrationTranslate('openDescription')}
                  {registrationMode === 'APPROVAL' && registrationTranslate('approvalDescription')}
                  {registrationMode === 'INVITE_ONLY' && registrationTranslate('inviteOnlyDescription')}
                </p>
              </div>
            </div>

            {/* Column 2: Registration window */}
            <div className="space-y-4 bg-slate-50/60 border border-slate-100 p-5 rounded-lg flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{registrationTranslate('registrationWindowTitle')}</h4>
              </div>

              <div className="space-y-4">
                <div>
                  <DateTimePicker
                    label={registrationTranslate('registrationOpenLabel')}
                    value={registrationStartDate}
                    min={(() => {
                      const now = new Date();
                      const pad = (v: number) => String(v).padStart(2, '0');
                      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                    })()}
                    onChange={setRegistrationStartDate}
                    disabled={registrationLocked}
                  />
                  {registrationStartDate && (
                    <div className="mt-1">
                      <CountdownTimer
                        targetDate={registrationStartDate}
                        labels={{ active: translate('registrationOpensAfter'), expired: translate('registrationOpened'), dayLabel: commonTranslate('countdownDay') }}
                        variant="info"
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <DateTimePicker
                    label={registrationTranslate('registrationCloseLabel')}
                    value={registrationEndDate}
                    min={registrationStartDate || (() => {
                      const now = new Date();
                      const pad = (v: number) => String(v).padStart(2, '0');
                      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                    })()}
                    onChange={setRegistrationEndDate}
                    disabled={registrationLocked}
                  />
                  {registrationEndDate && (
                    <div className="mt-1">
                      <CountdownTimer
                        targetDate={registrationEndDate}
                        labels={{ active: translate('closeRegistrationAfter'), expired: translate('registrationClosed'), dayLabel: commonTranslate('countdownDay') }}
                        variant="warning"
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed pt-2 border-t border-slate-200/60 mt-3">
                💡 {registrationTranslate('timelineNotice')}
              </p>
            </div>
          </div>

          {/* ELO Constraints */}
          <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-5 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={eloEnabled}
                onChange={(e) => setEloEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-800">{registrationTranslate('eloConstraintTitle')}</span>
                <p className="text-xs text-slate-500">{registrationTranslate('eloConstraintDescription')}</p>
              </div>
            </label>

            {eloEnabled && (() => {
              const selDiv = divisions.find(d => d.id === selectedDivisionId);
              const isDoubles = selDiv?.matchType === 'DOUBLES' || selDiv?.matchType === 'MIXED_DOUBLES';
              return (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500">{registrationTranslate('eloMinimum')}</label>
                  <input type="number" min={0} max={3000} value={eloMin}
                    onChange={(e) => setEloMin(Math.max(0, Number(e.target.value)))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500">{registrationTranslate('eloMaximum')}</label>
                  <input type="number" min={0} max={3000} value={eloMax}
                    onChange={(e) => setEloMax(Math.max(0, Number(e.target.value)))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white" />
                </div>
                {isDoubles && (
                  <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">{registrationTranslate('eloCombinedMaximum')}</label>
                    <input type="number" min={0} max={6000} value={eloMaxCombined}
                      onChange={(e) => setEloMaxCombined(Math.max(0, Number(e.target.value)))}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">{registrationTranslate('eloMaximumGap')}</label>
                    <input type="number" min={0} max={1000} value={eloMaxGap}
                      onChange={(e) => setEloMaxGap(Math.max(0, Number(e.target.value)))}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white" />
                  </div>
                  </>
                )}
              </div>
            )})()}
          </div>

          {(visibility === 'PRIVATE' || registrationMode === 'INVITE_ONLY') && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{registrationTranslate('quickInviteTitle')}</p>
                  <p className="text-xl font-bold tracking-[0.18em] text-blue-700">{tournament.inviteCode || registrationTranslate('inviteCodeMissing')}</p>
                  <p className="text-xs font-medium text-slate-600">
                    {registrationMode === 'INVITE_ONLY'
                      ? registrationTranslate('inviteOnlyCodeDescription')
                      : visibility === 'PRIVATE'
                        ? registrationTranslate('privateTournamentDescription')
                        : registrationTranslate('shareCodeDescription')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(tournament.inviteCode || '');
                        toast.success(registrationTranslate('copyCode'));
                      }}
                    className="border-blue-200 bg-white text-blue-700 hover:bg-blue-100 font-bold text-xs"
                  >
                    {registrationTranslate('copyCode')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateInviteCode}
                    disabled={registrationLocked}
                    className="border-blue-200 bg-white text-blue-700 hover:bg-blue-100 font-bold text-xs"
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    {registrationTranslate('regenerateCode')}
                  </Button>
                </div>
              </div>

              {isTournamentDraft(tournament.status) && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  ⚠️ {registrationTranslate('draftInviteWarning', { status: registrationTranslate('draftStatus') })}
                </div>
              )}

              <div className="mt-4 rounded-lg border border-white/80 bg-white/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {visibility === 'PRIVATE' ? registrationTranslate('privateRegistrationLink') : registrationTranslate('currentRegistrationLink')}
                </p>
                <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{inviteLink}</p>
                  <Button
                    variant="outline"
                    onClick={onCopyInviteLink}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold"
                  >
                    {registrationTranslate('copyLink')}
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <LiteInviteQr
                  inviteUrl={inviteLink}
                  tournamentName={tournament.name}
                  compact
                />
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-5 mt-2">
            <Button
              onClick={handleSaveRegistrationSettings}
              disabled={isSavingConfig || registrationLocked}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-md shadow-blue-500/10 active:scale-[0.98] transition-all"
            >
              {isSavingConfig ? registrationTranslate('saving') : registrationTranslate('saveRegistrationInfo')}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-5 max-w-full overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{registrationTranslate('approvalHeading')}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-455">
                {registrationTranslate('approvalDescriptionLong')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
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
                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                {registrationTranslate('exportExcel')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadParticipantsTemplateExcel(locale)}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                {registrationTranslate('excelTemplate')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsSmartImportOpen(true)}
                disabled={registrationLocked}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                {registrationTranslate('importExcel')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{registrationTranslate('totalProfiles')}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{participantSummary.total}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">{registrationTranslate('pendingProfiles')}</p>
              <p className="mt-2 text-lg font-bold text-amber-700">{participantSummary.pending}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{registrationTranslate('approvedProfiles')}</p>
              <p className="mt-2 text-lg font-bold text-emerald-700">{participantSummary.approved}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">{registrationTranslate('rejectedProfiles')}</p>
              <p className="mt-2 text-lg font-bold text-amber-700">{participantSummary.rejected}</p>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">{registrationTranslate('unpaidStatusLabel')}</p>
              <p className="mt-2 text-lg font-bold text-rose-700">{participantSummary.unpaid}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{registrationTranslate('waitingForPartner')}</p>
              <p className="mt-2 text-lg font-bold text-blue-700">{participantSummary.partnerInvite}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={registrationTranslate('searchTeamMembers')}
              icon={<Search className="h-4 w-4" />}
            />
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'ALL', label: registrationTranslate('filterAll') },
                { value: 'PENDING', label: registrationTranslate('filterPending') },
                { value: 'COMPLETE', label: registrationTranslate('filterApproved') },
                { value: 'UNPAID', label: registrationTranslate('unpaidStatus') },
                { value: 'REJECTED', label: registrationTranslate('filterRejected') },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value as typeof filter)}
                  className={[
                    'rounded-full border px-3 py-2 text-xs font-bold transition-colors',
                    filter === option.value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-650 hover:border-slate-300 hover:text-slate-900',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[680px] divide-y divide-slate-100">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  <th className="min-w-[160px] pb-3 pr-4">{registrationTranslate('teamPairHeader')}</th>
                  <th className="min-w-[180px] pb-3 pr-4">{registrationTranslate('membersHeader')}</th>
                  <th className="min-w-[100px] pb-3 pr-4">{registrationTranslate('statusHeader')}</th>
                  <th className="min-w-[120px] pb-3 text-right">{registrationTranslate('paymentHeader')}</th>
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
                        <td className="py-4 pr-4 align-top">
                          <span className={[
                            'inline-flex rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap',
                            getParticipantStatusClassName(participant.teamStatus),
                          ].join(' ')}>
                            {getParticipantStatusLabel(participant.teamStatus, participantStatusLabels)}
                          </span>
                        </td>
                        <td className="py-4 text-right align-top">
                          <div className="space-y-1">
                            <span className={cn('text-xs font-bold whitespace-nowrap', participant.isPaid ? 'text-blue-600' : 'text-rose-600')}>
                              {participant.isPaid ? registrationTranslate('paidStatus') : registrationTranslate('unpaidStatus')}
                            </span>
                            <p className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                              {paymentAmount != null
                                ? `${Number(paymentAmount).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} ${paymentCurrency}`
                                : registrationTranslate('amountUnavailable')}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: TESTING & WILDCARDS (span-1) */}
      <div className="space-y-6 min-w-0">
        {/* Custom Registration Form Builder */}
        <RegistrationFormBuilder tournament={tournament} divisions={divisions} />

        {/* Mock Participant Testing Panel */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-none" /> {registrationTranslate('mockDataTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {registrationTranslate('mockDataDescription')}
            </p>
          </div>

          <div className={`rounded-lg border px-3 py-2 text-xs ${
            canSeedMock
              ? 'border-blue-100 bg-blue-50 text-blue-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            <span className="font-semibold">{registrationTranslate('selectedDivisionLabel')}: </span>
            {selectedMockDivision ? (
              <>
                <strong>{selectedMockDivision.name}</strong>
                <span className={`ml-1.5 font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  selectedMockDivision.matchType === 'SINGLES'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedMockDivision.matchType === 'SINGLES' ? registrationTranslate('singlesMockBadge') : registrationTranslate('doublesMockBadge')}
                </span>
              </>
            ) : divisions.length > 0 ? (
              <span className="font-bold text-amber-700">{registrationTranslate('selectDivisionWarning')}</span>
            ) : (
              <span className="font-semibold">{registrationTranslate('generalFormat', { format: tournament.matchType === 'SINGLES' ? registrationTranslate('singlesShort') : registrationTranslate('doublesShort') })}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{registrationTranslate('virtualAthletesLabel')}</label>
              <label className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors">
                <Upload className="w-3 h-3" />
                {registrationTranslate('loadFromExcel')}
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  disabled={!canSeedMock || isSeedingMock || isClearingMock}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const res = await parseParticipantsExcel(file);
                      const p1Col = res.detectedMapping.player1NameCol || res.headers[0];
                      const names = res.rows
                        .map((r) => {
                          const p1 = r[p1Col];
                          const p2 = res.detectedMapping.player2NameCol ? r[res.detectedMapping.player2NameCol] : '';
                          if (p1 && p2) return `${p1}\n${p2}`;
                          return p1 ? String(p1) : '';
                        })
                        .filter(Boolean)
                        .join('\n');
                      setMockNamesText(names);
                      toast.success(registrationTranslate('loadedAthletes', { count: res.rows.length }));
                    } catch {
                      toast.error(registrationTranslate('readFileError', { message: commonTranslate('tryAgainLater') }));
                    }
                  }}
                />
              </label>
            </div>
            <Textarea
              value={mockNamesText}
              onChange={(e) => setMockNamesText(e.target.value)}
              placeholder={registrationTranslate('bulkParticipantsPlaceholder')}
              className="h-32 text-xs resize-none font-semibold text-slate-700"
              disabled={!canSeedMock || isSeedingMock || isClearingMock}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSeedMockData}
              disabled={!canSeedMock || isSeedingMock || isClearingMock || !mockNamesText.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
            >
              {isSeedingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {registrationTranslate('generateVirtualAthletes')}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearMockData}
              disabled={!canSeedMock || isSeedingMock || isClearingMock}
              className="border-rose-250 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 animate-none"
            >
              {isClearingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {registrationTranslate('clearData')}
            </Button>
          </div>
        </div>

        {/* Seeding */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-purple-600" /> {registrationTranslate('seedingTitle')}
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-semibold">{registrationTranslate('seedingDescription')}</p>
          </div>

          {/* Seeding method */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{registrationTranslate('seedingMethodLabel')}</label>
            <select
              value={seedingMethod}
              onChange={(e) => setSeedingMethod(e.target.value as 'ELO' | 'RANDOM' | 'MANUAL')}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="MANUAL">{registrationTranslate('manualSeeding')}</option>
              <option value="ELO">{registrationTranslate('eloSeeding')}</option>
              <option value="RANDOM">{registrationTranslate('randomSeeding')}</option>
            </select>
          </div>

          {/* Auto seeding button for ELO or RANDOM */}
          {(seedingMethod === 'ELO' || seedingMethod === 'RANDOM') && (
            <Button
              onClick={handleAutoSeed}
              disabled={isAutoSeeding || participants.length < 2}
              className="w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none font-bold"
            >
              {isAutoSeeding ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {registrationTranslate('seedingInProgress')}</>
              ) : (
                <><Shuffle className="w-3.5 h-3.5" /> {registrationTranslate('autoSeed')}</>
              )}
            </Button>
          )}

          {/* Manual seed list (draggable up/down) */}
          {seedingMethod === 'MANUAL' && (
            <div className="space-y-1">
              {(() => {
                const seeded = [...participants]
                  .filter((p) => p.seed != null)
                  .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
                const unseeded = [...participants]
                  .filter((p) => p.seed == null);

                if (participants.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                      <Shuffle className="w-6 h-6 text-slate-300" />
                      <p className="mt-2 text-sm font-bold text-slate-500">{registrationTranslate('noRegisteredTeams')}</p>
                    </div>
                  );
                }

                const activeDragParticipant = activeDragId
                  ? participants.find((p) => p.id === activeDragId)
                  : null;

                return (
                  <>
                    {seeded.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleSeedDragStart}
                        onDragEnd={handleSeedDragEnd}
                        onDragCancel={handleSeedDragCancel}
                      >
                        <SortableContext items={seeded.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1">
                            {seeded.map((p) => (
                              <SortableSeedItem key={p.id} p={p} dragTitle={registrationTranslate('dragToSort')} />
                            ))}
                          </div>
                        </SortableContext>
                        <DragOverlay>
                          {activeDragParticipant ? (
                            <div className="flex items-center justify-between rounded-lg border border-blue-400 bg-white px-3 py-2.5 shadow-xl ring-2 ring-blue-500/20 select-none">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="p-1 text-blue-600">
                                  <GripVertical className="w-4 h-4" />
                                </span>
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 shadow-sm">
                                  #{activeDragParticipant.seed}
                                </span>
                                <span className="text-sm font-bold text-slate-900 truncate">{activeDragParticipant.teamName}</span>
                              </div>
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    )}
                    {unseeded.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          {registrationTranslate('unseededCount', { count: unseeded.length })}
                        </p>
                        <div className="space-y-1">
                          {unseeded.map((p) => (
                            <div key={p.id} className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-400 text-xs font-bold shrink-0">
                                  ?
                                </span>
                                <span className="text-sm font-bold text-slate-500 truncate">{p.teamName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSeedEditStart(p.id, null)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                              >
                                {registrationTranslate('assignSeed')}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Reserved Slots / Wildcards Direct Assignment */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" /> {registrationTranslate('wildcardTitle')}
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-semibold">{registrationTranslate('wildcardDescription')}</p>
          </div>

          {/* Division Selector */}
          {divisions.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{registrationTranslate('contentSelectionLabel')}</label>
              <div className="grid grid-cols-1 gap-2">
                {divisions.map((div) => {
                  const isActive = div.id === selectedDivisionId;
                  const genderLabel = div.genderRestriction === 'FEMALE'
                    ? displayTranslate('femaleGender')
                    : div.genderRestriction === 'MIXED'
                      ? displayTranslate('mixedGender')
                      : displayTranslate('maleGender');
                  const matchLabel = div.matchType === 'SINGLES'
                    ? displayTranslate('singlesFormat', { gender: genderLabel })
                    : div.matchType === 'DOUBLES'
                      ? div.genderRestriction === 'MIXED'
                        ? displayTranslate('mixedDoublesFormat')
                        : displayTranslate('doublesFormat', { gender: genderLabel })
                      : displayTranslate('mixedDoublesFormat');
                  const bracketLabel = div.bracketType === 'DOUBLE_ELIMINATION' ? displayTranslate('bracketDoubleElimination')
                    : div.bracketType === 'ROUND_ROBIN' ? displayTranslate('bracketRoundRobin') : displayTranslate('bracketSingleElimination');
                  const count = div._count?.participants ?? 0;
                  return (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => {
                        setSelectedDivisionId(div.id);
                        setWildcardPartnerEmailOrPhone('');
                      }}
                      className={`relative w-full cursor-pointer rounded-lg border px-4 py-3 text-xs font-bold transition-all text-left ${
                        isActive
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-650 hover:border-emerald-200 hover:text-emerald-700'
                      }`}
                    >
                      <span className="block text-sm font-bold">{div.name}</span>
                      <span className="block text-[10px] font-semibold text-slate-500 mt-0.5">
                        {matchLabel} • {bracketLabel} • {registrationTranslate('profilesCount', { count })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected division info */}
          {(() => {
            const selDiv = divisions.find(d => d.id === selectedDivisionId);
            const isDoubles = selDiv?.matchType === 'DOUBLES' || selDiv?.matchType === 'MIXED_DOUBLES';
            return (
              <>
                {/* Player 1 Email */}
                <Input
                  label={registrationTranslate('playerEmailPhoneLabel')}
                  placeholder={registrationTranslate('playerEmailPhonePlaceholder')}
                  value={wildcardEmailOrPhone}
                  onChange={(e) => setWildcardEmailOrPhone(e.target.value)}
                  className="bg-white text-xs h-10"
                  disabled={isAssigningWildcard}
                />

                {/* Partner email for doubles */}
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

                {/* Team Name */}
                <Input
                  label={registrationTranslate('wildcardTeamNameLabel')}
                  placeholder={registrationTranslate('wildcardTeamNamePlaceholder')}
                  value={wildcardTeamName}
                  onChange={(e) => setWildcardTeamName(e.target.value)}
                  className="bg-white text-xs h-10"
                  disabled={isAssigningWildcard}
                />

                <Button
                  onClick={handleAssignWildcard}
                  disabled={isAssigningWildcard || !wildcardEmailOrPhone.trim() || !wildcardTeamName.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
                >
                  {isAssigningWildcard ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {registrationTranslate('assigningWildcard')}</>
                  ) : (
                    <><CheckCircle className="w-3.5 h-3.5" /> {registrationTranslate('assignWildcard')}</>
                  )}
                </Button>
              </>
            );
          })()}

          {/* Wildcard Participants List */}
          {(() => {
            const wildcards = participants.filter(p => p.isWildcard);
            if (wildcards.length === 0) return null;
            return (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  {registrationTranslate('assignedWildcards', { count: wildcards.length })}
                </p>
                <div className="space-y-2">
                  {wildcards.map((p) => {
                    const divName = divisions.find(d => d.id === p.tournamentDivisionId)?.name || '';
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">{p.teamName}</span>
                            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                              {registrationTranslate('wildcardBadge')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {p.members?.map(m => m.fullName).filter(Boolean).join(', ') || registrationTranslate('noName')}
                            {divName ? ` • ${divName}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(registrationTranslate('wildcardRemoveConfirm', { name: p.teamName }))) {
                              // handleRemoveWildcard(p.id)
                            }
                          }}
                          className="ml-2 rounded-lg p-1.5 text-rose-500 hover:bg-rose-100 transition-colors"
                          title={registrationTranslate('removeWildcard')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

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
          onSuccess={() => refetchDivisionData?.()}
        />

      </div>

    </div>
  );
}
