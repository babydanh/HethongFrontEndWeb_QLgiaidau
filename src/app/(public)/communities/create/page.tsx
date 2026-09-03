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
  Loader2,
  Sparkles,
  Shield,
  Users,
  Lock,
  Globe,
  Camera,
  MapPin,
  ArrowRight,
  Trophy,
} from 'lucide-react';

import { communitiesApi } from '@/features/communities/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { uploadApi } from '@/features/upload/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { CircularImageCropModal } from '@/components/common/CircularImageCropModal';
import { getSportLogo } from '@/constants/sports';
import { BRAND } from '@/constants/brand';

type CreateCommunityFormValues = {
  name: string;
  description?: string;
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
      categoryIds: [],
      visibility: 'PUBLIC',
      joinMode: 'OPEN',
      logoUrl: '',
      bannerUrl: '',
    },
  });

  const watchName = watch('name');
  const watchDescription = watch('description');
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
  }, [setValue]);

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
      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        categoryIds: data.categoryIds,
        visibility: data.visibility,
        joinMode: data.joinMode,
        logoUrl: data.logoUrl?.trim() ? data.logoUrl : undefined,
        bannerUrl: data.bannerUrl?.trim() ? data.bannerUrl : undefined,
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

        {/* 2 Cột Layout: Trái (Form tinh gọn) - Phải (Preview thật như Card CLB & Media & Submit) */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            
            {/* ─── CỘT TRÁI (7 CỘT): FORM THÔNG TIN CỐT LÕI ─── */}
            <div className="space-y-6 lg:col-span-7">
              
              {/* Thẻ 1: Thông tin nhận diện & Môn thể thao */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Thông tin câu lạc bộ
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

              {/* Thẻ 2: Chế độ hiển thị & Quyền riêng tư */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Shield className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Quyền riêng tư & Chế độ tham gia
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

            {/* ─── CỘT PHẢI (5 CỘT - STICKY): PREVIEW CHUẨN CARD CLB & MEDIA UPLOAD & SUBMIT ─── */}
            <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-6 lg:self-start">
              
              {/* Thẻ Xem trước đúng 100% tỷ lệ và diện mạo của Card Câu Lạc Bộ ngoài danh sách */}
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xem trước Card CLB</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Live Card Preview</span>
                </div>

                {/* Card Câu Lạc Bộ Thực Tế (Giống y hệt ngoài trang /communities) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between group">
                  {/* Header Banner - Cho phép nhấp trực tiếp để upload */}
                  <div
                    onClick={() => !isUploadingBanner && bannerInputRef.current?.click()}
                    className="h-44 sm:h-48 bg-slate-100 relative overflow-hidden shrink-0 cursor-pointer group/banner"
                  >
                    {watchBannerUrl ? (
                      <Image
                        src={watchBannerUrl.split(',')[0]}
                        alt="Banner Preview"
                        fill
                        className="object-cover group-hover/banner:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center p-6 group-hover/banner:opacity-95 transition-opacity">
                        <div className="flex flex-col items-center justify-center text-white/90 gap-1 text-center">
                          <Camera className="w-6 h-6 opacity-80" />
                          <span className="text-xs font-bold">Thêm ảnh bìa câu lạc bộ</span>
                          <span className="text-[10px] text-white/70">JPG, PNG (tối đa 10MB)</span>
                        </div>
                      </div>
                    )}

                    {/* Hover overlay for banner */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                      <Camera className="w-4 h-4" />
                      <span>{watchBannerUrl ? 'Thay đổi ảnh bìa' : 'Tải ảnh bìa lên'}</span>
                    </div>

                    {isUploadingBanner && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tải ảnh bìa...</span>
                      </div>
                    )}
                  </div>

                  {/* Card Info (White Area) */}
                  <div className="p-4 pt-2.5 flex flex-col justify-between bg-white">
                    <div className="flex items-start gap-3 relative">
                      {/* Circular Logo - Half overlap on Banner, click to crop/upload */}
                      <div
                        onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                        className="w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-white shadow-md -mt-10 z-10 shrink-0 relative flex items-center justify-center cursor-pointer group/logo"
                      >
                        <Image
                          src={watchLogoUrl || BRAND.assets.defaultCommunityLogo}
                          alt="Logo Preview"
                          fill
                          className={`transition-transform duration-300 ${watchLogoUrl ? 'object-cover' : 'object-contain p-2'}`}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                          Đổi
                        </div>
                        {isUploadingLogo && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Text info next to logo */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1 leading-snug">
                            {(watchName || '').trim() || 'Tên Câu Lạc Bộ Của Bạn'}
                          </h4>
                        </div>

                        {/* Stats row directly below title */}
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-semibold flex-wrap">
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            1 thành viên
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Trophy className="w-3 h-3 text-slate-400" />
                            0 giải đấu
                          </span>
                        </div>
                      </div>

                      {/* Nút xóa nhanh Logo/Bìa */}
                      <div className="flex items-center gap-1 text-[10px] shrink-0">
                        {watchLogoUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setValue('logoUrl', '');
                            }}
                            className="text-slate-400 hover:text-rose-500 px-1 py-0.5 rounded cursor-pointer"
                          >
                            Xóa logo
                          </button>
                        )}
                        {watchBannerUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setValue('bannerUrl', '');
                            }}
                            className="text-slate-400 hover:text-rose-500 px-1 py-0.5 rounded cursor-pointer"
                          >
                            Xóa bìa
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mô tả ngắn nếu có */}
                    {(watchDescription || '').trim() && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                        {watchDescription}
                      </p>
                    )}

                    {/* Badges / Tags Row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                      {/* Category Sport Badge */}
                      {selectedCategory ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] sm:text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-2xs">
                          {(() => {
                            const logo = getSportLogo(selectedCategory.name);
                            return logo ? (
                              <img src={logo} alt={selectedCategory.name} className="w-2.5 h-2.5 object-contain" />
                            ) : (
                              <span className="w-1 h-1 rounded-full bg-white" />
                            );
                          })()}
                          {selectedCategory.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-100 bg-slate-50 text-slate-500 text-[10px] sm:text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1 h-1 rounded-full bg-slate-400" />
                          Thể thao
                        </span>
                      )}

                      {/* Visibility Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-[10px] sm:text-[9px] font-semibold">
                        {watchVisibility === 'PUBLIC' ? (
                          <>
                            <Globe className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                            <span>Công khai</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span>Riêng tư</span>
                          </>
                        )}
                      </span>

                      {/* Join Mode Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[9px] font-bold uppercase tracking-wider shadow-2xs ${
                          watchJoinMode === 'INVITE_ONLY'
                            ? 'bg-rose-600 text-white'
                            : watchJoinMode === 'APPROVAL'
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        {watchJoinMode === 'INVITE_ONLY'
                          ? 'Chỉ mời'
                          : watchJoinMode === 'APPROVAL'
                            ? 'Cần duyệt'
                            : 'Mở tự do'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden file inputs for Logo & Banner */}
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
                      <span>Đang tạo câu lạc bộ...</span>
                    </>
                  ) : (
                    <>
                      <span>{translate('submit')}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-400">
                  Địa chỉ sân bãi, nội quy & form thành viên có thể thiết lập thêm bất cứ lúc nào trong Cài đặt CLB.
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
