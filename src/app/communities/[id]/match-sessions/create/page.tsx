'use client';

import { FormEvent, use, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Info,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import { getErrorMessage } from '@/utils/error';

type RegistrationMode = 'SELF' | 'MANAGER_ASSIGN' | 'MIXED';

const REGISTRATION_MODES = [
  {
    value: 'MIXED',
    labelKey: 'registrationMixed',
    hintKey: 'registrationMixedHint',
    icon: Users,
  },
  {
    value: 'SELF',
    labelKey: 'registrationSelf',
    hintKey: 'registrationSelfHint',
    icon: UserRound,
  },
  {
    value: 'MANAGER_ASSIGN',
    labelKey: 'registrationManager',
    hintKey: 'registrationManagerHint',
    icon: Trophy,
  },
] as const;

export default function CreateClubMatchSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('ClubMatchSession');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>('MIXED');
  const [isRanked, setIsRanked] = useState(true);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
      toast.error(t('invalidDateRange'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await clubMatchSessionsApi.create({
        communityId: id,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        registrationMode,
        isRanked,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
      });
      toast.success(t('created'));
      router.replace(`/communities/${id}/match-sessions/${response.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t('back')}
        </button>

        <header className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t('createKicker')}
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {t('createTitle')}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                {t('createDescription')}
              </p>
            </div>
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 sm:flex">
              <Users className="h-7 w-7" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-blue-200/80 bg-white/75 px-3.5 py-3 text-xs leading-5 text-blue-900 sm:text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span>{t('noBracketHint')}</span>
          </div>
        </header>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Trophy className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-950 sm:text-base">{t('basicInfoTitle')}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{t('basicInfoHint')}</p>
                  </div>
                </div>

                <Input
                  label={t('name')}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('namePlaceholder')}
                  autoComplete="off"
                />

                <div className="space-y-1.5">
                  <label htmlFor="club-match-session-description" className="text-sm font-medium text-slate-700">
                    {t('description')}
                  </label>
                  <textarea
                    id="club-match-session-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-950 sm:text-base">{t('scheduleTitle')}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{t('scheduleHint')}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t('startAt')}
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    aria-label={t('startAt')}
                  />
                  <Input
                    label={t('endAt')}
                    type="datetime-local"
                    value={endAt}
                    min={startAt || undefined}
                    onChange={(event) => setEndAt(event.target.value)}
                    aria-label={t('endAt')}
                  />
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950 sm:text-base">{t('registrationMode')}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{t('registrationModeHint')}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{t('chooseOne')}</span>
                </div>

                <div className="space-y-2.5" role="radiogroup" aria-label={t('registrationMode')}>
                  {REGISTRATION_MODES.map((mode) => {
                    const selected = registrationMode === mode.value;
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setRegistrationMode(mode.value)}
                        className={`group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${selected
                          ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                          }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`flex items-center justify-between gap-2 text-sm font-bold ${selected ? 'text-blue-950' : 'text-slate-800'}`}>
                            {t(mode.labelKey)}
                            {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{t(mode.hintKey)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950 sm:text-base">{t('ranked')}</h2>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{t('rankedHint')}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRanked}
                    aria-label={t('ranked')}
                    onClick={() => setIsRanked((value) => !value)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${isRanked ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isRanked ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-800">
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('registrationOpensImmediately')}
                </div>
              </section>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting} className="h-11 px-5 font-bold">
                {t('cancel')}
              </Button>
              <Button type="submit" isLoading={submitting} className="h-11 bg-blue-600 px-6 font-bold text-white hover:bg-blue-700">
                {t('create')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
