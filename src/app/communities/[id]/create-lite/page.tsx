'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import {
  Calendar,
  ChevronLeft,
  Info,
  Loader2,
  Lock,
  RotateCw,
  Zap,
  User,
  Users,
  Trophy,
  Shield,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

type LiteSport = 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';

const mapCategoryToLiteSport = (category?: { slug?: string; name?: string } | null): LiteSport => {
  const value = (category?.slug || category?.name || '').toLowerCase();
  if (value.includes('tennis') || value.includes('quần vợt') || value.includes('quan vot')) return 'tennis';
  if (value.includes('pickleball')) return 'pickleball';
  if (value.includes('table') || value.includes('bóng bàn') || value.includes('bong ban')) return 'table_tennis';
  if (value.includes('football') || value.includes('bóng đá') || value.includes('bong da') || value.includes('soccer')) return 'football';
  return 'badminton';
};

const sportLabel: Record<LiteSport, string> = {
  badminton: 'liteSportBadminton',
  tennis: 'liteSportTennis',
  pickleball: 'liteSportPickleball',
  table_tennis: 'liteSportTableTennis',
  football: 'liteSportFootball',
};

const formatDateTimeDisplay = (val: string | undefined, locale: string) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
};

/* 4 Biểu tượng thể thức thi đấu chuyên nghiệp */
const SingleEliminationIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 5h4v6H3" />
    <path d="M3 19h4v-6H3" />
    <path d="M7 8h6v8H7" />
    <path d="M13 12h8" />
  </svg>
);

const RoundRobinIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);

const GroupStageKnockoutIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="6" height="6" rx="1.5" />
    <rect x="3" y="14" width="6" height="6" rx="1.5" />
    <path d="M9 7h4v4h4" />
    <path d="M9 17h4v-4" />
    <path d="M17 11h4" />
  </svg>
);

const DoubleEliminationIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 4h4v3H3" />
    <path d="M7 5.5h5v2.5" />
    <path d="M3 11h4v3H3" />
    <path d="M7 12.5h5v-2" />
    <path d="M12 9h4v3h-4" />
    <path d="M16 10.5h5" />
    <path d="M3 18h4v2H3" />
    <path d="M7 19h9v-7" />
  </svg>
);

const BRACKET_OPTIONS = [
  {
    id: 'single_elimination' as const,
    labelKey: 'liteBracketSingleLabel',
    descKey: 'liteBracketSingleDescription',
    Icon: SingleEliminationIcon,
  },
  {
    id: 'round_robin' as const,
    labelKey: 'liteBracketRoundRobinLabel',
    descKey: 'liteBracketRoundRobinDescription',
    Icon: RoundRobinIcon,
  },
  {
    id: 'group_stage_knockout' as const,
    labelKey: 'liteBracketGroupStageLabel',
    descKey: 'liteBracketGroupStageDescription',
    Icon: GroupStageKnockoutIcon,
  },
  {
    id: 'double_elimination' as const,
    labelKey: 'liteBracketDoubleLabel',
    descKey: 'liteBracketDoubleDescription',
    Icon: DoubleEliminationIcon,
  },
];

export default function CreateLiteTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: communityId } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const translate = useTranslations('Match');
  const [community, setCommunity] = useState<Community | null>(null);
  const [sport, setSport] = useState<LiteSport>('badminton');
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [footballTeamSize, setFootballTeamSize] = useState<5 | 7 | 11>(7);
  const [bracketType, setBracketType] = useState<'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout'>('single_elimination');
  const [maxTeams, setMaxTeams] = useState(16);
  const [description, setDescription] = useState('');
  const [isRanked, setIsRanked] = useState(false);
  const [startDateTime, setStartDateTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const getCategoryDisplayName = (category?: { slug?: string; name?: string } | null) => {
    if (!category) return translate(sportLabel[sport]);
    const value = `${category.slug || ''} ${category.name || ''}`.toLowerCase();
    if (value.includes('badminton') || value.includes('cầu lông') || value.includes('cau long')) return translate('liteSportBadminton');
    if (value.includes('tennis') || value.includes('quần vợt') || value.includes('quan vot')) return translate('liteSportTennis');
    if (value.includes('pickleball')) return translate('liteSportPickleball');
    if (value.includes('table_tennis') || value.includes('table-tennis') || value.includes('table tennis') || value.includes('bóng bàn') || value.includes('bong ban')) return translate('liteSportTableTennis');
    if (value.includes('football') || value.includes('soccer') || value.includes('bóng đá') || value.includes('bong da')) return translate('liteSportFootball');
    return category.name || translate(sportLabel[sport]);
  };

  useEffect(() => {
    communitiesApi.getCommunityById(communityId).then((response) => {
      const data = (response as { data?: Community }).data || (response as unknown as Community);
      setCommunity(data);
      if (data.categories?.[0]) {
        const detectedSport = mapCategoryToLiteSport(data.categories[0]);
        setSport(detectedSport);
        if (detectedSport === 'football') {
          setFormat('doubles');
        }
      }
    }).catch(() => toast.error(translate('liteLoadFailed'))).finally(() => setIsLoading(false));
  }, [communityId, translate]);

  const triggerDatePicker = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error(translate('liteNameRequired'));
    if (bracketType === 'round_robin' && maxTeams > 15) {
      return toast.error(translate('liteRoundRobinLimit'));
    }
    if (maxTeams < 2 || maxTeams > 128) return toast.error(translate('liteMaxTeamsRange'));

    const isoStartDate = startDateTime ? new Date(startDateTime).toISOString() : undefined;
    const timeOfDay = startDateTime && startDateTime.includes('T') ? startDateTime.split('T')[1] : '18:00';
    const dayOfWeek = startDateTime ? new Date(startDateTime).getDay() : undefined;

    try {
      setIsSubmitting(true);
      const result = await tournamentsApi.createLiteTournament({
        name: name.trim(),
        sport,
        communityId,
        format: sport === 'football' ? 'doubles' : format,
        teamSize: sport === 'football' ? footballTeamSize : undefined,
        bracketType,
        maxTeams,
        description: description.trim() || undefined,
        visibility: 'PRIVATE',
        registrationMode: 'OPEN',
        isRanked,
        startDate: isoStartDate,
        startTime: timeOfDay,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        recurringDayOfWeek: isRecurring ? dayOfWeek : undefined,
        recurringTimeOfDay: isRecurring ? timeOfDay : undefined,
      });
      toast.success(translate('liteCreatedSuccess'));
      if (result?.id) router.push(`/organizer/tournaments/${result.id}/manage`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isFootball = sport === 'football';
  const displayDateTimeText = formatDateTimeDisplay(startDateTime, locale);

  return (
    <div className="min-h-screen bg-slate-50 py-7 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* Navigation & Header */}
        <div>
          <Link
            href={`/communities/${communityId}`}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-3 transition"
          >
            <ChevronLeft className="w-4 h-4" /> {translate('backToCommunity')}
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
                {translate('liteCreateTitle')}
              </h1>
              <p className="text-slate-500 mt-0.5 text-sm font-medium">
                {community?.name ? `${translate('communityLabel')}: ${community.name}` : translate('liteCommunityFallback')}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-2.5 text-xs sm:text-sm font-medium leading-relaxed text-amber-950 shadow-2xs">
            <strong className="font-bold text-amber-950">{translate('liteWarningTitle')}</strong> {translate('liteWarningDescription')}
          </div>
        </div>

        {/* 2-Column Grid Layout (50% / 50% split) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          
          {/* CỘT TRÁI: Thông tin cơ bản & Thời gian bắt đầu */}
          <div className="space-y-5">
            
            {/* Card 1: Thông tin giải đấu */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Trophy className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">{translate('liteTournamentInfo')}</h2>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {translate('liteTournamentName')} <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder={translate('liteTournamentNamePlaceholder')}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10.5"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {translate('liteSportLabel')}
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Lock className="w-3 h-3" /> {translate('liteLockedByClub')}
                  </span>
                </div>
                <div className="h-10.5 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-800">
                  {getCategoryDisplayName(community?.categories?.[0])}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {translate('liteDescriptionLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={translate('liteDescriptionPlaceholder')}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition"
                />
              </div>
            </section>

            {/* Card 2: Thời gian bắt đầu giải & Định kỳ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">{translate('liteStartSection')}</h2>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    {translate('liteStartDateTime')}
                  </span>
                  <span className="text-[11px] font-normal text-emerald-600">{translate('liteRegistrationOpensImmediately')}</span>
                </label>
                
                {/* Custom dd/mm/yyyy datetime picker */}
                <div
                  onClick={triggerDatePicker}
                  className="relative flex h-10.5 w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-sm transition hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                >
                  <span className={`font-medium ${displayDateTimeText ? 'text-slate-800' : 'text-slate-400'}`}>
                    {displayDateTimeText || translate('liteDatePlaceholder')}
                  </span>
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    ref={dateInputRef}
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(event) => setStartDateTime(event.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 pointer-events-none"
                    tabIndex={-1}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {translate('liteDateHint')}
                </p>
              </div>

              {/* Tự động định kỳ */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                      {translate('liteRecurringToggle')}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {translate('liteRecurringDescription')}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRecurring}
                    onClick={() => setIsRecurring((val) => !val)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      isRecurring ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        isRecurring ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {isRecurring && (
                  <div className="border-t border-slate-200/80 pt-2.5 flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">{translate('liteRecurringCycle')}</label>
                    <select
                      value={recurringFrequency}
                      onChange={(event) => setRecurringFrequency(event.target.value as typeof recurringFrequency)}
                      className="h-9.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="WEEKLY">{translate('frequencyWeekly')}</option>
                      <option value="BIWEEKLY">{translate('frequencyBiweekly')}</option>
                      <option value="MONTHLY">{translate('frequencyMonthly')}</option>
                    </select>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* CỘT PHẢI: Nội dung thi đấu, 4 Thể thức bảng đấu & Quy mô ELO */}
          <div className="space-y-5">
            
            {/* Card 3: Nội dung thi đấu (Đơn / Đôi hoặc Sân Bóng đá) */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <User className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">{translate('liteCompetitionContent')}</h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isFootball ? translate('liteFieldSize') : `${translate('liteSinglesOption')} / ${translate('liteDoublesOption')}`}
                </span>
              </div>

              {isFootball ? (
                <div className="grid grid-cols-3 gap-2">
                  {([5, 7, 11] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFootballTeamSize(size)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition ${
                        footballTeamSize === size
                          ? 'border-blue-600 bg-blue-50/80 shadow-2xs ring-1 ring-blue-500/30 text-blue-950 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Shield className={`h-4 w-4 ${footballTeamSize === size ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-xs">{size === 5 ? translate('communityTournamentField5') : size === 7 ? translate('communityTournamentField7') : translate('communityTournamentField11')}</span>
                      <span className="text-[10px] text-slate-400">{translate('litePlayersCount', { count: size })}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormat('singles')}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition ${
                      format === 'singles'
                        ? 'border-blue-600 bg-blue-50/80 shadow-2xs ring-1 ring-blue-500/30 text-blue-950 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <User className={`h-5 w-5 ${format === 'singles' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">{translate('liteSinglesOption')}</span>
                    <span className="text-[10px] text-slate-400">{translate('liteSinglesHint')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('doubles')}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition ${
                      format === 'doubles'
                        ? 'border-blue-600 bg-blue-50/80 shadow-2xs ring-1 ring-blue-500/30 text-blue-950 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Users className={`h-5 w-5 ${format === 'doubles' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">{translate('liteDoublesOption')}</span>
                    <span className="text-[10px] text-slate-400">{translate('liteDoublesHint')}</span>
                  </button>
                </div>
              )}
            </section>

            {/* Card 4: Thể thức bảng đấu (4 thể thức chuẩn) */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">{translate('liteBracketTitle')}</h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{translate('liteSelectOne')}</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {BRACKET_OPTIONS.map((opt) => {
                  const isSelected = bracketType === opt.id;
                  const { Icon } = opt;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBracketType(opt.id)}
                      className={`group flex items-start gap-3 rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 shadow-2xs ring-1 ring-blue-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-600 group-hover:text-blue-600'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold transition ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                            {translate(opt.labelKey)}
                          </span>
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                          )}
                        </div>
                        <p className={`mt-0.5 text-[11px] leading-snug transition ${isSelected ? 'text-blue-900/80' : 'text-slate-500'}`}>
                          {translate(opt.descKey)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Card 5: Quy mô & ELO */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    {translate('liteScaleTitle', { type: isFootball ? translate('liteTeamCountType') : translate('liteParticipantCountType') })}
                  </span>
                  <span className="text-xs text-slate-400">
                    {bracketType === 'round_robin' ? translate('liteMaxRoundRobin') : translate('liteMax128')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(bracketType === 'round_robin' ? [4, 6, 8, 10, 12, 15] : [4, 8, 16, 32, 64, 128]).map((num) => {
                    const isCurrent = maxTeams === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMaxTeams(num)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                          isCurrent
                            ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[11px] text-slate-500">{translate('liteOther')}</span>
                    <input
                      type="number"
                      min={2}
                      max={bracketType === 'round_robin' ? 15 : 128}
                      value={maxTeams}
                      onChange={(event) => setMaxTeams(Number(event.target.value))}
                      className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Smart suggestion when Round Robin > 15 */}
                {bracketType === 'round_robin' && maxTeams > 15 && (
                  <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-xs text-amber-900 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="leading-relaxed">
                        <strong className="font-bold text-amber-950">💡 {translate('liteSuggestionTitle')}</strong> {translate('liteSuggestionDescription', { count: maxTeams })}
                      </p>
                      <button
                        type="button"
                        onClick={() => setBracketType('group_stage_knockout')}
                        className="shrink-0 rounded-lg bg-amber-200 hover:bg-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-950 transition"
                      >
                        {translate('liteSwitchToGroups')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100" />

              {/* Tính điểm ELO CLB */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900">
                    {isRanked ? translate('liteRankedTitle') : translate('liteRecreationalTitle')}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isRanked ? translate('liteRankedDescription') : translate('liteRecreationalDescription')}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isRanked}
                  onClick={() => setIsRanked((val) => !val)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    isRanked ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      isRanked ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Tip & Action Buttons */}
        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-2.5 text-xs text-blue-700 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <span>
              {translate('liteAfterCreateTip')}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 pt-3.5">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-5 h-10.5 text-xs font-bold"
            >
              {translate('liteCancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 h-10.5 shadow-sm"
            >
              {isSubmitting ? translate('liteCreating') : translate('liteCreateAction')}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
