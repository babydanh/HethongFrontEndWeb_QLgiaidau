'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Trophy,
  Users,
  Settings,
  Sparkles,
  Minus,
  Plus,
  Zap,
  Shield,
  Loader2,
  Shuffle,
  RefreshCw,
  GripVertical,
  X,
  UserCheck,
  Hash,
} from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Division } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';

export interface ParticipantItem {
  id: string;
  teamName?: string;
  registeredBy?: { fullName?: string | null } | null;
  user?: { fullName?: string | null } | null;
  partnerUser?: { fullName?: string | null } | null;
  eloPoints?: number;
  seed?: number | null;
  teamStatus?: string;
  isPaid?: boolean;
}

export interface BracketSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentFormat?: string;
  bracketType?: string | null;
  selectedDivision: Division | null;
  participants: unknown[];

  // Scoring Rules
  sportRuleKind?: SportRuleKind;
  setSportRuleKind?: (val: SportRuleKind) => void;
  isLiteMode?: boolean;
  setIsLiteMode?: (val: boolean) => void;
  setsToWin?: number;
  setSetsToWin?: (val: number) => void;
  pointsPerSet?: number;
  setPointsPerSet?: (val: number) => void;
  winByTwo?: boolean;
  setWinByTwo?: (val: boolean) => void;
  maxDeucePoints?: number;
  setMaxDeucePoints?: (val: number) => void;
  superTiebreakEnabled?: boolean;
  setSuperTiebreakEnabled?: (val: boolean) => void;
  superTiebreakSetIndex?: number;
  setSuperTiebreakSetIndex?: (val: number) => void;
  superTiebreakPoints?: number;
  setSuperTiebreakPoints?: (val: number) => void;

  // Bracket Structure
  numGroups: number;
  setNumGroups?: React.Dispatch<React.SetStateAction<number>>;
  teamsPerGroup: number;
  setTeamsPerGroup?: React.Dispatch<React.SetStateAction<number>>;
  teamsAdvancing: number;
  setTeamsAdvancing?: React.Dispatch<React.SetStateAction<number>>;
  gskPlayoffType?: string;
  setGskPlayoffType?: React.Dispatch<React.SetStateAction<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION'>>;
  gskSeedingType?: string;
  setGskSeedingType?: React.Dispatch<React.SetStateAction<'SEEDED' | 'RANDOM'>>;

  // Submission
  isSubmitting: boolean;
  onConfirm: () => Promise<void> | void;
}

export function BracketSetupModal({
  open,
  onOpenChange,
  tournamentFormat,
  bracketType,
  selectedDivision,
  participants,

  sportRuleKind = 'PICKLEBALL_RALLY',
  setSportRuleKind,
  isLiteMode = true,
  setIsLiteMode,
  setsToWin = 1,
  setSetsToWin,
  pointsPerSet = 11,
  setPointsPerSet,
  winByTwo = true,
  setWinByTwo,
  maxDeucePoints = 15,
  setMaxDeucePoints,
  superTiebreakEnabled = false,
  setSuperTiebreakEnabled,
  superTiebreakSetIndex,
  setSuperTiebreakSetIndex,
  superTiebreakPoints = 11,
  setSuperTiebreakPoints,

  numGroups = 4,
  setNumGroups,
  teamsPerGroup = 4,
  setTeamsPerGroup,
  teamsAdvancing = 2,
  setTeamsAdvancing,
  gskPlayoffType = 'SINGLE_ELIMINATION',
  setGskPlayoffType,
  gskSeedingType = 'SEEDED',
  setGskSeedingType,

  isSubmitting,
  onConfirm,
}: BracketSetupModalProps) {
  const translate = useTranslations('TournamentDetail');
  const presentation = getSportRulePresentation(sportRuleKind, translate);
  const isPickleballVariant =
    sportRuleKind === 'PICKLEBALL_RALLY' ||
    sportRuleKind === 'PICKLEBALL_SIDE_OUT' ||
    selectedDivision?.name?.toLowerCase().includes('pickleball');
  const supportsTiebreakInput = sportRuleKind === 'TENNIS' || sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const presets = getSportRulePresets(sportRuleKind, translate);

  const handleSportRuleKindChange = (nextKind: SportRuleKind) => {
    const nextRules = resolveSportRuleView(buildDefaultSportRules(nextKind), nextKind);
    setSportRuleKind?.(nextKind);
    setSetsToWin?.(nextRules.setsToWin);
    setPointsPerSet?.(nextRules.pointsPerSet);
    setWinByTwo?.(nextRules.winByTwo);
    setMaxDeucePoints?.(nextRules.maxPoints);
    setSuperTiebreakEnabled?.(nextRules.hasCustomTiebreakTarget);
    setSuperTiebreakSetIndex?.(nextRules.bestOf);
    setSuperTiebreakPoints?.(nextRules.tiebreakPoints);
  };

  const applyPreset = (preset: (typeof presets)[number]) => {
    setSetsToWin?.(preset.setsToWin);
    setPointsPerSet?.(preset.pointsPerSet);
    setWinByTwo?.(preset.winByTwo);
    setMaxDeucePoints?.(preset.maxPoints);
    setSuperTiebreakEnabled?.(preset.tiebreakPoints !== null);
    setSuperTiebreakSetIndex?.(preset.setsToWin * 2 - 1);
    setSuperTiebreakPoints?.(preset.tiebreakPoints ?? preset.pointsPerSet);
  };

  const isGroupStageKnockout =
    tournamentFormat?.toUpperCase() === 'GROUP_STAGE_KNOCKOUT' ||
    bracketType?.toUpperCase() === 'GROUP_STAGE_KNOCKOUT' ||
    selectedDivision?.bracketType === 'GROUP_STAGE_KNOCKOUT';

  // Filter valid participants
  const eligibleParticipants = useMemo(() => {
    return (participants as ParticipantItem[]).filter(
      (p) => (p?.teamStatus === 'COMPLETE' || !p?.teamStatus) && (p?.isPaid ?? true),
    );
  }, [participants]);

  // Track team assignment: Map groupIndex (0, 1, 2...) -> Array of ParticipantItem
  const [groupAssignments, setGroupAssignments] = useState<Record<number, ParticipantItem[]>>({});
  const [unassignedTeams, setUnassignedTeams] = useState<ParticipantItem[]>([]);
  const [draggedParticipantId, setDraggedParticipantId] = useState<string | null>(null);

  // Initialize pool assignment when modal opens
  useEffect(() => {
    if (!open) return;

    setUnassignedTeams([...eligibleParticipants]);
    const initialGroups: Record<number, ParticipantItem[]> = {};
    for (let i = 0; i < numGroups; i++) {
      initialGroups[i] = [];
    }
    setGroupAssignments(initialGroups);
  }, [open, eligibleParticipants, numGroups]);

  // Format participant label
  const getParticipantLabel = (p: ParticipantItem) => {
    if (p.teamName) return p.teamName;
    const name1 = p.registeredBy?.fullName || p.user?.fullName;
    const name2 = p.partnerUser?.fullName;
    if (name1 && name2) return `${name1} / ${name2}`;
    if (name1) return name1;
    return `Đội #${p.id.slice(0, 4)}`;
  };

  // Quick pool count selection
  const handleSelectPoolCount = (count: number) => {
    setNumGroups?.(count);
    const newGroups: Record<number, ParticipantItem[]> = {};
    for (let i = 0; i < count; i++) {
      newGroups[i] = groupAssignments[i] || [];
    }
    const returnedTeams: ParticipantItem[] = [];
    Object.entries(groupAssignments).forEach(([gIdx, teams]) => {
      if (Number(gIdx) >= count) {
        returnedTeams.push(...teams);
      }
    });
    setGroupAssignments(newGroups);
    if (returnedTeams.length > 0) {
      setUnassignedTeams((prev) => [...prev, ...returnedTeams]);
    }
    if (setTeamsPerGroup) {
      setTeamsPerGroup(Math.max(2, Math.ceil(eligibleParticipants.length / count)));
    }
  };

  // Reset: All teams return to unassigned
  const handleResetToUnassigned = () => {
    setUnassignedTeams([...eligibleParticipants]);
    const resetGroups: Record<number, ParticipantItem[]> = {};
    for (let i = 0; i < numGroups; i++) {
      resetGroups[i] = [];
    }
    setGroupAssignments(resetGroups);
  };

  // Randomize: Distribute all eligible participants randomly and evenly
  const handleRandomize = () => {
    const shuffled = [...eligibleParticipants].sort(() => Math.random() - 0.5);
    const newGroups: Record<number, ParticipantItem[]> = {};
    for (let i = 0; i < numGroups; i++) {
      newGroups[i] = [];
    }

    shuffled.forEach((p, idx) => {
      const gIndex = idx % numGroups;
      newGroups[gIndex].push(p);
    });

    setGroupAssignments(newGroups);
    setUnassignedTeams([]);
  };

  // Seed by ELO / Snake seeding
  const handleSeedByElo = () => {
    const sorted = [...eligibleParticipants].sort((a, b) => {
      if (a.seed && b.seed) return a.seed - b.seed;
      if (a.seed) return -1;
      if (b.seed) return 1;
      return (b.eloPoints ?? 0) - (a.eloPoints ?? 0);
    });

    const newGroups: Record<number, ParticipantItem[]> = {};
    for (let i = 0; i < numGroups; i++) {
      newGroups[i] = [];
    }

    sorted.forEach((p, idx) => {
      const round = Math.floor(idx / numGroups);
      const isReversed = round % 2 === 1;
      const pos = idx % numGroups;
      const gIndex = isReversed ? numGroups - 1 - pos : pos;
      newGroups[gIndex].push(p);
    });

    setGroupAssignments(newGroups);
    setUnassignedTeams([]);
  };

  // Move a team into a specific group
  const assignTeamToGroup = (participant: ParticipantItem, targetGroupIndex: number) => {
    setUnassignedTeams((prev) => prev.filter((p) => p.id !== participant.id));

    setGroupAssignments((prev) => {
      const updated: Record<number, ParticipantItem[]> = {};
      for (let i = 0; i < numGroups; i++) {
        const filtered = (prev[i] || []).filter((p) => p.id !== participant.id);
        if (i === targetGroupIndex) {
          updated[i] = [...filtered, participant];
        } else {
          updated[i] = filtered;
        }
      }
      return updated;
    });
  };

  // Move a team back to unassigned from a group
  const removeTeamFromGroup = (participant: ParticipantItem) => {
    setGroupAssignments((prev) => {
      const updated: Record<number, ParticipantItem[]> = {};
      for (let i = 0; i < numGroups; i++) {
        updated[i] = (prev[i] || []).filter((p) => p.id !== participant.id);
      }
      return updated;
    });
    setUnassignedTeams((prev) => {
      if (prev.some((p) => p.id === participant.id)) return prev;
      return [...prev, participant];
    });
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, participantId: string) => {
    e.dataTransfer.setData('text/plain', participantId);
    setDraggedParticipantId(participantId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnGroup = (e: React.DragEvent, groupIndex: number) => {
    e.preventDefault();
    const pId = e.dataTransfer.getData('text/plain') || draggedParticipantId;
    if (!pId) return;

    const participant = eligibleParticipants.find((p) => p.id === pId);
    if (participant) {
      assignTeamToGroup(participant, groupIndex);
    }
    setDraggedParticipantId(null);
  };

  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const pId = e.dataTransfer.getData('text/plain') || draggedParticipantId;
    if (!pId) return;

    const participant = eligibleParticipants.find((p) => p.id === pId);
    if (participant) {
      removeTeamFromGroup(participant);
    }
    setDraggedParticipantId(null);
  };

  const poolOptions = [2, 4, 8, 16];

  const poolColors = [
    { title: 'text-rose-600', badge: 'bg-rose-500 text-white', border: 'border-rose-200' },
    { title: 'text-blue-600', badge: 'bg-blue-500 text-white', border: 'border-blue-200' },
    { title: 'text-emerald-600', badge: 'bg-emerald-500 text-white', border: 'border-emerald-200' },
    { title: 'text-amber-600', badge: 'bg-amber-500 text-white', border: 'border-amber-200' },
    { title: 'text-purple-600', badge: 'bg-purple-500 text-white', border: 'border-purple-200' },
    { title: 'text-cyan-600', badge: 'bg-cyan-500 text-white', border: 'border-cyan-200' },
    { title: 'text-pink-600', badge: 'bg-pink-500 text-white', border: 'border-pink-200' },
    { title: 'text-indigo-600', badge: 'bg-indigo-500 text-white', border: 'border-indigo-200' },
  ];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-7xl w-[96vw] max-h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-50 rounded-2xl shadow-2xl border border-slate-200">
        {/* MODAL HEADER */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {translate('setupBracketModalTitle')}
                </h2>
                {selectedDivision?.name && (
                  <span className="rounded-md bg-blue-100/80 px-2 py-0.5 text-xs font-bold text-blue-700">
                    {selectedDivision.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                {translate('groupStageKnockoutSummary', {
                  groups: numGroups,
                  teams: teamsPerGroup,
                  advancing: teamsAdvancing,
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <div className="p-5 sm:p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
          {/* PHẦN 1: KHỐI CẤU HÌNH THỂ THỨC & LUẬT TÍNH ĐIỂM */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Cột 1 (7 cols): Cấu hình thể thức vòng bảng */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {translate('stage1GroupStage')}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {translate('totalScale', { count: numGroups * teamsPerGroup })}
                </span>
              </div>

              {/* 3 Steppers: Số bảng, Số đội mỗi bảng, Số đội đi tiếp */}
              <div className="grid grid-cols-3 gap-3">
                {/* 1. SỐ BẢNG */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {translate('numberOfGroups')}
                  </span>
                  <div className="my-1.5 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPoolCount(Math.max(2, numGroups - 1))}
                      disabled={numGroups <= 2}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-base text-slate-900">{numGroups}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectPoolCount(Math.min(32, numGroups + 1))}
                      disabled={numGroups >= 32}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 font-medium truncate">
                    {Array.from({ length: Math.min(numGroups, 4) }, (_, i) => String.fromCharCode(65 + i)).join(', ') + (numGroups > 4 ? '...' : '')}
                  </p>
                </div>

                {/* 2. ĐỘI MỖI BẢNG */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {translate('teamsPerGroup')}
                  </span>
                  <div className="my-1.5 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setTeamsPerGroup?.(Math.max(2, teamsPerGroup - 1))}
                      disabled={teamsPerGroup <= 2}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-base text-slate-900">{teamsPerGroup}</span>
                    <button
                      type="button"
                      onClick={() => setTeamsPerGroup?.(Math.min(32, teamsPerGroup + 1))}
                      disabled={teamsPerGroup >= 32}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    {teamsPerGroup} {translate('teams').toLowerCase()}
                  </p>
                </div>

                {/* 3. LẤY ĐI TIẾP */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {translate('teamsAdvancing')}
                    </span>
                    <span className="rounded bg-blue-100/80 px-1 py-0.2 text-[8px] font-bold text-blue-700">
                      K.O
                    </span>
                  </div>
                  <div className="my-1.5 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setTeamsAdvancing?.(Math.max(1, teamsAdvancing - 1))}
                      disabled={teamsAdvancing <= 1}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-base text-slate-900">{teamsAdvancing}</span>
                    <button
                      type="button"
                      onClick={() => setTeamsAdvancing?.(Math.min(teamsPerGroup - 1, teamsAdvancing + 1))}
                      disabled={teamsAdvancing >= teamsPerGroup - 1}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    Top {teamsAdvancing} mỗi bảng
                  </p>
                </div>
              </div>

              {/* Tóm tắt knockout & Xếp hạt giống */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                <span className="text-slate-600 font-semibold">
                  {translate('toKnockoutSummary', {
                    groups: numGroups,
                    advancing: teamsAdvancing,
                    total: numGroups * teamsAdvancing,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{translate('seedingType')}:</span>
                  <select
                    value={gskSeedingType}
                    onChange={(e) => setGskSeedingType?.(e.target.value as 'SEEDED' | 'RANDOM')}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold bg-white text-slate-800 outline-none"
                  >
                    <option value="SEEDED">{translate('seededByElo')}</option>
                    <option value="RANDOM">{translate('randomSeeding')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cột 2 (5 cols): Cấu hình luật tính điểm (Tự do / Tiêu chuẩn) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {translate('rulesAndBracketTitle')}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {presentation.sportLabel}: {presentation.scoringLabel}
                  </p>
                </div>
                {/* Switch Lite / Strict */}
                {setIsLiteMode && (
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsLiteMode(true)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        isLiteMode ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {translate('liteModeLabel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLiteMode(false)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        !isLiteMode ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      {translate('strictModeLabel')}
                    </button>
                  </div>
                )}
              </div>

              {/* Pickleball Mode Switcher (chỉ khi là môn Pickleball) */}
              {isPickleballVariant && setSportRuleKind && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      {translate('pickleballMode')}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                      {sportRuleKind === 'PICKLEBALL_RALLY' ? translate('rallyScoring') : translate('sideOutScoring')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSportRuleKindChange('PICKLEBALL_RALLY')}
                      className={`px-2.5 py-1.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                        sportRuleKind === 'PICKLEBALL_RALLY'
                          ? 'border-emerald-500 bg-white text-emerald-900 shadow-2xs ring-1 ring-emerald-300'
                          : 'border-emerald-200 bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <p className="font-bold leading-tight">{translate('rallyScoring')}</p>
                      <p className="text-[9px] font-normal text-slate-500 mt-0.5">{translate('rallyScoringDescription')}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSportRuleKindChange('PICKLEBALL_SIDE_OUT')}
                      className={`px-2.5 py-1.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                        sportRuleKind === 'PICKLEBALL_SIDE_OUT'
                          ? 'border-emerald-500 bg-white text-emerald-900 shadow-2xs ring-1 ring-emerald-300'
                          : 'border-emerald-200 bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <p className="font-bold leading-tight">{translate('sideOutScoring')}</p>
                      <p className="text-[9px] font-normal text-slate-500 mt-0.5">{translate('sideOutScoringDescription')}</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Danh sách Preset Cards nhanh (cho cả Lite & Strict) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {translate('sportPresets')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presets.map((preset) => {
                    const isSelected =
                      setsToWin === preset.setsToWin &&
                      pointsPerSet === preset.pointsPerSet &&
                      winByTwo === preset.winByTwo;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-400'
                            : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 leading-snug">{preset.label}</p>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white text-blue-700 border border-slate-200 shrink-0">
                            {translate('firstToSets', { sets: preset.setsToWin })} • {preset.pointsPerSet}p
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chế độ TIÊU CHUẨN (Strict): Hiển thị đầy đủ ô tinh chỉnh số set, điểm, deuce, tiebreak */}
              {!isLiteMode ? (
                <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{translate('setsToWin')}</label>
                      <select
                        value={setsToWin}
                        onChange={(e) => setSetsToWin?.(Number(e.target.value))}
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {presentation.setOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{presentation.setUnitLabel}</label>
                      <input
                        type="number"
                        value={pointsPerSet}
                        onChange={(e) => setPointsPerSet?.(Number(e.target.value))}
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Win by 2 & Deuce points */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={winByTwo}
                        onChange={(e) => setWinByTwo?.(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                      <span>{presentation.winByTwoLabel}</span>
                    </label>
                    {winByTwo && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-400">Max:</span>
                        <input
                          type="number"
                          value={maxDeucePoints}
                          onChange={(e) => setMaxDeucePoints?.(Number(e.target.value))}
                          className="w-12 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-center"
                        />
                      </div>
                    )}
                  </div>

                  {/* Tiebreak Points (chỉ Tennis hoặc Pickleball Side-Out) */}
                  {supportsTiebreakInput && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="font-bold text-slate-700">{presentation.tiebreakLabel}:</span>
                      <input
                        type="number"
                        value={superTiebreakPoints}
                        onChange={(e) => setSuperTiebreakPoints?.(Number(e.target.value))}
                        placeholder={translate('tiebreakPlaceholder', { points: sportRuleKind === 'TENNIS' ? 7 : 11 })}
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center"
                      />
                    </div>
                  )}

                  {/* Tóm tắt cấu hình hiện tại */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2.5 text-[11px] font-semibold text-blue-950 flex items-center justify-between">
                    <span>
                      {translate('currentSetup', {
                        setsToWin,
                        unit: sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set',
                        points: pointsPerSet,
                        target: presentation.setUnitLabel,
                        margin: winByTwo ? translate('winByTwoShort') : translate('targetClosesSet'),
                      })}
                      {supportsTiebreakInput ? ` • ${presentation.tiebreakLabel.toLowerCase()}: ${superTiebreakPoints}` : ''}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                      {translate('strictModeLabel')}
                    </span>
                  </div>
                </div>
              ) : (
                /* Chế độ TỰ DO (Lite): Gọn gàng tuyệt đối, chỉ hiển thị card thông tin tóm tắt preset đã chọn, không bắt nhập lắt nhắt */
                <div className="pt-2 border-t border-slate-100">
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 text-xs text-amber-950 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Chế độ Tự do (Lite) đang áp dụng:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {translate('currentSetup', {
                          setsToWin,
                          unit: sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set',
                          points: pointsPerSet,
                          target: presentation.setUnitLabel,
                          margin: winByTwo ? translate('winByTwoShort') : translate('targetClosesSet'),
                        })}
                        {supportsTiebreakInput ? ` • ${presentation.tiebreakLabel.toLowerCase()}: ${superTiebreakPoints}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-700 bg-white px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                      {translate('liteModeLabel')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PHẦN 2: XẾP BẢNG ĐẤU & PHÂN BỔ ĐỘI THEO PHONG CÁCH VIDEO VDTOURNAMENT */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            {/* Toolbar trên khu vực phân bảng */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {translate('visualDistributionPreviewTitle')}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {translate('poolArrangementSubtitle')}
                </p>
              </div>

              {/* Group selection pills & Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {poolOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectPoolCount(opt)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        numGroups === opt
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt} {translate('twoGroups').replace('2 ', '')}
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToUnassigned}
                  className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 h-7 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>{translate('rearrange')}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRandomize}
                  className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 h-7 flex items-center gap-1"
                >
                  <Shuffle className="w-3 h-3 text-blue-600" />
                  <span>{translate('randomize')}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSeedByElo}
                  className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 h-7 flex items-center gap-1"
                >
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  <span>{translate('seedByElo')}</span>
                </Button>
              </div>
            </div>

            {/* Layout 2 cột: Cột trái (Đội chưa phân bảng) + Cột phải (Lưới bảng đấu) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* CỘT TRÁI (4 cols): Đội chưa phân bảng */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDropOnUnassigned}
                className="lg:col-span-4 bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 flex flex-col min-h-[380px] shadow-2xs"
              >
                <div className="pb-2.5 border-b border-slate-200 mb-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        {translate('unassignedTeams', { count: unassignedTeams.length })}
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {translate('unassignedDescription')}
                  </p>
                </div>

                {/* Danh sách thẻ đội chưa phân bảng */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[340px] pr-1">
                  {unassignedTeams.length > 0 ? (
                    unassignedTeams.map((team) => (
                      <div
                        key={team.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, team.id)}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group relative flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {translate('freeTag')}
                          </span>
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-rose-900 truncate">
                            {getParticipantLabel(team)}
                          </span>
                          {team.eloPoints && (
                            <span className="text-[10px] font-bold text-blue-600 shrink-0">
                              {team.eloPoints} ELO
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <UserCheck className="w-8 h-8 text-emerald-500 mb-2" />
                      <p className="text-xs font-semibold text-emerald-700">Tất cả đội đã được phân vào bảng!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CỘT PHẢI (8 cols): Lưới các bảng đấu (Bảng A, B, C, D...) */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
                {Array.from({ length: numGroups }).map((_, gIdx) => {
                  const groupName = String.fromCharCode(65 + gIdx); // A, B, C, D...
                  const assignedTeams = groupAssignments[gIdx] || [];
                  const color = poolColors[gIdx % poolColors.length];

                  return (
                    <div
                      key={groupName}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnGroup(e, gIdx)}
                      className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden min-h-[190px]"
                    >
                      {/* Group Header */}
                      <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <span className={`font-bold text-xs ${color.title}`}>
                          {translate('groupName', { name: groupName })}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${color.badge}`}>
                          {assignedTeams.length} {translate('teamsCount', { count: assignedTeams.length }).replace(`${assignedTeams.length} `, '')}
                        </span>
                      </div>

                      {/* Group Slots & Droppable */}
                      <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-start">
                        {assignedTeams.map((team, idx) => (
                          <div
                            key={team.id}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 flex items-center justify-between gap-2 text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {getParticipantLabel(team)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTeamFromGroup(team)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title={translate('moveToUnassigned')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {/* Droppable Area */}
                        <div
                          className="flex-1 min-h-[60px] rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer p-2"
                        >
                          <Plus className="w-4 h-4 mb-0.5" />
                          <span className="text-[11px] font-semibold">{translate('dropHere')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100"
          >
            {translate('cancel')}
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || !selectedDivision}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{translate('initializing')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{translate('confirmAndGenerateBracket')}</span>
              </>
            )}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

export default BracketSetupModal;
