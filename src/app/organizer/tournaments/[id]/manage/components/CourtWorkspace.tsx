'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronRight,
  Expand,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import type { Division, SchedulePlanPreview } from '@/features/tournaments/api';
import type { CourtSetupItem } from './CourtSetup';
import { CourtScheduleBoard } from './CourtScheduleBoard';

interface CourtWorkspaceProps {
  bracket?: any;
  venueName?: string;
  courts: CourtSetupItem[];
  divisions?: Division[];
  matches: any[];
  defaultDivisionId?: string;
  defaultDate?: string | null;
  defaultOperatingStart?: string;
  defaultOperatingEnd?: string;
  sportRuleKind?: string;
  setsToWin?: number;
  preview?: SchedulePlanPreview | null;
  isPreviewing?: boolean;
  onPreview?: (...args: any[]) => Promise<any>;
  onPreviewWithAi?: (...args: any[]) => Promise<any>;
  aiScheduleIntent?: unknown;
  isPlanningScheduleWithAi?: boolean;
  onOpenMatch: (matchId: string) => void;
  onSaveScheduleDirect?: (matchId: string, courtId: string, scheduledAt: string, silent?: boolean) => Promise<void>;
  onRefetchData?: () => Promise<any> | void;
}

export function CourtWorkspace({
  bracket,
  venueName,
  courts,
  divisions = [],
  matches,
  defaultDivisionId = 'all',
  defaultDate,
  defaultOperatingStart = '06:00',
  defaultOperatingEnd = '24:00',
  preview,
  onOpenMatch,
  onSaveScheduleDirect,
  onRefetchData,
}: CourtWorkspaceProps) {
  const t = useTranslations('OrganizerManage');

  // Fullscreen / Expanded State (Collapsed by default per user request)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>(() => courts.map((court) => court.id));
  const [courtPickerOpen, setCourtPickerOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');

  const allCourtsSelected = selectedCourtIds.length === courts.length;

  const stageMetaByMatchId = useMemo(() => {
    const entries: Array<[string, { stageId: string; stageName: string; stageType?: string; roundsToPlay: number }]> = [];
    if (bracket?.stages && Array.isArray(bracket.stages)) {
      bracket.stages.forEach((stage: any) => {
        (stage.groups ?? []).forEach((group: any) => {
          (group.matches ?? []).forEach((match: any) => {
            if (match?.id) {
              entries.push([
                match.id,
                {
                  stageId: stage.id || stage.name || 'stage',
                  stageName: stage.name || 'Giai đoạn',
                  stageType: stage.type,
                  roundsToPlay: stage.roundConfig?.roundsToPlay ?? stage.roundConfig?.rounds_to_play ?? 1,
                },
              ]);
            }
          });
        });
      });
    }
    return new Map<string, { stageId: string; stageName: string; stageType?: string; roundsToPlay: number }>(entries);
  }, [bracket]);

  const divisionOptions = useMemo(() => divisions, [divisions]);
  const contentMatches = useMemo(
    () => {
      if (selectedDivision === 'all') return matches;
      return matches.filter((match) => String(match.divisionId) === String(selectedDivision));
    },
    [matches, selectedDivision],
  );
  const stageOptions = useMemo(() => {
    const options = contentMatches.map((match) => {
      const meta = stageMetaByMatchId.get(match.id);
      return meta ? { id: meta.stageId, name: meta.stageName } : match.stage?.name ? { id: match.stage.name, name: match.stage.name } : null;
    }).filter((option): option is { id: string; name: string } => Boolean(option));
    return [...new Map(options.map((option) => [option.id, option])).values()];
  }, [contentMatches, stageMetaByMatchId]);

  const stageMatches = useMemo(
    () => selectedStage === 'all' ? contentMatches : contentMatches.filter((match) => (stageMetaByMatchId.get(match.id)?.stageId ?? match.stage?.name) === selectedStage),
    [contentMatches, selectedStage, stageMetaByMatchId],
  );

  const activeStageMeta = stageMatches.map((match) => stageMetaByMatchId.get(match.id)).find(Boolean);
  const configuredLegCount = activeStageMeta?.roundsToPlay ?? Math.max(0, ...stageMatches.map((match) => Math.max(match.stage?.roundConfig?.roundsToPlay ?? 0, match.stage?.roundConfig?.rounds_to_play ?? 0)));
  const stageType = activeStageMeta?.stageType?.toUpperCase() ?? '';
  const isKnockoutStage = stageType.includes('ELIMINATION');
  const usesLegFilter = configuredLegCount > 1;

  const roundOptions = useMemo(() => {
    const values = stageMatches
      .map((match) => (usesLegFilter ? match.leg ?? null : match.roundNumber ?? null))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return [...new Set(values)].sort((a, b) => a - b);
  }, [stageMatches, usesLegFilter]);

  const roundLabel = (round: number) => {
    if (usesLegFilter) return `Lượt ${round}`;

    // Check if group stage match exists for this round
    const roundMatch = stageMatches.find((m) => (m.roundNumber === round || m.leg === round));
    if (roundMatch) {
      const rawName = String(roundMatch.roundName || roundMatch.stageName || roundMatch.stage?.name || '').trim();
      const lower = rawName.toLowerCase();
      if (lower.includes('tranh hạng 3') || lower.includes('3rd')) return 'Tranh hạng 3';
      if (roundMatch.groupName || lower.includes('bảng')) {
        const cleanGroup = (roundMatch.groupName || rawName).replace(/giai\s*đoạn\s*\d*/gi, '').replace(/stage\s*\d*/gi, '').trim();
        return `${cleanGroup} • Lượt ${roundMatch.leg || roundMatch.roundNumber || round}`;
      }
    }

    const maxRound = roundOptions.at(-1) ?? round;
    if (maxRound > 1) {
      const diff = maxRound - round;
      if (diff === 0) return 'Chung kết';
      if (diff === 1) return 'Bán kết';
      if (diff === 2) return 'Tứ kết';
      if (diff === 3) return 'Vòng 1/8';
      if (diff === 4) return 'Vòng 1/16';
      if (diff === 5) return 'Vòng 1/32';
      if (diff === 6) return 'Vòng 1/64';
    }

    return `Vòng ${round}`;
  };

  const scopedMatches = useMemo(
    () => selectedRound === 'all' ? stageMatches : stageMatches.filter((match) => (usesLegFilter ? String(match.leg) === selectedRound : String(match.roundNumber) === selectedRound)),
    [stageMatches, selectedRound, usesLegFilter],
  );

  const visibleCourts = useMemo(() => {
    const selected = new Set(selectedCourtIds);
    return courts.filter((court) => selected.has(court.id));
  }, [courts, selectedCourtIds]);

  const toggleCourt = (courtId: string) => {
    setSelectedCourtIds((current) => current.includes(courtId)
      ? current.filter((id) => id !== courtId)
      : [...current, courtId]);
  };

  const scheduledMatchesCount = useMemo(
    () => matches.filter((m) => Boolean(m.courtId && m.scheduledAt)).length,
    [matches],
  );

  if (courts.length === 0) return null;

  const renderScheduleContent = () => (
    <div className="space-y-2 w-full h-full flex flex-col">
      {/* Single Unified High-Density Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs shrink-0">
        {/* Left: Venue & Match count */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xs sm:text-sm font-bold text-slate-900 leading-tight">
              {venueName || t('venueNotSet')}
            </h3>
            <p className="text-[10px] text-slate-500 leading-tight">
              Đã xếp <strong className="text-blue-700 font-bold">{scheduledMatchesCount}/{matches.length}</strong> trận
            </p>
          </div>
        </div>

        {/* Center: Inline Compact Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedDivision}
            onChange={(event) => {
              setSelectedDivision(event.target.value);
              setSelectedStage('all');
              setSelectedRound('all');
            }}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500"
          >
            <option value="all">{t('allDivisions')}</option>
            {divisionOptions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>

          {stageOptions.length > 1 && (
            <select
              value={selectedStage}
              onChange={(event) => {
                setSelectedStage(event.target.value);
                setSelectedRound('all');
              }}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500"
            >
              <option value="all">{t('allStages')}</option>
              {stageOptions.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          )}

          {roundOptions.length > 1 && (
            <select
              value={selectedRound}
              onChange={(event) => setSelectedRound(event.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500"
            >
              <option value="all">{usesLegFilter ? t('allLegs') : t('allRounds')}</option>
              {roundOptions.map((round) => (
                <option key={round} value={String(round)}>
                  {roundLabel(round)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCourtPickerOpen(true)}
            className="h-8 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            {t('chooseCourts')} ({visibleCourts.length}/{courts.length})
          </Button>

          {isFullscreen ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFullscreen(false)}
              className="h-8 px-3 rounded-lg border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Thu nhỏ / Đóng
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Toàn màn hình
            </Button>
          )}
        </div>
      </div>

      {/* Main Schedule Board Grid */}
      <CourtScheduleBoard
        courts={visibleCourts}
        matches={scopedMatches}
        divisions={divisions}
        preview={preview}
        defaultDate={defaultDate}
        defaultOperatingStart={defaultOperatingStart}
        defaultOperatingEnd={defaultOperatingEnd}
        isFullscreen={isFullscreen}
        onOpenMatch={onOpenMatch}
        onSaveScheduleDirect={onSaveScheduleDirect}
        onRefetchData={onRefetchData}
      />
    </div>
  );

  return (
    <section aria-labelledby="court-workspace-title" className="w-full">
      {/* 1. Default In-page View (renders clean unified layout) */}
      {!isFullscreen && (
        <div className="w-full">
          {renderScheduleContent()}
        </div>
      )}

      {/* 2. Fullscreen Workspace Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-100 animate-in fade-in duration-150 p-2 md:p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fullscreen-workspace-title"
        >
          <div className="w-full h-full flex flex-col">
            {renderScheduleContent()}
          </div>
        </div>
      )}

      {/* Court Filter Modal */}
      <Modal open={courtPickerOpen} onOpenChange={setCourtPickerOpen}>
        <ModalContent className="max-w-md rounded-xl border border-slate-200">
          <ModalHeader>
            <ModalTitle className="text-base font-bold text-slate-900">{t('chooseCourts')}</ModalTitle>
            <ModalDescription className="text-xs text-slate-500">{t('selectedCourtsHint')}</ModalDescription>
          </ModalHeader>
          <div className="grid gap-2 sm:grid-cols-2 py-2">
            {courts.map((court) => {
              const selected = selectedCourtIds.includes(court.id);
              return (
                <button
                  key={court.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleCourt(court.id)}
                  className={`flex min-h-10 items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate">{court.courtName}</span>
                  <span
                    className={`ml-2 h-3.5 w-3.5 shrink-0 rounded border ${
                      selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>{t('selectedCourtCount', { count: visibleCourts.length })}</span>
            <button
              type="button"
              onClick={() => setSelectedCourtIds(allCourtsSelected ? [] : courts.map((court) => court.id))}
              className="font-semibold text-blue-600 hover:underline"
            >
              {allCourtsSelected ? t('clearAllCourts') : t('selectAllCourts')}
            </button>
          </div>
          <ModalFooter className="pt-3">
            <ModalClose asChild>
              <Button type="button" variant="outline" className="h-8 rounded-lg text-xs font-semibold border-slate-300">
                {t('close')}
              </Button>
            </ModalClose>
            <ModalClose asChild>
              <Button
                type="button"
                disabled={visibleCourts.length === 0}
                className="h-8 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                {t('applyCourtSelection')}
              </Button>
            </ModalClose>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}
