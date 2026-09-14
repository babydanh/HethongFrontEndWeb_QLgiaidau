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
  CheckCircle2,
  HelpCircle,
  Hash,
  Crown,
  Shuffle,
  GitBranch,
} from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Division } from '@/features/tournaments/api';
import type { SportRuleKind, StageRoundConfig } from '@/types/tournament';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';

interface ParticipantItem {
  id: string;
  teamName?: string;
  registeredBy?: { fullName?: string | null } | null;
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
  sportRuleKind: SportRuleKind;
  setSportRuleKind: (val: SportRuleKind) => void;
  isLiteMode: boolean;
  setIsLiteMode: (val: boolean) => void;
  setsToWin: number;
  setSetsToWin: (val: number) => void;
  pointsPerSet: number;
  setPointsPerSet: (val: number) => void;
  winByTwo: boolean;
  setWinByTwo: (val: boolean) => void;
  maxDeucePoints: number;
  setMaxDeucePoints: (val: number) => void;
  superTiebreakEnabled: boolean;
  setSuperTiebreakEnabled?: (val: boolean) => void;
  superTiebreakSetIndex?: number | null;
  setSuperTiebreakSetIndex?: (val: number) => void;
  superTiebreakPoints: number;
  setSuperTiebreakPoints: (val: number) => void;
  // Round Robin
  roundsToPlay: number;
  setRoundsToPlay?: (val: number) => void;
  rrWinPoints: number;
  setRrWinPoints?: (val: number) => void;
  rrLossPoints: number;
  setRrLossPoints?: (val: number) => void;
  rrTiebreaker: string;
  setRrTiebreaker?: (val: string) => void;
  tiebreakerMode: 'split' | 'playoff';
  setTiebreakerMode?: (val: 'split' | 'playoff') => void;
  // GSK
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
  gskRoundsToPlay: number;
  setGskRoundsToPlay?: React.Dispatch<React.SetStateAction<number>>;
  // Submission
  isSubmitting: boolean;
  onConfirm: () => Promise<void> | void;
}

// Color accents for groups A, B, C, D...
const GROUP_COLORS = [
  { header: 'bg-blue-600 text-white', border: 'border-blue-200', bg: 'bg-blue-50/40', badge: 'bg-blue-100 text-blue-700' },
  { header: 'bg-emerald-600 text-white', border: 'border-emerald-200', bg: 'bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-700' },
  { header: 'bg-purple-600 text-white', border: 'border-purple-200', bg: 'bg-purple-50/40', badge: 'bg-purple-100 text-purple-700' },
  { header: 'bg-amber-600 text-white', border: 'border-amber-200', bg: 'bg-amber-50/40', badge: 'bg-amber-100 text-amber-700' },
  { header: 'bg-rose-600 text-white', border: 'border-rose-200', bg: 'bg-rose-50/40', badge: 'bg-rose-100 text-rose-700' },
  { header: 'bg-indigo-600 text-white', border: 'border-indigo-200', bg: 'bg-indigo-50/40', badge: 'bg-indigo-100 text-indigo-700' },
  { header: 'bg-teal-600 text-white', border: 'border-teal-200', bg: 'bg-teal-50/40', badge: 'bg-teal-100 text-teal-700' },
  { header: 'bg-orange-600 text-white', border: 'border-orange-200', bg: 'bg-orange-50/40', badge: 'bg-orange-100 text-orange-700' },
];

export function BracketSetupModal({
  open,
  onOpenChange,
  tournamentFormat,
  bracketType,
  selectedDivision,
  participants,
  sportRuleKind,
  setSportRuleKind,
  isLiteMode,
  setIsLiteMode,
  setsToWin,
  setSetsToWin,
  pointsPerSet,
  setPointsPerSet,
  winByTwo,
  setWinByTwo,
  maxDeucePoints,
  setMaxDeucePoints,
  superTiebreakEnabled,
  setSuperTiebreakEnabled,
  superTiebreakSetIndex,
  setSuperTiebreakSetIndex,
  superTiebreakPoints,
  setSuperTiebreakPoints,
  roundsToPlay,
  setRoundsToPlay,
  rrWinPoints,
  setRrWinPoints,
  rrLossPoints,
  setRrLossPoints,
  rrTiebreaker,
  setRrTiebreaker,
  tiebreakerMode,
  setTiebreakerMode,
  numGroups,
  setNumGroups,
  teamsPerGroup,
  setTeamsPerGroup,
  teamsAdvancing,
  setTeamsAdvancing,
  gskPlayoffType = 'SINGLE_ELIMINATION',
  setGskPlayoffType,
  gskSeedingType = 'SEEDED',
  setGskSeedingType,
  gskRoundsToPlay,
  setGskRoundsToPlay,
  isSubmitting,
  onConfirm,
}: BracketSetupModalProps) {
  const translate = useTranslations('TournamentDetail');
  const presentation = getSportRulePresentation(sportRuleKind, translate);
  const presets = getSportRulePresets(sportRuleKind, translate);

  const isGroupStageKnockout =
    tournamentFormat?.toUpperCase() === 'GROUP_STAGE_KNOCKOUT' ||
    bracketType?.toUpperCase() === 'GROUP_STAGE_KNOCKOUT' ||
    selectedDivision?.bracketType === 'GROUP_STAGE_KNOCKOUT';

  const isRoundRobin =
    !isGroupStageKnockout &&
    (tournamentFormat?.toUpperCase() === 'ROUND_ROBIN' ||
      bracketType?.toUpperCase() === 'ROUND_ROBIN' ||
      selectedDivision?.bracketType === 'ROUND_ROBIN');

  // Filter valid participants
  const eligibleParticipants = useMemo(() => {
    return (participants as ParticipantItem[]).filter(
      (p) => (p?.teamStatus === 'COMPLETE' || !p?.teamStatus) && (p?.isPaid ?? true),
    );
  }, [participants]);

  const participantCount = eligibleParticipants.length;

  // Auto-tune default setting based on participantCount on first open or count change
  useEffect(() => {
    if (!open) return;
    if (isGroupStageKnockout && participantCount >= 4) {
      if (participantCount <= 8) {
        setNumGroups?.(2);
        setTeamsPerGroup?.(Math.ceil(participantCount / 2));
        setTeamsAdvancing?.(1);
      } else if (participantCount <= 16) {
        setNumGroups?.(2);
        setTeamsPerGroup?.(Math.ceil(participantCount / 2));
        setTeamsAdvancing?.(2);
      } else if (participantCount <= 32) {
        setNumGroups?.(4);
        setTeamsPerGroup?.(Math.ceil(participantCount / 4));
        setTeamsAdvancing?.(2);
      } else {
        setNumGroups?.(8);
        setTeamsPerGroup?.(Math.ceil(participantCount / 8));
        setTeamsAdvancing?.(2);
      }
    }
  }, [open, participantCount, isGroupStageKnockout, setNumGroups, setTeamsPerGroup, setTeamsAdvancing]);

  // Derived advancing count and display label
  const totalAdvancing = numGroups * teamsAdvancing;
  const getKnockoutRoundTitle = (advancingCount: number) => {
    if (advancingCount <= 2) return translate('stageFinal');
    if (advancingCount <= 4) return translate('stageSemifinal');
    if (advancingCount <= 8) return translate('stageQuarterfinal');
    return translate('roundOf', { round: advancingCount });
  };

  // Build list of groups with assigned preview teams (snake or round-robin distribution)
  const groupDistribution = useMemo(() => {
    const totalSlots = numGroups * teamsPerGroup;
    const groups: Array<{ name: string; teams: Array<ParticipantItem | null> }> = [];

    for (let i = 0; i < numGroups; i++) {
      groups.push({
        name: String.fromCharCode(65 + i), // A, B, C, D...
        teams: [],
      });
    }

    // Distribute eligible participants across groups (Seed / ELO order)
    const sorted = [...eligibleParticipants].sort((a, b) => {
      if (a.seed && b.seed) return a.seed - b.seed;
      if (a.seed) return -1;
      if (b.seed) return 1;
      return (b.eloPoints ?? 0) - (a.eloPoints ?? 0);
    });

    for (let slotIndex = 0; slotIndex < teamsPerGroup; slotIndex++) {
      for (let gIndex = 0; gIndex < numGroups; gIndex++) {
        // Snake order: even rows forward, odd rows reverse for fair seeding
        const effectiveGroupIndex = slotIndex % 2 === 0 ? gIndex : numGroups - 1 - gIndex;
        const participantIndex = slotIndex * numGroups + gIndex;
        const assignedTeam = sorted[participantIndex] ?? null;
        if (groups[effectiveGroupIndex]) {
          groups[effectiveGroupIndex].teams.push(assignedTeam);
        }
      }
    }

    return groups;
  }, [numGroups, teamsPerGroup, eligibleParticipants]);

  const applyPreset = (preset: (typeof presets)[number]) => {
    setSetsToWin(preset.setsToWin);
    setPointsPerSet(preset.pointsPerSet);
    setWinByTwo(preset.winByTwo);
    setMaxDeucePoints(preset.maxPoints);
    setSuperTiebreakEnabled?.(preset.tiebreakPoints !== null);
    setSuperTiebreakSetIndex?.(preset.setsToWin * 2 - 1);
    setSuperTiebreakPoints(preset.tiebreakPoints ?? preset.pointsPerSet);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-5xl w-[95vw] rounded-2xl bg-slate-50/90 p-0 overflow-hidden border border-slate-200/90 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 shadow-2xs">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ModalTitle className="text-base sm:text-lg font-bold text-slate-900">
                  {translate('setupBracketModalTitle')}
                </ModalTitle>
                <span className="rounded-md bg-blue-100/70 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                  {selectedDivision?.name || translate('divisionDefault')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isGroupStageKnockout
                  ? translate('groupStageKnockoutSummary', { groups: numGroups, teams: teamsPerGroup, advancing: teamsAdvancing })
                  : isRoundRobin
                  ? translate('roundRobinConfigTitle')
                  : translate('bracketSingleElimination')}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* PHẦN 1: BỘ THIẾT LẬP THỂ THỨC (GỌN GÀNG, ÍT CHỮ) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Cột trái: Cấu hình bảng đấu & Knockout */}
            <div className={`space-y-4 ${isGroupStageKnockout ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
              {isGroupStageKnockout && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {translate('stage1GroupStage')}
                      </h4>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {participantCount} {translate('teamsCount', { count: participantCount })} / {numGroups * teamsPerGroup} suất
                    </span>
                  </div>

                  {/* 3 Steppers: Số Bảng, Số Đội Mỗi Bảng, Số Đội Đi Tiếp */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 1. SỐ BẢNG */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        {translate('numberOfGroups')}
                      </span>
                      <div className="my-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.max(2, numGroups - 1);
                            setNumGroups?.(next);
                            if (participantCount > 0) setTeamsPerGroup?.(Math.min(128, Math.max(2, Math.ceil(participantCount / next))));
                          }}
                          disabled={numGroups <= 2}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-lg font-bold text-slate-900">{numGroups}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.min(16, numGroups + 1);
                            setNumGroups?.(next);
                            if (participantCount > 0) setTeamsPerGroup?.(Math.min(128, Math.max(2, Math.ceil(participantCount / next))));
                          }}
                          disabled={numGroups >= 16}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-center text-slate-400 font-medium">
                        {Array.from({ length: Math.min(numGroups, 6) }, (_, i) => String.fromCharCode(65 + i)).join(', ')}
                        {numGroups > 6 ? '...' : ''}
                      </span>
                    </div>

                    {/* 2. ĐỘI MỖI BẢNG */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        {translate('teamsPerGroup')}
                      </span>
                      <div className="my-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setTeamsPerGroup?.(Math.max(2, teamsPerGroup - 1))}
                          disabled={teamsPerGroup <= 2}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-lg font-bold text-slate-900">{teamsPerGroup}</span>
                        <button
                          type="button"
                          onClick={() => setTeamsPerGroup?.(Math.min(32, teamsPerGroup + 1))}
                          disabled={teamsPerGroup >= 32}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-center text-slate-400 font-medium">
                        {teamsPerGroup} {translate('teamsCount', { count: teamsPerGroup })}
                      </span>
                    </div>

                    {/* 3. SUẤT ĐI TIẾP MỖI BẢNG */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        {translate('teamsAdvancing')}
                      </span>
                      <div className="my-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setTeamsAdvancing?.(Math.max(1, teamsAdvancing - 1))}
                          disabled={teamsAdvancing <= 1}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-lg font-bold text-blue-600">{teamsAdvancing}</span>
                        <button
                          type="button"
                          onClick={() => setTeamsAdvancing?.(Math.min(teamsPerGroup - 1, teamsAdvancing + 1))}
                          disabled={teamsAdvancing >= teamsPerGroup - 1}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-center text-blue-600 font-semibold">
                        Top {teamsAdvancing} mỗi bảng
                      </span>
                    </div>
                  </div>

                  {/* Flow Summary Pill */}
                  <div className="flex items-center justify-between rounded-lg bg-blue-50/70 border border-blue-200/60 px-4 py-2 text-xs font-semibold text-blue-900">
                    <div className="flex items-center gap-1.5">
                      <span>{numGroups} bảng × {teamsAdvancing} suất</span>
                      <span className="text-blue-500 font-bold">➔</span>
                      <span className="font-bold text-blue-700">
                        {totalAdvancing} đội vào Knockout ({getKnockoutRoundTitle(totalAdvancing)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={gskSeedingType}
                        onChange={(e) => setGskSeedingType?.(e.target.value as 'SEEDED' | 'RANDOM')}
                        className="bg-white border border-blue-200 rounded px-2 py-1 text-xs font-bold text-slate-700"
                      >
                        <option value="SEEDED">{translate('seededByElo')}</option>
                        <option value="RANDOM">{translate('randomSeeding')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Round Robin simple config (if purely round robin) */}
              {isRoundRobin && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {translate('roundRobinConfigTitle')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">{translate('roundsToPlay')}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={roundsToPlay}
                        onChange={(e) => setRoundsToPlay?.(Math.max(1, Number(e.target.value)))}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">{translate('tieHandling')}</label>
                      <select
                        value={tiebreakerMode}
                        onChange={(e) => setTiebreakerMode?.(e.target.value as 'split' | 'playoff')}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold bg-white"
                      >
                        <option value="split">{translate('splitTie')}</option>
                        <option value="playoff">{translate('playoffTie')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cột phải: Luật tính điểm (Tự do / Tiêu chuẩn) */}
            <div className={`space-y-4 ${isGroupStageKnockout ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
              <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {translate('rulesAndBracketTitle')}
                  </h4>
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
                </div>

                {/* Micro scoring rules */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">{translate('setsToWin')}</label>
                    <select
                      value={setsToWin}
                      onChange={(e) => setSetsToWin(Number(e.target.value))}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold bg-white text-slate-800"
                    >
                      {presentation.setOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">{presentation.setUnitLabel}</label>
                    <input
                      type="number"
                      value={pointsPerSet}
                      onChange={(e) => setPointsPerSet(Number(e.target.value))}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label htmlFor="modal_winByTwo" className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      id="modal_winByTwo"
                      checked={winByTwo}
                      onChange={(e) => setWinByTwo(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    {presentation.winByTwoLabel}
                  </label>
                  {winByTwo && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">Max:</span>
                      <input
                        type="number"
                        value={maxDeucePoints}
                        onChange={(e) => setMaxDeucePoints(Number(e.target.value))}
                        className="w-14 border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-center"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN 2: TRỰC QUAN HÓA (VISUAL PREVIEW) THEO LUỒNG VIDEO */}
          {isGroupStageKnockout && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {translate('visualDistributionPreviewTitle')}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>{translate('topAdvancingBadge', { count: teamsAdvancing })}</span>
                </div>
              </div>

              {/* Bố cục 2 cột: Bên trái là danh sách VĐV, Bên phải là các Card Bảng đấu */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* CỘT TRÁI (4 cols): DANH SÁCH VẬN ĐỘNG VIÊN */}
                <div className="lg:col-span-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {translate('participantsList')} ({eligibleParticipants.length})
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {gskSeedingType === 'SEEDED' ? 'Hạt giống theo ELO' : 'Xếp ngẫu nhiên'}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200/60 max-h-[320px] overflow-y-auto pr-1">
                    {eligibleParticipants.length > 0 ? (
                      eligibleParticipants.map((p, idx) => (
                        <div key={p.id || idx} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-[10px] font-bold text-slate-700">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 truncate">
                              {p.teamName || p.registeredBy?.fullName || `Đội ${idx + 1}`}
                            </span>
                          </div>
                          {p.eloPoints && (
                            <span className="shrink-0 text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {p.eloPoints} ELO
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                        {translate('noParticipantsYet')}
                      </div>
                    )}
                  </div>
                </div>

                {/* CỘT PHẢI (8 cols): DANH SÁCH CÁC BẢNG ĐẤU MÀU SẮC */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[340px] overflow-y-auto pr-1">
                  {groupDistribution.map((grp, gIdx) => {
                    const color = GROUP_COLORS[gIdx % GROUP_COLORS.length];
                    return (
                      <div
                        key={grp.name}
                        className={`rounded-xl border ${color.border} ${color.bg} overflow-hidden shadow-2xs flex flex-col`}
                      >
                        {/* Group Header */}
                        <div className={`px-3 py-2 flex items-center justify-between ${color.header}`}>
                          <div className="flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5" />
                            <span className="font-bold text-xs uppercase tracking-wider">
                              {translate('groupName', { name: grp.name })}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                            {grp.teams.filter(Boolean).length}/{teamsPerGroup} {translate('teams')}
                          </span>
                        </div>

                        {/* Slots */}
                        <div className="p-2 space-y-1.5 divide-y divide-slate-100 bg-white/80 flex-1">
                          {grp.teams.map((team, tIdx) => {
                            const isAdvancingSlot = tIdx < teamsAdvancing;
                            return (
                              <div
                                key={tIdx}
                                className={`pt-1.5 first:pt-0 flex items-center justify-between text-xs px-2 py-1 rounded-md transition-colors ${
                                  isAdvancingSlot ? 'bg-emerald-50/60 border border-emerald-200/50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                                      isAdvancingSlot ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {tIdx + 1}
                                  </span>
                                  <span className="font-semibold text-slate-800 truncate">
                                    {team ? (team.teamName || team.registeredBy?.fullName || `Đội #${tIdx + 1}`) : (
                                      <span className="text-slate-400 italic">{translate('openSlot')}</span>
                                    )}
                                  </span>
                                </div>
                                {isAdvancingSlot && (
                                  <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded shrink-0">
                                    {translate('advancing')}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm"
          >
            {translate('cancel')}
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || (!selectedDivision)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
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
