'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Flame,
} from 'lucide-react';
import { categoriesApi, Category } from '@/features/categories/api';
import { divisionsApi, tournamentsApi, type CreateDivisionInput } from '@/features/tournaments/api';
import { regionsApi, Region } from '@/features/regions/api';
import { getErrorMessage } from '@/utils/error';
import { GenderRestriction, MatchTypeDB } from '@/types/tournament';

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
    label: 'Loại trực tiếp',
    desc: 'Nhánh đấu 1 lần thua. Nhanh gọn & gay cấn.',
    Icon: SingleEliminationIcon,
  },
  {
    id: 'round_robin',
    label: 'Vòng tròn',
    desc: 'Mọi đội đều được thi đấu tính điểm xếp hạng.',
    Icon: RoundRobinIcon,
  },
  {
    id: 'group_stage_knockout',
    label: 'Vòng bảng + Knockout',
    desc: 'Đấu vòng bảng lấy đội đầu bảng vào Play-off.',
    Icon: GroupStageKnockoutIcon,
  },
  {
    id: 'double_elimination',
    label: 'Nhánh thắng / thua',
    desc: 'Hệ thống 2 nhánh đấu có cơ hội phục thù.',
    Icon: DoubleEliminationIcon,
  },
] as const;

const quickSchema = z.object({
  name: z.string().trim().min(2, 'Nhập tên giải đấu.'),
  sport: z.enum(['badminton', 'tennis', 'pickleball', 'table_tennis', 'football']),
  format: z.enum(['singles', 'doubles']),
  tournamentType: z.enum(['CLUB', 'PUBLIC']),
  visibility: z.enum(['PRIVATE', 'PUBLIC']),
  registrationMode: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']),
  bracketType: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'group_stage_knockout']),
  maxTeams: z.number().int().min(2).max(32),
  registrationStart: z.string().optional(),
  registrationEnd: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  venueName: z.string().trim().optional(),
  locationAddress: z.string().trim().optional(),
  province: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  district: z.string().trim().optional(),
  genderRestriction: z.enum(['', 'MALE', 'FEMALE', 'MIXED']),
  selectedFormats: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất 1 nội dung thi đấu.'),
  teamSize: z.enum(['5', '7', '11']),
  maxReserve: z.number().int().min(0).max(20),
  footballHalvesCount: z.number().int().min(1).max(4),
  footballHalfDuration: z.number().int().min(1).max(120),
  footballAllowDraw: z.boolean(),
  description: z.string().trim().max(1000).optional(),
  isRanked: z.boolean(),
});

type QuickValues = z.infer<typeof quickSchema>;
type QuickSport = QuickValues['sport'];

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
  bracketType: QuickValues['bracketType'],
  maxParticipants: number,
  startDate?: string,
  endDate?: string,
  registrationEndDate?: string,
): CreateDivisionInput => {
  const definitions: Record<string, { name: string; matchType: MatchTypeDB; genderRestriction?: GenderRestriction }> = {
    MALE_SINGLES: { name: 'Đơn Nam', matchType: MatchTypeDB.SINGLES, genderRestriction: GenderRestriction.MALE },
    FEMALE_SINGLES: { name: 'Đơn Nữ', matchType: MatchTypeDB.SINGLES, genderRestriction: GenderRestriction.FEMALE },
    MALE_DOUBLES: { name: 'Đôi Nam', matchType: MatchTypeDB.DOUBLES, genderRestriction: GenderRestriction.MALE },
    FEMALE_DOUBLES: { name: 'Đôi Nữ', matchType: MatchTypeDB.DOUBLES, genderRestriction: GenderRestriction.FEMALE },
    MIXED_DOUBLES: { name: 'Đôi Nam Nữ', matchType: MatchTypeDB.MIXED_DOUBLES, genderRestriction: GenderRestriction.MIXED },
    FOOTBALL_MALE: { name: 'Đội Nam', matchType: MatchTypeDB.DOUBLES, genderRestriction: GenderRestriction.MALE },
    FOOTBALL_FEMALE: { name: 'Đội Nữ', matchType: MatchTypeDB.DOUBLES, genderRestriction: GenderRestriction.FEMALE },
    FOOTBALL_MIXED: { name: 'Không giới hạn', matchType: MatchTypeDB.DOUBLES },
  };
  const definition = definitions[formatKey] ?? definitions.MALE_DOUBLES;
  return {
    name: definition.name,
    matchType: definition.matchType,
    genderRestriction: definition.genderRestriction,
    maxParticipants,
    entryFee: 0,
    bracketType: bracketType.toUpperCase() as CreateDivisionInput['bracketType'],
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    registrationEndDate: registrationEndDate ?? null,
  };
};

const quickDefaults = () => {
  const regStart = new Date(Date.now() + 3 * 60 * 60 * 1000);
  regStart.setSeconds(0, 0);

  return {
    registrationStart: formatDateTimeInput(regStart),
    registrationEnd: '',
    startDate: '',
    endDate: '',
  };
};

interface CustomDateTimePickerProps {
  label: React.ReactNode;
  value?: string;
  onChange: (val: string) => void;
  error?: string;
  isPrimary?: boolean;
}

function CustomDateTimePicker({
  label,
  value,
  onChange,
  error,
  isPrimary = false,
}: CustomDateTimePickerProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  const triggerPicker = () => {
    if (hiddenRef.current) {
      try {
        hiddenRef.current.showPicker();
      } catch {
        hiddenRef.current.focus();
      }
    }
  };

  const displayText = formatDateTimeDisplay(value);

  return (
    <fieldset
      onClick={triggerPicker}
      className={`relative cursor-pointer rounded-xl border p-3.5 shadow-2xs transition ${
        isPrimary
          ? 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <legend className={`px-1.5 text-xs font-semibold ${isPrimary ? 'text-blue-900' : 'text-slate-700'}`}>
        {label}
      </legend>
      <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <span className={`font-medium ${displayText ? 'text-slate-800' : 'font-normal text-slate-400'}`}>
          {displayText || 'dd/mm/yyyy --:--'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-slate-400"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        <input
          ref={hiddenRef}
          type="datetime-local"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </fieldset>
  );
}

export default function QuickTournamentCreate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = searchParams.get('communityId') || undefined;
  const scheduleDefaults = useMemo(() => quickDefaults(), []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<QuickValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      sport: 'badminton', format: 'doubles',
      tournamentType: communityId ? 'CLUB' : 'PUBLIC',
      visibility: communityId ? 'PRIVATE' : 'PUBLIC',
      registrationMode: communityId ? 'OPEN' : 'APPROVAL',
      bracketType: 'single_elimination',
      maxTeams: 16, ...scheduleDefaults,
      selectedFormats: ['MALE_DOUBLES'],
      venueName: '', locationAddress: '', province: '', ward: '', district: '',
      isRanked: false, description: '', genderRestriction: 'MALE', teamSize: '7', maxReserve: 5,
      footballHalvesCount: 2, footballHalfDuration: 45, footballAllowDraw: true,
    },
  });

  const sport = useWatch({ control, name: 'sport' });
  const format = useWatch({ control, name: 'format' });
  const selectedFormats = useWatch({ control, name: 'selectedFormats' }) || ['MALE_DOUBLES'];
  const bracketType = useWatch({ control, name: 'bracketType' });
  const maxTeams = useWatch({ control, name: 'maxTeams' });
  const genderRestriction = useWatch({ control, name: 'genderRestriction' });
  const visibility = useWatch({ control, name: 'visibility' });
  const registrationMode = useWatch({ control, name: 'registrationMode' });
  const isRanked = useWatch({ control, name: 'isRanked' });
  const province = useWatch({ control, name: 'province' });
  const registrationStart = useWatch({ control, name: 'registrationStart' });
  const registrationEnd = useWatch({ control, name: 'registrationEnd' });
  const startDate = useWatch({ control, name: 'startDate' });
  const endDate = useWatch({ control, name: 'endDate' });

  const [provinces, setProvinces] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const selectedCategory = useMemo(() => categories.find((category) => sportFromCategory(category) === sport), [categories, sport]);

  const handleRegistrationStartChange = (val: string) => {
    setValue('registrationStart', val, { shouldValidate: true });
  };

  const handleRegistrationEndChange = (val: string) => {
    setValue('registrationEnd', val, { shouldValidate: true });
  };

  useEffect(() => {
    let active = true;
    categoriesApi.getCategories().then((response) => {
      if (active) setCategories((response.data ?? []).filter((category) => category.isActive !== false));
    }).catch(() => toast.error('Không thể tải danh sách môn thể thao.')).finally(() => {
      if (active) setLoadingCategories(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    regionsApi.getProvinces().then((response) => {
      if (active) setProvinces(response ?? []);
    }).catch(() => { if (active) toast.error('Không thể tải danh sách tỉnh/thành.'); });
    return () => { active = false; };
  }, []);

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

  const toggleFormat = (formatKey: string) => {
    const current = selectedFormats || [];
    if (current.includes(formatKey)) {
      if (current.length > 1) {
        const next = current.filter((item) => item !== formatKey);
        setValue('selectedFormats', next, { shouldValidate: true });
        syncLegacyFormat(next[0]);
      } else {
        toast('Cần ít nhất 1 nội dung thi đấu.', { icon: 'ℹ️' });
      }
    } else {
      const next = [...current, formatKey];
      setValue('selectedFormats', next, { shouldValidate: true });
      syncLegacyFormat(next[0]);
    }
  };

  useEffect(() => {
    if (sport === 'football') {
      const hasFootball = selectedFormats.some((f) => f.startsWith('FOOTBALL_'));
      if (!hasFootball) {
        setValue('selectedFormats', ['FOOTBALL_MALE'], { shouldValidate: true });
        syncLegacyFormat('FOOTBALL_MALE');
      }
    } else {
      const hasRacket = selectedFormats.some((f) => f.includes('SINGLES') || f.includes('DOUBLES'));
      if (!hasRacket) {
        setValue('selectedFormats', ['MALE_DOUBLES'], { shouldValidate: true });
        syncLegacyFormat('MALE_DOUBLES');
      }
    }
  }, [sport]);

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
        toast.error('Không thể tải danh sách phường/xã.'); 
      }
    });

    return () => {
      active = false;
    };
  }, [province, provinces]);

  const onSubmit = async (values: QuickValues) => {
    try {
      setIsSubmitting(true);
      const { registrationStart, registrationEnd, startDate, endDate } = values;

      const regStartDate = registrationStart ? new Date(registrationStart) : undefined;
      const regEndDate = registrationEnd ? new Date(registrationEnd) : undefined;
      const startDateTime = startDate ? new Date(startDate) : undefined;
      const endDateTime = endDate ? new Date(endDate) : undefined;

      if (regStartDate && regEndDate && regStartDate >= regEndDate) {
        toast.error('Thời gian mở đăng ký phải trước thời gian đóng.');
        return;
      }
      if (regEndDate && startDateTime && regEndDate >= startDateTime) {
        toast.error('Thời gian đóng đăng ký phải trước giờ bắt đầu giải.');
        return;
      }
      if (endDateTime && startDateTime && startDateTime >= endDateTime) {
        toast.error('Thời gian kết thúc phải sau thời gian bắt đầu.');
        return;
      }

      const provinceName = provinces.find((item) => item.code === values.province)?.fullName ?? values.province;
      const wardName = wards.find((item) => item.code === values.ward)?.fullName ?? values.ward;

      const createPayload: Parameters<typeof tournamentsApi.createLiteTournament>[0] = {
        name: values.name.trim(),
        sport: values.sport,
        format: values.format,
        bracketType: values.bracketType,
        maxTeams: values.maxTeams,
        visibility: values.visibility,
        registrationMode: values.registrationMode,
        isRanked: values.isRanked,
        communityId,
        tournamentType: communityId ? 'CLUB' : 'PUBLIC',
        genderRestriction: values.genderRestriction || undefined,
        registrationStartDate: values.registrationStart ? new Date(values.registrationStart).toISOString() : undefined,
        registrationEndDate: values.registrationEnd ? new Date(values.registrationEnd).toISOString() : undefined,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
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

      try {
        const divisionInputs = values.selectedFormats.map((formatKey) =>
          toDivisionInput(
            formatKey,
            values.bracketType,
            values.maxTeams,
            values.startDate ? new Date(values.startDate).toISOString() : undefined,
            values.endDate ? new Date(values.endDate).toISOString() : undefined,
            values.registrationEnd ? new Date(values.registrationEnd).toISOString() : undefined,
          )
        );
        await Promise.all(
          divisionInputs.map((divInput) => divisionsApi.createDivision(response.id, divInput))
        );
      } catch (divisionError: unknown) {
        await tournamentsApi.deleteTournament(response.id).catch(() => undefined);
        throw divisionError;
      }

      toast.success(values.visibility === 'PUBLIC' ? 'Đã tạo, đang chờ Admin duyệt công khai.' : 'Tạo giải đấu thành công.');
      router.push(`/organizer/tournaments/${response.id}/manage`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tạo giải đấu.'));
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
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Tạo giải đấu nhanh</h1>
            </div>
            <p className="mt-1.5 text-xs md:text-sm text-slate-500">
              Khởi tạo giải đấu nhanh gọn trong 1 phút. Bạn có thể bổ sung luật chi tiết và phân nhánh bên trong trang quản lý bất cứ lúc nào.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/organizer/tournaments/create?mode=advanced${communityId ? `&communityId=${communityId}` : ''}`)}
            className="inline-flex shrink-0 items-center gap-2 self-start md:self-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition"
          >
            <Settings2 className="h-4 w-4 text-slate-500" /> Tạo bản nâng cao (4 bước)
          </button>
        </div>

        {/* Notice Banner */}
        <div className="mb-8 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-amber-50/40 p-4 text-amber-950 shadow-2xs">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs md:text-sm leading-relaxed">
              <strong className="font-bold text-amber-900">Lưu ý quan trọng:</strong> Giải phong trào được tạo tức thì và hoàn toàn miễn phí. Sau khi tạo xong, bạn có thể chỉnh sửa mọi thông tin (lịch thi đấu, thể thức, điều lệ, danh sách VĐV) trước khi bấm Bắt đầu giải.
            </div>
          </div>
        </div>

        {/* Form Container with 2-Column Responsive Layout */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            
            {/* ─── CỘT TRÁI (7 CỘT): THÔNG TIN CƠ BẢN, LỊCH TRÌNH, ĐỊA ĐIỂM, MÔ TẢ ─── */}
            <div className="space-y-6 lg:col-span-7 xl:col-span-7">
              
              {/* Card 1: Thông tin cơ bản */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Thông tin giải đấu</h2>
                </div>

                {/* Tên giải đấu */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tên giải đấu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ví dụ: Giải Cầu Lông Mùa Hè 2026 / Giao Hữu Sporto"
                  />
                  {errors.name && <span className="mt-1 block text-xs text-rose-600 font-medium">{errors.name.message}</span>}
                </div>

                {/* Môn thể thao */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Môn thể thao <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('sport')}
                    disabled={loadingCategories}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {categories.map((category) => {
                      const value = sportFromCategory(category);
                      return value ? <option key={category.id} value={value}>{category.name}</option> : null;
                    })}
                  </select>
                  <span className="mt-1.5 block text-xs text-slate-500">
                    {selectedCategory ? `Áp dụng bộ luật mặc định: ${selectedCategory.name}` : 'Chọn môn để nạp luật thi đấu.'}
                  </span>
                </div>

                {/* Mô tả giải đấu */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Mô tả giải đấu (tùy chọn)
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Giới thiệu sơ lược về giải đấu, đối tượng tham gia, thể lệ hoặc lưu ý cho vận động viên..."
                  />
                </div>
              </section>

              {/* Card 2: Lịch trình thời gian */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Lịch trình thi đấu</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <CustomDateTimePicker
                    label="Mở đăng ký (tùy chọn)"
                    value={registrationStart}
                    onChange={handleRegistrationStartChange}
                    error={errors.registrationStart?.message}
                  />

                  <CustomDateTimePicker
                    label="Đóng đăng ký (tùy chọn)"
                    value={registrationEnd}
                    onChange={handleRegistrationEndChange}
                    error={errors.registrationEnd?.message}
                  />

                  <CustomDateTimePicker
                    label="Bắt đầu giải (tùy chọn)"
                    value={startDate}
                    onChange={(val) => setValue('startDate', val, { shouldValidate: true })}
                    error={errors.startDate?.message}
                    isPrimary
                  />

                  <CustomDateTimePicker
                    label="Kết thúc dự kiến (tùy chọn)"
                    value={endDate}
                    onChange={(val) => setValue('endDate', val, { shouldValidate: true })}
                    error={errors.endDate?.message}
                  />
                </div>
              </section>

              {/* Card 3: Địa điểm & Sân thi đấu */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Địa điểm & Sân thi đấu</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Tên sân / Nhà thi đấu
                    </label>
                    <input
                      {...register('venueName')}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ví dụ: Sân Cầu Lông Kỳ Hòa"
                    />
                    {errors.venueName && <span className="mt-1 block text-xs text-rose-600">{errors.venueName.message}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Địa chỉ chi tiết
                    </label>
                    <input
                      {...register('locationAddress')}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Số nhà, tên đường..."
                    />
                    {errors.locationAddress && <span className="mt-1 block text-xs text-rose-600">{errors.locationAddress.message}</span>}
                  </div>
                </div>

                {/* Dropdowns Tỉnh/Thành ➔ Phường/Xã */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Khu vực hành chính
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <select
                        {...register('province', {
                          onChange: () => {
                            setWards([]);
                            setValue('ward', '');
                          },
                        })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                      >
                        <option value="">-- Chọn Tỉnh / Thành phố --</option>
                        {provinces.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.fullName || item.name}
                          </option>
                        ))}
                      </select>
                      {errors.province && <span className="mt-1 block text-xs text-rose-600">{errors.province.message}</span>}
                    </div>
                    <div>
                      <select
                        {...register('ward')}
                        disabled={!province || wards.length === 0}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">
                          {!province ? '-- Chọn Tỉnh/Thành trước --' : wards.length === 0 ? '-- Đang tải danh sách... --' : '-- Chọn Phường / Xã --'}
                        </option>
                        {wards.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.fullName || item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Card 4: Thiết lập chuyên biệt bóng đá (nếu là môn bóng đá) */}
              {sport === 'football' && (
                <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 md:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <Flame className="h-4 w-4" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">Thiết lập luật bóng đá</h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng cầu thủ</label>
                      <select {...register('teamSize')} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="5">Sân 5 người</option>
                        <option value="7">Sân 7 người</option>
                        <option value="11">Sân 11 người</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Dự bị tối đa</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        {...register('maxReserve', { valueAsNumber: true })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder="Số dự bị"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Số hiệp thi đấu</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        {...register('footballHalvesCount', { valueAsNumber: true })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder="2 hiệp"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Thời lượng mỗi hiệp (phút)</label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        {...register('footballHalfDuration', { valueAsNumber: true })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder="45 phút"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex w-full items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" {...register('footballAllowDraw')} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                        Cho phép tỷ số hòa
                      </label>
                    </div>
                  </div>
                </section>
              )}

            </div>

            {/* ─── CỘT PHẢI (5 CỘT - STICKY): NỘI DUNG, THỂ THỨC, ELO, QUY MÔ, HIỂN THỊ, NÚT SUBMIT ─── */}
            <div className="space-y-5 lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6 self-start">
              
              {/* Card Phải 1: Nội dung thi đấu */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Layers className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {sport === 'football' ? 'Nội dung bóng đá' : 'Nội dung thi đấu'}
                    </h3>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                    {selectedFormats.length} đã chọn
                  </span>
                </div>

                {sport === 'football' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'FOOTBALL_MALE', label: 'Đội nam' },
                      { key: 'FOOTBALL_FEMALE', label: 'Đội nữ' },
                      { key: 'FOOTBALL_MIXED', label: 'Không giới hạn' },
                    ].map((fmt) => {
                      const isSelected = selectedFormats.includes(fmt.key);
                      return (
                        <button
                          key={fmt.key}
                          type="button"
                          onClick={() => toggleFormat(fmt.key)}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/80 text-blue-700 ring-1 ring-blue-500/20 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{fmt.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'MALE_SINGLES', label: 'Đơn nam' },
                      { key: 'FEMALE_SINGLES', label: 'Đơn nữ' },
                      { key: 'MALE_DOUBLES', label: 'Đôi nam' },
                      { key: 'FEMALE_DOUBLES', label: 'Đôi nữ' },
                      { key: 'MIXED_DOUBLES', label: 'Đôi nam nữ', span2: true },
                    ].map((fmt) => {
                      const isSelected = selectedFormats.includes(fmt.key);
                      return (
                        <button
                          key={fmt.key}
                          type="button"
                          onClick={() => toggleFormat(fmt.key)}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                            fmt.span2 ? 'col-span-2' : ''
                          } ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/80 text-blue-700 ring-1 ring-blue-500/20 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{fmt.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
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
                    <h3 className="text-sm font-bold text-slate-900">Thể thức bảng đấu</h3>
                  </div>
                  <span className="text-xs text-slate-400">Chọn 1</span>
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
                              {opt.label}
                            </span>
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                            )}
                          </div>
                          <p className={`mt-0.5 text-[11px] leading-snug transition ${isSelected ? 'text-blue-900/80' : 'text-slate-500'}`}>
                            {opt.desc}
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
                      Quy mô giải đấu (Số đội/người)
                    </span>
                    <span className="text-xs text-slate-400">Tối đa 32</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[4, 8, 16, 32].map((num) => {
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
                      <span className="text-[11px] text-slate-500">Khác:</span>
                      <input
                        type="number"
                        min={2}
                        max={32}
                        {...register('maxTeams', { valueAsNumber: true })}
                        className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {errors.maxTeams && <span className="mt-1 block text-xs text-rose-600">{errors.maxTeams.message}</span>}
                </div>

                <div className="h-px bg-slate-100" />

                {/* 2. Hiển thị giải đấu */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                    Hiển thị giải đấu
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
                        Công khai
                      </div>
                      <span className="mt-1 block text-[10.5px] text-slate-500 leading-tight">Xuất hiện trên bảng Khám phá</span>
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
                        Không niêm yết
                      </div>
                      <span className="mt-1 block text-[10.5px] text-slate-500 leading-tight">Chỉ truy cập bằng liên kết/mã</span>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* 3. Chế độ nhận đăng ký — Public Quick mặc định xét duyệt; CLB Quick vẫn cho chọn */}
                {communityId ? <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    Chế độ tiếp nhận đăng ký
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { val: 'OPEN', label: 'Tự do', sub: 'Vào ngay' },
                      { val: 'APPROVAL', label: 'Xét duyệt', sub: 'BTC duyệt' },
                      { val: 'INVITE_ONLY', label: 'Mã mời', sub: 'Cần mã' },
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
                          <div className="text-xs font-bold">{item.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div> : (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                    <span className="font-bold">Đăng ký: Xét duyệt</span>
                    <p className="mt-1 text-blue-800/80">Đăng ký sẽ chờ BTC duyệt. Có thể thay đổi trong trang quản lý sau khi tạo.</p>
                  </div>
                )}
              </section>

              {/* Card Phải 4: Action Buttons (Sticky Submit) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60 transition active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang khởi tạo giải...
                    </>
                  ) : (
                    <>
                      Tạo giải đấu ngay
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-400">
                  Nhấn Tạo giải để khởi tạo và chuyển tới trang quản lý bảng đấu
                </p>
              </div>

            </div>

          </div>
        </form>
      </div>
    </main>
  );
}
