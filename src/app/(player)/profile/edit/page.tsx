'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore, User as AuthUser } from '@/lib/zustand/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, getButtonClasses } from '@/components/ui/Button';
import { Input, DatePicker } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/utils/error';
import { trimSpaces, trimAndNormalizeSpaces } from '@/utils/string';
import { usersApi } from '@/features/users/api';
import { authApi } from '@/features/auth/api';
import { regionsApi, Region } from '@/features/regions/api';
import { communitiesApi } from '@/features/communities/api';
import toast from 'react-hot-toast';
import { 
  User, Lock, Save, Camera, ArrowLeft, Loader2, Shield, MapPin,
  Trash2, Mail, Phone, ShieldAlert, CheckCircle2, AlertTriangle, EyeOff, Eye, X, CreditCard, MessageCircle,
  Bell, BellOff, AtSign, Users, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAutoAddressParser } from '@/utils/vietnamAddressParser';
import { toDateLocalValue } from '@/utils/dateTimeInput';

// Zod Schemas matching backend constraints
const createProfileSchema = (translate: ReturnType<typeof useTranslations>) => z.object({
  email: z.string().email(translate('validationEmail')).max(255, translate('validationEmail')),
  fullName: z.string().min(2, translate('validationFullNameMin')).max(100, translate('validationFullNameMax')),

  phone: z.string().regex(/^[0-9]{10,11}$/, translate('validationPhone')).optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal(''))
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      return date < today;
    }, translate('validationBirthFuture')),
  gender: z.string().optional().or(z.literal('')),
  address: z.string().max(255, translate('validationAddressMax')).optional().or(z.literal('')),
  provinceCode: z.string().optional().or(z.literal('')),
  bio: z.string().max(500, translate('validationBioMax')).optional(),
  bankName: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankAccountName: z.string().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;

const createPasswordSchema = (translate: ReturnType<typeof useTranslations>) => z.object({
  currentPassword: z.string().min(1, translate('validationCurrentPassword')),
  newPassword: z.string().min(8, translate('validationNewPassword')),
  confirmPassword: z.string().min(1, translate('validationConfirmPassword')),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: translate('validationPasswordMismatch'),
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordSchema>>;

export default function EditProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();
    const translate = useTranslations('Profile');
  const profileSchema = useMemo(() => createProfileSchema(translate), [translate]);
  const passwordSchema = useMemo(() => createPasswordSchema(translate), [translate]);
  const [activeTab, setActiveTab] = useState<'profile' | 'refund' | 'security'>('profile');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [provinces, setProvinces] = useState<Region[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Modals state
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [requestGender, setRequestGender] = useState('Nam');
  const [isSubmittingGenderRequest, setIsSubmittingGenderRequest] = useState(false);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailToken, setEmailToken] = useState('');
  const [isRequestingEmailCode, setIsRequestingEmailCode] = useState(false);
  const [isConfirmingEmailCode, setIsConfirmingEmailCode] = useState(false);

  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isRequestingPhoneCode, setIsRequestingPhoneCode] = useState(false);
  const [isConfirmingPhoneCode, setIsConfirmingPhoneCode] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Quyền riêng tư nhắn tin: bật = chặn người lạ nhắn tin (mặc định tắt).
  const handleToggleStrangerMessages = async (blockStrangers: boolean) => {
    try {
      setIsSavingPrivacy(true);
      const response = await usersApi.updateProfile({ allowStrangerMessages: !blockStrangers });
      const responseData = ((response as unknown) as Record<string, unknown>).data || response;
      setUser(responseData as NonNullable<typeof user>);
      toast.success(
        blockStrangers
          ? translate('privacyBlocked')
          : translate('privacyAllowed'),
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  // Club Notification Preferences
  const [clubNotificationPrefs, setClubNotificationPrefs] = useState<Array<{
    communityId: string;
    communityName: string;
    logoUrl: string | null;
    role: string;
    notificationPreference: 'ALL' | 'MENTIONS_ONLY' | 'MUTED';
  }>>([]);
  const [isLoadingClubPrefs, setIsLoadingClubPrefs] = useState(false);
  const [updatingClubId, setUpdatingClubId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'security') {
      setIsLoadingClubPrefs(true);
      communitiesApi.getMyNotificationPreferences()
        .then((data) => setClubNotificationPrefs(data || []))
        .catch(() => {})
        .finally(() => setIsLoadingClubPrefs(false));
    }
  }, [activeTab]);

  const handleUpdateClubPref = async (communityId: string, preference: 'ALL' | 'MENTIONS_ONLY' | 'MUTED') => {
    try {
      setUpdatingClubId(communityId);
      await communitiesApi.updateMyNotificationPreference(communityId, preference);
      setClubNotificationPrefs((prev) =>
        prev.map((item) =>
          item.communityId === communityId ? { ...item, notificationPreference: preference } : item,
        ),
      );
      toast.success(
        preference === 'ALL'
          ? translate('clubNotificationsAll')
          : preference === 'MENTIONS_ONLY'
          ? translate('clubNotificationsMentions')
          : translate('clubNotificationsMuted'),
      );
    } catch (err) {
      toast.error(getErrorMessage(err, translate('profileNotificationUpdateFailed')));
    } finally {
      setUpdatingClubId(null);
    }
  };

  // Fetch provinces list
  useEffect(() => {
    regionsApi.getProvinces()
      .then(res => {
        setProvinces(res || []);
      })
      .catch(err => {
        console.error('Failed to fetch provinces', err);
      });
  }, []);

  // Profile Form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
        defaultValues: {
      email: user?.email || '',
      fullName: user?.fullName || '',

      phone: user?.phoneNumber || '',
      dateOfBirth: toDateLocalValue(user?.dateOfBirth),
      gender: user?.gender || '',
      address: user?.address || '',
      provinceCode: user?.provinceCode || '',
      bio: user?.bio || '',
      bankName: user?.bankName || '',
      bankAccountNumber: user?.bankAccountNumber || '',
      bankAccountName: user?.bankAccountName || '',
    },
  });

  const watchAddress = profileForm.watch('address');

  const autoDetectedAddress = useAutoAddressParser({
    addressValue: watchAddress,
    provinces,
    wards: [],
    onSelectProvince: (provCode) => {
      profileForm.setValue('provinceCode', provCode, { shouldValidate: true, shouldDirty: true });
    },
    onSelectWard: () => {},
  });

  // Update default values when user loads
  useEffect(() => {
    if (user) {
            profileForm.reset({
        email: user.email || '',
        fullName: user.fullName || '',

        phone: user.phoneNumber || '',
        dateOfBirth: toDateLocalValue(user.dateOfBirth),
        gender: user.gender || '',
        address: user.address || '',
        provinceCode: user.provinceCode || '',
        bio: user.bio || '',
        bankName: user.bankName || '',
        bankAccountNumber: user.bankAccountNumber || '',
        bankAccountName: user.bankAccountName || '',
      });
    }
  }, [user, profileForm]);

  // Password Form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

    const onSubmitProfile = async (data: ProfileFormValues) => {
    try {
      setIsSubmittingProfile(true);
      const normalizedEmail = trimSpaces(data.email).toLowerCase();
      const currentEmail = (user?.email || '').trim().toLowerCase();
      const emailChanged = user?.isEmailVerified !== true && normalizedEmail !== currentEmail;
      const cleanData = {
        email: user?.isEmailVerified === true ? undefined : normalizedEmail,
        fullName: trimAndNormalizeSpaces(data.fullName),

        phoneNumber: trimSpaces(data.phone || ''),
        dateOfBirth: data.dateOfBirth || undefined,
        gender: user?.isGenderLocked ? undefined : (data.gender || undefined),
        address: data.address ? trimSpaces(data.address) : undefined,
        provinceCode: data.provinceCode || undefined,
        bio: data.bio ? trimSpaces(data.bio) : undefined,
        bankName: data.bankName ? trimSpaces(data.bankName) : undefined,
        bankAccountNumber: data.bankAccountNumber ? trimSpaces(data.bankAccountNumber) : undefined,
        bankAccountName: data.bankAccountName ? trimAndNormalizeSpaces(data.bankAccountName).toUpperCase() : undefined,
      };

      const response = await usersApi.updateProfile(cleanData);
      const responseData = ((response as unknown) as Record<string, unknown>).data || response;
      setUser(responseData as NonNullable<typeof user>);

      if (emailChanged) {
        await authApi.requestEmailVerification();
        setEmailCooldown(120);
        setEmailToken('');
        setIsEmailModalOpen(true);
        toast.success(translate('emailChangeVerificationSent'));
      } else {
        toast.success(translate('profileUpdated'));
        router.push('/profile');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormValues) => {
    try {
      setIsSubmittingPassword(true);
      await usersApi.changePassword({
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success(translate('passwordChanged'));
      passwordForm.reset();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const response = await usersApi.uploadAvatar(file);
      const url = response.avatarUrl || undefined;

      const currentUser = useAuthStore.getState().user;
      if (currentUser && url) {
        useAuthStore.getState().setUser({ ...currentUser, avatarUrl: url });
      }
      toast.success(translate('avatarUpdated'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(translate('imageTooLarge'));
      return;
    }

    try {
      setIsUploadingCover(true);
      const response = await usersApi.uploadCover(file);
      const url = response.coverUrl || undefined;

      const currentUser = useAuthStore.getState().user;
      if (currentUser && url) {
        useAuthStore.getState().setUser({ ...currentUser, coverUrl: url });
      }
      toast.success(translate('coverUpdated'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Gender Change Request
  const handleGenderRequestSubmit = async () => {
    try {
      setIsSubmittingGenderRequest(true);
      await usersApi.createChangeRequest({
        requestType: 'GENDER',
        newValue: requestGender,
      });
      toast.success(translate('profileGenderRequestSuccess'));
      setIsGenderModalOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmittingGenderRequest(false);
    }
  };

  const [emailCooldown, setEmailCooldown] = useState(0);

  // Email resend countdown timer
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  // Email Verification Flow
  const handleRequestEmailVerification = async () => {
    if (emailCooldown > 0) {
      toast.error(translate('emailCooldown', { seconds: emailCooldown }));
      return;
    }
    try {
      setIsRequestingEmailCode(true);
      await authApi.requestEmailVerification();
      setEmailCooldown(120);
      toast.success(translate('emailSent'));
      setIsEmailModalOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRequestingEmailCode(false);
    }
  };

  const handleConfirmEmailVerification = async () => {
    if (!emailToken.trim()) {
      toast.error(translate('enterActivationCode'));
      return;
    }
    try {
      setIsConfirmingEmailCode(true);
      await authApi.confirmEmailVerification(emailToken.trim());
      toast.success(translate('emailVerified'));
      setIsEmailModalOpen(false);
      
      // Refresh profile data in store
      const freshProfile = await usersApi.getProfile();
      setUser(freshProfile as unknown as AuthUser);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsConfirmingEmailCode(false);
    }
  };

  // Phone Verification Flow
  const handleRequestPhoneVerification = async () => {
    const phoneToVerify = profileForm.getValues('phone')?.trim() || user?.phoneNumber;
    if (!phoneToVerify) {
      toast.error(translate('phoneRequired'));
      return;
    }
    try {
      setIsRequestingPhoneCode(true);
      await authApi.requestPhoneVerification(phoneToVerify);
      toast.success(
        process.env.NODE_ENV === 'production'
          ? translate('phoneOtpSent')
          : translate('phoneOtpSentDev')
      );
      setIsPhoneModalOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRequestingPhoneCode(false);
    }
  };

  const handleConfirmPhoneVerification = async () => {
    if (!phoneOtp.trim()) {
      toast.error(translate('enterOtp'));
      return;
    }
    try {
      setIsConfirmingPhoneCode(true);
      await authApi.confirmPhoneVerification(phoneOtp.trim());
      toast.success(translate('phoneVerified'));
      setIsPhoneModalOpen(false);
      
      // Refresh profile data in store
      const freshProfile = await usersApi.getProfile();
      setUser(freshProfile as unknown as AuthUser);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsConfirmingPhoneCode(false);
    }
  };

  // Delete Account Flow
  const handleDeleteAccountSubmit = async () => {
    if (!deletePassword) {
      toast.error(translate('profileDeletePasswordRequired'));
      return;
    }
    try {
      setIsDeletingAccount(true);
      await usersApi.deleteAccount({ password: deletePassword });
      toast.success(translate('profileAccountDeleted'));
      setIsDeleteModalOpen(false);
      logout();
      router.push('/');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/profile" className={getButtonClasses("outline", "sm", "h-10 w-10 p-0 border-slate-200 hover:bg-slate-50 active:scale-95 transition-all")}>
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translate('settingsTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">{translate('settingsDescription')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Navigation & Avatar */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <div 
              className="relative group cursor-pointer mb-4"
              onClick={handleAvatarClick}
            >
              <div className="w-32 h-32 rounded-full border-4 border-slate-50 bg-slate-100 flex items-center justify-center overflow-hidden">
                {isUploadingAvatar ? (
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                ) : user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-slate-400 uppercase">{user?.fullName?.charAt(0) || 'U'}</span>
                )}
              </div>
              {!isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{user?.fullName}</h3>
            <p className="text-sm font-medium text-slate-500 mb-6">{user?.email}</p>
            
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm active:scale-95 ${
                  activeTab === 'profile' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-5 h-5" />
                {translate('personalInfoNav')}
              </button>
              <button
                onClick={() => setActiveTab('refund')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm active:scale-95 ${
                  activeTab === 'refund' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                {translate("bankWallet")}
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm active:scale-95 ${
                  activeTab === 'security' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-5 h-5" />
                {translate('securityNav')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="md:col-span-8 flex flex-col gap-6">
          
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Cover Photo Banner Preview & Upload */}
              <div className="h-32 bg-slate-900 relative group overflow-hidden">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="profile-cover-upload"
                  onChange={handleCoverChange} 
                />
                {user?.coverUrl ? (
                  <img 
                    src={user.coverUrl} 
                    alt="Cover" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-80"></div>
                )}
                <label 
                  htmlFor="profile-cover-upload"
                  className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/85 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors backdrop-blur-sm active:scale-95"
                >
                  {isUploadingCover ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  {isUploadingCover ? translate('uploading') : translate('changeCover')}
                </label>
              </div>

              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">{translate('personalInfoTitle')}</h2>
              </div>
              <div className="p-6">
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="flex flex-col gap-5">
                  <Input
                    label={translate('emailAddressLabel')}
                    type="email"
                    placeholder="name@example.com"
                    disabled={user?.isEmailVerified === true}
                    {...profileForm.register('email')}
                    error={profileForm.formState.errors.email?.message}
                  />
                  <p className="text-xs text-slate-500 -mt-3">
                    {user?.isEmailVerified === true ? translate('emailVerifiedLocked') : translate('emailEditHint')}
                  </p>

                  <Input
                    label={translate('fullNameLabel')}
                    placeholder={translate('fullNamePlaceholder')}
                    {...profileForm.register('fullName')}
                    error={profileForm.formState.errors.fullName?.message}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                      data-testid="profile-phone-input"
                      label={translate('phoneLabel')}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="0912345678"
                      {...profileForm.register('phone')}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 11);
                        profileForm.setValue('phone', digitsOnly, {
                          shouldDirty: true,
                          shouldValidate: profileForm.formState.isSubmitted,
                        });
                      }}
                      error={profileForm.formState.errors.phone?.message}
                    />
                    <DatePicker
                      label={translate('dateOfBirthLabel')}
                      value={profileForm.watch('dateOfBirth') || ''}
                      onChange={(val) => profileForm.setValue('dateOfBirth', val, { shouldValidate: true, shouldDirty: true })}
                      error={profileForm.formState.errors.dateOfBirth?.message}
                    />
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">{translate('genderLabel')}</label>
                      <select
                        data-testid="profile-gender-select"
                        disabled={user?.isGenderLocked}
                        className={`w-full px-4 py-2.5 rounded-lg border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                          user?.isGenderLocked ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'
                        }`}
                        {...profileForm.register('gender')}
                      >
                        <option value="">{translate('notSelected')}</option>
                        <option value="Nam">{translate('male')}</option>
                        <option value="Nữ">{translate('female')}</option>
                        <option value="Khác">{translate('other')}</option>
                      </select>
                      {user?.isGenderLocked ? (
                        <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center justify-between">
                          <span>{translate('genderLocked')}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRequestGender(user?.gender || 'Nam');
                              setIsGenderModalOpen(true);
                            }}
                            className="text-amber-700 hover:text-amber-800 underline active:scale-95 transition-all outline-none font-bold"
                          >
                            {translate('requestGenderChange')}
                          </button>
                        </p>
                      ) : (
                        profileForm.formState.errors.gender && (
                          <p className="text-xs font-semibold text-rose-500">{profileForm.formState.errors.gender.message}</p>
                        )
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" /> {translate('competitionRegionLabel')}
                      </label>
                      <select
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        {...profileForm.register('provinceCode')}
                      >
                        <option value="">{translate('regionNotSelected')}</option>
                        {provinces.map(p => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                      {profileForm.formState.errors.provinceCode && (
                        <p className="text-xs font-semibold text-rose-500">{profileForm.formState.errors.provinceCode.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Input
                      label={translate('addressLabel')}
                      placeholder={translate('addressPlaceholder')}
                      {...profileForm.register('address')}
                      error={profileForm.formState.errors.address?.message}
                    />
                    {autoDetectedAddress.isMatched && autoDetectedAddress.province && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-fadeIn">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                        <span>
                          {translate('addressAutoDetected')} <strong>{autoDetectedAddress.province.fullName || autoDetectedAddress.province.name}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">{translate('bioLabel')}</label>
                    <Textarea
                      placeholder={translate('bioPlaceholder')}
                      className="h-28 resize-none"
                      {...profileForm.register('bio')}
                    />
                    {profileForm.formState.errors.bio && (
                      <p className="text-xs font-semibold text-rose-500">{profileForm.formState.errors.bio.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 gap-3">
                    <Button data-testid="save-profile-btn" type="submit" disabled={isSubmittingProfile} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm active:scale-[0.98] transition-all">
                      <Save className="w-4 h-4 mr-2" /> {translate('saveChanges')}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Account Verification Section */}
              <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">{translate('accountVerificationTitle')}</h2>
              </div>
              <div className="p-6 flex flex-col gap-6">
                
                {/* Email Verification Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mt-0.5">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{translate('emailAddressLabel')}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {user?.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {translate('verified')}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> {translate('unverified')}
                        </span>
                        <Button 
                          onClick={handleRequestEmailVerification} 
                          disabled={isRequestingEmailCode}
                          variant="outline" 
                          size="sm"
                          className="h-8 text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                        >
                          {isRequestingEmailCode ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          {translate('confirmVerification')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone Verification Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mt-0.5">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{translate('phoneLabel')}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{user?.phoneNumber || translate('phoneNotUpdated')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {user?.isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {translate('verified')}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> {translate('unverified')}
                        </span>
                        <Button 
                          onClick={handleRequestPhoneVerification} 
                          disabled={isRequestingPhoneCode}
                          variant="outline" 
                          size="sm"
                          className="h-8 text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                        >
                          {isRequestingPhoneCode ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          {translate('confirmVerification')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">{translate('refundAccountTitle')}</h2>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {translate('refundDescription')}
                </p>
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">{translate('bankReceiverLabel')}</label>
                      <select
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        {...profileForm.register('bankName')}
                      >
                        <option value="">{translate('bankNotSelected')}</option>
                        <optgroup label={translate('ewalletGroup')}>
                          <option value="Momo">MoMo</option>
                          <option value="ZaloPay">ZaloPay</option>
                          <option value="ShopeePay">ShopeePay</option>
                        </optgroup>
                        <optgroup label={translate('bankGroup')}>
                          <option value="Vietcombank">Vietcombank</option>
                          <option value="Techcombank">Techcombank</option>
                          <option value="Vietinbank">Vietinbank</option>
                          <option value="BIDV">BIDV</option>
                          <option value="Agribank">Agribank</option>
                          <option value="MB Bank">MB Bank</option>
                          <option value="ACB">ACB</option>
                          <option value="VPBank">VPBank</option>
                          <option value="TPBank">TPBank</option>
                          <option value="Sacombank">Sacombank</option>
                          <option value="VIB">VIB</option>
                        </optgroup>
                      </select>
                      {profileForm.formState.errors.bankName && (
                        <p className="text-xs font-semibold text-rose-500">{profileForm.formState.errors.bankName.message}</p>
                      )}
                    </div>
                    
                    <Input
                      label={['Momo', 'ZaloPay', 'ShopeePay'].includes(profileForm.watch('bankName') || '') ? translate('walletPhoneLabel') : translate('accountNumberLabel')}
                      placeholder={['Momo', 'ZaloPay', 'ShopeePay'].includes(profileForm.watch('bankName') || '') ? translate('walletPhonePlaceholder') : translate('accountNumberPlaceholder')}
                      {...profileForm.register('bankAccountNumber')}
                      error={profileForm.formState.errors.bankAccountNumber?.message}
                    />
                  </div>

                  <Input
                    label={translate('accountNameLabel')}
                    placeholder={translate('accountNamePlaceholder')}
                    {...profileForm.register('bankAccountName')}
                    onChange={(e) => {
                      const normalized = e.target.value
                        .toUpperCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/Đ/g, 'D');
                      profileForm.setValue('bankAccountName', normalized);
                    }}
                    error={profileForm.formState.errors.bankAccountName?.message}
                  />

                  <div className="flex justify-end pt-2 border-t border-slate-100 gap-3">
                    <Button type="submit" disabled={isSubmittingProfile} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm active:scale-[0.98] transition-all">
                      <Save className="w-4 h-4 mr-2" /> {translate('saveRefundSettings')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="flex flex-col gap-6">
              {/* Change Password Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900">{translate('changePasswordTitle')}</h2>
                </div>
                <div className="p-6">
                  <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="flex flex-col gap-5">
                    <Input
                      label={translate('currentPasswordLabel')}
                      type="password"
                      placeholder={translate('currentPasswordPlaceholder')}
                      {...passwordForm.register('currentPassword')}
                      error={passwordForm.formState.errors.currentPassword?.message}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Input
                        label={translate('newPasswordLabel')}
                        type="password"
                        placeholder={translate('newPasswordPlaceholder')}
                        {...passwordForm.register('newPassword')}
                        error={passwordForm.formState.errors.newPassword?.message}
                      />
                      <Input
                        label={translate('confirmPasswordLabel')}
                        type="password"
                        placeholder={translate('confirmPasswordPlaceholder')}
                        {...passwordForm.register('confirmPassword')}
                        error={passwordForm.formState.errors.confirmPassword?.message}
                      />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <Button type="submit" variant="secondary" disabled={isSubmittingPassword} className="active:scale-[0.98] transition-all font-semibold">
                        {translate('changePasswordAction')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Privacy Messaging Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900">{translate('messagingPrivacyTitle')}</h2>
                </div>
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{translate('strangerMessagesTitle')}</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[60ch] leading-relaxed">
                      {translate('strangerMessagesDescription')}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={user?.allowStrangerMessages === false}
                      disabled={isSavingPrivacy}
                      onChange={(e) => void handleToggleStrangerMessages(e.target.checked)}
                    />
                    <span className="relative w-11 h-6 rounded-full bg-slate-200 peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                    <span className="text-xs font-semibold text-slate-600">
                      {isSavingPrivacy ? translate('saving') : user?.allowStrangerMessages === false ? translate('enabled') : translate('disabled')}
                    </span>
                  </label>
                </div>
              </div>

              {/* Club Notification Preferences Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{translate('clubNotificationsTitle')}</h2>
                      <p className="text-xs text-slate-500">{translate('clubNotificationsDescription')}</p>
                    </div>
                  </div>
                  {isLoadingClubPrefs && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>

                <div className="p-6">
                  {isLoadingClubPrefs ? (
                    <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span>{translate("clubPreferencesLoading")}</span>
                    </div>
                  ) : clubNotificationPrefs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">{translate("clubsEmptyTitle")}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{translate("clubNotificationHint")}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {clubNotificationPrefs.map((club) => {
                        const isUpdating = updatingClubId === club.communityId;
                        return (
                          <div
                            key={club.communityId}
                            className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-blue-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-blue-600 font-bold text-sm">
                                {club.logoUrl ? (
                                  <img src={club.logoUrl} alt={club.communityName} className="w-full h-full object-cover" />
                                ) : (
                                  club.communityName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-900 text-sm truncate">{club.communityName}</h4>
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {club.role}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {club.notificationPreference === 'ALL'
                                                                        ? translate('allNotificationsSummary')
                                    : club.notificationPreference === 'MENTIONS_ONLY'
                                    ? translate('mentionsOnlySummary')
                                    : translate('mutedNotificationsSummary')}
                                </p>
                              </div>
                            </div>

                            {/* Preference Segmented Buttons */}
                            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0 self-start sm:self-center">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => void handleUpdateClubPref(club.communityId, 'ALL')}
                                title={translate('allNotificationsTitle')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  club.notificationPreference === 'ALL'
                                    ? 'bg-white text-blue-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>{translate('allNotifications')}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => void handleUpdateClubPref(club.communityId, 'MENTIONS_ONLY')}
                                title={translate('mentionsOnlyTitle')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  club.notificationPreference === 'MENTIONS_ONLY'
                                    ? 'bg-white text-amber-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <AtSign className="w-3.5 h-3.5" />
                                <span>{translate('mentionsOnly')}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => void handleUpdateClubPref(club.communityId, 'MUTED')}
                                title={translate('mutedNotificationsTitle')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  club.notificationPreference === 'MUTED'
                                    ? 'bg-white text-rose-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <BellOff className="w-3.5 h-3.5" />
                                <span>{translate('mutedNotifications')}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-6 py-5 border-b border-rose-100 bg-rose-50/30 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h2 className="text-lg font-bold text-rose-900">{translate('dangerZoneTitle')}</h2>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{translate('deleteAccountTitle')}</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[60ch] leading-relaxed">
                      {translate('deleteAccountDescription')}
                    </p>
                  </div>
                  <div className="pt-2 flex justify-start">
                    <Button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      variant="destructive"
                      className="font-bold px-4 py-2.5 shadow-sm active:scale-[0.98] transition-all text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> {translate('deleteAccountAction')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Gender Change Request Modal */}
      {isGenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{translate('genderRequestTitle')}</h3>
              <button 
                onClick={() => setIsGenderModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              {translate('genderRequestDescription')}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">{translate('requestedGenderLabel')}</label>
              <select
                value={requestGender}
                onChange={(e) => setRequestGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                <option value="Nam">{translate('male')}</option>
                <option value="Nữ">{translate('female')}</option>
                <option value="Khác">{translate('other')}</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setIsGenderModalOpen(false)}
                className="border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold"
              >
                {translate('cancel')}
              </Button>
              <Button 
                onClick={handleGenderRequestSubmit}
                disabled={isSubmittingGenderRequest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold active:scale-95"
              >
                {isSubmittingGenderRequest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {translate('submitRequest')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Email Verification Token Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{translate('emailVerificationTitle')}</h3>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              {translate('emailVerificationDescription')}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-semibold flex items-center justify-between">
              <span>{translate('verificationExpiry')}</span>
              {emailCooldown > 0 && (
                <span className="text-blue-600 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                  {emailCooldown}s
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">{translate('tokenLabel')}</label>
                <button
                  type="button"
                  disabled={emailCooldown > 0 || isRequestingEmailCode}
                  onClick={handleRequestEmailVerification}
                  className={`text-xs font-bold transition-all ${
                    emailCooldown > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-700 underline active:scale-95'
                  }`}
                >
                  {isRequestingEmailCode
                                        ? translate('sending')
                    : emailCooldown > 0
                    ? translate('resendAfter', { seconds: emailCooldown })
                    : translate('resendCode')}
                </button>
              </div>
              <Input
                placeholder={translate('emailTokenPlaceholder')}
                value={emailToken}
                onChange={(e) => setEmailToken(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setIsEmailModalOpen(false)}
                className="border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold"
              >
                {translate('cancel')}
              </Button>
              <Button 
                onClick={handleConfirmEmailVerification}
                disabled={isConfirmingEmailCode}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold active:scale-95"
              >
                {isConfirmingEmailCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {translate('confirmVerification')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Phone OTP Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{translate('phoneVerificationTitle')}</h3>
              <button 
                onClick={() => setIsPhoneModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              {process.env.NODE_ENV === 'production'
                                ? translate('phoneVerificationDescriptionProd')
                : translate('phoneVerificationDescriptionDev')}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">{translate('otpLabel')}</label>
              <Input
                placeholder={translate('otpPlaceholder')}
                maxLength={6}
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setIsPhoneModalOpen(false)}
                className="border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold"
              >
                {translate('cancel')}
              </Button>
              <Button 
                onClick={handleConfirmPhoneVerification}
                disabled={isConfirmingPhoneCode}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold active:scale-95"
              >
                {isConfirmingPhoneCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {translate('confirmVerification')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-rose-100 pb-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">{translate('confirmDeleteTitle')}</h3>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              {translate('deleteAccountWarning', { irreversible: translate('irreversible') })}
            </div>
            
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-sm font-semibold text-slate-700">{translate('deletePasswordLabel')}</label>
              <div className="relative">
                <Input
                  type={showDeletePassword ? 'text' : 'password'}
                  placeholder={translate('deletePasswordPlaceholder')}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletePassword('');
                }}
                className="border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold"
              >
                {translate('cancel')}
              </Button>
              <Button
                onClick={handleDeleteAccountSubmit}
                disabled={isDeletingAccount}
                variant="destructive"
                className="font-bold active:scale-95"
              >
                {isDeletingAccount ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {translate('confirmDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

