'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRight, Settings2, MapPin } from 'lucide-react';
import { categoriesApi, Category } from '@/features/categories/api';
import { tournamentsApi } from '@/features/tournaments/api';
import { regionsApi, Region } from '@/features/regions/api';
import { getErrorMessage } from '@/utils/error';

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
    desc: 'Nhánh đấu loại trực tiếp 1 lần thua. Nhanh gọn & gay cấn.',
    Icon: SingleEliminationIcon,
  },
  {
    id: 'round_robin',
    label: 'Vòng tròn',
    desc: 'Mọi đội đều được thi đấu đối đầu tính điểm xếp hạng.',
    Icon: RoundRobinIcon,
  },
  {
    id: 'group_stage_knockout',
    label: 'Vòng bảng + Knockout',
    desc: 'Đấu vòng bảng lấy các đội đầu bảng vào vòng loại trực tiếp.',
    Icon: GroupStageKnockoutIcon,
  },
  {
    id: 'double_elimination',
    label: 'Nhánh thắng / thua',
    desc: 'Hệ thống 2 nhánh đấu, có cơ hội phục thù từ nhánh thua.',
    Icon: DoubleEliminationIcon,
  },
] as const;

const quickSchema = z.object({
  name: z.string().trim().min(2, 'Nhập tên giải đấu.'),
  sport: z.enum(['badminton', 'tennis', 'pickleball', 'table_tennis', 'football']),
  format: z.enum(['singles', 'doubles']),
  visibility: z.enum(['PRIVATE', 'PUBLIC']),
  bracketType: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'group_stage_knockout']),
  maxTeams: z.number().int().min(2).max(32),
  registrationStart: z.string().min(1, 'Chọn thời gian mở đăng ký.'),
  registrationEnd: z.string().min(1, 'Chọn thời gian đóng đăng ký.'),
  startDate: z.string().min(1, 'Chọn thời gian bắt đầu giải.'),
  endDate: z.string().optional(),
  venueName: z.string().trim().min(1, 'Vui lòng nhập tên sân / nhà thi đấu.'),
  locationAddress: z.string().trim().min(1, 'Vui lòng nhập địa chỉ sân.'),
  province: z.string().trim().min(1, 'Vui lòng chọn Tỉnh/Thành.'),
  district: z.string().trim().min(1, 'Vui lòng chọn Quận/Huyện.'),
  ward: z.string().trim().optional(),
  genderRestriction: z.enum(['', 'MALE', 'FEMALE', 'MIXED']),
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

const quickDefaults = () => {
  const regStart = new Date();
  regStart.setSeconds(0, 0);

  // Đóng đăng ký tự động = Mở đăng ký + 2 tiếng
  const regEnd = new Date(regStart.getTime() + 2 * 60 * 60 * 1000);

  // Bắt đầu giải tự động = Đóng đăng ký + 2 tiếng
  const start = new Date(regEnd.getTime() + 2 * 60 * 60 * 1000);

  return {
    registrationStart: formatDateTimeInput(regStart),
    registrationEnd: formatDateTimeInput(regEnd),
    startDate: formatDateTimeInput(start),
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
      <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
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
  const scheduleDefaults = useMemo(quickDefaults, []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<QuickValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      sport: 'badminton', format: 'doubles', visibility: 'PRIVATE', bracketType: 'single_elimination',
      maxTeams: 16, ...scheduleDefaults,
      venueName: '', locationAddress: '', province: '', district: '', ward: '',
      isRanked: false, description: '', genderRestriction: '', teamSize: '7', maxReserve: 5,
      footballHalvesCount: 2, footballHalfDuration: 45, footballAllowDraw: true,
    },
  });

  const sport = useWatch({ control, name: 'sport' });
  const format = useWatch({ control, name: 'format' });
  const bracketType = useWatch({ control, name: 'bracketType' });
  const maxTeams = useWatch({ control, name: 'maxTeams' });
  const genderRestriction = useWatch({ control, name: 'genderRestriction' });
  const visibility = useWatch({ control, name: 'visibility' });
  const isRanked = useWatch({ control, name: 'isRanked' });
  const province = useWatch({ control, name: 'province' });
  const district = useWatch({ control, name: 'district' });
  const registrationStart = useWatch({ control, name: 'registrationStart' });
  const registrationEnd = useWatch({ control, name: 'registrationEnd' });
  const startDate = useWatch({ control, name: 'startDate' });
  const endDate = useWatch({ control, name: 'endDate' });

  const [provinces, setProvinces] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const selectedCategory = useMemo(() => categories.find((category) => sportFromCategory(category) === sport), [categories, sport]);

  const handleRegistrationStartChange = (val: string) => {
    setValue('registrationStart', val, { shouldValidate: true });
    if (!val) return;
    const base = new Date(val);
    if (isNaN(base.getTime())) return;
    const newRegEnd = new Date(base.getTime() + 2 * 60 * 60 * 1000);
    const newStart = new Date(newRegEnd.getTime() + 2 * 60 * 60 * 1000);

    setValue('registrationEnd', formatDateTimeInput(newRegEnd), { shouldValidate: true });
    setValue('startDate', formatDateTimeInput(newStart), { shouldValidate: true });
  };

  const handleRegistrationEndChange = (val: string) => {
    setValue('registrationEnd', val, { shouldValidate: true });
    if (!val) return;
    const base = new Date(val);
    if (isNaN(base.getTime())) return;
    const newStart = new Date(base.getTime() + 2 * 60 * 60 * 1000);

    setValue('startDate', formatDateTimeInput(newStart), { shouldValidate: true });
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

  useEffect(() => {
    let active = true;
    setDistricts([]);
    setWards([]);
    setValue('district', '');
    setValue('ward', '');
    if (!province || !provinces.some((item) => item.code === province)) return () => { active = false; };
    regionsApi.getDistricts(province).then((response) => {
      if (active) setDistricts(response ?? []);
    }).catch(() => { if (active) toast.error('Không thể tải danh sách quận/huyện.'); });
    return () => { active = false; };
  }, [province, provinces, setValue]);

  useEffect(() => {
    let active = true;
    setWards([]);
    setValue('ward', '');
    if (!district || !districts.some((item) => item.code === district)) return () => { active = false; };
    regionsApi.getWards(district).then((response) => {
      if (active) setWards(response ?? []);
    }).catch(() => { if (active) toast.error('Không thể tải danh sách phường/xã.'); });
    return () => { active = false; };
  }, [district, districts, setValue]);

  const onSubmit = async (values: QuickValues) => {
    try {
      setIsSubmitting(true);
      const { genderRestriction, teamSize, registrationStart, registrationEnd, startDate, endDate, ...restValues } = values;

      const regStartDate = new Date(registrationStart);
      const regEndDate = new Date(registrationEnd);
      const startDateTime = new Date(startDate);
      const endDateTime = endDate ? new Date(endDate) : undefined;

      if (regStartDate >= regEndDate) {
        toast.error('Thời gian mở đăng ký phải trước thời gian đóng.');
        return;
      }
      if (regEndDate >= startDateTime) {
        toast.error('Thời gian đóng đăng ký phải trước giờ bắt đầu giải.');
        return;
      }
      if (endDateTime && startDateTime >= endDateTime) {
        toast.error('Thời gian kết thúc phải sau thời gian bắt đầu.');
        return;
      }

      const provinceName = provinces.find((item) => item.code === values.province)?.fullName ?? values.province;
      const districtName = districts.find((item) => item.code === values.district)?.fullName ?? values.district;
      const wardName = wards.find((item) => item.code === values.ward)?.fullName ?? values.ward;

      const response = await tournamentsApi.createLiteTournament({
        ...restValues,
        communityId,
        sport: values.sport,
        description: values.description || undefined,
        registrationStartDate: regStartDate.toISOString(),
        registrationEndDate: regEndDate.toISOString(),
        startDate: startDateTime.toISOString(),
        endDate: endDateTime ? endDateTime.toISOString() : undefined,
        venueName: values.venueName,
        locationAddress: values.locationAddress,
        province: provinceName,
        district: districtName,
        ward: wardName || undefined,
        genderRestriction: genderRestriction || undefined,
        ...(values.sport === 'football' ? {
          teamSize: (Number(teamSize) || 7) as 5 | 7 | 11,
          maxReserve: values.maxReserve,
          footballHalvesCount: values.footballHalvesCount,
          footballHalfDuration: values.footballHalfDuration,
          footballAllowDraw: values.footballAllowDraw,
        } : {}),
        registrationMode: values.visibility === 'PUBLIC' || communityId ? 'OPEN' : 'INVITE_ONLY',
        isRanked: values.isRanked,
      });

      toast.success(values.visibility === 'PUBLIC' ? 'Đã tạo, đang chờ Admin duyệt công khai.' : 'Tạo giải đấu thành công.');
      if (response?.id) router.push(`/lite/tournaments/${response.id}/manage`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tạo giải đấu.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tạo giải đấu</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Tạo nhanh để bắt đầu ngay, bạn có thể thiết lập đầy đủ chi tiết và luật thi đấu bên trong trang quản lý sau. Giải phong trào không thu phí, không tính điểm ELO quốc gia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/organizer/tournaments/create?mode=advanced${communityId ? `&communityId=${communityId}` : ''}`)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <Settings2 className="h-4 w-4" /> Nâng cao
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <label className="block text-sm font-semibold text-slate-700">
            Tên giải đấu <span className="text-red-500">*</span>
            <input
              {...register('name')}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ví dụ: Giải giao hữu cuối tuần"
            />
            {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>}
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Môn
              <select {...register('sport')} disabled={loadingCategories} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal">
                {categories.map((category) => {
                  const value = sportFromCategory(category);
                  return value ? <option key={category.id} value={value}>{category.name}</option> : null;
                })}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {selectedCategory ? `Luật mặc định: ${selectedCategory.name}` : 'Chọn môn để nạp preset linh hoạt.'}
              </span>
            </label>

            <div>
              <span className="text-sm font-semibold text-slate-700">
                {sport === 'football' ? 'Nội dung bóng đá' : 'Nội dung thi đấu'}
              </span>
              {sport === 'football' ? (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('genderRestriction', 'MALE')}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${genderRestriction === 'MALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-500'}`}
                  >
                    Đội nam
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('genderRestriction', 'FEMALE')}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${genderRestriction === 'FEMALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-500'}`}
                  >
                    Đội nữ
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('genderRestriction', '')}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${genderRestriction === '' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-500'}`}
                  >
                    Không giới hạn
                  </button>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setValue('format', 'singles'); setValue('genderRestriction', 'MALE'); }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${format === 'singles' && genderRestriction === 'MALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-500'}`}
                  >
                    Đơn nam
                  </button>
                  <button
                    type="button"
                    onClick={() => { setValue('format', 'singles'); setValue('genderRestriction', 'FEMALE'); }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${format === 'singles' && genderRestriction === 'FEMALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-500'}`}
                  >
                    Đơn nữ
                  </button>
                  <button
                    type="button"
                    onClick={() => { setValue('format', 'doubles'); setValue('genderRestriction', 'MALE'); }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${format === 'doubles' && genderRestriction === 'MALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-500'}`}
                  >
                    Đôi nam
                  </button>
                  <button
                    type="button"
                    onClick={() => { setValue('format', 'doubles'); setValue('genderRestriction', 'FEMALE'); }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${format === 'doubles' && genderRestriction === 'FEMALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-500'}`}
                  >
                    Đôi nữ
                  </button>
                  <button
                    type="button"
                    onClick={() => { setValue('format', 'doubles'); setValue('genderRestriction', 'MIXED'); }}
                    className={`col-span-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${format === 'doubles' && genderRestriction === 'MIXED' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-500'}`}
                  >
                    Đôi nam nữ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Thời gian giải đấu (Chuẩn dd/mm/yyyy HH:mm, tự động nối tiếp mở ĐK -> đóng ĐK, kết thúc để trống) */}
          <div className="grid gap-4 md:grid-cols-2">
            <CustomDateTimePicker
              label={<>Mở đăng ký <span className="text-red-500">*</span></>}
              value={registrationStart}
              onChange={handleRegistrationStartChange}
              error={errors.registrationStart?.message}
            />

            <CustomDateTimePicker
              label={<>Đóng đăng ký <span className="text-red-500">*</span></>}
              value={registrationEnd}
              onChange={handleRegistrationEndChange}
              error={errors.registrationEnd?.message}
            />

            <CustomDateTimePicker
              label={<>Bắt đầu giải <span className="text-red-500">*</span></>}
              value={startDate}
              onChange={(val) => setValue('startDate', val, { shouldValidate: true })}
              error={errors.startDate?.message}
              isPrimary
            />

            <CustomDateTimePicker
              label="Kết thúc dự kiến"
              value={endDate}
              onChange={(val) => setValue('endDate', val, { shouldValidate: true })}
              error={errors.endDate?.message}
            />
          </div>

          {/* Thể thức thi đấu (Cards chọn trực quan với Icon sơ đồ giải đấu chân thực) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">
                Thể thức thi đấu <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-500">Chọn cấu trúc bảng đấu</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {BRACKET_OPTIONS.map((opt) => {
                const isSelected = bracketType === opt.id;
                const { Icon } = opt;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setValue('bracketType', opt.id, { shouldValidate: true })}
                    className={`group relative flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-2xs ring-1 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300 group-hover:text-blue-600'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-bold transition ${isSelected ? 'text-blue-900' : 'text-slate-800 group-hover:text-blue-600'}`}>
                          {opt.label}
                        </span>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                        )}
                      </div>
                      <p className={`mt-0.5 text-xs leading-snug transition ${isSelected ? 'text-blue-800/85' : 'text-slate-500'}`}>
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.bracketType && <span className="block text-xs text-red-600">{errors.bracketType.message}</span>}
          </div>

          {/* Quy mô giải đấu (Số đội / người tối đa) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">
                Số đội / người tham gia tối đa <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-500">Giới hạn 2 - 32</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[4, 8, 16, 32].map((num) => {
                const isCurrent = maxTeams === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setValue('maxTeams', num, { shouldValidate: true })}
                    className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition ${
                      isCurrent
                        ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {num} đội / người
                  </button>
                );
              })}

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-slate-600 font-medium">Tùy chỉnh:</span>
                <input
                  type="number"
                  min={2}
                  max={32}
                  {...register('maxTeams', { valueAsNumber: true })}
                  className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-center text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            {errors.maxTeams && <span className="block text-xs text-red-600">{errors.maxTeams.message}</span>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setValue('visibility', 'PRIVATE')}
              className={`rounded-xl border p-4 text-left transition ${visibility === 'PRIVATE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className="block font-semibold text-slate-800">Riêng tư / nội bộ</span>
              <span className="mt-1 block text-xs text-slate-500">Tạo trực tiếp, chia sẻ bằng liên kết hoặc trong CLB.</span>
            </button>
            <button
              type="button"
              onClick={() => setValue('visibility', 'PUBLIC')}
              className={`rounded-xl border p-4 text-left transition ${visibility === 'PUBLIC' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className="block font-semibold text-slate-800">Công khai</span>
              <span className="mt-1 block text-xs text-slate-500">Giải sẽ chờ Admin duyệt trước khi hiển thị công khai.</span>
            </button>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm cursor-pointer hover:bg-slate-50/60 transition">
            <input
              type="checkbox"
              checked={isRanked}
              onChange={(event) => setValue('isRanked', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block font-semibold text-slate-800">Tính ELO</span>
              <span className="text-xs text-slate-500">Giải phong trào không tính ELO quốc gia. Bật tính năng này nếu là giải giao hữu tính xếp hạng nội bộ.</span>
            </span>
          </label>

          {/* Khu vực Địa điểm & Sân thi đấu (Bắt buộc nhập) */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <MapPin className="h-4 w-4 text-blue-600" />
              Địa điểm & Sân thi đấu
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">
                Tên sân / Nhà thi đấu <span className="text-red-500">*</span>
                <input
                  {...register('venueName')}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Ví dụ: Sân Cầu Lông Kỳ Hòa"
                />
                {errors.venueName && <span className="mt-1 block text-xs text-red-600">{errors.venueName.message}</span>}
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Địa chỉ chi tiết <span className="text-red-500">*</span>
                <input
                  {...register('locationAddress')}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Số nhà, tên đường..."
                />
                {errors.locationAddress && <span className="mt-1 block text-xs text-red-600">{errors.locationAddress.message}</span>}
              </label>
            </div>

            {/* 3 Dropdown Tỉnh / Quận / Phường */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Khu vực hành chính <span className="text-red-500">*</span>
              </span>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <select
                    {...register('province')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="">-- Chọn Tỉnh/Thành * --</option>
                    {provinces.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.fullName || item.name}
                      </option>
                    ))}
                  </select>
                  {errors.province && <span className="mt-1 block text-xs text-red-600">{errors.province.message}</span>}
                </div>
                <div>
                  <select
                    {...register('district')}
                    disabled={!province || districts.length === 0}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {!province ? '-- Chọn Tỉnh trước --' : districts.length === 0 ? '-- Đang tải... --' : '-- Chọn Quận/Huyện * --'}
                    </option>
                    {districts.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.fullName || item.name}
                      </option>
                    ))}
                  </select>
                  {errors.district && <span className="mt-1 block text-xs text-red-600">{errors.district.message}</span>}
                </div>
                <div>
                  <select
                    {...register('ward')}
                    disabled={!district || wards.length === 0}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {!district ? '-- Chọn Huyện trước --' : wards.length === 0 ? '-- Đang tải... --' : '-- Chọn Phường/Xã --'}
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
          </div>

          {sport === 'football' && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">Thiết lập bóng đá</p>
              <div className="grid gap-3 md:grid-cols-3">
                <select {...register('teamSize')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="5">5 người</option>
                  <option value="7">7 người</option>
                  <option value="11">11 người</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={20}
                  {...register('maxReserve', { valueAsNumber: true })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Dự bị tối đa"
                />
                <span className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 flex items-center">
                  Giới tính theo nội dung đã chọn
                </span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  type="number"
                  min={1}
                  max={4}
                  {...register('footballHalvesCount', { valueAsNumber: true })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Số hiệp"
                />
                <input
                  type="number"
                  min={1}
                  max={120}
                  {...register('footballHalfDuration', { valueAsNumber: true })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Phút/hiệp"
                />
                <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register('footballAllowDraw')} />
                  Cho phép hòa
                </label>
              </div>
            </div>
          )}

          <label className="block text-sm font-semibold text-slate-700">
            Mô tả giải đấu
            <textarea
              {...register('description')}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Mô tả chi tiết giải đấu, thể lệ thi đấu, quy định trang phục hoặc lưu ý cho người tham gia..."
            />
          </label>

          <div className="flex justify-end">
            <button
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-xs"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo giải đấu'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
