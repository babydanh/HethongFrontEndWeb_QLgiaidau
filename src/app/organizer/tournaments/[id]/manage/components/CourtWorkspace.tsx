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
import type { SportRuleKind } from '@/types/tournament';
import type { CourtSetupItem } from './CourtSetup';
import { QuickSchedulePanel } from './QuickSchedulePanel';
import { CourtScheduleBoard } from './CourtScheduleBoard';

interface WorkspaceMatch {
  id: string;
  divisionId?: string | null;
  roundNumber?: number | null;
  matchOrder?: number | null;
  scheduledAt?: string | null;
  courtId?: string | null;
  participant1?: { teamName?: string | null } | null;
  participant2?: { teamName?: string | null } | null;
}

interface CourtWorkspaceProps {
  venueName?: string | null;
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
  const [selectedRound, setSelectedRound] = useState('all');
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>(() => courts.map((court) => court.id));
  const [courtPickerOpen, setCourtPickerOpen] = useState(false);
  const [scheduleSettingsOpen, setScheduleSettingsOpen] = useState(false);
  const roundOptions = useMemo(
    () => [...new Set(matches.map((match) => match.roundNumber).filter((round): round is number => Number.isInteger(round)))].sort((a, b) => a - b),
    [matches],
  );
  const scopedMatches = useMemo(
    () => selectedRound === 'all' ? matches : matches.filter((match) => String(match.roundNumber) === selectedRound),
    [matches, selectedRound],
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

      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
          <CalendarRange className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <span className="truncate">{selectedRound === 'all' ? t('allRoundsSummary', { count: matches.length }) : t('roundSummary', { round: selectedRound, count: scopedMatches.length })}</span>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="sr-only">{t('roundLabel')}</span>
          <select value={selectedRound} onChange={(event) => setSelectedRound(event.target.value)} className="h-10 min-w-40 border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
            <option value="all">{t('allRounds')}</option>
            {roundOptions.map((round) => <option key={round} value={String(round)}>{t('roundValue', { round })}</option>)}
          </select>
        </label>
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
