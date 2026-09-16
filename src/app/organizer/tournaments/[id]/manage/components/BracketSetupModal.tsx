'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Trophy,
  Users,
  Sparkles,
  Plus,
  Loader2,
  Shuffle,
  RefreshCw,
  GripVertical,
  X,
  UserCheck,
} from 'lucide-react';
import { Modal, ModalContent, ModalTitle, ModalDescription } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Division } from '@/features/tournaments/api';
import type { BracketStage } from '@/types/tournament';
import { buildBracketSetupViewModel } from './bracket-setup-view-model';

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
  selectedDivision: Division | null;
  participants: unknown[];

  // Existing bracket structure state; this modal only arranges teams.
  numGroups: number;
  setNumGroups?: React.Dispatch<React.SetStateAction<number>>;
  teamsPerGroup: number;
  setTeamsPerGroup?: React.Dispatch<React.SetStateAction<number>>;
  teamsAdvancing: number;

  // Submission
  isSubmitting: boolean;
  onConfirm: (assignments: Record<number, ParticipantItem[]>) => Promise<void> | void;
  onAssignmentsChange?: (assignments: Record<number, ParticipantItem[]>) => Promise<void> | void;
  bracket?: { stages: BracketStage[] } | null;
}

function createEmptyGroupAssignments(groupCount: number): Record<number, ParticipantItem[]> {
  const groups: Record<number, ParticipantItem[]> = {};
  for (let i = 0; i < Math.max(0, groupCount); i++) {
    groups[i] = [];
  }
  return groups;
}

function extractExistingGroupAssignments(
  bracket: { stages: BracketStage[] } | null | undefined,
  eligibleParticipants: ParticipantItem[],
  fallbackGroupCount: number,
): { assignments: Record<number, ParticipantItem[]>; unassigned: ParticipantItem[]; groupCount: number } {
  if (!bracket || !bracket.stages || bracket.stages.length === 0) {
    return {
      assignments: createEmptyGroupAssignments(fallbackGroupCount),
      unassigned: [...eligibleParticipants],
      groupCount: fallbackGroupCount,
    };
  }

  // Find round robin or group stage
  const groupStage =
    bracket.stages.find((s) => s.type === 'ROUND_ROBIN' || s.type === 'GROUP_STAGE_KNOCKOUT') ||
    bracket.stages[0];

  const groups = groupStage?.groups;
  if (!groups || groups.length === 0) {
    return {
      assignments: createEmptyGroupAssignments(fallbackGroupCount),
      unassigned: [...eligibleParticipants],
      groupCount: fallbackGroupCount,
    };
  }

  const participantMap = new Map<string, ParticipantItem>();
  eligibleParticipants.forEach((p) => {
    participantMap.set(p.id, p);
  });

  const assignedSet = new Set<string>();
  const assignments: Record<number, ParticipantItem[]> = {};
  const actualGroupCount = groups.length;

  for (let gIdx = 0; gIdx < actualGroupCount; gIdx++) {
    const group = groups[gIdx];
    const groupTeamIds: string[] = [];
    const seenInGroup = new Set<string>();

    (group.matches || []).forEach((m) => {
      const p1Id = m.participant1?.id || m.participant1Id;
      const p2Id = m.participant2?.id || m.participant2Id;

      if (p1Id && !seenInGroup.has(p1Id)) {
        seenInGroup.add(p1Id);
        groupTeamIds.push(p1Id);
      }
      if (p2Id && !seenInGroup.has(p2Id)) {
        seenInGroup.add(p2Id);
        groupTeamIds.push(p2Id);
      }
    });

    const groupTeams: ParticipantItem[] = [];
    groupTeamIds.forEach((id) => {
      assignedSet.add(id);
      const found = participantMap.get(id);
      if (found) {
        groupTeams.push(found);
      } else {
        // Fallback placeholder item if not in eligible list
        groupTeams.push({ id, teamName: `Đội #${id.slice(0, 4)}` });
      }
    });

    assignments[gIdx] = groupTeams;
  }

  const unassigned = eligibleParticipants.filter((p) => !assignedSet.has(p.id));

  return {
    assignments,
    unassigned,
    groupCount: actualGroupCount,
  };
}

export function BracketSetupModal({
  open,
  onOpenChange,
  selectedDivision,
  participants,
  numGroups = 4,
  setNumGroups,
  teamsPerGroup = 4,
  setTeamsPerGroup,
  teamsAdvancing = 2,
  isSubmitting,
  onConfirm,
  onAssignmentsChange,
  bracket,
}: BracketSetupModalProps) {
  const translate = useTranslations('TournamentDetail');

  // Filter valid participants
  const eligibleParticipants = useMemo(() => {
    return (participants as ParticipantItem[]).filter(
      (p) => (p?.teamStatus === 'COMPLETE' || !p?.teamStatus) && (p?.isPaid ?? true),
    );
  }, [participants]);

  const bracketSetup = buildBracketSetupViewModel({
    divisionBracketType: selectedDivision?.bracketType,
    numGroups,
    teamsPerGroup,
    teamsAdvancing,
    participantCount: eligibleParticipants.length,
  });
  const modalSummary = bracketSetup.variant === 'GROUP_STAGE_KNOCKOUT'
    ? translate('compactGroupStageSummary', {
        groups: bracketSetup.groups,
        teams: bracketSetup.teamsPerGroup,
        advancing: bracketSetup.teamsAdvancing,
        total: bracketSetup.advancingTotal,
      })
    : bracketSetup.variant === 'ROUND_ROBIN'
      ? translate('compactRoundRobinSummary', { rounds: bracketSetup.roundsToPlay })
      : translate('compactKnockoutSummary', { count: bracketSetup.participantCount });

  // Track team assignment: Map groupIndex (0, 1, 2...) -> Array of ParticipantItem
  const [groupAssignments, setGroupAssignments] = useState<Record<number, ParticipantItem[]>>(() => {
    const extracted = extractExistingGroupAssignments(bracket, eligibleParticipants, numGroups);
    return extracted.assignments;
  });
  const [unassignedTeams, setUnassignedTeams] = useState<ParticipantItem[]>(() => {
    const extracted = extractExistingGroupAssignments(bracket, eligibleParticipants, numGroups);
    return extracted.unassigned;
  });
  const [draggedParticipantId, setDraggedParticipantId] = useState<string | null>(null);

  const initFromBracketOrEmpty = useCallback(() => {
    const extracted = extractExistingGroupAssignments(bracket, eligibleParticipants, numGroups);
    if (extracted.groupCount !== numGroups && setNumGroups) {
      setNumGroups(extracted.groupCount);
    }
    setGroupAssignments(extracted.assignments);
    setUnassignedTeams(extracted.unassigned);
  }, [bracket, eligibleParticipants, numGroups, setNumGroups]);

  const resetPoolAssignments = useCallback((groupCount = numGroups) => {
    setUnassignedTeams([...eligibleParticipants]);
    setGroupAssignments(createEmptyGroupAssignments(groupCount));
  }, [eligibleParticipants, numGroups]);

  const handleModalOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      initFromBracketOrEmpty();
    }
    onOpenChange(nextOpen);
  }, [onOpenChange, initFromBracketOrEmpty]);

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
    resetPoolAssignments();
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

  // Move a team into a specific group (optionally at a target index, or append)
  const assignTeamToGroup = (
    participant: ParticipantItem,
    targetGroupIndex: number,
    targetSlotIndex?: number,
  ): Record<number, ParticipantItem[]> => {
    setUnassignedTeams((prev) => prev.filter((p) => p.id !== participant.id));

    const updated: Record<number, ParticipantItem[]> = {};
    for (let i = 0; i < numGroups; i++) {
      const filtered = (groupAssignments[i] || []).filter((p) => p.id !== participant.id);
      if (i === targetGroupIndex) {
        if (typeof targetSlotIndex === 'number' && targetSlotIndex >= 0 && targetSlotIndex <= filtered.length) {
          const nextList = [...filtered];
          nextList.splice(targetSlotIndex, 0, participant);
          updated[i] = nextList;
        } else {
          updated[i] = [...filtered, participant];
        }
      } else {
        updated[i] = filtered;
      }
    }
    setGroupAssignments(updated);
    return updated;
  };

  // Move a team back to unassigned from a group
  const removeTeamFromGroup = (participant: ParticipantItem): Record<number, ParticipantItem[]> => {
    const updated: Record<number, ParticipantItem[]> = {};
    for (let i = 0; i < numGroups; i++) {
      updated[i] = (groupAssignments[i] || []).filter((p) => p.id !== participant.id);
    }
    setGroupAssignments(updated);
    setUnassignedTeams((prev) => {
      if (prev.some((p) => p.id === participant.id)) return prev;
      return [...prev, participant];
    });
    return updated;
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, participantId: string, fromGroupIndex?: number) => {
    e.dataTransfer.setData('text/plain', participantId);
    if (typeof fromGroupIndex === 'number') {
      e.dataTransfer.setData('application/json', JSON.stringify({ participantId, fromGroupIndex }));
    }
    setDraggedParticipantId(participantId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnGroup = (e: React.DragEvent, groupIndex: number, targetSlotIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const pId = e.dataTransfer.getData('text/plain') || draggedParticipantId;
    if (!pId) return;

    const participant = eligibleParticipants.find((p) => p.id === pId);
    if (participant) {
      const nextAssignments = assignTeamToGroup(participant, groupIndex, targetSlotIndex);
      void onAssignmentsChange?.(nextAssignments);
    }
    setDraggedParticipantId(null);
  };

  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pId = e.dataTransfer.getData('text/plain') || draggedParticipantId;
    if (!pId) return;

    const participant = eligibleParticipants.find((p) => p.id === pId);
    if (participant) {
      const nextAssignments = removeTeamFromGroup(participant);
      void onAssignmentsChange?.(nextAssignments);
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
    <Modal open={open} onOpenChange={handleModalOpenChange}>
      <ModalContent className="max-w-7xl w-[96vw] max-h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-50 rounded-2xl shadow-2xl border border-slate-200">
        {/* MODAL HEADER */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ModalTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  {translate('setupBracketModalTitle')}
                </ModalTitle>
                {selectedDivision?.name && (
                  <span className="rounded-md bg-blue-100/80 px-2 py-0.5 text-xs font-bold text-blue-700">
                    {selectedDivision.name}
                  </span>
                )}
              </div>
              <ModalDescription className="text-xs text-slate-500 mt-0.5 font-normal">{modalSummary}</ModalDescription>
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

          {/* PHẦN 2: XẾP BẢNG ĐẤU & PHÂN BỔ ĐỘI */}
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
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[520px] pr-1">
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
              <div className={`lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 ${numGroups > 4 ? 'max-h-[600px] overflow-y-auto pr-1' : ''}`}>
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
                            draggable
                            onDragStart={(e) => handleDragStart(e, team.id, gIdx)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnGroup(e, gIdx, idx)}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs flex items-center justify-between gap-2 text-xs shadow-2xs transition-all cursor-grab active:cursor-grabbing group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {getParticipantLabel(team)}
                              </span>
                              {team.eloPoints && (
                                <span className="text-[9px] font-bold text-blue-600 shrink-0">
                                  {team.eloPoints}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextAssignments = removeTeamFromGroup(team);
                                  void onAssignmentsChange?.(nextAssignments);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title={translate('moveToUnassigned')}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Droppable Area */}
                        <div
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnGroup(e, gIdx)}
                          className="flex-1 min-h-[50px] rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer p-2"
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
            Đóng
          </Button>

          <Button
            type="button"
            onClick={() => onConfirm(groupAssignments)}
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
