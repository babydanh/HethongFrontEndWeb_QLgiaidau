'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRight, Settings2, Sparkles } from 'lucide-react';
import { categoriesApi, Category } from '@/features/categories/api';
import { tournamentsApi } from '@/features/tournaments/api';
import { regionsApi, Region } from '@/features/regions/api';
import { getErrorMessage } from '@/utils/error';

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
  endDate: z.string().min(1, 'Chọn thời gian kết thúc giải.'),
  venueName: z.string().trim().max(160).optional(),
  locationAddress: z.string().trim().max(300).optional(),
  province: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  ward: z.string().trim().max(100).optional(),
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

const quickDefaults = () => {
  const regStart = new Date();
  regStart.setSeconds(0, 0);

  // Đóng đăng ký tự động = Mở đăng ký + 2 tiếng
  const regEnd = new Date(regStart.getTime() + 2 * 60 * 60 * 1000);

  // Bắt đầu giải tự động = Đóng đăng ký + 2 tiếng
  const start = new Date(regEnd.getTime() + 2 * 60 * 60 * 1000);

  // Kết thúc dự kiến tự động = Bắt đầu giải + 2 tiếng
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  return {
    registrationStart: formatDateTimeInput(regStart),
    registrationEnd: formatDateTimeInput(regEnd),
    startDate: formatDateTimeInput(start),
    endDate: formatDateTimeInput(end),
  };
};

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
      isRanked: false, description: '', genderRestriction: '', teamSize: '7', maxReserve: 5,
      footballHalvesCount: 2, footballHalfDuration: 45, footballAllowDraw: true,
    },
  });

  const sport = useWatch({ control, name: 'sport' });
  const format = useWatch({ control, name: 'format' });
  const genderRestriction = useWatch({ control, name: 'genderRestriction' });
  const visibility = useWatch({ control, name: 'visibility' });
  const isRanked = useWatch({ control, name: 'isRanked' });
  const province = useWatch({ control, name: 'province' });
  const district = useWatch({ control, name: 'district' });
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
    const newEnd = new Date(newStart.getTime() + 2 * 60 * 60 * 1000);

    setValue('registrationEnd', formatDateTimeInput(newRegEnd), { shouldValidate: true });
    setValue('startDate', formatDateTimeInput(newStart), { shouldValidate: true });
    setValue('endDate', formatDateTimeInput(newEnd), { shouldValidate: true });
  };

  const handleRegistrationEndChange = (val: string) => {
    setValue('registrationEnd', val, { shouldValidate: true });
    if (!val) return;
    const base = new Date(val);
    if (isNaN(base.getTime())) return;
    const newStart = new Date(base.getTime() + 2 * 60 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + 2 * 60 * 60 * 1000);

    setValue('startDate', formatDateTimeInput(newStart), { shouldValidate: true });
    setValue('endDate', formatDateTimeInput(newEnd), { shouldValidate: true });
  };

  const handleStartDateChange = (val: string) => {
    setValue('startDate', val, { shouldValidate: true });
    if (!val) return;
    const base = new Date(val);
    if (isNaN(base.getTime())) return;
    const newEnd = new Date(base.getTime() + 2 * 60 * 60 * 1000);

    setValue('endDate', formatDateTimeInput(newEnd), { shouldValidate: true });
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
      const endDateTime = new Date(endDate);

      if (regStartDate >= regEndDate) {
        toast.error('Thời gian mở đăng ký phải trước thời gian đóng.');
        return;
      }
      if (regEndDate >= startDateTime) {
        toast.error('Thời gian đóng đăng ký phải trước giờ bắt đầu giải.');
        return;
      }
      if (startDateTime >= endDateTime) {
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
        endDate: endDateTime.toISOString(),
        venueName: values.venueName || undefined,
        locationAddress: values.locationAddress || undefined,
        province: provinceName || undefined,
        district: districtName || undefined,
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

      toast.success(values.visibility === 'PUBLIC' ? 'Đã tạo, đang chờ Admin duyệt công khai.' : 'Tạo giải nhanh thành công.');
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
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
              <Sparkles className="h-4 w-4" /> Tạo nhanh
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Tạo giải đấu nhanh</h1>
            <p className="mt-2 text-sm text-slate-500">Preset chỉ là điểm khởi đầu. Bạn vẫn có thể chỉnh luật trong trang quản lý.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/organizer/tournaments/create?mode=advanced${communityId ? `&communityId=${communityId}` : ''}`)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Settings2 className="h-4 w-4" /> Nâng cao
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <label className="block text-sm font-semibold text-slate-700">
            Tên giải đấu
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

          {/* Khu vực 4 mốc thời gian (Gộp chung 1 ô datetime-local + Auto cascade + Note) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">Thời gian giải đấu</span>
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                ⚡ Tự động giãn cách 2 tiếng
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <fieldset className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition">
                <legend className="px-1.5 text-xs font-semibold text-slate-700">1. Mở đăng ký</legend>
                <input
                  type="datetime-local"
                  {...register('registrationStart')}
                  onChange={(e) => handleRegistrationStartChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Thời điểm mở cho VĐV / Đội đăng ký
                </span>
                {errors.registrationStart && <span className="mt-1 block text-xs text-red-600">{errors.registrationStart.message}</span>}
              </fieldset>

              <fieldset className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition">
                <legend className="px-1.5 text-xs font-semibold text-slate-700">2. Đóng đăng ký</legend>
                <input
                  type="datetime-local"
                  {...register('registrationEnd')}
                  onChange={(e) => handleRegistrationEndChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Tự động +2h sau mở đăng ký (có thể sửa)
                </span>
                {errors.registrationEnd && <span className="mt-1 block text-xs text-red-600">{errors.registrationEnd.message}</span>}
              </fieldset>

              <fieldset className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs hover:border-blue-300 transition">
                <legend className="px-1.5 text-xs font-semibold text-blue-900">3. Bắt đầu giải</legend>
                <input
                  type="datetime-local"
                  {...register('startDate')}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Tự động +2h sau đóng đăng ký (có thể sửa)
                </span>
                {errors.startDate && <span className="mt-1 block text-xs text-red-600">{errors.startDate.message}</span>}
              </fieldset>

              <fieldset className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs hover:border-blue-300 transition">
                <legend className="px-1.5 text-xs font-semibold text-blue-900">4. Kết thúc dự kiến</legend>
                <input
                  type="datetime-local"
                  {...register('endDate')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Tự động +2h sau bắt đầu giải (có thể sửa)
                </span>
                {errors.endDate && <span className="mt-1 block text-xs text-red-600">{errors.endDate.message}</span>}
              </fieldset>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
              <span className="text-base leading-none">💡</span>
              <div>
                <strong>Ghi chú:</strong> Hệ thống tự động tính toán lịch trình nối tiếp nhau (mỗi mốc cách nhau 2 tiếng). Bạn có thể bấm trực tiếp vào bất kỳ ô nào để tùy chỉnh ngày và giờ theo ý muốn.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Thể thức
              <select {...register('bracketType')} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal">
                <option value="single_elimination">Loại trực tiếp</option>
                <option value="round_robin">Vòng tròn</option>
                <option value="group_stage_knockout">Vòng bảng + loại trực tiếp</option>
                <option value="double_elimination">Nhánh thắng/thua</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Số đội/người tối đa
              <input
                type="number"
                min={2}
                max={32}
                {...register('maxTeams', { valueAsNumber: true })}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              />
              {errors.maxTeams && <span className="mt-1 block text-xs text-red-600">{errors.maxTeams.message}</span>}
            </label>
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
              <span className="text-xs text-slate-500">Giải phong trào có thể tắt; giải lớn/toàn quốc nên mở cấu hình nâng cao.</span>
            </span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Tên sân
              <input
                {...register('venueName')}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                placeholder="Không bắt buộc"
              />
            </label>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800 flex items-center">
              <div>
                Giải thu phí hoặc quy mô lớn: mở <strong>Nâng cao</strong> để cấu hình thanh toán và kiểm duyệt đầy đủ.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Địa chỉ sân
              <input
                {...register('locationAddress')}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                placeholder="Số nhà, tên đường..."
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select {...register('province')} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm">
                <option value="">Tỉnh/thành</option>
                {provinces.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
              <select {...register('district')} disabled={!province || districts.length === 0} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm disabled:bg-slate-100 disabled:opacity-60">
                <option value="">Quận/huyện</option>
                {districts.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
              <select {...register('ward')} disabled={!district || wards.length === 0} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm disabled:bg-slate-100 disabled:opacity-60">
                <option value="">Phường/xã</option>
                {wards.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
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
            Ghi chú
            <textarea
              {...register('description')}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Luật hoặc thông tin ngắn cho người tham gia"
            />
          </label>

          <div className="flex justify-end">
            <button
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-xs"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo giải nhanh'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
