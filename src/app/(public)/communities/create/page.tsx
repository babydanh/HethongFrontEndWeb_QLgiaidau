'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  UploadCloud,
  X,
  Loader2,
  Sparkles,
  Shield,
  Users,
  Lock,
  Globe,
  CheckCircle2,
  Camera,
  MapPin,
  HelpCircle,
  ArrowRight,
  Trophy,
} from 'lucide-react';

import { communitiesApi } from '@/features/communities/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import { uploadApi } from '@/features/upload/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useAutoAddressParser } from '@/utils/vietnamAddressParser';
import { SearchableRegionSelect } from '@/components/shared/SearchableRegionSelect';
import { CircularImageCropModal } from '@/components/common/CircularImageCropModal';
import { getSportLogo } from '@/constants/sports';

type CreateCommunityFormValues = {
  name: string;
  description?: string;
  provinceCode: string;
  wardCode?: string;
  locationAddress?: string;
  categoryIds: string[];
  visibility: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  joinMode: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  logoUrl?: string;
  bannerUrl?: string;
};

export default function CreateCommunityPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const translate = useTranslations('CommunityCreate');

  const createCommunitySchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(3, translate('validation.nameMin'))
          .max(255, translate('validation.nameMax')),
        description: z.string().max(1000, translate('validation.descriptionMax')).optional(),
        provinceCode: z.string().min(1, translate('validation.provinceRequired')),
        wardCode: z.string().optional(),
        locationAddress: z.string().max(255, translate('validation.locationMax')).optional(),
        categoryIds: z.array(z.string().uuid()).length(1, translate('validation.categoryExactOne')),
        visibility: z.enum(['PUBLIC', 'PRIVATE', 'RESTRICTED']),
        joinMode: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']),
        logoUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
      }),
    [translate]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);

  // Image upload & cropping states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawLogoSrc, setRawLogoSrc] = useState<string>('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCommunityFormValues>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: '',
      description: '',
      provinceCode: '',
      wardCode: '',
      locationAddress: '',
      categoryIds: [],
      visibility: 'PUBLIC',
      joinMode: 'OPEN',
      logoUrl: '',
      bannerUrl: '',
    },
  });

  const watchName = watch('name');
  const watchDescription = watch('description');
  const watchProvince = watch('provinceCode');
  const watchWard = watch('wardCode');
  const watchLocationAddress = watch('locationAddress');
  const watchVisibility = watch('visibility');
  const watchJoinMode = watch('joinMode');
  const watchCategoryIds = watch('categoryIds');
  const watchLogoUrl = watch('logoUrl');
  const watchBannerUrl = watch('bannerUrl');

  // Selected Category Info for Live Preview
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === watchCategoryIds?.[0]),
    [categories, watchCategoryIds]
  );

  // Auto address recognition
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
    // Load categories (active only)
    categoriesApi
      .getCategories()
      .then((res) => {
        if (Array.isArray(res.data)) {
          const activeList = res.data.filter((c) => c.isActive !== false);
          setCategories(activeList);
          // Pre-select first sport if not chosen
          if (activeList.length > 0 && (!watchCategoryIds || watchCategoryIds.length === 0)) {
            setValue('categoryIds', [activeList[0].id], { shouldValidate: true });
          }
        }
      })
      .catch(console.error);

    // Load provinces
    regionsApi.getProvinces().then(setProvinces).catch(console.error);
  }, [setValue]);

  useEffect(() => {
    if (watchProvince) {
      regionsApi.getWardsByProvince(watchProvince).then(setWards).catch(console.error);
      setValue('wardCode', '');
    } else {
      setWards([]);
      setValue('wardCode', '');
    }
  }, [watchProvince, setValue]);

  // Logo file selection -> Open Circular Crop Modal
  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(translate('logoTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawLogoSrc(reader.result);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Crop confirm callback
  const handleCropConfirm = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    try {
      setIsUploadingLogo(true);
      const file = new File([croppedBlob], 'club_logo.png', { type: 'image/png' });
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

  // Banner file upload
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
      const provinceName = provinces.find((p) => p.code === data.provinceCode)?.name || '';
      const wardName = wards.find((w) => w.code === data.wardCode)?.name || '';
      const detailedAddress = data.locationAddress?.trim() || '';
      const combinedAddress = [detailedAddress, wardName, provinceName].filter(Boolean).join(', ');

      const payload = {
        ...data,
        logoUrl: data.logoUrl?.trim() ? data.logoUrl : undefined,
        bannerUrl: data.bannerUrl?.trim() ? data.bannerUrl : undefined,
        locationAddress: combinedAddress,
        districtCode: null,
        wardCode: data.wardCode || null,
        joinQuestions: [],
      };

      const res = await communitiesApi.createCommunity(payload);
      toast.success(translate('createSuccess'));

      const responseData = res as { data?: { id?: string }; id?: string };
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

  const selectedProvinceName = provinces.find((p) => p.code === watchProvince)?.name || '';

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-6 sm:pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation & Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              {translate('back')}
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              CLB / Community
            </span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {translate('title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{translate('subtitle')}</p>
          </div>
        </div>

        {/* 2 Cột Layout: Trái (Form tinh gọn) - Phải (Preview & Media & Submit) */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            
            {/* ─── CỘT TRÁI (7 CỘT): FORM THÔNG TIN TINH GỌN ─── */}
            <div className="space-y-6 lg:col-span-7">
              
              {/* Thẻ 1: Thông tin nhận diện & Môn thể thao */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {translate('step1')}
                  </h2>
                </div>

                {/* Tên câu lạc bộ */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {translate('clubName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder={translate('namePlaceholder')}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 ${
                      errors.name
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Môn thể thao chính */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {translate('primarySport')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const isSelected = watchCategoryIds?.includes(cat.id);
                      const sportIcon = getSportLogo(cat.name);

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setValue('categoryIds', [cat.id], { shouldValidate: true })}
                          className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-1 ring-blue-600 shadow-2xs font-bold'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {sportIcon ? (
                            <div className="relative h-6 w-6 shrink-0">
                              <Image
                                src={sportIcon}
                                alt={cat.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <Trophy className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs font-semibold truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.categoryIds && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                      {errors.categoryIds.message}
                    </p>
                  )}
                </div>

                {/* Mô tả ngắn */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {translate('description')}
                  </label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    placeholder={translate('descriptionPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.description && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </section>

              {/* Thẻ 2: Khu vực & Địa điểm sân bãi */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {translate('step2')}
                  </h2>
                </div>

                {/* Tên sân / Địa chỉ chi tiết */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {translate('locationAddressLabel')}
                  </label>
                  <input
                    {...register('locationAddress')}
                    placeholder={translate('locationAddressPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  {autoDetectedAddress.isMatched && autoDetectedAddress.province && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                      <span>
                        {translate('autoDetectedAddress')}{' '}
                        <strong>
                          {autoDetectedAddress.province.fullName || autoDetectedAddress.province.name}
                        </strong>
                        {autoDetectedAddress.ward
                          ? ` > ${autoDetectedAddress.ward.fullName || autoDetectedAddress.ward.name}`
                          : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Dropdowns Tỉnh / Phường */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {translate('ward')}
                    </label>
                    <SearchableRegionSelect
                      value={watchWard || ''}
                      options={wards}
                      inputName="wardCode"
                      placeholder={translate('wardPlaceholder')}
                      disabled={!watchProvince || wards.length === 0}
                      onChange={(value) =>
                        setValue('wardCode', value, { shouldValidate: true, shouldDirty: true })
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Thẻ 3: Chế độ hiển thị & Quyền riêng tư */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Shield className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {translate('step4')}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Chế độ hiển thị */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      {translate('visibility')}
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          value: 'PUBLIC',
                          label: translate('publicLabel'),
                          desc: translate('publicDescription'),
                          Icon: Globe,
                        },
                        {
                          value: 'PRIVATE',
                          label: translate('privateLabel'),
                          desc: translate('privateDescription'),
                          Icon: Lock,
                        },
                      ].map((item) => {
                        const isChecked = watchVisibility === item.value;
                        const ItemIcon = item.Icon;
                        return (
                          <div
                            key={item.value}
                            onClick={() =>
                              setValue('visibility', item.value as 'PUBLIC' | 'PRIVATE')
                            }
                            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                              isChecked
                                ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <ItemIcon className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold leading-tight text-slate-900">
                                {item.label}
                              </p>
                              <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chế độ duyệt thành viên */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      {translate('joinMode')}
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          value: 'OPEN',
                          label: translate('openLabel'),
                          desc: translate('openDescription'),
                          Icon: Users,
                        },
                        {
                          value: 'APPROVAL',
                          label: translate('approvalLabel'),
                          desc: translate('approvalDescription'),
                          Icon: Shield,
                        },
                      ].map((item) => {
                        const isChecked = watchJoinMode === item.value;
                        const ItemIcon = item.Icon;
                        return (
                          <div
                            key={item.value}
                            onClick={() =>
                              setValue('joinMode', item.value as 'OPEN' | 'APPROVAL')
                            }
                            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                              isChecked
                                ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <ItemIcon className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold leading-tight text-slate-900">
                                {item.label}
                              </p>
                              <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

            </div>

            {/* ─── CỘT PHẢI (5 CỘT - STICKY): PREVIEW & MEDIA UPLOAD & SUBMIT ─── */}
            <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-6 lg:self-start">
              
              {/* Thẻ Xem trước CLB Thực tế (Live Visual Preview) */}
              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Xem trước diện mạo CLB
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Live Preview</span>
                </div>

                {/* Banner & Avatar Preview Card */}
                <div className="relative">
                  {/* Banner Area */}
                  <div
                    onClick={() => !isUploadingBanner && bannerInputRef.current?.click()}
                    className="group relative h-28 w-full bg-linear-to-r from-blue-600 via-indigo-600 to-sky-500 cursor-pointer overflow-hidden"
                  >
                    {watchBannerUrl ? (
                      <Image
                        src={watchBannerUrl}
                        alt="Club Banner"
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs font-medium gap-1.5">
                        <Camera className="w-4 h-4" />
                        <span>Thêm ảnh bìa CLB</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{watchBannerUrl ? 'Đổi ảnh bìa' : 'Tải ảnh bìa lên'}</span>
                    </div>
                    {isUploadingBanner && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
                        <Loader2 className="w-5 h-5 animate-spin mr-1.5" />
                        <span>{translate('loadingBanner')}</span>
                      </div>
                    )}
                  </div>

                  {/* Hidden inputs */}
                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={handleBannerUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoFileSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Circular Avatar / Logo (Overlap on Banner) */}
                  <div className="px-5 -mt-8 relative flex items-end justify-between">
                    <div
                      onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                      className="group relative h-16 w-16 rounded-full border-2 border-white bg-white shadow-md cursor-pointer overflow-hidden shrink-0"
                    >
                      {watchLogoUrl ? (
                        <Image
                          src={watchLogoUrl}
                          alt="Club Logo"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                        Sửa
                      </div>
                      {isUploadingLogo && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Quick remove buttons if uploaded */}
                    <div className="flex items-center gap-1 text-[11px]">
                      {watchLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setValue('logoUrl', '')}
                          className="text-slate-400 hover:text-rose-500 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Xóa logo
                        </button>
                      )}
                      {watchBannerUrl && (
                        <button
                          type="button"
                          onClick={() => setValue('bannerUrl', '')}
                          className="text-slate-400 hover:text-rose-500 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Xóa bìa
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Club Info Details in Card */}
                  <div className="p-5 pt-3 space-y-2.5">
                    <div>
                      <h3 className="text-base font-black text-slate-900 leading-snug">
                        {(watchName || '').trim() || 'Tên Câu Lạc Bộ Của Bạn'}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {(watchDescription || '').trim() || 'Giới thiệu ngắn về sân chơi thể thao của bạn...'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      {selectedCategory && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200/80 px-2 py-0.5 font-bold text-blue-700">
                          <Trophy className="w-3 h-3" />
                          {selectedCategory.name}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {selectedProvinceName || 'Khu vực hoạt động'}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {watchVisibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Card Nút Bấm Tạo Câu Lạc Bộ */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60 transition active:scale-[0.99] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Đang khởi tạo câu lạc bộ...</span>
                    </>
                  ) : (
                    <>
                      <span>{translate('submit')}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-400">
                  Nội quy & form thành viên có thể thiết lập thêm bất cứ lúc nào trong Cài đặt CLB.
                </p>
              </div>

            </div>

          </div>
        </form>
      </div>

      {/* Modal cắt ảnh logo tròn chuyên nghiệp */}
      {cropModalOpen && (
        <CircularImageCropModal
          isOpen={cropModalOpen}
          imageSrc={rawLogoSrc}
          onClose={() => setCropModalOpen(false)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
