'use client';

import { FormEvent, use, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  RotateCw,
  Trophy,
  UsersRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input, DatePicker } from '@/components/ui/Input';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import { getErrorMessage } from '@/utils/error';

type DurationOption = 60 | 90 | 120 | 180 | 'custom';
type CapacityOption = 8 | 16 | 32 | 64 | 'custom';
type PairingMode = 'FREE' | 'BRACKET';

export default function CreateClubMatchSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('ClubMatchSession');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pairingMode, setPairingMode] = useState<PairingMode>('FREE');
  const [format, setFormat] = useState<'singles' | 'doubles'>('doubles');
  const [bracketType, setBracketType] = useState<'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout'>('group_stage_knockout');
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
  const creationIdempotencyKey = useRef<string | null>(null);

  const selectedCapacity = capacityOption === 'custom' ? customCapacity : String(capacityOption);
  const selectedSchedule = startDate ? `${startDate} ${startTime}` : t('summaryNoSchedule');

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
    if (pairingMode === 'BRACKET' && !startIso) {
      toast.error(t('bracketStartRequired'));
      return;
    }

    setSubmitting(true);
    try {
      creationIdempotencyKey.current ??= crypto.randomUUID();
      const response = await clubMatchSessionsApi.create({
        communityId: id,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        registrationMode: 'MIXED',
        pairingMode,
        ...(pairingMode === 'BRACKET' ? { format, bracketType } : {}),
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
      }, creationIdempotencyKey.current);
      toast.success(t('created'));
      router.replace(pairingMode === 'BRACKET' && response.bracketTournamentId
        ? `/organizer/tournaments/${response.bracketTournamentId}/manage?tab=bracket`
        : `/communities/${id}/match-sessions/${response.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/70 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <form onSubmit={submit}>
          {/* Header Bar: Tiêu đề + Nút Hành Động (Đưa thẳng lên đầu để vừa trọn 1 màn hình) */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                title={t('back')}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div>
                <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                  {t('createTitle')}
                </h1>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {t('createDescription')}
                </p>
              </div>
            </div>

            {/* Cụm Action Buttons: Nhìn thấy ngay không cần cuộn */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
                className="h-8.5 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                isLoading={submitting}
                className="h-8.5 bg-blue-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                {t('create')}
              </Button>
            </div>
          </div>

          {/* Form 2 Cột Cân Đối (Không cuộn, trực quan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cột 1: Thông tin & Kiểu ghép */}
            <div className="space-y-4">
              {/* Card 1: Thông tin cơ bản */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <UsersRound className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t('basicInfoTitle')}
                  </h2>
                </div>
                <div className="space-y-3">
                  <Input
                    label={t('name')}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t('namePlaceholder')}
                    autoComplete="off"
                    className="h-9 text-xs"
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
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Cách chơi & Xếp hạng ELO */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3.5">
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {t('modeTitle')}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'FREE' as const, title: t('freeMode'), desc: 'Tự do ghép trận' },
                      { value: 'BRACKET' as const, title: t('bracketMode'), desc: 'Chia bảng thi đấu' },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPairingMode(opt.value)}
                        className={`rounded-xl border p-2.5 text-left transition-all ${
                          pairingMode === opt.value
                            ? 'border-blue-400/80 bg-blue-50/40 text-blue-900 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phân nhánh nếu là BRACKET */}
                {pairingMode === 'BRACKET' && (
                  <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">{t('formatTitle')}</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          ['singles', t('singles')],
                          ['doubles', t('doubles')],
                        ] as const).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFormat(val)}
                            className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition ${
                              format === val
                                ? 'border-blue-400 bg-blue-600 text-white shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">{t('bracketTypeTitle')}</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          ['group_stage_knockout', t('groupStageKnockout')],
                          ['single_elimination', t('singleElimination')],
                          ['double_elimination', t('doubleElimination')],
                          ['round_robin', t('roundRobin')],
                        ] as const).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBracketType(val)}
                            className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium truncate transition ${
                              bracketType === val
                                ? 'border-blue-400 bg-blue-600 text-white shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Xếp hạng ELO Toggle (Gọn gàng 1 dòng) */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-800">{t('ranked')}</span>
                      <p className="text-[11px] text-slate-400 leading-none mt-0.5">
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
                    className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors ${
                      isRanked ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                        isRanked ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Cột 2: Thời gian, Quy mô & Lặp lại */}
            <div className="space-y-4">
              {/* Card: Lịch thi đấu & Thời lượng */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <CalendarDays className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t('scheduleTitle')}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <DatePicker
                      label={t('startAt')}
                      value={startDate}
                      onChange={(val) => setStartDate(val)}
                      className="h-9 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Giờ bắt đầu</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Chọn nhanh thời lượng */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    {t('durationTitle')}
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {([60, 90, 120, 180] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setDurationOption(opt)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          durationOption === opt
                            ? 'border-blue-400/80 bg-blue-50/70 text-blue-700 font-semibold'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt === 60 ? '1h' : opt === 90 ? '1h30' : opt === 120 ? '2h' : '3h'}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDurationOption('custom')}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                        durationOption === 'custom'
                          ? 'border-blue-400/80 bg-blue-50/70 text-blue-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {t('customDuration')}
                    </button>
                    {durationOption === 'custom' && (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[11px] text-slate-400">Phút:</span>
                        <input
                          type="number"
                          min={30}
                          max={720}
                          value={customDuration}
                          onChange={(e) => setCustomDuration(e.target.value)}
                          className="w-14 rounded-md border border-slate-200 px-1.5 py-0.5 text-center text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card: Số lượng người tối đa */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t('maxParticipants')}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5">
                  {([8, 16, 32, 64] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCapacityOption(opt)}
                      className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                        capacityOption === opt
                          ? 'border-blue-400/80 bg-blue-50/70 text-blue-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt} người
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCapacityOption('custom')}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      capacityOption === 'custom'
                        ? 'border-blue-400/80 bg-blue-50/70 text-blue-700 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Tùy chọn
                  </button>
                  {capacityOption === 'custom' && (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[11px] text-slate-400">Người:</span>
                      <input
                        type="number"
                        min={2}
                        max={128}
                        value={customCapacity}
                        onChange={(e) => setCustomCapacity(e.target.value)}
                        className="w-14 rounded-md border border-slate-200 px-1.5 py-0.5 text-center text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Card: Lặp lại định kỳ (Chỉ ghép tự do) */}
              {pairingMode === 'FREE' && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCw className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-800">{t('recurringTitle')}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRecurring}
                      aria-label={t('recurringTitle')}
                      onClick={() => setIsRecurring((val) => !val)}
                      className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors ${
                        isRecurring ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                          isRecurring ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {isRecurring && (
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block mb-1">{t('recurringFrequency')}</span>
                        <select
                          value={recurringFrequency}
                          onChange={(e) => setRecurringFrequency(e.target.value as typeof recurringFrequency)}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="DAILY">{t('recurringDaily')}</option>
                          <option value="WEEKLY">{t('recurringWeekly')}</option>
                          <option value="BIWEEKLY">{t('recurringBiweekly')}</option>
                          <option value="MONTHLY">{t('recurringMonthly')}</option>
                        </select>
                      </div>

                      {(recurringFrequency === 'WEEKLY' || recurringFrequency === 'BIWEEKLY') && (
                        <div>
                          <span className="text-[11px] font-medium text-slate-500 block mb-1">{t('recurringWeekday')}</span>
                          <select
                            value={recurringDayOfWeek}
                            onChange={(e) => setRecurringDayOfWeek(Number(e.target.value))}
                            className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                              <option key={d} value={d}>
                                {t(`weekday${d}`)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block mb-1">{t('recurringTime')}</span>
                        <input
                          type="time"
                          value={recurringTimeOfDay}
                          onChange={(e) => setRecurringTimeOfDay(e.target.value)}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block mb-1">{t('recurringAdvanceDays')}</span>
                        <select
                          value={recurringAdvanceDays}
                          onChange={(e) => setRecurringAdvanceDays(Number(e.target.value))}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          {Array.from({ length: 8 }, (_, d) => (
                            <option key={d} value={d}>
                              {d === 0 ? t('recurringSameDay') : t('recurringBeforeDays', { count: d })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
