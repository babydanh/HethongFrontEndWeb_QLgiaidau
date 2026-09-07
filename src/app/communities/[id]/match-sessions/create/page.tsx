'use client';

import { FormEvent, use, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  RotateCw,
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
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
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

    let startIso: string | undefined;
    let endIso: string | undefined;
    if (startDate) {
      const combined = new Date(`${startDate}T${startTime || '00:00'}:00`);
      if (!isNaN(combined.getTime())) {
        startIso = combined.toISOString();
        endIso = new Date(combined.getTime() + duration * 60_000).toISOString();
      }
    }

    setSubmitting(true);
    try {
      const response = await clubMatchSessionsApi.create({
        communityId: id,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        registrationMode: 'MIXED',
        isRanked,
        maxParticipants,
        startAt: startIso,
        endAt: endIso,
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
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t('back')}
        </button>

        {/* Tiêu đề gọn, không gradient */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {t('createTitle')}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('noBracketHint')}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Card: Thông tin cơ bản */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
              {t('basicInfoTitle')}
            </h2>
            <div className="space-y-3">
              <Input
                label={t('name')}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('namePlaceholder')}
                autoComplete="off"
              />

              <div className="space-y-1">
                <label htmlFor="club-match-session-description" className="text-xs font-medium text-slate-700">
                  {t('description')}
                </label>
                <textarea
                  id="club-match-session-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </section>

          {/* Card: Xếp hạng (Bật/Tắt ELO gọn gàng) */}
          <section
            className={`rounded-xl border p-3.5 transition ${
              isRanked ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isRanked ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900">
                    {t('ranked')}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {isRanked ? t('rankedHint') : t('unrankedHint')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isRanked}
                aria-label={t('ranked')}
                onClick={() => setIsRanked((value) => !value)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  isRanked ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                    isRanked ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Card: Lịch bắt đầu & Thời lượng */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
              {t('scheduleTitle')}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t('startAt')}</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Giờ bắt đầu</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Thời lượng */}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <label className="text-xs font-medium text-slate-700 block mb-2">
                {t('durationTitle')}
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {([60, 90, 120, 180] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDurationOption(option)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      durationOption === option
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
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
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    durationOption === 'custom'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {t('customDuration')}
                </button>

                {durationOption === 'custom' && (
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[11px] text-slate-500">Phút:</span>
                    <input
                      type="number"
                      min={30}
                      max={720}
                      value={customDuration}
                      onChange={(event) => setCustomDuration(event.target.value)}
                      className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Card: Số người tối đa */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              {t('maxParticipants')}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {([8, 16, 32, 64] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCapacityOption(option)}
                  className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition ${
                    capacityOption === option
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {option}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCapacityOption('custom')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  capacityOption === 'custom'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {t('customMaxParticipants')}
              </button>
              {capacityOption === 'custom' && (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[11px] text-slate-500">Người:</span>
                  <input
                    type="number"
                    min={2}
                    max={128}
                    value={customCapacity}
                    onChange={(event) => setCustomCapacity(event.target.value)}
                    className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Card: Lặp lại định kỳ (Tùy chọn) */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RotateCw className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">
                  {t('recurringTitle')}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isRecurring}
                aria-label={t('recurringTitle')}
                onClick={() => setIsRecurring((value) => !value)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  isRecurring ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                    isRecurring ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {isRecurring && (
              <div className="border-t border-slate-100 pt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  <span>{t('recurringFrequency')}</span>
                  <select
                    value={recurringFrequency}
                    onChange={(event) => setRecurringFrequency(event.target.value as typeof recurringFrequency)}
                    className="w-full h-9.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="DAILY">{t('recurringDaily')}</option>
                    <option value="WEEKLY">{t('recurringWeekly')}</option>
                    <option value="BIWEEKLY">{t('recurringBiweekly')}</option>
                    <option value="MONTHLY">{t('recurringMonthly')}</option>
                  </select>
                </label>
                {(recurringFrequency === 'WEEKLY' || recurringFrequency === 'BIWEEKLY') && (
                  <label className="space-y-1 text-xs font-medium text-slate-700">
                    <span>{t('recurringWeekday')}</span>
                    <select
                      value={recurringDayOfWeek}
                      onChange={(event) => setRecurringDayOfWeek(Number(event.target.value))}
                      className="w-full h-9.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    >
                      {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                        <option key={day} value={day}>
                          {t(`weekday${day}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    {t('recurringTime')}
                  </label>
                  <input
                    type="time"
                    value={recurringTimeOfDay}
                    onChange={(event) => setRecurringTimeOfDay(event.target.value)}
                    className="w-full h-9.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  <span>{t('recurringAdvanceDays')}</span>
                  <select
                    value={recurringAdvanceDays}
                    onChange={(event) => setRecurringAdvanceDays(Number(event.target.value))}
                    className="w-full h-9.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  >
                    {Array.from({ length: 8 }, (_, day) => (
                      <option key={day} value={day}>
                        {day === 0 ? t('recurringSameDay') : t('recurringBeforeDays', { count: day })}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>

          {/* Nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
              className="h-10 px-4 text-xs font-bold"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              className="h-10 bg-blue-600 px-6 text-xs font-bold text-white hover:bg-blue-700"
            >
              {t('create')}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
