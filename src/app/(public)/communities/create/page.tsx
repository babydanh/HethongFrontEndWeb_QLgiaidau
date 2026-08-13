'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { communitiesApi } from '@/features/communities/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import { uploadApi } from '@/features/upload/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/zustand/authStore';
import { ChevronLeft, Plus, Trash2, UploadCloud, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

const createCommunitySchema = z.object({
  name: z.string().min(3, "Tên câu lạc bộ phải có ít nhất 3 ký tự").max(255, "Tên quá dài"),
  description: z.string().max(1000, "Mô tả quá dài").optional(),
  rules: z.string().max(5000, "Nội quy quá dài").optional(),
  provinceCode: z.string().min(1, "Vui lòng chọn tỉnh/thành phố"),
  districtCode: z.string().optional(),
  wardCode: z.string().optional(),
  locationAddress: z.string().max(255, "Địa chỉ quá dài").optional(),
  categoryIds: z.array(z.string().uuid()).min(1, "Vui lòng chọn ít nhất 1 môn thể thao"),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'RESTRICTED']),
  joinMode: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']),
  joinQuestions: z.array(z.object({ value: z.string() })).optional(),
  logoUrl: z.string().min(1, "Vui lòng tải lên Logo cho câu lạc bộ").url("Logo URL không hợp lệ"),
  bannerUrl: z.string().min(1, "Vui lòng tải lên Ảnh bìa (Banner) cho câu lạc bộ").url("Banner URL không hợp lệ"),
});

type CreateCommunityFormValues = z.infer<typeof createCommunitySchema>;

export default function CreateCommunityPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateCommunityFormValues>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: '',
      description: '',
      rules: '',
      provinceCode: '',
      districtCode: '',
      wardCode: '',
      locationAddress: '',
      categoryIds: [],
      visibility: 'PUBLIC',
      joinMode: 'OPEN',
      joinQuestions: [],
      logoUrl: '',
      bannerUrl: '',
    }
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control,
    name: "joinQuestions",
  });

  const watchProvince = watch('provinceCode');
  const watchDistrict = watch('districtCode');
  const watchJoinMode = watch('joinMode');
  const watchCategoryIds = watch('categoryIds');
  const watchLogoUrl = watch('logoUrl');
  const watchBannerUrl = watch('bannerUrl');

  useEffect(() => {
    // Load categories (filter active only)
    categoriesApi.getCategories()
      .then(res => {
        if (Array.isArray(res.data)) {
          setCategories(res.data.filter(c => c.isActive !== false));
        }
      })
      .catch(console.error);
    // Load provinces
    regionsApi.getProvinces().then(setProvinces).catch(console.error);
  }, []);

  useEffect(() => {
    if (watchProvince) {
      regionsApi.getDistricts(watchProvince).then(setDistricts).catch(console.error);
      setValue('districtCode', '');
      setValue('wardCode', '');
      setWards([]);
    }
  }, [watchProvince, setValue]);

  useEffect(() => {
    if (watchDistrict) {
      regionsApi.getWards(watchDistrict).then(setWards).catch(console.error);
      setValue('wardCode', '');
    }
  }, [watchDistrict, setValue]);

  const handleCategoryToggle = (id: string) => {
    const current = watchCategoryIds || [];
    if (current.includes(id)) {
      setValue('categoryIds', current.filter(c => c !== id));
    } else {
      setValue('categoryIds', [...current, id]);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh Logo không được vượt quá 5MB');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const res = await uploadApi.uploadImage(file);
      setValue('logoUrl', res.url, { shouldValidate: true });
      toast.success('Tải ảnh Logo lên thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải ảnh Logo lên');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh bìa không được vượt quá 10MB');
      return;
    }

    try {
      setIsUploadingBanner(true);
      const res = await uploadApi.uploadImage(file);
      setValue('bannerUrl', res.url, { shouldValidate: true });
      toast.success('Tải ảnh bìa lên thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải ảnh bìa lên');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const onSubmit = async (data: CreateCommunityFormValues) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để tạo câu lạc bộ');
      router.push('/login?redirect=/communities/create');
      return;
    }

    try {
      setIsSubmitting(true);
      const provinceName = provinces.find(p => p.code === data.provinceCode)?.name || '';
      const districtName = districts.find(d => d.code === data.districtCode)?.name || '';
      const combinedAddress = [districtName, provinceName].filter(Boolean).join(', ');

      const payload = {
        ...data,
        locationAddress: combinedAddress,
        districtCode: data.districtCode || null,
        wardCode: null,
        joinQuestions: data.joinQuestions?.map(q => q.value).filter(Boolean) || [],
      };
      
      const res = await communitiesApi.createCommunity(payload);
      toast.success('Tạo câu lạc bộ thành công! Đang chờ duyệt.');
      
      const responseData = res as { data?: { id?: string }, id?: string };
      const communityId = responseData?.data?.id || responseData?.id;
      if (communityId) {
        router.push(`/communities/${communityId}`);
      } else {
        router.push('/communities');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi tạo câu lạc bộ');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Quay lại
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-8 py-10 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">Tạo Câu Lạc Bộ Mới</h1>
            <p className="text-emerald-100">Xây dựng và phát triển câu lạc bộ thể thao của riêng bạn</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-10">
            {/* BƯỚC 1: THÔNG TIN CƠ BẢN */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">BƯỚC 1: THÔNG TIN CƠ BẢN</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tên câu lạc bộ <span className="text-rose-500">*</span>
                </label>
                <input 
                  {...register('name')}
                  placeholder="VD: CLB Cầu Lông Ba Đình"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
                {errors.name && <p className="text-rose-500 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mô tả
                </label>
                <textarea 
                  {...register('description')}
                  rows={3}
                  placeholder="Giới thiệu ngắn về câu lạc bộ..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nội quy
                </label>
                <textarea 
                  {...register('rules')}
                  rows={4}
                  placeholder="1. Tôn trọng lẫn nhau&#10;2. Đúng giờ..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </section>

            {/* BƯỚC 2: KHU VỰC & MÔN THỂ THAO */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">BƯỚC 2: KHU VỰC & MÔN THỂ THAO</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tỉnh/Thành phố <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('provinceCode')}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Chọn Tỉnh/Thành phố</option>
                    {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                  {errors.provinceCode && <p className="text-rose-500 text-sm mt-1">{errors.provinceCode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quận/Huyện
                  </label>
                  <select
                    {...register('districtCode')}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    disabled={!watchProvince}
                  >
                    <option value="">Chọn Quận/Huyện</option>
                    {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Môn thể thao <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {categories.map(cat => {
                    const isSelected = watchCategoryIds?.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryToggle(cat.id)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                          isSelected 
                            ? 'bg-blue-50 border-emerald-500 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && '✓ '}{cat.name}
                      </button>
                    )
                  })}
                </div>
                {errors.categoryIds && <p className="text-rose-500 text-sm mt-2">{errors.categoryIds.message}</p>}
              </div>
            </section>

            {/* BƯỚC 3: HÌNH ẢNH CÂU LẠC BỘ */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">BƯỚC 3: HÌNH ẢNH CÂU LẠC BỘ</h2>
              <p className="text-sm text-slate-500">Tải lên Logo đại diện và Ảnh bìa (Banner) để thu hút thành viên tham gia câu lạc bộ của bạn.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Logo Uploader */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-700 mb-4 text-center">
                    Logo / Avatar nhóm <span className="text-rose-500">*</span>
                  </label>
                  
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <div 
                    onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                    className={`group w-32 h-32 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
                      watchLogoUrl 
                        ? 'border-emerald-500 bg-white' 
                        : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {isUploadingLogo ? (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-[10px] mt-1">Đang tải...</span>
                      </div>
                    ) : watchLogoUrl ? (
                      <>
                        <div className="relative w-full h-full">
                          <Image src={watchLogoUrl} alt="Logo Preview" fill className="object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                          Thay đổi
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 p-4 text-center">
                        <UploadCloud className="w-8 h-8 mb-1" />
                        <span className="text-xs font-medium">Chọn Logo</span>
                      </div>
                    )}
                  </div>

                  {watchLogoUrl && !isUploadingLogo && (
                    <button
                      type="button"
                      onClick={() => setValue('logoUrl', '')}
                      className="mt-3 text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Gỡ ảnh Logo
                    </button>
                  )}
                  {errors.logoUrl && <p className="text-rose-500 text-sm mt-2 text-center">{errors.logoUrl.message}</p>}
                </div>

                {/* Banner Uploader */}
                <div className="md:col-span-2 flex flex-col p-6 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-700 mb-4">
                    Ảnh bìa (Cover Banner) <span className="text-rose-500">*</span>
                  </label>
                  
                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={handleBannerUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <div 
                    onClick={() => !isUploadingBanner && bannerInputRef.current?.click()}
                    className={`group w-full h-36 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
                      watchBannerUrl 
                        ? 'border-emerald-500 bg-white' 
                        : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {isUploadingBanner ? (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-xs mt-1">Đang tải ảnh lên...</span>
                      </div>
                    ) : watchBannerUrl ? (
                      <>
                        <div className="relative w-full h-full">
                          <Image src={watchBannerUrl} alt="Banner Preview" fill className="object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm font-medium transition-opacity">
                          Thay đổi ảnh bìa
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 p-6">
                        <UploadCloud className="w-10 h-10 mb-2" />
                        <span className="text-sm font-medium">Nhấp chọn hoặc kéo thả ảnh bìa nhóm vào đây</span>
                        <span className="text-xs text-slate-400 mt-1">Hỗ trợ JPG, PNG (tối đa 10MB)</span>
                      </div>
                    )}
                  </div>

                  {watchBannerUrl && !isUploadingBanner && (
                    <button
                      type="button"
                      onClick={() => setValue('bannerUrl', '')}
                      className="mt-3 text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium self-start transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Gỡ ảnh bìa
                    </button>
                  )}
                  {errors.bannerUrl && <p className="text-rose-500 text-sm mt-2">{errors.bannerUrl.message}</p>}
                </div>
              </div>
            </section>


            {/* BƯỚC 4: CÀI ĐẶT QUYỀN RIÊNG TƯ */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">BƯỚC 4: CÀI ĐẶT QUYỀN RIÊNG TƯ</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-4">Chế độ hiển thị</label>
                  <div className="space-y-3">
                    {[
                      { value: 'PUBLIC', label: 'Công khai', desc: 'Ai cũng thấy và tìm được' },
                      { value: 'PRIVATE', label: 'Riêng tư', desc: 'Chỉ thành viên mới thấy nội dung' },
                      { value: 'RESTRICTED', label: 'Hạn chế', desc: 'Hiện trong tìm kiếm, cần vào mới xem' }
                    ].map(opt => (
                      <label key={opt.value} className="flex items-start cursor-pointer group">
                        <div className="flex items-center h-5">
                          <input 
                            type="radio"
                            value={opt.value}
                            {...register('visibility')}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <span className="font-medium text-slate-700 block group-hover:text-blue-600">{opt.label}</span>
                          <span className="text-slate-500">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-4">Chế độ tham gia</label>
                  <div className="space-y-3">
                    {[
                      { value: 'OPEN', label: 'Mở tự do', desc: 'Ai cũng vào được' },
                      { value: 'APPROVAL', label: 'Cần duyệt', desc: 'Gửi đơn xin vào (có thể kèm form)' },
                      { value: 'INVITE_ONLY', label: 'Chỉ mời', desc: 'Chỉ vào qua lời mời của Quản trị viên' }
                    ].map(opt => (
                      <label key={opt.value} className="flex items-start cursor-pointer group">
                        <div className="flex items-center h-5">
                          <input 
                            type="radio"
                            value={opt.value}
                            {...register('joinMode')}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <span className="font-medium text-slate-700 block group-hover:text-blue-600">{opt.label}</span>
                          <span className="text-slate-500">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {watchJoinMode === 'APPROVAL' && (
                <div className="mt-8 bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-800 mb-4">Câu hỏi xin vào nhóm</label>
                  <p className="text-sm text-slate-500 mb-4">Người xin vào nhóm sẽ phải trả lời các câu hỏi này.</p>
                  
                  <div className="space-y-3 mb-4">
                    {questionFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <input
                          {...register(`joinQuestions.${index}.value` as const)}
                          placeholder={`Câu hỏi ${index + 1}...`}
                          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => appendQuestion({ value: '' })}
                    className="flex items-center text-sm text-blue-600 font-medium hover:text-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi
                  </button>
                </div>
              )}
            </section>

            <div className="pt-6 border-t flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                isLoading={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
              >
                Tạo Câu Lạc Bộ
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

