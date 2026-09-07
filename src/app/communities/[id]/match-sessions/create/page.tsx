'use client';

import { FormEvent, use, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Info,
  Trophy,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import { getErrorMessage } from '@/utils/error';

type DurationOption = 60 | 90 | 120 | 180 | 'custom';
type CapacityOption = 8 | 16 | 32 | 64 | 'custom';

export default function CreateClubMatchSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('ClubMatchSession');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isRanked, setIsRanked] = useState(true);
  const [startAt, setStartAt] = useState('');
  const [durationOption, setDurationOption] = useState<DurationOption>(60);
  const [customDuration, setCustomDuration] = useState('60');
  const [capacityOption, setCapacityOption] = useState<CapacityOption>(16);
  const [customCapacity, setCustomCapacity] = useState('16');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState(6);
  const [recurringTimeOfDay, setRecurringTimeOfDay] = useState('18:00');
  const [recurringAdvanceDays, setRecurringAdvanceDays] = useState(3);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const duration = durationOption === 'custom' ? Number(customDuration) : durationOption;
    if (!Number.isInteger(duration) || duration < 30 || duration > 720) {
      toast.error(t('invalidDuration'));
      return;
    }
    const maxParticipants = capacityOption === 'custom' ? Number(customCapacity) : capacityOption;
    if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 128) {
      toast.error(t('invalidMaxParticipants'));
      return;
    }

    const startDate = startAt ? new Date(startAt) : undefined;
    const endDate = startDate ? new Date(startDate.getTime() + duration * 60_000) : undefined;

    setSubmitting(true);
    try {
      const response = await clubMatchSessionsApi.create({
        communityId: id,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        registrationMode: 'MIXED',
        isRanked,
        maxParticipants,
        startAt: startDate?.toISOString(),
        endAt: endDate?.toISOString(),
        isRecurring,
        ...(isRecurring
          ? {
              recurringFrequency,
              recurringDayOfWeek,
              recurringDaysOfWeek: [recurringDayOfWeek],
              recurringTimeOfDay,
              recurringAdvanceDays,
            }
          : {}),
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

        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {t('createTitle')}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                {t('createDescription')}
              </p>
            </div>
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 sm:flex">
              <Users className="h-7 w-7" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs leading-5 text-blue-900 sm:text-sm">
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

                <div className="grid gap-4">
                  <Input
                    label={t('startAt')}
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    aria-label={t('startAt')}
                  />
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{t('durationTitle')}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{t('durationHint')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([60, 90, 120, 180] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setDurationOption(option)}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${durationOption === option
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                            }`}
                        >
                          {option === 60
                            ? t('oneHour')
                            : option === 90
                            ? t('ninetyMinutes')
                            : option === 120
                            ? t('twoHours')
                            : t('threeHours')}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDurationOption('custom')}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${durationOption === 'custom'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                          }`}
                      >
                        {t('customDuration')}
                      </button>
                    </div>
                    {durationOption === 'custom' && (
                      <Input
                        label={t('durationMinutes')}
                        type="number"
                        min={30}
                        max={720}
                        value={customDuration}
                        onChange={(event) => setCustomDuration(event.target.value)}
                      />
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950 sm:text-base">{t('recurringTitle')}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{t('recurringHint')}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRecurring}
                    aria-label={t('recurringTitle')}
                    onClick={() => setIsRecurring((value) => !value)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${isRecurring ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {isRecurring && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      <span>{t('recurringFrequency')}</span>
                      <select value={recurringFrequency} onChange={(event) => setRecurringFrequency(event.target.value as typeof recurringFrequency)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20">
                        <option value="DAILY">{t('recurringDaily')}</option>
                        <option value="WEEKLY">{t('recurringWeekly')}</option>
                        <option value="BIWEEKLY">{t('recurringBiweekly')}</option>
                        <option value="MONTHLY">{t('recurringMonthly')}</option>
                      </select>
                    </label>
                    {(recurringFrequency === 'WEEKLY' || recurringFrequency === 'BIWEEKLY') && (
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>{t('recurringWeekday')}</span>
                        <select value={recurringDayOfWeek} onChange={(event) => setRecurringDayOfWeek(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20">
                          {[1, 2, 3, 4, 5, 6, 0].map((day) => <option key={day} value={day}>{t(`weekday${day}`)}</option>)}
                        </select>
                      </label>
                    )}
                    <Input label={t('recurringTime')} type="time" value={recurringTimeOfDay} onChange={(event) => setRecurringTimeOfDay(event.target.value)} />
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      <span>{t('recurringAdvanceDays')}</span>
                      <select value={recurringAdvanceDays} onChange={(event) => setRecurringAdvanceDays(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20">
                        {Array.from({ length: 8 }, (_, day) => <option key={day} value={day}>{day === 0 ? t('recurringSameDay') : t('recurringBeforeDays', { count: day })}</option>)}
                      </select>
                    </label>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-950 sm:text-base">{t('maxParticipants')}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{t('maxParticipantsHint')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {([8, 16, 32, 64] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCapacityOption(option)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${capacityOption === option
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                        }`}
                    >
                      {option}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCapacityOption('custom')}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${capacityOption === 'custom'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                      }`}
                  >
                    {t('customMaxParticipants')}
                  </button>
                </div>
                {capacityOption === 'custom' && (
                  <Input
                    label={t('maxParticipants')}
                    type="number"
                    min={2}
                    max={128}
                    value={customCapacity}
                    onChange={(event) => setCustomCapacity(event.target.value)}
                  />
                )}
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
