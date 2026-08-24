'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Settings2,
  MapPin,
  Calendar,
  Layers,
  GitBranch,
  Users,
  Eye,
  ShieldCheck,
  Trophy,
  Info,
  Check,
  Plus,
  Flame,
  X,
  Sparkles,
} from 'lucide-react';
import { categoriesApi, Category } from '@/features/categories/api';
import { tournamentsApi, type CreateDivisionInput } from '@/features/tournaments/api';
import { regionsApi, Region } from '@/features/regions/api';
import { getErrorMessage } from '@/utils/error';
import { GenderRestriction, MatchTypeDB } from '@/types/tournament';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { SearchableRegionSelect } from '@/components/shared/SearchableRegionSelect';
import { DateTimePicker } from '@/components/ui/Input';
import { toApiIsoDateTime } from '@/utils/dateTimeInput';
import SmartAiTournamentModal from './SmartAiTournamentModal';
import { useAutoAddressParser } from '@/utils/vietnamAddressParser';

/* 4 Biểu tượng sơ đồ thể thức thi đấu chuyên nghiệp */
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
    id: 'single_elimination',
    labelKey: 'bracketSingleLabel',
    descKey: 'bracketSingleDesc',
    Icon: SingleEliminationIcon,
  },
  {
    id: 'round_robin',
    labelKey: 'bracketRoundRobinLabel',
    descKey: 'bracketRoundRobinDesc',
    Icon: RoundRobinIcon,
  },
  {
    id: 'group_stage_knockout',
    labelKey: 'bracketGroupStageLabel',
    descKey: 'bracketGroupStageDesc',
    Icon: GroupStageKnockoutIcon,
  },
  {
    id: 'double_elimination',
    labelKey: 'bracketDoubleLabel',
    descKey: 'bracketDoubleDesc',
    Icon: DoubleEliminationIcon,
  },
] as const;

type QuickValues = {
  name: string;
  sport: 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';
  format: 'singles' | 'doubles';
  tournamentType: 'CLUB' | 'PUBLIC';
  visibility: 'PRIVATE' | 'PUBLIC';
  registrationMode: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  bracketType: 'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout';
  maxTeams: number;
  registrationStart?: string;
  registrationEnd?: string;
  startDate: string;
  endDate?: string;
  venueName: string;
  locationAddress: string;
  province: string;
  ward?: string;
  district?: string;
  genderRestriction: '' | 'MALE' | 'FEMALE' | 'MIXED';
  selectedFormats: string[];
  teamSize: '5' | '7' | '11';
  maxReserve: number;
  footballHalvesCount: number;
  footballHalfDuration: number;
  footballAllowDraw: boolean;
  description?: string;
  isRanked: boolean;
};

type QuickMessage = (key: string, values?: Record<string, string | number>) => string;

const buildQuickSchema = (translate: QuickMessage) => z.object({
  name: z.string().trim().min(2, translate('validationName')),
  sport: z.enum(['badminton', 'tennis', 'pickleball', 'table_tennis', 'football']),
  format: z.enum(['singles', 'doubles']),
  tournamentType: z.enum(['CLUB', 'PUBLIC']),
  visibility: z.enum(['PRIVATE', 'PUBLIC']),
  registrationMode: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']),
  bracketType: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'group_stage_knockout']),
  maxTeams: z.number().int().min(2).max(128),
  registrationStart: z.string().optional(),
  registrationEnd: z.string().optional(),
  startDate: z.string().min(1, translate('validationStartDate')),
  endDate: z.string().optional(),
  venueName: z.string().trim().min(1, translate('validationVenueName')),
  locationAddress: z.string().trim().min(1, translate('validationLocation')),
  province: z.string().trim().min(1, translate('validationProvince')),
  ward: z.string().trim().optional(),
  district: z.string().trim().optional(),
  genderRestriction: z.enum(['', 'MALE', 'FEMALE', 'MIXED']),
  selectedFormats: z.array(z.string()).min(1, translate('validationFormats')),
  teamSize: z.enum(['5', '7', '11']),
  maxReserve: z.number().int().min(0).max(20),
  footballHalvesCount: z.number().int().min(1).max(4),
  footballHalfDuration: z.number().int().min(1).max(120),
  footballAllowDraw: z.boolean(),
  description: z.string().trim().max(10000, translate('validationDescription')).optional(),
  isRanked: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.bracketType === 'round_robin' && data.maxTeams > 15) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxTeams'], message: translate('validationRoundRobin') });
  }
  const registrationStart = data.registrationStart ? new Date(data.registrationStart) : null;
  const registrationEnd = data.registrationEnd ? new Date(data.registrationEnd) : null;
  const tournamentStart = data.startDate ? new Date(data.startDate) : null;
  const tournamentEnd = data.endDate ? new Date(data.endDate) : null;
  const now = new Date();
  if (registrationStart && registrationEnd && registrationStart >= registrationEnd) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registrationEnd'], message: translate('validationRegOpenAfter') });
  }
  if (registrationEnd && tournamentStart && registrationEnd >= tournamentStart) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registrationEnd'], message: translate('validationRegBeforeStart') });
  }
  if (tournamentStart && tournamentEnd && tournamentStart >= tournamentEnd) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: translate('validationEndAfterStart') });
  }
  if (tournamentStart && !Number.isNaN(tournamentStart.getTime()) && tournamentStart <= now) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: translate('validationStartFuture') });
  }
  if (registrationEnd && !Number.isNaN(registrationEnd.getTime()) && registrationEnd <= now) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registrationEnd'], message: translate('validationRegEndFuture') });
  }
  if (data.ward && !data.province) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['province'], message: translate('validationProvinceBeforeWard') });
  }
});
type QuickSport = QuickValues['sport'];

type QuickFormatConfig = {
  id: string;
  key: string;
  label: string;
  bracketType?: QuickValues['bracketType'];
  maxParticipantsOverride?: boolean;
  maxParticipants?: number | null;
  eloEnabled: boolean;
  minElo: number | null;
  maxElo: number | null;
  isCustom?: boolean;
};

const QUICK_FORMAT_OPTIONS = [
  { key: 'MALE_SINGLES', labelKey: 'formatMaleSingles' },
  { key: 'FEMALE_SINGLES', labelKey: 'formatFemaleSingles' },
  { key: 'MALE_DOUBLES', labelKey: 'formatMaleDoubles' },
  { key: 'FEMALE_DOUBLES', labelKey: 'formatFemaleDoubles' },
  { key: 'MIXED_DOUBLES', labelKey: 'formatMixedDoubles' },
  { key: 'FOOTBALL_MALE', labelKey: 'formatFootballMale' },
  { key: 'FOOTBALL_FEMALE', labelKey: 'formatFootballFemale' },
  { key: 'FOOTBALL_MIXED', labelKey: 'formatFootballMixed' },
] as const;

const DEFAULT_RACKET_FORMATS = QUICK_FORMAT_OPTIONS.slice(0, 5).map((item) => item.key);
const DEFAULT_FOOTBALL_FORMATS = QUICK_FORMAT_OPTIONS.slice(5).map((item) => item.key);

const sportFromCategory = (category: Category): QuickSport | null => {
  const value = `${category.slug ?? ''} ${category.name ?? ''}`.toLowerCase();
  if (value.includes('badminton') || value.includes('cầu lông')) return 'badminton';
  if (value.includes('pickleball')) return 'pickleball';
  if (value.includes('tennis') || value.includes('quần vợt')) return 'tennis';
  if (value.includes('table') || value.includes('bóng bàn')) return 'table_tennis';
  if (value.includes('football') || value.includes('bóng đá') || value.includes('soccer')) return 'football';
  return null;
};

const formatDateTimeInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTimeDisplay = (val?: string) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const toDivisionInput = (
  formatKey: string,
  divisionName: string,
  bracketType: QuickValues['bracketType'],
  maxParticipants: number,
  startDate?: string,
  registrationEndDate?: string,
): CreateDivisionInput => {
  const genderRestrictionByFormat: Record<string, GenderRestriction | undefined> = {
    MALE_SINGLES: GenderRestriction.MALE,
    FEMALE_SINGLES: GenderRestriction.FEMALE,
    MALE_DOUBLES: GenderRestriction.MALE,
    FEMALE_DOUBLES: GenderRestriction.FEMALE,
    MIXED_DOUBLES: GenderRestriction.MIXED,
    FOOTBALL_MALE: GenderRestriction.MALE,
    FOOTBALL_FEMALE: GenderRestriction.FEMALE,
  };
  return {
    name: divisionName,
    matchType: formatKey.includes('SINGLES') ? MatchTypeDB.SINGLES : formatKey.includes('MIXED_DOUBLES') ? MatchTypeDB.MIXED_DOUBLES : MatchTypeDB.DOUBLES,
    genderRestriction: genderRestrictionByFormat[formatKey],
    maxParticipants,
    entryFee: 0,
    bracketType: bracketType.toUpperCase() as CreateDivisionInput['bracketType'],
    startDate: startDate ?? null,
    registrationEndDate: registrationEndDate ?? null,
  };
};

const quickDefaults = () => {
  const regStart = new Date();
  regStart.setSeconds(0, 0);

  return {
    registrationStart: formatDateTimeInput(regStart),
    registrationEnd: '',
    startDate: '',
    endDate: '',
  };
};

export default function QuickTournamentCreate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const translate = useTranslations('OrganizerQuickCreate');
  const quickSchema = useMemo(() => buildQuickSchema(translate), [translate]);
  const getFormatLabel = (key: string) => {
    const option = QUICK_FORMAT_OPTIONS.find((item) => item.key === key);
    return option ? translate(option.labelKey) : key;
  };
  const getBracketLabel = (key: QuickValues['bracketType']) => {
    const option = BRACKET_OPTIONS.find((item) => item.id === key);
    return option ? translate(option.labelKey) : translate('bracketSingleLabel');
  };
  const communityId = searchParams.get('communityId') || undefined;
  const scheduleDefaults = useMemo(() => quickDefaults(), []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue, getValues, control, formState: { errors } } = useForm<QuickValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      sport: 'badminton', format: 'doubles',
      tournamentType: communityId ? 'CLUB' : 'PUBLIC',
      visibility: communityId ? 'PRIVATE' : 'PUBLIC',
      registrationMode: communityId ? 'OPEN' : 'APPROVAL',
      bracketType: 'single_elimination',
      maxTeams: 16, ...scheduleDefaults,
      selectedFormats: [],
      venueName: '', locationAddress: '', province: '', ward: '', district: '',
      isRanked: false, description: '', genderRestriction: 'MALE', teamSize: '7', maxReserve: 5,
      footballHalvesCount: 2, footballHalfDuration: 45, footballAllowDraw: true,
    },
  });

  const sport = useWatch({ control, name: 'sport' });
  const selectedFormats = useWatch({ control, name: 'selectedFormats' }) || [];
  const bracketType = useWatch({ control, name: 'bracketType' });
  const maxTeams = useWatch({ control, name: 'maxTeams' });
  const visibility = useWatch({ control, name: 'visibility' });
  const registrationMode = useWatch({ control, name: 'registrationMode' });
  const province = useWatch({ control, name: 'province' });
  const ward = useWatch({ control, name: 'ward' });
  const registrationStart = useWatch({ control, name: 'registrationStart' });
  const registrationEnd = useWatch({ control, name: 'registrationEnd' });
  const startDate = useWatch({ control, name: 'startDate' });
  const endDate = useWatch({ control, name: 'endDate' });
  const description = useWatch({ control, name: 'description' }) || '';
  const formValues = useWatch({ control });
  const [isDescriptionEditorOpen, setIsDescriptionEditorOpen] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [editingFormatId, setEditingFormatId] = useState<string | null>(null);
  const [formatDraft, setFormatDraft] = useState<QuickFormatConfig>({
    id: 'MALE_DOUBLES',
    key: 'MALE_DOUBLES',
      label: translate('formatMaleDoubles'),
    bracketType: 'single_elimination',
    maxParticipantsOverride: false,
    maxParticipants: null,
    eloEnabled: false,
    minElo: null,
    maxElo: null,
  });
  const [formatConfigs, setFormatConfigs] = useState<QuickFormatConfig[]>([
    ...QUICK_FORMAT_OPTIONS.slice(0, 5).map((item) => ({
      id: item.key,
      key: item.key,
      label: translate(item.labelKey),
      eloEnabled: false,
      minElo: null,
      maxElo: null,
    })),
  ]);
  const draftHydratedRef = useRef(false);
  const autoScheduleRef = useRef({ registrationEnd: '', endDate: '' });

  useEffect(() => {
    if (!isFormatModalOpen && !isDescriptionEditorOpen && !isAiModalOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isFormatModalOpen) setIsFormatModalOpen(false);
      if (isDescriptionEditorOpen) setIsDescriptionEditorOpen(false);
      if (isAiModalOpen) setIsAiModalOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAiModalOpen, isDescriptionEditorOpen, isFormatModalOpen]);

  const draftKey = `sporto:tournament-quick-draft:${communityId || 'public'}`;

  useEffect(() => {
    if (typeof window === 'undefined' || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<QuickValues>;
      Object.entries(saved).forEach(([key, value]) => {
        // Không khôi phục registrationStart từ bản nháp cũ, luôn giữ Date Time Now
        if (key === 'registrationStart') return;
        if (value !== undefined && value !== null) setValue(key as keyof QuickValues, value as never, { shouldDirty: false });
      });
      // Luôn cập nhật lại registrationStart thành Date Time Now hiện tại
      const now = new Date();
      now.setSeconds(0, 0);
      setValue('registrationStart', formatDateTimeInput(now), { shouldDirty: false });
      toast.success(translate('draftRestored'), { id: 'quick-draft-restored' });
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, setValue, translate]);

  useEffect(() => {
    if (typeof window === 'undefined' || !draftHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      const draft = { ...(formValues as QuickValues) } as Partial<QuickValues>;
      // Không lưu registrationStart vào bản nháp
      delete draft.registrationStart;
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftKey, formValues]);

  const userTouchedScheduleRef = useRef<{ registrationEnd: boolean; endDate: boolean }>({
    registrationEnd: false,
    endDate: false,
  });

  const handleRegistrationStartChange = (val: string) => {
    setValue('registrationStart', val, { shouldValidate: true });
  };

  const handleRegistrationEndChange = (val: string) => {
    userTouchedScheduleRef.current.registrationEnd = true;
    setValue('registrationEnd', val, { shouldValidate: true });
  };

  useEffect(() => {
    if (!registrationStart || !startDate) {
      return;
    }
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return;
    
    // Tự động tính hạn đóng đăng ký: 23:59 ngày hôm trước ngày bắt đầu giải
    const dayBeforeStart = new Date(start);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
    dayBeforeStart.setHours(23, 59, 0, 0);

    const regStart = new Date(registrationStart);
    const now = new Date();
    let targetRegEnd = dayBeforeStart;

    // Nếu ngày hôm trước vẫn nhỏ hơn thời điểm mở đăng ký hoặc nhỏ hơn hiện tại
    if (targetRegEnd.getTime() <= regStart.getTime() || targetRegEnd.getTime() <= now.getTime()) {
      targetRegEnd = new Date(start.getTime() - 2 * 60 * 60 * 1000);
      if (targetRegEnd.getTime() <= regStart.getTime() || targetRegEnd.getTime() <= now.getTime()) {
        const baseline = Math.max(regStart.getTime(), now.getTime());
        targetRegEnd = new Date((baseline + start.getTime()) / 2);
      }
    }

    if (targetRegEnd.getTime() >= start.getTime()) {
      targetRegEnd = new Date(start.getTime() - 60 * 60 * 1000);
    }

    const estimatedEnd = new Date(start);
    estimatedEnd.setDate(estimatedEnd.getDate() + 14);
    estimatedEnd.setHours(23, 59, 0, 0);

    const nextRegistrationEnd = formatDateTimeInput(targetRegEnd);
    const nextEndDate = formatDateTimeInput(estimatedEnd);
    const currentRegistrationEnd = getValues('registrationEnd');
    const currentEndDate = getValues('endDate');

    if (!currentRegistrationEnd || !userTouchedScheduleRef.current.registrationEnd) {
      setValue('registrationEnd', nextRegistrationEnd, { shouldValidate: true });
    }
    if (!currentEndDate || !userTouchedScheduleRef.current.endDate) {
      setValue('endDate', nextEndDate, { shouldValidate: true });
    }
  }, [registrationStart, startDate, getValues, setValue]);

  const showDerivedSchedule = Boolean(registrationStart && startDate);

  const [provinces, setProvinces] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const selectedCategory = useMemo(() => categories.find((category) => sportFromCategory(category) === sport), [categories, sport]);

  const locationAddress = useWatch({ control, name: 'locationAddress' });

  const autoDetectedAddress = useAutoAddressParser({
    addressValue: locationAddress,
    provinces,
    wards,
    onSelectProvince: (provCode) => {
      setValue('province', provCode, { shouldValidate: true, shouldDirty: true });
    },
    onSelectWard: (wardCode) => {
      setValue('ward', wardCode, { shouldValidate: true, shouldDirty: true });
    },
    onWardsLoaded: (loadedWards) => {
      setWards(loadedWards);
    },
  });

  useEffect(() => {
    let active = true;
    categoriesApi.getCategories().then((response) => {
      if (active) setCategories((response.data ?? []).filter((category) => category.isActive !== false));
    }).catch(() => toast.error(translate('categoriesLoadError'))).finally(() => {
      if (active) setLoadingCategories(false);
    });
    return () => { active = false; };
  }, [translate]);

  useEffect(() => {
    let active = true;
    regionsApi.getProvinces().then((response) => {
      if (active) setProvinces(response ?? []);
    }).catch(() => { if (active) toast.error(translate('provincesLoadError')); });
    return () => { active = false; };
  }, [translate]);

  const syncLegacyFormat = (primary: string) => {
    if (!primary) return;
    if (primary.includes('SINGLES')) {
      setValue('format', 'singles');
      setValue('genderRestriction', primary.includes('FEMALE') ? 'FEMALE' : 'MALE');
    } else if (primary.includes('DOUBLES')) {
      setValue('format', 'doubles');
      if (primary.includes('MIXED')) setValue('genderRestriction', 'MIXED');
      else if (primary.includes('FEMALE')) setValue('genderRestriction', 'FEMALE');
      else setValue('genderRestriction', 'MALE');
    } else if (primary.startsWith('FOOTBALL_')) {
      setValue('format', 'doubles');
      if (primary === 'FOOTBALL_MALE') setValue('genderRestriction', 'MALE');
      else if (primary === 'FOOTBALL_FEMALE') setValue('genderRestriction', 'FEMALE');
      else setValue('genderRestriction', '');
    }
  };

  const toggleFormat = (formatId: string) => {
    const isSelected = selectedFormats.includes(formatId);
    if (isSelected) {
      const next = selectedFormats.filter((item) => item !== formatId);
      setValue('selectedFormats', next, { shouldValidate: true });
      const firstConfig = formatConfigs.find((c) => c.id === next[0] || c.key === next[0]);
      if (firstConfig) syncLegacyFormat(firstConfig.key);
      return;
    }
    const next = [...selectedFormats, formatId];
    setValue('selectedFormats', next, { shouldValidate: true });
    const firstConfig = formatConfigs.find((c) => c.id === next[0] || c.key === next[0]);
    if (firstConfig) syncLegacyFormat(firstConfig.key);
  };

  const openFormatModal = (formatId?: string) => {
    const isFootball = sport === 'football';
    const sportOptions = QUICK_FORMAT_OPTIONS.filter((item) =>
      isFootball ? item.key.startsWith('FOOTBALL_') : !item.key.startsWith('FOOTBALL_')
    );

    if (formatId) {
      const existing = formatConfigs.find((config) => config.id === formatId || config.key === formatId);
      if (existing) {
        setEditingFormatId(existing.id);
        setFormatDraft({ ...existing });
        setShowAdvancedOptions(Boolean(existing.bracketType || existing.maxParticipantsOverride || existing.eloEnabled));
        setIsFormatModalOpen(true);
        return;
      }
    }

    const defaultOpt = sportOptions.find((item) => !selectedFormats.includes(item.key)) ?? sportOptions[0];
    const newId = `format-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setEditingFormatId(null);
    setFormatDraft({
      id: newId,
      key: defaultOpt.key,
      label: getFormatLabel(defaultOpt.key),
      bracketType: undefined,
      maxParticipantsOverride: false,
      maxParticipants: null,
      eloEnabled: false,
      minElo: null,
      maxElo: null,
      isCustom: true,
    });
    setShowAdvancedOptions(false);
    setIsFormatModalOpen(true);
  };

  const removeFormat = (formatId: string) => {
    const nextSelected = selectedFormats.filter((id) => id !== formatId);
    setFormatConfigs((current) => current.filter((item) => item.id !== formatId));
    setValue('selectedFormats', nextSelected, { shouldValidate: true });
    const firstConfig = formatConfigs.find((c) => c.id === nextSelected[0] || c.key === nextSelected[0]);
    if (firstConfig) syncLegacyFormat(firstConfig.key);
    toast.success(translate('formatRemoved'));
  };

  const saveFormatConfig = () => {
    if (formatDraft.eloEnabled && formatDraft.minElo !== null && formatDraft.maxElo !== null && formatDraft.minElo > formatDraft.maxElo) {
      toast.error(translate('eloRangeError'));
      return;
    }
    const defaultOption = QUICK_FORMAT_OPTIONS.find((item) => item.key === formatDraft.key);
    const normalizedLabel = formatDraft.label.trim() || (defaultOption ? translate(defaultOption.labelKey) : formatDraft.key);
    const normalizedDraft: QuickFormatConfig = {
      ...formatDraft,
      label: normalizedLabel,
      bracketType: formatDraft.bracketType || undefined,
      maxParticipantsOverride: Boolean(formatDraft.maxParticipantsOverride),
      maxParticipants: formatDraft.maxParticipantsOverride && formatDraft.maxParticipants ? Number(formatDraft.maxParticipants) : null,
    };

    if (editingFormatId) {
      setFormatConfigs((current) =>
        current.map((item) => (item.id === editingFormatId ? normalizedDraft : item))
      );
      toast.success(translate('formatUpdated'));
    } else {
      setFormatConfigs((current) => [...current, normalizedDraft]);
      setValue('selectedFormats', [...selectedFormats, normalizedDraft.id], { shouldValidate: true });
      toast.success(translate('formatAdded'));
    }

    syncLegacyFormat(normalizedDraft.key);
    setIsFormatModalOpen(false);
  };

  const handleSportChange = (newSport: QuickSport) => {
    if (newSport === 'football') {
      const defaultFootball = QUICK_FORMAT_OPTIONS.slice(5).map((item) => ({
        id: item.key,
        key: item.key,
        label: translate(item.labelKey),
        bracketType: undefined,
        maxParticipantsOverride: false,
        maxParticipants: null,
        eloEnabled: false,
        minElo: null,
        maxElo: null,
      }));
      setValue('selectedFormats', [], { shouldValidate: false });
      setFormatConfigs(defaultFootball);
    } else {
      const defaultRacket = QUICK_FORMAT_OPTIONS.slice(0, 5).map((item) => ({
        id: item.key,
        key: item.key,
        label: translate(item.labelKey),
        bracketType: undefined,
        maxParticipantsOverride: false,
        maxParticipants: null,
        eloEnabled: false,
        minElo: null,
        maxElo: null,
      }));
      setValue('selectedFormats', [], { shouldValidate: false });
      setFormatConfigs(defaultRacket);
    }
  };

  useEffect(() => {
    if (!province || !provinces.some((item) => item.code === province)) {
      return;
    }

    let active = true;
    regionsApi.getWards(province).then((response) => {
      if (active) {
        setWards(response ?? []);
      }
    }).catch(() => { 
      if (active) {
        setWards([]);
        toast.error(translate('wardsLoadError')); 
      }
    });

    return () => {
      active = false;
    };
  }, [province, provinces, translate]);

  const onSubmit = async (values: QuickValues) => {
    try {
      setIsSubmitting(true);
      const { registrationStart, registrationEnd, startDate, endDate } = values;

      const regStartDate = registrationStart ? new Date(registrationStart) : undefined;
      const regEndDate = registrationEnd ? new Date(registrationEnd) : undefined;
      const startDateTime = startDate ? new Date(startDate) : undefined;
      const endDateTime = endDate ? new Date(endDate) : undefined;

      if (regStartDate && regEndDate && regStartDate >= regEndDate) {
        toast.error(translate('validationRegOpenAfter'));
        return;
      }
      if (regEndDate && startDateTime && regEndDate >= startDateTime) {
        toast.error(translate('validationRegBeforeStart'));
        return;
      }
      if (endDateTime && startDateTime && startDateTime >= endDateTime) {
        toast.error(translate('validationEndAfterStart'));
        return;
      }

      const provinceName = provinces.find((item) => item.code === values.province)?.fullName ?? values.province;
      const wardName = wards.find((item) => item.code === values.ward)?.fullName ?? values.ward;

      // Convert the selected cards into the explicit API DTO. The UI-only
      // selectedFormats array never crosses the API boundary.
      const divisionInputs = values.selectedFormats.map((formatId) => {
        const config = formatConfigs.find((item) => item.id === formatId || item.key === formatId);
        const formatKey = config?.key || formatId;
        const divisionMaxParticipants = config?.maxParticipantsOverride && config.maxParticipants && config.maxParticipants > 0
          ? Number(config.maxParticipants)
          : values.maxTeams;
        const division = toDivisionInput(
          formatKey,
          config?.label?.trim() || getFormatLabel(formatKey),
          config?.bracketType ?? values.bracketType,
          divisionMaxParticipants,
          toApiIsoDateTime(values.startDate) ?? undefined,
          toApiIsoDateTime(values.registrationEnd) ?? undefined,
        );
        return {
          name: config?.label?.trim() || division.name,
          matchType: division.matchType,
          genderRestriction: division.genderRestriction,
          maxParticipants: division.maxParticipants,
          bracketType: division.bracketType,
          startDate: division.startDate,
          registrationEndDate: division.registrationEndDate,
          minElo: config?.eloEnabled ? config.minElo : null,
          maxElo: config?.eloEnabled ? config.maxElo : null,
        };
      });

      const createPayload: Parameters<typeof tournamentsApi.createLiteTournament>[0] = {
        name: values.name.trim(),
        sport: values.sport,
        format: values.format,
        bracketType: values.bracketType,
        maxTeams: values.maxTeams,
        divisions: divisionInputs,
        visibility: values.visibility,
        registrationMode: values.registrationMode,
        isRanked: values.isRanked,
        communityId,
        genderRestriction: values.genderRestriction || undefined,
        registrationStartDate: toApiIsoDateTime(values.registrationStart) ?? undefined,
        registrationEndDate: toApiIsoDateTime(values.registrationEnd) ?? undefined,
        startDate: toApiIsoDateTime(values.startDate) ?? undefined,
        endDate: toApiIsoDateTime(values.endDate) ?? undefined,
        venueName: values.venueName ? values.venueName.trim() : undefined,
        locationAddress: values.locationAddress ? values.locationAddress.trim() : undefined,
        province: provinceName || undefined,
        ward: wardName || undefined,
        description: values.description ? values.description.trim() : undefined,
        teamSize: values.sport === 'football' ? (Number(values.teamSize) as 5 | 7 | 11) : undefined,
        maxReserve: values.sport === 'football' ? values.maxReserve : undefined,
        footballHalvesCount: values.sport === 'football' ? values.footballHalvesCount : undefined,
        footballHalfDuration: values.sport === 'football' ? values.footballHalfDuration : undefined,
        footballAllowDraw: values.sport === 'football' ? values.footballAllowDraw : undefined,
      };

      const response = await tournamentsApi.createLiteTournament(createPayload);

      toast.success(values.visibility === 'PUBLIC' ? translate('createdPendingApproval') : translate('createSuccess'));
      if (typeof window !== 'undefined') window.localStorage.removeItem(draftKey);
      router.push(`/organizer/tournaments/${response.id}/manage`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('createFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/70 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Bar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/25">
                <Trophy className="h-5 w-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{translate('pageTitle')}</h1>
            </div>
            <p className="mt-1.5 text-xs md:text-sm text-slate-500">
              {translate('pageSubtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600 transition"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              {translate('createWithAiExcel')}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/organizer/tournaments/create?mode=advanced${communityId ? `&communityId=${communityId}` : ''}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
            >
              <Settings2 className="h-4 w-4 text-slate-500" /> {translate('advancedCreate')}
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="mb-8 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-amber-50/40 p-4 text-amber-950 shadow-2xs">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs md:text-sm leading-relaxed">
              <strong className="font-bold text-amber-900">{translate('importantNoticeTitle')}</strong> {translate('importantNoticeBody')}
            </div>
          </div>
        </div>

        {/* Form Container with 2-Column Responsive Layout */}
        <form
          onSubmit={handleSubmit(onSubmit, (fieldErrors) => {
            const firstError = Object.values(fieldErrors)[0]?.message;
            toast.error(firstError || translate('requiredFieldsError'));
          })}
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            
            {/* ─── CỘT TRÁI (7 CỘT): THÔNG TIN CƠ BẢN, LỊCH TRÌNH, ĐỊA ĐIỂM, MÔ TẢ ─── */}
            <div className="space-y-6 lg:col-span-7 xl:col-span-7">
              
              {/* Card 1: Thông tin cơ bản */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{translate('basicInfoTitle')}</h2>
                </div>

                {/* Tên giải đấu */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {translate('tournamentNameLabel')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    data-testid="tournament-name-input"
                    {...register('name')}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder={translate('tournamentNamePlaceholder')}
                  />
                  {errors.name && <span className="mt-1 block text-xs text-rose-600 font-medium">{errors.name.message}</span>}
                </div>

                {/* Môn thể thao */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {translate('sportLabel')} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    data-testid="sport-select"
                    {...register('sport', {
                      onChange: (e) => handleSportChange(e.target.value as QuickSport),
                    })}
                    disabled={loadingCategories}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {categories.map((category) => {
                      const value = sportFromCategory(category);
                      return value ? <option key={category.id} value={value}>{category.name}</option> : null;
                    })}
                  </select>
                  <span className="mt-1.5 block text-xs text-slate-500">
                    {selectedCategory ? translate('defaultRulesApplied', { sport: selectedCategory.name }) : translate('selectSportHint')}
                  </span>
                </div>

                {/* Mô tả giải đấu: inline preview, editor đầy đủ mở trong popup */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {translate('descriptionLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDescriptionEditorOpen(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {translate('openEditor')}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDescriptionEditorOpen(true)}
                    className="mt-2 flex min-h-36 w-full items-start rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-left text-sm transition hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <span className={description ? 'line-clamp-6 text-slate-800' : 'text-slate-400'}>
                      {description ? description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : translate('descriptionPlaceholder')}
                    </span>
                  </button>
                  <input type="hidden" {...register('description')} />
                </div>
              </section>

              {/* Card 2: Lịch trình thời gian */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{translate('scheduleTitle')}</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DateTimePicker
					label={translate('registrationStartLabel')}                    value={registrationStart || ''}
                    onChange={handleRegistrationStartChange}
                    error={errors.registrationStart?.message}
                  />

                  <DateTimePicker
					label={translate('startDateLabel')}                    value={startDate || ''}
                    onChange={(val) => setValue('startDate', val, { shouldValidate: true })}
                    error={errors.startDate?.message}
                  />

                  <div className={`sm:col-span-2 grid gap-4 overflow-hidden transition-all duration-300 ease-out ${showDerivedSchedule ? 'max-h-48 translate-y-0 opacity-100' : 'pointer-events-none max-h-0 -translate-y-2 opacity-0'}`} aria-hidden={!showDerivedSchedule}>
                    <div className="grid gap-4 sm:grid-cols-2">
                  <DateTimePicker
                        label={translate('registrationEndLabel')}
                        value={registrationEnd || ''}
                        onChange={handleRegistrationEndChange}
                        error={errors.registrationEnd?.message}
                        max={startDate || undefined}
                      />

                      <DateTimePicker
                        label={translate('endDateLabel')}
                        value={endDate || ''}
                        onChange={(val) => setValue('endDate', val, { shouldValidate: true })}
                        error={errors.endDate?.message}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Card 3: Địa điểm & Sân thi đấu */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{translate('locationTitle')}</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {translate('venueLabel')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      data-testid="venue-name-input"
                      {...register('venueName')}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder={translate('venuePlaceholder')}
                    />
                    {errors.venueName && <span className="mt-1 block text-xs text-rose-600">{errors.venueName.message}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {translate('addressLabel')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      data-testid="location-address-input"
                      {...register('locationAddress')}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder={translate('addressPlaceholder')}
                    />
                    {errors.locationAddress && <span className="mt-1 block text-xs text-rose-600">{errors.locationAddress.message}</span>}
                    {autoDetectedAddress.isMatched && autoDetectedAddress.province && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-fadeIn">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                        <span>
                          <strong>{autoDetectedAddress.province.fullName || autoDetectedAddress.province.name}</strong>
                          {autoDetectedAddress.ward ? ` > ${autoDetectedAddress.ward.fullName || autoDetectedAddress.ward.name}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dropdowns Tỉnh/Thành ➔ Phường/Xã */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    {translate('administrativeAreaLabel')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <SearchableRegionSelect
                        value={province || ''}
                        options={provinces}
                        inputName="province"
                        placeholder={translate('provincePlaceholder')}
                        onChange={(value) => {
                          setWards([]);
                          setValue('province', value, { shouldValidate: true, shouldDirty: true });
                          setValue('ward', '', { shouldValidate: true, shouldDirty: true });
                        }}
                        error={errors.province?.message}
                      />
                    </div>
                    <div>
                      <SearchableRegionSelect
                        value={ward || ''}
                        options={wards}
                        inputName="ward"
                        disabled={!province || wards.length === 0}
                        placeholder={!province ? translate('selectProvinceFirst') : wards.length === 0 ? translate('loadingWards') : translate('wardPlaceholder')}
                        onChange={(value) => setValue('ward', value, { shouldValidate: true, shouldDirty: true })}
                        error={errors.ward?.message}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {translate('locationHint')}
                  </p>
                </div>
              </section>

              {/* Card 4: Thiết lập chuyên biệt bóng đá (nếu là môn bóng đá) */}
              {sport === 'football' && (
                <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 md:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <Flame className="h-4 w-4" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">{translate('footballRulesTitle')}</h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{translate('teamSizeLabel')}</label>
                      <select {...register('teamSize')} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="5">{translate('footballField5')}</option>
                        <option value="7">{translate('footballField7')}</option>
                        <option value="11">{translate('footballField11')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{translate('maxReserveLabel')}</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        {...register('maxReserve', { valueAsNumber: true })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder={translate('reservePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{translate('halvesLabel')}</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        {...register('footballHalvesCount', { valueAsNumber: true })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder={translate('halvesPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{translate('halfDurationLabel')}</label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        {...register('footballHalfDuration', { valueAsNumber: true })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder={translate('halfDurationPlaceholder')}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex w-full items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" {...register('footballAllowDraw')} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                        {translate('allowDrawLabel')}
                      </label>
                    </div>
                  </div>
                </section>
              )}

            </div>

            {/* ─── CỘT PHẢI (5 CỘT - STICKY): NỘI DUNG, THỂ THỨC, ELO, QUY MÔ, HIỂN THỊ, NÚT SUBMIT ─── */}
            <div className="space-y-5 lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6 self-start">
              
              {/* Card Phải 1: Nội dung thi đấu */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Layers className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {sport === 'football' ? translate('footballContentTitle') : translate('competitionContentTitle')}
                    </h3>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                    {translate('selectedFormatsCount', { count: selectedFormats.length })}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {formatConfigs
                    .filter((config) => (sport === 'football' ? config.key.startsWith('FOOTBALL_') : !config.key.startsWith('FOOTBALL_')))
                    .map((config) => {
                      const formatId = config.id;
                      const isSelected = selectedFormats.includes(formatId);
                      const activeBracketId = config.bracketType ?? bracketType;
                      const activeBracketOption = BRACKET_OPTIONS.find((item) => item.id === activeBracketId);
                      const bracketTitle = activeBracketOption
                        ? translate(activeBracketOption.labelKey)
                        : translate('bracketSingleLabel');
                      const participantTitle = config.maxParticipantsOverride && config.maxParticipants
                        ? translate('participantLimit', { count: config.maxParticipants })
                        : translate('participantScale', { count: maxTeams });

                      return (
                        <div
                          key={formatId}
                          className={`group flex items-center justify-between rounded-xl border p-3.5 md:p-4 transition ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/80 text-blue-800 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          <button
                            type="button"
                            data-testid={`format-option-${formatId}`}
                            onClick={() => toggleFormat(formatId)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold leading-none ${
                                isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected ? '✓' : ''}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <span className="block truncate text-xs md:text-sm font-bold text-slate-900">
                                {config.label}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                                <span className="inline-flex items-center rounded-md bg-white border border-slate-200 px-2 py-0.5 font-semibold text-slate-700 shadow-2xs">
                                  {bracketTitle}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-slate-100/80 px-1.5 py-0.5 font-medium text-slate-600">
                                  {participantTitle}
                                </span>
                                {config.eloEnabled ? (
                                  <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 font-bold text-amber-700">
                                    ELO {config.minElo ?? 0}–{config.maxElo ?? '∞'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">{translate('eloDisabled')}</span>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="ml-2 flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openFormatModal(formatId)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 opacity-0 transition group-hover:opacity-100 hover:border-blue-300 hover:text-blue-700 cursor-pointer shadow-2xs"
                              aria-label={translate('editFormatAria', { label: config.label })}
                            >
                              <Settings2 className="h-3.5 w-3.5" /> {translate('editFormat')}
                            </button>
                            {config.isCustom && (
                              <button
                                type="button"
                                onClick={() => removeFormat(formatId)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shadow-2xs"
                                title={translate('removeFormatTitle')}
                                aria-label={translate('removeFormatAria', { label: config.label })}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <button
                  type="button"
                  onClick={() => openFormatModal()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-white px-3 py-2.5 text-xs font-bold text-blue-700 transition hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> {translate('addFormat')}
                </button>
                {errors.selectedFormats && (
                  <span className="block text-xs text-rose-600 font-medium">{errors.selectedFormats.message}</span>
                )}
              </section>

              {/* Card Phải 2: Thể thức thi đấu */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{translate('bracketTitle')}</h3>
                  </div>
                  <span className="text-xs text-slate-400">{translate('chooseOne')}</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {BRACKET_OPTIONS.map((opt) => {
                    const isSelected = bracketType === opt.id;
                    const { Icon } = opt;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setValue('bracketType', opt.id, { shouldValidate: true })}
                        className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 shadow-2xs ring-1 ring-blue-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                              : 'border-slate-200 bg-slate-50 text-slate-600 group-hover:text-blue-600'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
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
                {errors.bracketType && <span className="block text-xs text-rose-600">{errors.bracketType.message}</span>}
              </section>

              {/* Card Phải 3: Quy mô, ELO, Hiển thị & Chế độ đăng ký */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                
                {/* 1. Quy mô số đội */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      {translate('tournamentScaleLabel')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {bracketType === 'round_robin' ? translate('roundRobinScaleLimit') : translate('generalScaleLimit')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(bracketType === 'round_robin' ? [4, 6, 8, 10, 12, 15] : [4, 8, 16, 32, 64, 128]).map((num) => {
                      const isCurrent = maxTeams === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setValue('maxTeams', num, { shouldValidate: true })}
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
                      <span className="text-[11px] text-slate-500">{translate('otherOption')}</span>
                      <input
                        type="number"
                        min={2}
                        max={bracketType === 'round_robin' ? 15 : 128}
                        {...register('maxTeams', { valueAsNumber: true })}
                        className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {errors.maxTeams && <span className="mt-1 block text-xs text-rose-600 font-medium">{errors.maxTeams.message}</span>}

                  {/* Smart suggestion when Round Robin > 15 */}
                  {bracketType === 'round_robin' && maxTeams > 15 && (
                    <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="leading-relaxed">
                          <strong className="font-bold text-amber-950">{translate('smartSuggestionLabel')}</strong> {translate('roundRobinSuggestion', { maxTeams })}
                        </p>
                        <button
                          type="button"
                          onClick={() => setValue('bracketType', 'group_stage_knockout', { shouldValidate: true })}
                          className="shrink-0 rounded-lg bg-amber-200 hover:bg-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-950 transition"
                        >
                          {translate('switchToGroupStage')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* 2. Hiển thị giải đấu */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                    {translate('visibilityTitle')}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setValue('visibility', 'PUBLIC')}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        visibility === 'PUBLIC'
                          ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-200'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                        <span className={`h-3 w-3 rounded-full border-2 ${visibility === 'PUBLIC' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                        {translate('publicVisibility')}
                      </div>
                      <span className="mt-1 block text-[10.5px] text-slate-500 leading-tight">{translate('publicVisibilityDescription')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('visibility', 'PRIVATE')}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        visibility === 'PRIVATE'
                          ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-200'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                        <span className={`h-3 w-3 rounded-full border-2 ${visibility === 'PRIVATE' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                        {translate('privateVisibility')}
                      </div>
                      <span className="mt-1 block text-[10.5px] text-slate-500 leading-tight">{translate('privateVisibilityDescription')}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Chế độ nhận đăng ký (Chỉ hiện khi tạo trong CLB) */}
                {communityId && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                        {translate('registrationModeTitle')}
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { val: 'OPEN', labelKey: 'registrationOpen', subKey: 'registrationOpenShort' },
                          { val: 'APPROVAL', labelKey: 'registrationApproval', subKey: 'registrationApprovalShort' },
                          { val: 'INVITE_ONLY', labelKey: 'registrationInviteOnly', subKey: 'registrationInviteOnlyShort' },
                        ].map((item) => {
                          const isSelected = registrationMode === item.val;
                          return (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => setValue('registrationMode', item.val as QuickValues['registrationMode'])}
                              className={`rounded-xl border p-2 text-center transition ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50/80 font-bold text-blue-700 ring-1 ring-blue-200'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div className="text-xs font-bold">{translate(item.labelKey)}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{translate(item.subKey)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* Card Phải 4: Action Buttons (Sticky Submit) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <button
                  type="submit"
                  data-testid="submit-quick-create-btn"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60 transition active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {translate('creatingTournament')}
                    </>
                  ) : (
                    <>
                      {translate('createTournamentNow')}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-400">
                  {translate('submitHint')}
                </p>
              </div>

            </div>

          </div>
        </form>
      </div>
      {isFormatModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={translate('formatDialogAria')}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsFormatModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingFormatId ? translate('editFormatTitle') : translate('addFormatTitle')}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{translate('formatModalSubtitle')}</p>
              </div>
              <button type="button" onClick={() => setIsFormatModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label={translate('close')}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              {/* 1. Chọn loại */}
              <label className="block text-xs font-semibold text-slate-700">
                {translate('formatTypeLabel')}
                <select
                  value={formatDraft.key}
                  onChange={(event) => {
                    const option = QUICK_FORMAT_OPTIONS.find((item) => item.key === event.target.value);
                    if (option) {
                      setFormatDraft((current) => ({
                        ...current,
                        key: option.key,
                        label: translate(option.labelKey),
                      }));
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                >
                  {QUICK_FORMAT_OPTIONS
                    .filter((option) => (sport === 'football' ? option.key.startsWith('FOOTBALL_') : !option.key.startsWith('FOOTBALL_')))
                    .map((option) => (
                      <option key={option.key} value={option.key}>
                        {translate(option.labelKey)}
                      </option>
                    ))}
                </select>
              </label>

              {/* 2. Tên nội dung riêng */}
              <label className="block text-xs font-semibold text-slate-700">
                {translate('customFormatNameLabel')}
                <input
                  value={formatDraft.label}
                  onChange={(event) => setFormatDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder={translate('customFormatNamePlaceholder')}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                />
                <span className="mt-1 block text-[10.5px] font-normal text-slate-500">{translate('customFormatNameHint')}</span>
              </label>

              {/* 3. Tùy chọn nâng cao (Thu gọn mặc định) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-blue-600" />
                    {translate('advancedOptions')}
                  </span>
                  <span className="text-[11px] font-semibold text-blue-600">
                    {showAdvancedOptions ? translate('collapse') : translate('expand')}
                  </span>
                </button>

                {showAdvancedOptions && (
                  <div className="mt-3 space-y-3.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    {/* 3.1 Thể thức bảng đấu riêng */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        {translate('customBracketLabel')}
                        <select
                          value={formatDraft.bracketType ?? ''}
                          onChange={(event) => setFormatDraft((current) => ({
                            ...current,
                            bracketType: event.target.value ? (event.target.value as QuickValues['bracketType']) : undefined,
                          }))}
                          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                        >
                          <option value="">{translate('inheritBracket', { bracket: getBracketLabel(bracketType) })}</option>
                          {BRACKET_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{translate(option.labelKey)}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* 3.2 Quy mô số người/đội tham gia riêng */}
                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(formatDraft.maxParticipantsOverride)}
                          onChange={(event) => setFormatDraft((current) => ({
                            ...current,
                            maxParticipantsOverride: event.target.checked,
                            maxParticipants: event.target.checked ? (current.maxParticipants || maxTeams) : null,
                          }))}
                          className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                        />
                        {translate('overrideParticipants')}
                      </label>

                      {formatDraft.maxParticipantsOverride ? (
                        <div className="pt-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={2}
                              max={128}
                              value={formatDraft.maxParticipants ?? maxTeams}
                              onChange={(event) => setFormatDraft((current) => ({
                                ...current,
                                maxParticipants: event.target.value === '' ? null : Math.min(128, Math.max(2, Number(event.target.value))),
                              }))}
                              className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900"
                            />
                            <span className="text-xs text-slate-500 font-medium">{translate('participantLimitUnit')}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          {translate('inheritedParticipantLimit', { count: maxTeams })}
                        </p>
                      )}
                    </div>

                    {/* 3.3 Giới hạn ELO */}
                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formatDraft.eloEnabled}
                          onChange={(event) => setFormatDraft((current) => ({
                            ...current,
                            eloEnabled: event.target.checked,
                          }))}
                          className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                        />
                        {translate('limitElo')}
                      </label>

                      {formatDraft.eloEnabled && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <label className="text-xs font-semibold text-slate-600">
                            {translate('minElo')}
                            <input
                              type="number"
                              min={0}
                              value={formatDraft.minElo ?? ''}
                              onChange={(event) => setFormatDraft((current) => ({
                                ...current,
                                minElo: event.target.value === '' ? null : Number(event.target.value),
                              }))}
                              placeholder="0"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                            />
                          </label>
                          <label className="text-xs font-semibold text-slate-600">
                            {translate('maxElo')}
                            <input
                              type="number"
                              min={0}
                              value={formatDraft.maxElo ?? ''}
                              onChange={(event) => setFormatDraft((current) => ({
                                ...current,
                                maxElo: event.target.value === '' ? null : Number(event.target.value),
                              }))}
                              placeholder={translate('unlimited')}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => setIsFormatModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{translate('cancel')}</button><button type="button" onClick={saveFormatConfig} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">{editingFormatId ? translate('saveChanges') : <><Plus className="h-3.5 w-3.5" /> {translate('addFormat')}</>}</button></div>
          </div>
        </div>
      )}
      {isDescriptionEditorOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={translate('descriptionDialogAria')}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsDescriptionEditorOpen(false);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">{translate('descriptionEditorTitle')}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{translate('descriptionEditorSubtitle')}</p>
              </div>
              <button type="button" onClick={() => setIsDescriptionEditorOpen(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={translate('close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-5">
              <RichTextEditor
                value={description}
                onChange={(value) => setValue('description', value, { shouldDirty: true, shouldValidate: true })}
                placeholder={translate('descriptionEditorPlaceholder')}
              />
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button type="button" onClick={() => setIsDescriptionEditorOpen(false)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700">
                {translate('saveDescription')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart AI & Excel Modal */}
      <SmartAiTournamentModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSuccess={(tournamentId) => {
          router.push(`/organizer/tournaments/${tournamentId}/manage`);
        }}
      />
    </main>
  );
}
