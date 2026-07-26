'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore, User as AuthUser } from '@/lib/zustand/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, getButtonClasses } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/utils/error';
import { trimSpaces, trimAndNormalizeSpaces } from '@/utils/string';
import { usersApi } from '@/features/users/api';
import { authApi } from '@/features/auth/api';
import { regionsApi, Region } from '@/features/regions/api';
import toast from 'react-hot-toast';
import { 
  User, Lock, Save, Camera, ArrowLeft, Loader2, Shield, MapPin,
  Trash2, Mail, Phone, ShieldAlert, CheckCircle2, AlertTriangle, EyeOff, Eye, X, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Zod Schemas matching backend constraints
const profileSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100, 'Họ tên tối đa 100 ký tự'),
  phone: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal(''))
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      return date < today;
    }, 'Ngày sinh không thể ở tương lai'),
  gender: z.string().optional().or(z.literal('')),
  address: z.string().max(255, 'Địa chỉ tối đa 255 ký tự').optional().or(z.literal('')),
  provinceCode: z.string().optional().or(z.literal('')),
  bio: z.string().max(500, 'Giới thiệu tối đa 500 ký tự').optional(),
  bankName: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankAccountName: z.string().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function EditProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();
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
      fullName: user?.fullName || '',
      phone: user?.phoneNumber || '',
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
      gender: user?.gender || '',
      address: user?.address || '',
      provinceCode: user?.provinceCode || '',
      bio: user?.bio || '',
      bankName: user?.bankName || '',
      bankAccountNumber: user?.bankAccountNumber || '',
      bankAccountName: user?.bankAccountName || '',
    },
  });

  // Update default values when user loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || '',
        phone: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
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
      const cleanData = {
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
      toast.success('Cập nhật hồ sơ thành công');
      router.push('/profile');
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
      toast.success('Đổi mật khẩu thành công!');
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
      toast.success('Đã cập nhật ảnh đại diện');
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
      toast.error('Kích thước ảnh không được vượt quá 5MB');
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
      toast.success('Đã cập nhật ảnh bìa');
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
      toast.success('Gửi yêu cầu thay đổi giới tính thành công. Vui lòng chờ Admin duyệt.');
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
      toast.error(`Vui lòng chờ ${emailCooldown}s trước khi yêu cầu gửi lại email xác minh.`);
      return;
    }
    try {
      setIsRequestingEmailCode(true);
      await authApi.requestEmailVerification();
      setEmailCooldown(120);
      toast.success('Mã kích hoạt có hiệu lực trong 120 giây (2 phút) đã được gửi tới email của bạn.');
      setIsEmailModalOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRequestingEmailCode(false);
    }
  };

  const handleConfirmEmailVerification = async () => {
    if (!emailToken.trim()) {
      toast.error('Vui lòng nhập mã kích hoạt');
      return;
    }
    try {
      setIsConfirmingEmailCode(true);
      await authApi.confirmEmailVerification(emailToken.trim());
      toast.success('Xác minh Email thành công!');
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
      toast.error('Vui lòng nhập số điện thoại trước khi xác minh');
      return;
    }
    try {
      setIsRequestingPhoneCode(true);
      await authApi.requestPhoneVerification(phoneToVerify);
      toast.success(
        process.env.NODE_ENV === 'production'
          ? 'Mã OTP đã được gửi tới số điện thoại của bạn.'
          : 'Mã OTP đã được gửi tới số điện thoại (Vui lòng kiểm tra Console logs của Backend)'
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
      toast.error('Vui lòng nhập mã OTP');
      return;
    }
    try {
      setIsConfirmingPhoneCode(true);
      await authApi.confirmPhoneVerification(phoneOtp.trim());
      toast.success('Xác minh Số điện thoại thành công!');
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
      toast.error('Vui lòng nhập mật khẩu xác nhận');
      return;
    }
    try {
      setIsDeletingAccount(true);
      await usersApi.deleteAccount({ password: deletePassword });
      toast.success('Tài khoản của bạn đã được xóa thành công.');
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
          <h1 className="text-2xl font-bold text-slate-900">Cài đặt tài khoản</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý thông tin cá nhân và bảo mật của bạn</p>
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
                Thông tin cá nhân
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
                Tài khoản hoàn tiền
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
                Bảo mật & Mật khẩu
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
                  {isUploadingCover ? 'Đang tải...' : 'Thay đổi ảnh bìa'}
                </label>
              </div>

              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h2>
              </div>
              <div className="p-6">
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="flex flex-col gap-5">
                  <Input
                    label="Họ và tên"
                    placeholder="Nhập họ tên đầy đủ"
                    {...profileForm.register('fullName')}
                    error={profileForm.formState.errors.fullName?.message}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                      label="Số điện thoại"
                      placeholder="0912345678"
                      {...profileForm.register('phone')}
                      error={profileForm.formState.errors.phone?.message}
                    />
                    <Input
                      label="Ngày sinh"
                      type="date"
                      {...profileForm.register('dateOfBirth')}
                      error={profileForm.formState.errors.dateOfBirth?.message}
                    />
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">Giới tính</label>
                      <select
                        disabled={user?.isGenderLocked}
                        className={`w-full px-4 py-2.5 rounded-lg border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                          user?.isGenderLocked ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'
                        }`}
                        {...profileForm.register('gender')}
                      >
                        <option value="">Chưa chọn</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                      {user?.isGenderLocked ? (
                        <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center justify-between">
                          <span>Giới tính đã bị khóa sau khi giải đấu hoàn thành.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRequestGender(user?.gender || 'Nam');
                              setIsGenderModalOpen(true);
                            }}
                            className="text-amber-700 hover:text-amber-800 underline active:scale-95 transition-all outline-none font-bold"
                          >
                            Gửi yêu cầu đổi
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
                        <MapPin className="w-4 h-4 text-slate-400" /> Khu vực tranh tài
                      </label>
                      <select
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        {...profileForm.register('provinceCode')}
                      >
                        <option value="">Chưa chọn (Không tranh hạng Tier S)</option>
                        {provinces.map(p => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                      {profileForm.formState.errors.provinceCode && (
                        <p className="text-xs font-semibold text-rose-500">{profileForm.formState.errors.provinceCode.message}</p>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Địa chỉ chi tiết"
                    placeholder="Nhập địa chỉ cụ thể của bạn"
                    {...profileForm.register('address')}
                    error={profileForm.formState.errors.address?.message}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Giới thiệu bản thân</label>
                    <Textarea
                      placeholder="Viết một chút về phong cách chơi của bạn..."
                      className="h-28 resize-none"
                      {...profileForm.register('bio')}
                    />
                    {profileForm.formState.errors.bio && (
                      <p className="text-xs font-semibold text-rose-500">{profileForm.formState.errors.bio.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 gap-3">
                    <Button type="submit" disabled={isSubmittingProfile} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm active:scale-[0.98] transition-all">
                      <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                    </Button>
                  </div>
                </form>
              </div>

              {/* Account Verification Section */}
              <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Xác minh tài khoản</h2>
              </div>
              <div className="p-6 flex flex-col gap-6">
                
                {/* Email Verification Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mt-0.5">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Địa chỉ Email</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {user?.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác minh
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> Chưa xác minh
                        </span>
                        <Button 
                          onClick={handleRequestEmailVerification} 
                          disabled={isRequestingEmailCode}
                          variant="outline" 
                          size="sm"
                          className="h-8 text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                        >
                          {isRequestingEmailCode ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Xác minh
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
                      <h4 className="font-semibold text-slate-900 text-sm">Số điện thoại</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{user?.phoneNumber || 'Chưa cập nhật số điện thoại'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {user?.isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác minh
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> Chưa xác minh
                        </span>
                        <Button 
                          onClick={handleRequestPhoneVerification} 
                          disabled={isRequestingPhoneCode}
                          variant="outline" 
                          size="sm"
                          className="h-8 text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                        >
                          {isRequestingPhoneCode ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Xác minh
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
                <h2 className="text-lg font-bold text-slate-900">Tài khoản nhận hoàn tiền</h2>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Cấu hình thông tin tài khoản ngân hàng hoặc số điện thoại ví điện tử chính xác của bạn để Ban Tổ Chức (BTC) có thể gửi lại lệ phí giải đấu cho bạn trong trường hợp bạn xin rút khỏi giải đấu trước khi giải khởi tranh.
                </p>
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">Ngân hàng / Ví nhận tiền</label>
                      <select
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        {...profileForm.register('bankName')}
                      >
                        <option value="">Chưa chọn ngân hàng/ví</option>
                        <optgroup label="Ví điện tử">
                          <option value="Momo">Ví điện tử MoMo</option>
                          <option value="ZaloPay">Ví điện tử ZaloPay</option>
                          <option value="ShopeePay">Ví điện tử ShopeePay</option>
                        </optgroup>
                        <optgroup label="Ngân hàng">
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
                      label={['Momo', 'ZaloPay', 'ShopeePay'].includes(profileForm.watch('bankName') || '') ? 'Số điện thoại ví' : 'Số tài khoản'}
                      placeholder={['Momo', 'ZaloPay', 'ShopeePay'].includes(profileForm.watch('bankName') || '') ? 'Ví dụ: 0912345678' : 'Ví dụ: 0011001234567'}
                      {...profileForm.register('bankAccountNumber')}
                      error={profileForm.formState.errors.bankAccountNumber?.message}
                    />
                  </div>

                  <Input
                    label="Tên chủ tài khoản / ví (Viết hoa không dấu)"
                    placeholder="Ví dụ: NGUYEN VAN A"
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
                      <Save className="w-4 h-4 mr-2" /> Lưu cấu hình hoàn tiền
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
                  <h2 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h2>
                </div>
                <div className="p-6">
                  <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="flex flex-col gap-5">
                    <Input
                      label="Mật khẩu hiện tại"
                      type="password"
                      placeholder="Nhập mật khẩu cũ"
                      {...passwordForm.register('currentPassword')}
                      error={passwordForm.formState.errors.currentPassword?.message}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Input
                        label="Mật khẩu mới"
                        type="password"
                        placeholder="Nhập mật khẩu mới"
                        {...passwordForm.register('newPassword')}
                        error={passwordForm.formState.errors.newPassword?.message}
                      />
                      <Input
                        label="Xác nhận mật khẩu"
                        type="password"
                        placeholder="Nhập lại mật khẩu mới"
                        {...passwordForm.register('confirmPassword')}
                        error={passwordForm.formState.errors.confirmPassword?.message}
                      />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <Button type="submit" variant="secondary" disabled={isSubmittingPassword} className="active:scale-[0.98] transition-all font-semibold">
                        Đổi mật khẩu
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Danger Zone Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-6 py-5 border-b border-rose-100 bg-rose-50/30 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h2 className="text-lg font-bold text-rose-900">Vùng nguy hiểm</h2>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Xóa tài khoản cá nhân</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[60ch] leading-relaxed">
                      Khi thực hiện xóa tài khoản, tất cả dữ liệu cá nhân, hồ sơ thi đấu, và các thông tin liên quan sẽ bị ẩn vĩnh viễn. Bạn không thể đăng nhập hoặc tham gia bất kỳ giải đấu nào sau hành động này.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-start">
                    <Button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      variant="destructive"
                      className="font-bold px-4 py-2.5 shadow-sm active:scale-[0.98] transition-all text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Xóa tài khoản
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
              <h3 className="text-base font-bold text-slate-900">Yêu cầu thay đổi giới tính</h3>
              <button 
                onClick={() => setIsGenderModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              Vì bạn đã hoàn thành ít nhất một giải đấu, giới tính của bạn đã được khóa để đảm bảo công bằng. Vui lòng chọn giới tính mới. Yêu cầu sẽ được gửi tới Admin để phê duyệt thủ công.
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Giới tính mong muốn</label>
              <select
                value={requestGender}
                onChange={(e) => setRequestGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setIsGenderModalOpen(false)}
                className="border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold"
              >
                Hủy bỏ
              </Button>
              <Button 
                onClick={handleGenderRequestSubmit}
                disabled={isSubmittingGenderRequest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold active:scale-95"
              >
                {isSubmittingGenderRequest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Gửi yêu cầu
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
              <h3 className="text-base font-bold text-slate-900">Xác thực địa chỉ Email</h3>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              Mã kích hoạt xác thực đã được gửi tới địa chỉ email của bạn. Vui lòng kiểm tra hộp thư (hoặc mục Thư rác/Spam) và nhập vào ô dưới đây.
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-semibold flex items-center justify-between">
              <span>⏱️ Mã xác thực hết hạn sau 120 giây (2 phút)</span>
              {emailCooldown > 0 && (
                <span className="text-blue-600 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                  {emailCooldown}s
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Mã kích thực (Token)</label>
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
                    ? 'Đang gửi...'
                    : emailCooldown > 0
                    ? `Gửi lại sau (${emailCooldown}s)`
                    : 'Gửi lại mã mới'}
                </button>
              </div>
              <Input
                placeholder="Nhập mã xác thực email"
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
                Hủy bỏ
              </Button>
              <Button 
                onClick={handleConfirmEmailVerification}
                disabled={isConfirmingEmailCode}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold active:scale-95"
              >
                {isConfirmingEmailCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Xác thực
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
              <h3 className="text-base font-bold text-slate-900">Xác thực số điện thoại</h3>
              <button 
                onClick={() => setIsPhoneModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              {process.env.NODE_ENV === 'production'
                ? 'Mã OTP 6 chữ số đã được gửi tới số điện thoại của bạn. Vui lòng nhập mã để xác minh.'
                : 'Mã OTP 6 chữ số đã được gửi thử nghiệm và hiển thị trong Console log của hệ thống backend. Vui lòng nhập mã để xác minh số điện thoại.'}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Mã OTP (6 chữ số)</label>
              <Input
                placeholder="Nhập mã OTP 6 số"
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
                Hủy bỏ
              </Button>
              <Button 
                onClick={handleConfirmPhoneVerification}
                disabled={isConfirmingPhoneCode}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold active:scale-95"
              >
                {isConfirmingPhoneCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Xác thực
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
              <h3 className="text-base font-bold">Xác nhận xóa tài khoản cá nhân</h3>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              Hành động này <span className="font-bold text-rose-600">không thể hoàn tác</span>. Vui lòng nhập mật khẩu hiện tại của bạn để tiếp tục xóa tài khoản.
            </div>
            
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-sm font-semibold text-slate-700">Mật khẩu xác nhận</label>
              <div className="relative">
                <Input
                  type={showDeletePassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu của bạn"
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
                Hủy bỏ
              </Button>
              <Button
                onClick={handleDeleteAccountSubmit}
                disabled={isDeletingAccount}
                variant="destructive"
                className="font-bold active:scale-95"
              >
                {isDeletingAccount ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
