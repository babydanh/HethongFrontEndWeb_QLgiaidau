'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, ChevronRight, Loader2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { clubMatchSessionsApi, type ClubScoreMatchSnapshot } from './api';
import { extractMatchScores } from '@/features/matches/score-display';
import { getSportRuleKind, resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import type { ClubSessionMatch } from '@/types/club-match-session';
import type { SportRuleKind } from '@/types/tournament';
import { getErrorMessage } from '@/utils/error';

export type ScoreMatch = ClubScoreMatchSnapshot & Pick<ClubSessionMatch, 'status' | 'participant1' | 'participant2' | 'p1SetsWon' | 'p2SetsWon' | 'sportRules' | 'tournamentConfig'>;

type ScoreFormValues = {
  sets: Array<{ team1: string; team2: string }>;
};

const scoreEntrySchema = z.object({
  sets: z.array(z.object({
    team1: z.string().regex(/^\d*$/, 'invalid'),
    team2: z.string().regex(/^\d*$/, 'invalid'),
  })),
});

const MAX_SETS = 10;

function getSideName(match: ScoreMatch, side: 'A' | 'B') {
  const members = side === 'A' ? match.participant1.members : match.participant2.members;
  return members.map((member) => member.fullName?.trim()).filter(Boolean).join(' · ') || (side === 'A' ? 'A' : 'B');
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function TeamIdentity({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{initials(name)}</span>
      )}
      <span className="truncate text-sm font-bold text-slate-900">{name}</span>
    </div>
  );
}

function matchKind(match: ScoreMatch): SportRuleKind {
  return getSportRuleKind(match.sportRules ?? match.tournamentConfig ?? null);
}

export function ClubMatchScoreEntryModal({
  match,
  open,
  onOpenChange,
  onSaved,
}: {
  match: ScoreMatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (match: ClubSessionMatch) => void;
}) {
  const translate = useTranslations('ClubMatchSession');
  const sportTranslate = useTranslations('TournamentDetail');
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const initialRows = useMemo(() => {
    const existing = match ? extractMatchScores(match.scoreDetails) : [];
    const rows = existing.slice(0, MAX_SETS).map((set) => ({
      team1: String(set.team1Score),
      team2: String(set.team2Score),
    }));
    return rows.length > 0 ? rows : [{ team1: '', team2: '' }];
  }, [match]);
  const [visibleSetCount, setVisibleSetCount] = useState(initialRows.length);
  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(scoreEntrySchema),
    defaultValues: { sets: initialRows },
    mode: 'onSubmit',
  });
  const { fields, append } = useFieldArray({ control: form.control, name: 'sets' });

  const kind = match ? matchKind(match) : 'BADMINTON';
  const rules = useMemo(() => resolveSportRuleView(match?.sportRules ?? match?.tournamentConfig ?? null, kind), [kind, match]);
  const sportPresentation = getSportRulePresentation(rules.kind, sportTranslate);
  const sideAName = match ? getSideName(match, 'A') : '';
  const sideBName = match ? getSideName(match, 'B') : '';

  const addSet = () => {
    if (visibleSetCount >= MAX_SETS) return;
    append({ team1: '', team2: '' });
    setVisibleSetCount((count) => Math.min(MAX_SETS, count + 1));
  };

  const buildPayload = (values: ScoreFormValues) => {
    const rows = values.sets.slice(0, visibleSetCount);
    const lastFilledIndex = rows.reduce((last, row, index) => row.team1 !== '' || row.team2 !== '' ? index : last, -1);
    if (lastFilledIndex < 0) {
      form.setError('sets.0.team1', { message: translate('scoreAtLeastOneSet') });
      return null;
    }

    const parsed = rows.slice(0, lastFilledIndex + 1).map((row, index) => {
      if (row.team1 === '' || row.team2 === '') {
        form.setError(`sets.${index}.team1`, { message: translate('scoreBothSidesRequired') });
        form.setError(`sets.${index}.team2`, { message: translate('scoreBothSidesRequired') });
        return null;
      }
      return {
        team1Score: Number(row.team1),
        team2Score: Number(row.team2),
        isFinished: true,
      };
    });
    if (parsed.some((row) => row === null)) return null;

    const sets = parsed.filter((row): row is { team1Score: number; team2Score: number; isFinished: boolean } => row !== null);
    const p1SetsWon = sets.filter((set) => set.team1Score > set.team2Score).length;
    const p2SetsWon = sets.filter((set) => set.team2Score > set.team1Score).length;
    return {
      p1SetsWon,
      p2SetsWon,
      scoreDetails: {
        ...(match?.scoreDetails ?? {}),
        sets,
      },
    };
  };

  const submit = async (values: ScoreFormValues, complete: boolean) => {
    if (!match) return;
    const payload = buildPayload(values);
    if (!payload) return;
    setIsSaving(!complete);
    setIsCompleting(complete);
    try {
      const snapshot: ClubScoreMatchSnapshot = {
        id: match.id,
        revision: match.revision,
        scoreDetails: match.scoreDetails,
      };
      const saved = complete
        ? await clubMatchSessionsApi.completeMatch(snapshot, payload.p1SetsWon, payload.p2SetsWon, payload.scoreDetails)
        : await clubMatchSessionsApi.updateScore(snapshot, payload.p1SetsWon, payload.p2SetsWon, payload.scoreDetails);
      onSaved?.(saved);
      toast.success(complete ? translate('matchCompleted') : translate('scoreSaved'));
      if (complete) onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, translate('scoreSaveFailed')));
    } finally {
      setIsSaving(false);
      setIsCompleting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="w-[calc(100vw-1rem)] max-w-xl overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:w-full">
        <ModalHeader className="flex-row items-start justify-between border-b border-slate-100 px-5 py-4 text-left">
          <div>
            <ModalTitle className="text-lg font-extrabold text-slate-900">{translate('scoreEntryTitle')}</ModalTitle>
            <p className="mt-1 text-xs text-slate-500">{translate('scoreEntryHint', { sport: sportPresentation.sportLabel })}</p>
          </div>
          <button type="button" aria-label={translate('close')} onClick={() => onOpenChange(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </ModalHeader>

        <form onSubmit={form.handleSubmit((values) => void submit(values, false))}>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
              <TeamIdentity name={sideAName} avatarUrl={match?.participant1.members[0]?.avatarUrl} />
              <span className="text-xs font-black text-slate-400">VS</span>
              <TeamIdentity name={sideBName} avatarUrl={match?.participant2.members[0]?.avatarUrl} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-slate-900">{translate('scoreSetCount', { count: visibleSetCount })}</p>
                <p className="text-xs text-slate-500">{translate('scoreSetUnit', { unit: rules.kind === 'TENNIS' ? translate('games') : translate('points') })}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{sportPresentation.sportLabel}</span>
            </div>

            <div className="space-y-2">
              {fields.slice(0, visibleSetCount).map((field, index) => (
                <div key={field.id} className="grid grid-cols-[3.5rem_1fr_auto_1fr] items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                  <span className="text-xs font-bold text-slate-500">{translate('setLabel', { set: index + 1 })}</span>
                  <div>
                    <input aria-label={`${sideAName} ${index + 1}`} inputMode="numeric" placeholder="0" {...form.register(`sets.${index}.team1`)} className="h-10 w-full rounded-lg border border-blue-200 bg-blue-50/30 px-3 text-center text-base font-extrabold text-slate-900 outline-none focus:border-blue-500" />
                    {form.formState.errors.sets?.[index]?.team1?.message && <p className="mt-1 text-[10px] text-rose-600">{form.formState.errors.sets[index]?.team1?.message}</p>}
                  </div>
                  <span className="font-bold text-slate-400">–</span>
                  <div>
                    <input aria-label={`${sideBName} ${index + 1}`} inputMode="numeric" placeholder="0" {...form.register(`sets.${index}.team2`)} className="h-10 w-full rounded-lg border border-orange-200 bg-orange-50/30 px-3 text-center text-base font-extrabold text-slate-900 outline-none focus:border-orange-500" />
                    {form.formState.errors.sets?.[index]?.team2?.message && <p className="mt-1 text-[10px] text-rose-600">{form.formState.errors.sets[index]?.team2?.message}</p>}
                  </div>
                </div>
              ))}
            </div>

            {visibleSetCount < MAX_SETS && (
              <button type="button" onClick={addSet} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800">
                <Plus className="h-4 w-4" /> {translate('addSet')}
              </button>
            )}
            {visibleSetCount >= MAX_SETS && <p className="text-xs font-semibold text-slate-500">{translate('maxSetsReached', { count: MAX_SETS })}</p>}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.push(`/live/${match?.id}?scoring=1`)} disabled={!match || isSaving || isCompleting} className="gap-1.5 font-bold">
              {translate('openScoring')}
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="submit" disabled={!match || isSaving || isCompleting} className="gap-1.5 bg-blue-600 font-bold hover:bg-blue-700">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {translate('saveScore')}
            </Button>
            {match && match.status !== 'COMPLETED' && (
              <Button type="button" disabled={isSaving || isCompleting} onClick={() => void form.handleSubmit((values) => submit(values, true))()} className="gap-1.5 bg-emerald-600 font-bold hover:bg-emerald-700">
                {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {translate('complete')}
              </Button>
            )}
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
