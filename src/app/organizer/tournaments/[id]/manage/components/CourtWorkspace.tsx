'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, LayoutGrid } from 'lucide-react';
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
import type {
  AiScheduleCommandInput,
  AiScheduleCommandResult,
  Division,
  SchedulePlanPreview,
  SchedulePlanPreviewInput,
} from '@/features/tournaments/api';
import type { BracketStage, SportRuleKind } from '@/types/tournament';
import type { CourtSetupItem } from './CourtSetup';
import { CourtScheduleBoard } from './CourtScheduleBoard';

interface WorkspaceMatch {
  id: string;
  divisionId?: string | null;
  roundNumber?: number | null;
  leg?: number | null;
  stage?: {
    name?: string | null;
    roundConfig?: { roundsToPlay?: number; rounds_to_play?: number } | null;
  } | null;
  matchOrder?: number | null;
  scheduledAt?: string | null;
  courtId?: string | null;
  participant1?: { teamName?: string | null } | null;
  participant2?: { teamName?: string | null } | null;
}

interface CourtWorkspaceProps {
  venueName?: string | null;
  bracket?: { stages: BracketStage[] } | null;
  courts: CourtSetupItem[];
  divisions: Division[];
  matches: WorkspaceMatch[];
  defaultDivisionId?: string | null;
  defaultDate?: string | null;
  defaultOperatingStart?: string;
  defaultOperatingEnd?: string;
  sportRuleKind?: SportRuleKind | null;
  setsToWin?: number | null;
  preview: SchedulePlanPreview | null;
  isPreviewing: boolean;
  onPreview: (payload: SchedulePlanPreviewInput) => Promise<SchedulePlanPreview | null>;
  onPreviewWithAi: (payload: AiScheduleCommandInput) => Promise<AiScheduleCommandResult | null>;
  aiScheduleIntent: AiScheduleCommandResult['intent'] | null;
  isPlanningScheduleWithAi: boolean;
  onOpenMatch: (matchId: string) => void;
  onSaveScheduleDirect?: (matchId: string, courtId: string, scheduledAt: string) => Promise<void>;
}

export function CourtWorkspace({
  venueName,
  bracket = null,
  courts,
  divisions,
  matches,
  defaultDivisionId,
  defaultDate,
  defaultOperatingStart,
  defaultOperatingEnd,
  preview,
  onOpenMatch,
  onSaveScheduleDirect,
}: CourtWorkspaceProps) {
  const t = useTranslations('OrganizerManage');
  const [selectedDivision, setSelectedDivision] = useState(defaultDivisionId ?? 'all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedRound, setSelectedRound] = useState('all');
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>(() => courts.map((court) => court.id));
  const [courtPickerOpen, setCourtPickerOpen] = useState(false);

  const stageMetaByMatchId = useMemo(() => {
    const entries = bracket?.stages.flatMap((stage) => stage.groups.flatMap((group) => group.matches.map((match) => [match.id, {
      stageId: stage.id,
      stageName: stage.name,
      stageType: stage.type,
      roundsToPlay: stage.roundConfig?.roundsToPlay ?? stage.roundConfig?.rounds_to_play ?? 1,
    }] as const))) ?? [];
    return new Map(entries);
  }, [bracket]);

  const divisionOptions = useMemo(() => divisions, [divisions]);
  const contentMatches = useMemo(
    () => selectedDivision === 'all' ? matches : matches.filter((match) => match.divisionId === selectedDivision),
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
    if (usesLegFilter) return t('legValue', { leg: round });
    const maxRound = roundOptions.at(-1) ?? round;
    const distanceFromFinal = maxRound - round;
    if (isKnockoutStage && distanceFromFinal >= 0 && distanceFromFinal <= 4) {
      const knockoutLabels = [t('finalRound'), t('semiFinalRound'), t('quarterFinalRound'), t('roundOf', { count: 16 }), t('roundOf', { count: 32 })];
      return knockoutLabels[distanceFromFinal];
    }
    return t('roundValue', { round });
  };

  const scopedMatches = useMemo(
    () => selectedRound === 'all' ? stageMatches : stageMatches.filter((match) => (usesLegFilter ? String(match.leg) === selectedRound : String(match.roundNumber) === selectedRound)),
    [stageMatches, selectedRound, usesLegFilter],
  );

  const visibleCourts = useMemo(() => {
    const selected = new Set(selectedCourtIds);
    return courts.filter((court) => selected.has(court.id));
  }, [courts, selectedCourtIds]);

  const allCourtsSelected = courts.length > 0 && visibleCourts.length === courts.length;

  const toggleCourt = (courtId: string) => {
    setSelectedCourtIds((current) => current.includes(courtId)
      ? current.filter((id) => id !== courtId)
      : [...current, courtId]);
  };

  if (courts.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="court-workspace-title">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between shadow-xs">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div>
            <h2 id="court-workspace-title" className="truncate text-base font-bold text-slate-900">
              Lịch thi đấu · {venueName || t('venueNotSet')}
            </h2>
            <p className="text-xs text-slate-500">
              Bấm vào các ô giờ trên từng sân để chọn trận đấu xếp lịch trực tiếp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCourtPickerOpen(true)}
            className="h-9 rounded-lg border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            {t('chooseCourts')} ({visibleCourts.length}/{courts.length})
          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 xl:flex-row xl:items-center xl:justify-between shadow-xs">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600">
          <CalendarRange className="h-4 w-4 shrink-0 text-blue-600" />
          <span>
            {selectedRound === 'all'
              ? `Hiển thị ${scopedMatches.length} trận đấu`
              : `${roundLabel(Number(selectedRound))} (${scopedMatches.length} trận)`}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
            <span>{t('divisionLabel')}</span>
            <select
              value={selectedDivision}
              onChange={(event) => {
                setSelectedDivision(event.target.value);
                setSelectedStage('all');
                setSelectedRound('all');
              }}
              className="h-9 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-hidden focus:border-blue-500"
            >
              <option value="all">{t('allDivisions')}</option>
              {divisionOptions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
            <span>{t('stageLabel')}</span>
            <select
              value={selectedStage}
              onChange={(event) => {
                setSelectedStage(event.target.value);
                setSelectedRound('all');
              }}
              className="h-9 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-hidden focus:border-blue-500"
            >
              <option value="all">{t('allStages')}</option>
              {stageOptions.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>

          {roundOptions.length > 0 && (
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
              <span>{usesLegFilter ? t('legLabel') : t('roundLabel')}</span>
              <select
                value={selectedRound}
                onChange={(event) => setSelectedRound(event.target.value)}
                className="h-9 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-hidden focus:border-blue-500"
              >
                <option value="all">{usesLegFilter ? t('allLegs') : t('allRounds')}</option>
                {roundOptions.map((round) => (
                  <option key={round} value={String(round)}>
                    {roundLabel(round)}
                  </option>
                ))}
              </select>
            </label>
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
        onOpenMatch={onOpenMatch}
        onSaveScheduleDirect={onSaveScheduleDirect}
      />

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
