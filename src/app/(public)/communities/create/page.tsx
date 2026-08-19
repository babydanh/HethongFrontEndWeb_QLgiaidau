'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
import { ChevronLeft, Plus, Trash2, UploadCloud, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { useAutoAddressParser } from '@/utils/vietnamAddressParser';
import { SearchableRegionSelect } from '@/components/shared/SearchableRegionSelect';

type CreateCommunityFormValues = {
  name: string;
  description?: string;
  rules?: string;
  provinceCode: string;
  wardCode?: string;
  locationAddress?: string;
  categoryIds: string[];
  visibility: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  joinMode: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  joinQuestions?: { value: string }[];
  logoUrl?: string;
  bannerUrl?: string;
};

export default function CreateCommunityPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const translate = useTranslations('CommunityCreate');
  const createCommunitySchema = z.object({
    name: z.string().min(3, translate('validation.nameMin')).max(255, translate('validation.nameMax')),
    description: z.string().max(1000, translate('validation.descriptionMax')).optional(),
    rules: z.string().max(5000, translate('validation.rulesMax')).optional(),
    provinceCode: z.string().min(1, translate('validation.provinceRequired')),
    wardCode: z.string().optional(),
    locationAddress: z.string().max(255, translate('validation.locationMax')).optional(),
    categoryIds: z.array(z.string().uuid()).length(1, translate('validation.categoryExactOne')),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'RESTRICTED']),
    joinMode: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']),
    joinQuestions: z.array(z.object({ value: z.string() })).optional(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateCommunityFormValues>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: '',
      description: '',
      rules: '',
      provinceCode: '',
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
  const watchWard = watch('wardCode');
  const watchLocationAddress = watch('locationAddress');
  const watchJoinMode = watch('joinMode');
  const watchCategoryIds = watch('categoryIds');
  const watchLogoUrl = watch('logoUrl');
  const watchBannerUrl = watch('bannerUrl');

  const autoDetectedAddress = useAutoAddressParser({
    addressValue: watchLocationAddress,
    provinces,
    wards,
    onSelectProvince: (provCode) => {
      setValue('provinceCode', provCode, { shouldValidate: true, shouldDirty: true });
    },
    onSelectWard: (wardCode) => {
      setValue('wardCode', wardCode, { shouldValidate: true, shouldDirty: true });
    },
    onWardsLoaded: (loadedWards) => {
      setWards(loadedWards);
    },
  });

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
      regionsApi.getWardsByProvince(watchProvince).then(setWards).catch(console.error);
      setValue('wardCode', '');
    } else {
      setWards([]);
      setValue('wardCode', '');
    }
  }, [watchProvince, setValue]);

  const handleCategoryToggle = (id: string) => {
    // A club owns one primary sport. Selecting another replaces the previous one.
    setValue('categoryIds', [id], { shouldValidate: true });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error(translate('logoTooLarge'));
      return;
    }

    try {
      setIsUploadingLogo(true);
      const res = await uploadApi.uploadImage(file);
      setValue('logoUrl', res.url, { shouldValidate: true });
      toast.success(translate('logoUploaded'));
    } catch (error) {
      console.error(error);
      toast.error(translate('logoUploadError'));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(translate('bannerTooLarge'));
      return;
    }

    try {
      setIsUploadingBanner(true);
      const res = await uploadApi.uploadImage(file);
      setValue('bannerUrl', res.url, { shouldValidate: true });
      toast.success(translate('bannerUploaded'));
    } catch (error) {
      console.error(error);
      toast.error(translate('bannerUploadError'));
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const onSubmit = async (data: CreateCommunityFormValues) => {
    if (!user) {
      toast.error(translate('loginRequired'));
      router.push('/login?redirect=/communities/create');
      return;
    }

    try {
      setIsSubmitting(true);
      const provinceName = provinces.find(p => p.code === data.provinceCode)?.name || '';
      const wardName = wards.find(w => w.code === data.wardCode)?.name || '';
      const detailedAddress = data.locationAddress?.trim() || '';
      const combinedAddress = [detailedAddress, wardName, provinceName].filter(Boolean).join(', ');

      const payload = {
        ...data,
        logoUrl: data.logoUrl?.trim() ? data.logoUrl : undefined,
        bannerUrl: data.bannerUrl?.trim() ? data.bannerUrl : undefined,
        locationAddress: combinedAddress,
        districtCode: null,
        wardCode: data.wardCode || null,
        joinQuestions: data.joinQuestions?.map(q => q.value).filter(Boolean) || [],
      };
      
      const res = await communitiesApi.createCommunity(payload);
      toast.success(translate('createSuccess'));
      
      const responseData = res as { data?: { id?: string }, id?: string };
      const communityId = responseData?.data?.id || responseData?.id;
      if (communityId) {
        router.push(`/communities/${communityId}`);
      } else {
        router.push('/communities');
      }
    } catch (error) {
      toast.error(translate('createError'));
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
          {translate('back')}
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 px-8 py-10 text-white text-center rounded-t-xl">
            <h1 className="text-3xl font-bold mb-2">{translate('title')}</h1>
            <p className="text-blue-100">{translate('subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-10">
            {/* BƯỚC 1: THÔNG TIN CƠ BẢN */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">{translate('step1')}</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {translate('clubName')} <span className="text-rose-500">*</span>
                </label>
                <input 
                  {...register('name')}
                  placeholder={translate('namePlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                {errors.name && <p className="text-rose-500 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {translate('description')}
                </label>
                <textarea 
                  {...register('description')}
                  rows={3}
                  placeholder={translate('descriptionPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {translate('rules')}
                </label>
                <textarea 
                  {...register('rules')}
                  rows={4}
                  placeholder={translate('rulesPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </section>

            {/* BƯỚC 2: KHU VỰC & MÔN THỂ THAO */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">{translate('step2')}</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Địa chỉ chi tiết / Sân sinh hoạt chính
                </label>
                <input 
                  {...register('locationAddress')}
                  placeholder="Ví dụ: Số 123 Đường Hoa Sứ, P. 7, Q. Phú Nhuận, TP.HCM..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                {autoDetectedAddress.isMatched && autoDetectedAddress.province && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-fadeIn">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    <span>
                      Đã tự nhận diện: <strong>{autoDetectedAddress.province.fullName || autoDetectedAddress.province.name}</strong>
                      {autoDetectedAddress.ward ? ` > ${autoDetectedAddress.ward.fullName || autoDetectedAddress.ward.name}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {translate('province')} <span className="text-rose-500">*</span>
                  </label>
                  <SearchableRegionSelect
                    value={watchProvince || ''}
                    options={provinces}
                    inputName="provinceCode"
                    placeholder={translate('provincePlaceholder')}
                    onChange={(value) => {
                      setValue('provinceCode', value, { shouldValidate: true, shouldDirty: true });
                      setValue('wardCode', '', { shouldValidate: true, shouldDirty: true });
                    }}
                    error={errors.provinceCode?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {translate('ward')}
                  </label>
                  <SearchableRegionSelect
                    value={watchWard || ''}
                    options={wards}
                    inputName="wardCode"
                    placeholder={translate('wardPlaceholder')}
                    disabled={!watchProvince || wards.length === 0}
                    onChange={(value) => setValue('wardCode', value, { shouldValidate: true, shouldDirty: true })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  {translate('primarySport')} <span className="text-rose-500">*</span>
                </label>
                <p className="mb-3 text-sm text-slate-500">{translate('primarySportHint')}</p>
                <div className="flex flex-wrap gap-3">
                  {categories.map(cat => {
                    const isSelected = watchCategoryIds?.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryToggle(cat.id)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
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
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">{translate('step3')}</h2>
              <p className="text-sm text-slate-500">{translate('imagesDescription')}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Logo Uploader */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-700 mb-4 text-center">
                    {translate('logoAvatar')} <span className="text-slate-400 font-normal text-xs">({translate('optional')})</span>
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
                        ? 'border-blue-500 bg-white' 
                        : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {isUploadingLogo ? (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-[10px] mt-1">{translate('loading')}</span>
                      </div>
                    ) : watchLogoUrl ? (
                      <>
                        <div className="relative w-full h-full">
                          <Image src={watchLogoUrl} alt={translate('logoPreview')} fill className="object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                          {translate('change')}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 p-4 text-center">
                        <UploadCloud className="w-8 h-8 mb-1" />
                        <span className="text-xs font-medium">{translate('chooseLogo')}</span>
                      </div>
                    )}
                  </div>

                  {watchLogoUrl && !isUploadingLogo && (
                    <button
                      type="button"
                      onClick={() => setValue('logoUrl', '')}
                      className="mt-3 text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> {translate('removeLogo')}
                    </button>
                  )}
                  {errors.logoUrl && <p className="text-rose-500 text-sm mt-2 text-center">{errors.logoUrl.message}</p>}
                </div>

                {/* Banner Uploader */}
                <div className="md:col-span-2 flex flex-col p-6 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-700 mb-4">
                    {translate('bannerLabel')} <span className="text-slate-400 font-normal text-xs">({translate('optional')})</span>
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
                        ? 'border-blue-500 bg-white' 
                        : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {isUploadingBanner ? (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-xs mt-1">{translate('loadingBanner')}</span>
                      </div>
                    ) : watchBannerUrl ? (
                      <>
                        <div className="relative w-full h-full">
                          <Image src={watchBannerUrl} alt={translate('bannerPreview')} fill className="object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm font-medium transition-opacity">
                          {translate('changeBanner')}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 p-6">
                        <UploadCloud className="w-10 h-10 mb-2" />
                        <span className="text-sm font-medium">{translate('dropBanner')}</span>
                        <span className="text-xs text-slate-400 mt-1">{translate('supportedFormats')}</span>
                      </div>
                    )}
                  </div>

                  {watchBannerUrl && !isUploadingBanner && (
                    <button
                      type="button"
                      onClick={() => setValue('bannerUrl', '')}
                      className="mt-3 text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium self-start transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> {translate('removeBanner')}
                    </button>
                  )}
                  {errors.bannerUrl && <p className="text-rose-500 text-sm mt-2">{errors.bannerUrl.message}</p>}
                </div>
              </div>
            </section>


            {/* BƯỚC 4: CÀI ĐẶT QUYỀN RIÊNG TƯ */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">{translate('step4')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-4">{translate('visibility')}</label>
                  <div className="space-y-3">
                    {[
                      { value: 'PUBLIC', label: translate('publicLabel'), desc: translate('publicDescription') },
                      { value: 'PRIVATE', label: translate('privateLabel'), desc: translate('privateDescription') },
                      { value: 'RESTRICTED', label: translate('restrictedLabel'), desc: translate('restrictedDescription') }
                    ].map(opt => (
                      <label key={opt.value} className="flex items-start cursor-pointer group">
                        <div className="flex items-center h-5">
                          <input 
                            type="radio"
                            value={opt.value}
                            {...register('visibility')}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
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
                  <label className="block text-sm font-semibold text-slate-800 mb-4">{translate('joinMode')}</label>
                  <div className="space-y-3">
                    {[
                      { value: 'OPEN', label: translate('openLabel'), desc: translate('openDescription') },
                      { value: 'APPROVAL', label: translate('approvalLabel'), desc: translate('approvalDescription') },
                      { value: 'INVITE_ONLY', label: translate('inviteOnlyLabel'), desc: translate('inviteOnlyDescription') }
                    ].map(opt => (
                      <label key={opt.value} className="flex items-start cursor-pointer group">
                        <div className="flex items-center h-5">
                          <input 
                            type="radio"
                            value={opt.value}
                            {...register('joinMode')}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
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
                  <label className="block text-sm font-semibold text-slate-800 mb-4">{translate('joinQuestions')}</label>
                  <p className="text-sm text-slate-500 mb-4">{translate('joinQuestionsDescription')}</p>
                  
                  <div className="space-y-3 mb-4">
                    {questionFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <input
                          {...register(`joinQuestions.${index}.value` as const)}
                          placeholder={translate('questionPlaceholder', { number: index + 1 })}
                          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="flex items-center text-sm text-blue-600 font-medium hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" /> {translate('addQuestion')}
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
                {translate('cancel')}
              </Button>
              <Button 
                type="submit" 
                isLoading={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[140px] shadow-md shadow-blue-500/20"
              >
                {translate('submit')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

