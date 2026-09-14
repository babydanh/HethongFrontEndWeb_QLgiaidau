'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Loader2,
  Shuffle,
  RefreshCw,
  Sparkles,
  GripVertical,
  X,
  UserCheck,
} from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Division } from '@/features/tournaments/api';

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
  numGroups: number;
  setNumGroups?: React.Dispatch<React.SetStateAction<number>>;
  teamsPerGroup: number;
  setTeamsPerGroup?: React.Dispatch<React.SetStateAction<number>>;
  teamsAdvancing: number;
  setTeamsAdvancing?: React.Dispatch<React.SetStateAction<number>>;
  gskSeedingType?: string;
  setGskSeedingType?: React.Dispatch<React.SetStateAction<'SEEDED' | 'RANDOM'>>;
  isSubmitting: boolean;
  onConfirm: () => Promise<void> | void;
}

export function BracketSetupModal({
  open,
  onOpenChange,
  selectedDivision,
  participants,
  numGroups = 4,
  setNumGroups,
  teamsPerGroup: _teamsPerGroup = 4,
  setTeamsPerGroup,
  isSubmitting,
  onConfirm,
}: BracketSetupModalProps) {
  const translate = useTranslations('TournamentDetail');

  // Filter valid participants
  const eligibleParticipants = useMemo(() => {
    return (participants as ParticipantItem[]).filter(
      (p) => (p?.teamStatus === 'COMPLETE' || !p?.teamStatus) && (p?.isPaid ?? true),
    );
  }, [participants]);

  // Track team assignment: Map groupIndex (0, 1, 2...) -> Array of ParticipantItem
  const [groupAssignments, setGroupAssignments] = useState<Record<number, ParticipantItem[]>>({});
  // Track unassigned teams
  const [unassignedTeams, setUnassignedTeams] = useState<ParticipantItem[]>([]);
  // Dragged participant ID
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

  // Helper to format participant name
  const getParticipantLabel = (p: ParticipantItem) => {
    if (p.teamName) return p.teamName;
    const name1 = p.registeredBy?.fullName || p.user?.fullName;
    const name2 = p.partnerUser?.fullName;
    if (name1 && name2) return `${name1} / ${name2}`;
    if (name1) return name1;
    return `Đội #${p.id.slice(0, 4)}`;
  };

  // Quick pool count selection: 2, 4, 8, 16
  const handleSelectPoolCount = (count: number) => {
    setNumGroups?.(count);
    const newGroups: Record<number, ParticipantItem[]> = {};
    for (let i = 0; i < count; i++) {
      newGroups[i] = groupAssignments[i] || [];
    }
    // Any teams from removed groups go back to unassigned
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

  // Randomize: Distribute all eligible participants randomly and evenly across numGroups
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

    // Snake seeding distribution
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
      <ModalContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50/80 rounded-2xl shadow-2xl border border-slate-200">
        {/* Header - Matching VNTournament layout */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {translate('poolArrangementTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              {translate('poolArrangementSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Pool Count Pills & Actions */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Group pills: 2 bảng, 4 bảng, 8 bảng, 16 bảng */}
          <div className="flex items-center gap-2">
            {poolOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectPoolCount(opt)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  numGroups === opt
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{opt} {translate('twoGroups').replace('2 ', '')}</span>
              </button>
            ))}
          </div>

          {/* Action buttons: Sắp xếp lại, Xếp ngẫu nhiên, Xếp theo ELO */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToUnassigned}
              className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 h-8 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>{translate('rearrange')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRandomize}
              className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 h-8 flex items-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-600" />
              <span>{translate('randomize')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSeedByElo}
              className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 h-8 flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{translate('seedByElo')}</span>
            </Button>
          </div>
        </div>

        {/* Body: Left Column (Unassigned) + Right Column (Pool Grid) */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto">
          {/* CỘT TRÁI: Đội chưa phân bảng */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnassigned}
            className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 flex flex-col min-h-[440px] shadow-2xs"
          >
            <div className="pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {translate('unassignedTeams', { count: unassignedTeams.length })}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                {translate('unassignedDescription')}
              </p>
            </div>

            {/* List of unassigned cards */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
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
                  <UserCheck className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">Tất cả đội đã được phân vào bảng!</p>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Lưới các Bảng đấu (Bảng A, Bảng B, Bảng C, Bảng D...) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-max overflow-y-auto pr-1">
            {Array.from({ length: numGroups }).map((_, gIdx) => {
              const groupName = String.fromCharCode(65 + gIdx); // A, B, C, D...
              const assignedTeams = groupAssignments[gIdx] || [];
              const color = poolColors[gIdx % poolColors.length];

              return (
                <div
                  key={groupName}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnGroup(e, gIdx)}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden min-h-[200px]"
                >
                  {/* Pool Card Header */}
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className={`font-bold text-sm ${color.title}`}>
                      {translate('groupName', { name: groupName })}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${color.badge}`}>
                      {assignedTeams.length} {translate('teamsCount', { count: assignedTeams.length }).replace(`${assignedTeams.length} `, '')}
                    </span>
                  </div>

                  {/* Pool Slots & Droppable Area */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-start">
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

                    {/* Droppable zone "Thả ở đây" */}
                    <div
                      className="flex-1 min-h-[70px] rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer p-3"
                    >
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-xs font-semibold">{translate('dropHere')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
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
                <span>{translate('completeAndCreateBracket')}</span>
              </>
            )}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

export default BracketSetupModal;
