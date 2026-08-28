'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, LayoutGrid, Settings2 } from 'lucide-react';
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
import { QuickSchedulePanel } from './QuickSchedulePanel';
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
  sportRuleKind,
  setsToWin,
  preview,
  isPreviewing,
  onPreview,
  onPreviewWithAi,
  aiScheduleIntent,
  isPlanningScheduleWithAi,
  onOpenMatch,
}: CourtWorkspaceProps) {
  const t = useTranslations('OrganizerManage');
  const [selectedDivision, setSelectedDivision] = useState(defaultDivisionId ?? 'all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedRound, setSelectedRound] = useState('all');
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>(() => courts.map((court) => court.id));
  const [courtPickerOpen, setCourtPickerOpen] = useState(false);
  const [scheduleSettingsOpen, setScheduleSettingsOpen] = useState(false);
  const stageMetaByMatchId = useMemo(() => {
    const entries = bracket?.stages.flatMap((stage) => stage.groups.flatMap((group) => group.matches.map((match) => [match.id, {
      stageId: stage.id,
      stageName: stage.name,
      stageType: stage.type,
      roundsToPlay: stage.roundConfig?.roundsToPlay ?? stage.roundConfig?.rounds_to_play ?? 1,
    }] as const))) ?? [];
    return new Map(entries);
  }, [bracket]);
  const divisionOptions = useMemo(() => divisions.filter((division) => matches.some((match) => match.divisionId === division.id)), [divisions, matches]);
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
  const legOptions = useMemo(
    () => [...new Set(stageMatches.map((match) => match.leg).filter((leg): leg is number => typeof leg === 'number' && Number.isInteger(leg) && leg > 0))].sort((a, b) => a - b),
    [stageMatches],
  );
  const usesLegFilter = configuredLegCount > 1 || legOptions.length > 1;
  const roundOptions = useMemo(
    () => usesLegFilter || isKnockoutStage ? [...new Set(stageMatches.map((match) => usesLegFilter ? match.leg : match.roundNumber).filter((round): round is number => typeof round === 'number' && Number.isInteger(round)))].sort((a, b) => a - b) : [],
    [isKnockoutStage, stageMatches, usesLegFilter],
  );
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
  const scopedMatchIds = selectedRound === 'all' ? undefined : scopedMatches.map((match) => match.id);
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
    <section className="space-y-3" aria-labelledby="court-workspace-title">
      <div className="flex flex-col gap-3 border-y border-slate-200 bg-white py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <LayoutGrid className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <h2 id="court-workspace-title" className="truncate text-xl font-bold text-slate-900">{venueName || t('venueNotSet')}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setCourtPickerOpen(true)} className="min-h-10 border-slate-300 bg-white text-slate-800">
            <LayoutGrid className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('chooseCourts')} <span className="ml-1 text-slate-500">{visibleCourts.length}/{courts.length}</span>
          </Button>
          <Button type="button" variant="outline" onClick={() => setScheduleSettingsOpen(true)} className="min-h-10 border-slate-300 bg-white text-slate-800">
            <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('scheduleSettings')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white pb-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
          <CalendarRange className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <span className="truncate">{selectedRound === 'all' ? t('allRoundsSummary', { count: scopedMatches.length }) : t('roundSummary', { round: roundLabel(Number(selectedRound)), count: scopedMatches.length })}</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span>{t('divisionLabel')}</span>
            <select value={selectedDivision} onChange={(event) => { setSelectedDivision(event.target.value); setSelectedStage('all'); setSelectedRound('all'); }} className="h-10 min-w-44 border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="all">{t('allDivisions')}</option>
              {divisionOptions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span>{t('stageLabel')}</span>
            <select value={selectedStage} onChange={(event) => { setSelectedStage(event.target.value); setSelectedRound('all'); }} className="h-10 min-w-40 border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="all">{t('allStages')}</option>
              {stageOptions.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
            </select>
          </label>
          {roundOptions.length > 0 && (
            <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>{usesLegFilter ? t('legLabel') : t('roundLabel')}</span>
              <select value={selectedRound} onChange={(event) => setSelectedRound(event.target.value)} className="h-10 min-w-40 border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                <option value="all">{usesLegFilter ? t('allLegs') : t('allRounds')}</option>
                {roundOptions.map((round) => <option key={round} value={String(round)}>{roundLabel(round)}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <CourtScheduleBoard courts={visibleCourts} matches={scopedMatches} preview={preview} defaultDate={defaultDate} defaultOperatingStart={defaultOperatingStart} defaultOperatingEnd={defaultOperatingEnd} onOpenMatch={onOpenMatch} />

      <Modal open={courtPickerOpen} onOpenChange={setCourtPickerOpen}>
        <ModalContent className="max-w-xl">
          <ModalHeader>
            <ModalTitle>{t('chooseCourts')}</ModalTitle>
            <ModalDescription>{t('selectedCourtsHint')}</ModalDescription>
          </ModalHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {courts.map((court) => {
              const selected = selectedCourtIds.includes(court.id);
              return (
                <button key={court.id} type="button" aria-pressed={selected} onClick={() => toggleCourt(court.id)} className={`flex min-h-12 items-center justify-between border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${selected ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}>
                  <span className="truncate font-semibold">{court.courtName}</span>
                  <span className={`ml-3 h-4 w-4 shrink-0 border ${selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
            <span>{t('selectedCourtCount', { count: visibleCourts.length })}</span>
            <button type="button" onClick={() => setSelectedCourtIds(allCourtsSelected ? [] : courts.map((court) => court.id))} className="font-semibold text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500">
              {allCourtsSelected ? t('clearAllCourts') : t('selectAllCourts')}
            </button>
          </div>
          <ModalFooter>
            <ModalClose asChild><Button type="button" variant="outline" className="border-slate-300 bg-white">{t('close')}</Button></ModalClose>
            <ModalClose asChild><Button type="button" disabled={visibleCourts.length === 0} className="bg-blue-600 text-white hover:bg-blue-700">{t('applyCourtSelection')}</Button></ModalClose>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={scheduleSettingsOpen} onOpenChange={setScheduleSettingsOpen}>
        <ModalContent className="max-w-5xl">
          <ModalHeader>
            <ModalTitle>{t('scheduleSettings')}</ModalTitle>
            <ModalDescription>{t('scheduleSettingsHint')}</ModalDescription>
          </ModalHeader>
          <QuickSchedulePanel
            key={`${defaultDivisionId}-${sportRuleKind}-${setsToWin ?? ''}-${selectedRound}-${defaultOperatingStart}-${defaultOperatingEnd}-${visibleCourts.map((court) => court.id).join(',')}`}
            courts={visibleCourts}
            divisions={divisions}
            defaultDivisionId={defaultDivisionId}
            defaultDate={defaultDate}
            defaultOperatingStart={defaultOperatingStart}
            defaultOperatingEnd={defaultOperatingEnd}
            sportRuleKind={sportRuleKind}
            setsToWin={setsToWin}
            matchIds={scopedMatchIds}
            preview={preview}
            isPreviewing={isPreviewing}
            onPreview={onPreview}
            onPreviewWithAi={onPreviewWithAi}
            aiScheduleIntent={aiScheduleIntent}
            isPlanningScheduleWithAi={isPlanningScheduleWithAi}
            selectedCourtIds={visibleCourts.map((court) => court.id)}
            showCourtSelector={false}
          />
        </ModalContent>
      </Modal>
    </section>
  );
}
