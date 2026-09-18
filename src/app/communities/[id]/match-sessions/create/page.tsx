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
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Input, DatePicker } from '@/components/ui/Input';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import { getErrorMessage } from '@/utils/error';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-32 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
      Đang tải trình soạn thảo...
    </div>
  ),
});

const DAYS_OF_WEEK = [
  { value: 1, label: 'T2', key: 'weekday1' },
  { value: 2, label: 'T3', key: 'weekday2' },
  { value: 3, label: 'T4', key: 'weekday3' },
  { value: 4, label: 'T5', key: 'weekday4' },
  { value: 5, label: 'T6', key: 'weekday5' },
  { value: 6, label: 'T7', key: 'weekday6' },
  { value: 0, label: 'CN', key: 'weekday0' },
];

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
  const [memberScoringEnabled, setMemberScoringEnabled] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customDurationInput, setCustomDurationInput] = useState('60');
  const [capacityCount, setCapacityCount] = useState(16);
  const [customCapacityInput, setCustomCapacityInput] = useState('16');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurringDaysOfWeek, setRecurringDaysOfWeek] = useState<number[]>([6]);
  const [recurringTimeOfDay, setRecurringTimeOfDay] = useState('18:00');
  const [recurringAdvanceDays, setRecurringAdvanceDays] = useState(3);
  const creationIdempotencyKey = useRef<string | null>(null);

  const selectedCapacity = String(capacityCount);
  const selectedSchedule = startDate ? `${startDate} ${startTime}` : t('summaryNoSchedule');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const duration = Number(customDurationInput) || durationMinutes;
    if (!Number.isInteger(duration) || duration < 30 || duration > 720) {
      toast.error(t('invalidDuration'));
      return;
    }
    const maxParticipants = Number(customCapacityInput) || capacityCount;
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
      const primaryDayOfWeek = recurringDaysOfWeek[0] ?? 6;
      const response = await clubMatchSessionsApi.create({
        communityId: id,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        registrationMode: 'MIXED',
        pairingMode,
        ...(pairingMode === 'BRACKET' ? { format, bracketType } : {}),
        isRanked,
        memberScoringEnabled,
        maxParticipants,
        startAt: startIso,
        endAt: endIso,
        isRecurring,
        ...(isRecurring
          ? {
              recurringFrequency,
              recurringDayOfWeek: primaryDayOfWeek,
              recurringDaysOfWeek: recurringDaysOfWeek.length > 0 ? recurringDaysOfWeek : [primaryDayOfWeek],
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

                  <div className="space-y-1.5">
                    <label htmlFor="club-match-session-description" className="text-xs font-medium text-slate-700">
                      {t('description')}
                    </label>
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      compact={true}
                      placeholder={t('descriptionPlaceholder')}
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

                <label className="flex cursor-pointer items-start justify-between gap-3 border-t border-slate-100 pt-3">
                  <span>
                    <span className="block text-xs font-bold text-slate-800">Cho phép thành viên nhập điểm</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">Thiết lập cho toàn bộ buổi giao lưu này.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={memberScoringEnabled}
                    onChange={(event) => setMemberScoringEnabled(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
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

                {/* Chọn thời lượng */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    {t('durationTitle')}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {([60, 90, 120, 180] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setDurationMinutes(opt);
                          setCustomDurationInput(String(opt));
                        }}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          durationMinutes === opt && Number(customDurationInput) === opt
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt === 60 ? '1h' : opt === 90 ? '1h30' : opt === 120 ? '2h' : '3h'}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-xs text-slate-500 font-medium">Phút:</span>
                      <input
                        type="number"
                        min={30}
                        max={720}
                        value={customDurationInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomDurationInput(val);
                          const num = Number(val);
                          if (num) setDurationMinutes(num);
                        }}
                        placeholder="60"
                        className="w-16 h-8 rounded-lg border border-slate-200 px-2 text-center text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Số lượng người tối đa */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t('maxParticipants')}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {([8, 16, 32, 64] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setCapacityCount(opt);
                        setCustomCapacityInput(String(opt));
                      }}
                      className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                        capacityCount === opt && Number(customCapacityInput) === opt
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt} người
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-slate-500 font-medium">Người:</span>
                    <input
                      type="number"
                      min={2}
                      max={128}
                      value={customCapacityInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomCapacityInput(val);
                        const num = Number(val);
                        if (num) setCapacityCount(num);
                      }}
                      placeholder="16"
                      className="w-16 h-8 rounded-lg border border-slate-200 px-2 text-center text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card: Lặp lại định kỳ (Hỗ trợ cấu hình đa ngày) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-slate-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-800">{t('recurringTitle')}</span>
                      <p className="text-[11px] text-slate-400">
                        {pairingMode === 'BRACKET' ? 'Tự động mở giải đấu theo bảng định kỳ' : 'Tự động tạo buổi giao lưu định kỳ'}
                      </p>
                    </div>
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
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
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

                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block mb-1">{t('recurringTime')}</span>
                        <input
                          type="time"
                          value={recurringTimeOfDay}
                          onChange={(e) => setRecurringTimeOfDay(e.target.value)}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                        </input>
                      </div>
                    </div>

                    {(recurringFrequency === 'WEEKLY' || recurringFrequency === 'BIWEEKLY') && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-medium text-slate-600">
                            Các thứ trong tuần ({recurringDaysOfWeek.length} ngày đã chọn):
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS_OF_WEEK.map((day) => {
                            const isSelected = recurringDaysOfWeek.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => {
                                  setRecurringDaysOfWeek((prev) => {
                                    if (prev.includes(day.value)) {
                                      if (prev.length === 1) return prev;
                                      return prev.filter((d) => d !== day.value);
                                    } else {
                                      return [...prev, day.value].sort(
                                        (a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)
                                      );
                                    }
                                  });
                                }}
                                className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition border ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

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
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
