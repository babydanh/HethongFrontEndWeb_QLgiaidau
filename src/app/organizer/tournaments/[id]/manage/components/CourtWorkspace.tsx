'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AiScheduleCommandInput, AiScheduleCommandResult, Division, SchedulePlanPreview } from '@/features/tournaments/api';
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
  onPreview: (payload: Parameters<React.ComponentProps<typeof QuickSchedulePanel>['onPreview']>[0]) => Promise<SchedulePlanPreview | null>;
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
  const roundOptions = useMemo(
    () => [...new Set(matches.map((match) => match.roundNumber).filter((round): round is number => Number.isInteger(round)))].sort((a, b) => a - b),
    [matches],
  );
  const scopedMatches = useMemo(
    () => selectedRound === 'all' ? matches : matches.filter((match) => String(match.roundNumber) === selectedRound),
    [matches, selectedRound],
  );
  const scopedMatchIds = selectedRound === 'all' ? undefined : scopedMatches.map((match) => match.id);

  if (courts.length === 0) return null;

  return (
    <section className="space-y-5 border border-slate-200 bg-white p-5 md:p-6" aria-labelledby="court-workspace-title">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <LayoutGrid className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{t('courtWorkspace')}</p>
            <h2 id="court-workspace-title" className="mt-1 text-xl font-bold text-slate-900">{venueName || t('venueNotSet')}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{t('workspaceIntro')}</p>
          </div>
        </div>
        <div className="shrink-0 border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <strong>{courts.length}</strong> {t('courtCount')}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
        <div>
          <p className="text-sm font-semibold text-slate-800">{t('assignmentScope')}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t('assignmentScopeHint')}</p>
        </div>
        <label className="text-sm font-semibold text-slate-700">
          {t('roundLabel')}
          <select value={selectedRound} onChange={(event) => setSelectedRound(event.target.value)} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
            <option value="all">{t('allRounds')}</option>
            {roundOptions.map((round) => <option key={round} value={String(round)}>{t('roundValue', { round })}</option>)}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2 border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
        <CalendarRange className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{selectedRound === 'all' ? t('allRoundsSummary', { count: matches.length }) : t('roundSummary', { round: selectedRound, count: scopedMatches.length })}</span>
      </div>

      <QuickSchedulePanel
        key={`${defaultDivisionId}-${sportRuleKind}-${setsToWin ?? ''}-${selectedRound}-${defaultOperatingStart}-${defaultOperatingEnd}`}
        courts={courts}
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
      />
      <CourtScheduleBoard courts={courts} matches={scopedMatches} preview={preview} onOpenMatch={onOpenMatch} />
    </section>
  );
}
