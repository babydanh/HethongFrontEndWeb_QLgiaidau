import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { tournamentsApi, type TournamentResult } from '@/features/tournaments/api';

interface ResultsTabProps {
  tournamentId: string;
  divisionId?: string;
}

export default function ResultsTab({ tournamentId, divisionId }: ResultsTabProps) {
  const translate = useTranslations('TournamentDetail');
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadResults = async () => {
      try {
        const response = await tournamentsApi.getTournamentResults(tournamentId, divisionId);
        if (active && response.data) {
          setResult(response.data);
          setHasError(false);
        }
      } catch {
        if (active) setHasError(true);
      } finally {
        if (active) {
          setIsLoading(false);
          timer = setTimeout(loadResults, 15000);
        }
      }
    };

    void loadResults();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [divisionId, tournamentId]);

  if (isLoading && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-slate-300" />
        <p className="text-sm font-medium text-slate-400">{translate('bracketLoading')}</p>
      </div>
    );
  }

  const awards = (result?.awards ?? [])
    .filter((award) => (award.rank === 1 || award.rank === 2) && award.participant)
    .sort((a, b) => a.rank - b.rank);
  const hasConfirmedResult = awards.length > 0;
  const title = result?.finalized
    ? translate('resultsTabOfficialTitle')
    : hasConfirmedResult
      ? translate('resultsTabCurrentTitle')
      : translate('resultsTabPendingTitle');

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm ring-1 ring-amber-100">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-600">
                {translate('resultsTabLabel')}
              </p>
              <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">{title}</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">{translate('resultsTabDescription')}</p>
            </div>
          </div>
          {hasError && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-700">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {translate('resultsTabSyncing')}
            </span>
          )}
        </div>

        {hasConfirmedResult ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {awards.map((award) => (
              <div
                key={`${award.rank}-${award.participant?.participantId}`}
                className="rounded-xl border border-white bg-white/85 px-4 py-4 shadow-sm"
              >
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  {translate('rank', { rank: award.rank })}
                </p>
                <p className="mt-1 truncate text-base font-extrabold text-slate-900">
                  {award.participant?.teamName}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/75 px-4 py-8 text-center">
            <p className="text-sm font-bold text-slate-700">{translate('resultsTabPendingTitle')}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {translate('resultsTabPendingDescription')}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
