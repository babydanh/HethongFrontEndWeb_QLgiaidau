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
import { uploadApi } from '@/features/upload/api';
import { getErrorMessage } from '@/utils/error';

const quickSchema = z.object({
  name: z.string().trim().min(2, 'Nhập tên giải đấu.'),
  sport: z.enum(['badminton', 'tennis', 'pickleball', 'table_tennis', 'football']),
  format: z.enum(['singles', 'doubles']),
  visibility: z.enum(['PRIVATE', 'PUBLIC']),
  bracketType: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'group_stage_knockout']),
  maxTeams: z.number().int().min(2).max(32),
  startDate: z.string().min(1, 'Chọn ngày bắt đầu.'),
  startTime: z.string().min(1, 'Chọn giờ bắt đầu.'),
  registrationEndDate: z.string().optional(),
  venueName: z.string().trim().max(160).optional(),
  locationAddress: z.string().trim().max(300).optional(),
  province: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  ward: z.string().trim().max(100).optional(),
  genderRestriction: z.enum(['', 'MALE', 'FEMALE']),
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

const today = () => new Date().toISOString().slice(0, 10);

export default function QuickTournamentCreate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = searchParams.get('communityId') || undefined;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<QuickValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      sport: 'badminton', format: 'doubles', visibility: 'PRIVATE', bracketType: 'single_elimination',
      maxTeams: 16, startDate: today(), startTime: '18:00', registrationEndDate: '',
      isRanked: false, description: '', genderRestriction: '', teamSize: '7', maxReserve: 5,
      footballHalvesCount: 2, footballHalfDuration: 45, footballAllowDraw: true,
    },
  });
  const sport = useWatch({ control, name: 'sport' });
  const visibility = useWatch({ control, name: 'visibility' });
  const isRanked = useWatch({ control, name: 'isRanked' });
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isUploading, setIsUploading] = useState<'logo' | 'banner' | null>(null);
  const selectedCategory = useMemo(() => categories.find((category) => sportFromCategory(category) === sport), [categories, sport]);

  useEffect(() => {
    let active = true;
    categoriesApi.getCategories().then((response) => {
      if (active) setCategories((response.data ?? []).filter((category) => category.isActive !== false));
    }).catch(() => toast.error('Không thể tải danh sách môn thể thao.')).finally(() => {
      if (active) setLoadingCategories(false);
    });
    return () => { active = false; };
  }, []);

  const onSubmit = async (values: QuickValues) => {
    try {
      setIsSubmitting(true);
      const { genderRestriction, teamSize, ...restValues } = values;
      const response = await tournamentsApi.createLiteTournament({
        ...restValues,
        communityId,
        sport: values.sport,
        description: values.description || undefined,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        registrationEndDate: values.registrationEndDate || undefined,
        venueName: values.venueName || undefined,
        locationAddress: values.locationAddress || undefined,
        province: values.province || undefined,
        district: values.district || undefined,
        ward: values.ward || undefined,
        ...(values.sport === 'football' ? {
          genderRestriction: genderRestriction === 'MALE' || genderRestriction === 'FEMALE' ? genderRestriction : undefined,
          teamSize: (Number(teamSize) || 7) as 5 | 7 | 11,
          maxReserve: values.maxReserve,
          footballHalvesCount: values.footballHalvesCount,
          footballHalfDuration: values.footballHalfDuration,
          footballAllowDraw: values.footballAllowDraw,
        } : {}),
        registrationMode: values.visibility === 'PUBLIC' ? 'OPEN' : 'INVITE_ONLY',
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

  const upload = async (kind: 'logo' | 'banner', file: File) => {
    try {
      setIsUploading(kind);
      const result = await uploadApi.uploadImage(file);
      if (kind === 'logo') setLogoUrl(result.url); else setBannerUrl(result.url);
      toast.success(kind === 'logo' ? 'Đã tải logo.' : 'Đã tải banner.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Tải ảnh thất bại.'));
    } finally { setIsUploading(null); }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600"><Sparkles className="h-4 w-4" /> Tạo nhanh</div><h1 className="text-3xl font-bold text-slate-900">Tạo giải đấu nhanh</h1><p className="mt-2 text-sm text-slate-500">Preset chỉ là điểm khởi đầu. Bạn vẫn có thể chỉnh luật trong trang quản lý.</p></div>
          <button type="button" onClick={() => router.push(`/organizer/tournaments/create?mode=advanced${communityId ? `&communityId=${communityId}` : ''}`)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Settings2 className="h-4 w-4" /> Nâng cao</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <label className="block text-sm font-semibold text-slate-700">Tên giải đấu<input {...register('name')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500" placeholder="Ví dụ: Giải giao hữu cuối tuần" />{errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>}</label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Môn<select {...register('sport')} disabled={loadingCategories} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal">{categories.map((category) => { const value = sportFromCategory(category); return value ? <option key={category.id} value={value}>{category.name}</option> : null; })}</select><span className="mt-1 block text-xs font-normal text-slate-500">{selectedCategory ? `Luật mặc định: ${selectedCategory.name}` : 'Chọn môn để nạp preset linh hoạt.'}</span></label>
            <label className="text-sm font-semibold text-slate-700">Nội dung<select {...register('format')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"><option value="singles">Đơn</option><option value="doubles">Đôi</option></select></label>
          </div>
          <div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Ngày bắt đầu<input type="date" {...register('startDate')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" />{errors.startDate && <span className="mt-1 block text-xs text-red-600">{errors.startDate.message}</span>}</label><label className="text-sm font-semibold text-slate-700">Giờ bắt đầu<input type="time" {...register('startTime')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label><label className="text-sm font-semibold text-slate-700">Đóng đăng ký<input type="date" {...register('registrationEndDate')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label></div>
          <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Thể thức<select {...register('bracketType')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"><option value="single_elimination">Loại trực tiếp</option><option value="round_robin">Vòng tròn</option><option value="group_stage_knockout">Vòng bảng + loại trực tiếp</option><option value="double_elimination">Nhánh thắng/thua</option></select></label><label className="text-sm font-semibold text-slate-700">Số đội/người tối đa<input type="number" min={2} max={32} {...register('maxTeams', { valueAsNumber: true })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" />{errors.maxTeams && <span className="mt-1 block text-xs text-red-600">{errors.maxTeams.message}</span>}</label></div>
          <div className="grid gap-3 md:grid-cols-2"><button type="button" onClick={() => setValue('visibility', 'PRIVATE')} className={`rounded-xl border p-4 text-left ${visibility === 'PRIVATE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><span className="block font-semibold text-slate-800">Riêng tư / nội bộ</span><span className="mt-1 block text-xs text-slate-500">Tạo trực tiếp, chia sẻ bằng liên kết hoặc trong CLB.</span></button><button type="button" onClick={() => setValue('visibility', 'PUBLIC')} className={`rounded-xl border p-4 text-left ${visibility === 'PUBLIC' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><span className="block font-semibold text-slate-800">Công khai</span><span className="mt-1 block text-xs text-slate-500">Giải sẽ chờ Admin duyệt trước khi hiển thị công khai.</span></button></div>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input type="checkbox" checked={isRanked} onChange={(event) => setValue('isRanked', event.target.checked)} className="mt-0.5 h-4 w-4" /><span><span className="block font-semibold text-slate-800">Tính ELO</span><span className="text-xs text-slate-500">Giải phong trào có thể tắt; giải lớn/toàn quốc nên mở cấu hình nâng cao.</span></span></label>
          <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Tên sân<input {...register('venueName')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Không bắt buộc" /></label><div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Giải thu phí hoặc quy mô lớn: mở <strong>Nâng cao</strong> để cấu hình thanh toán và kiểm duyệt đầy đủ.</div></div>
          <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Địa chỉ sân<input {...register('locationAddress')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label><div className="grid grid-cols-3 gap-2"><input {...register('province')} className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm" placeholder="Tỉnh" /><input {...register('district')} className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm" placeholder="Huyện" /><input {...register('ward')} className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm" placeholder="Xã/phường" /></div></div>
          <div className="grid gap-3 md:grid-cols-2"><label className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold">Logo tùy chọn<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload('logo', file); }} className="mt-2 w-full text-xs font-normal" />{isUploading === 'logo' ? <span className="text-xs text-blue-600">Đang tải...</span> : logoUrl ? <span className="text-xs text-emerald-600">Đã tải logo</span> : null}</label><label className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold">Banner tùy chọn<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload('banner', file); }} className="mt-2 w-full text-xs font-normal" />{isUploading === 'banner' ? <span className="text-xs text-blue-600">Đang tải...</span> : bannerUrl ? <span className="text-xs text-emerald-600">Đã tải banner</span> : null}</label></div>
          {sport === 'football' && <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><p className="mb-3 text-sm font-semibold text-slate-800">Thiết lập bóng đá</p><div className="grid gap-3 md:grid-cols-3"><select {...register('genderRestriction')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Không ràng buộc giới tính</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option></select><select {...register('teamSize')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="5">5 người</option><option value="7">7 người</option><option value="11">11 người</option></select><input type="number" min={0} max={20} {...register('maxReserve', { valueAsNumber: true })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Dự bị tối đa" /></div><div className="mt-3 grid gap-3 md:grid-cols-3"><input type="number" min={1} max={4} {...register('footballHalvesCount', { valueAsNumber: true })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Số hiệp" /><input type="number" min={1} max={120} {...register('footballHalfDuration', { valueAsNumber: true })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Phút/hiệp" /><label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><input type="checkbox" {...register('footballAllowDraw')} /> Cho phép hòa</label></div></div>}
          <label className="block text-sm font-semibold text-slate-700">Ghi chú<textarea {...register('description')} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Luật hoặc thông tin ngắn cho người tham gia" /></label>
          <div className="flex justify-end"><button disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? 'Đang tạo...' : 'Tạo giải nhanh'}<ArrowRight className="h-4 w-4" /></button></div>
        </form>
      </section>
    </main>
  );
}
