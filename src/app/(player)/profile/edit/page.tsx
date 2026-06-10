'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, getButtonClasses } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/utils/error';
import { trimSpaces, trimAndNormalizeSpaces } from '@/utils/string';
import { usersApi } from '@/features/users/api';
import toast from 'react-hot-toast';
import { User, Lock, Save, Camera, ArrowLeft, Loader2, Shield } from 'lucide-react';
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
      // Date must be in the past
      return date < today;
    }, 'Ngày sinh không thể ở tương lai'),
  gender: z.string().optional().or(z.literal('')),
  address: z.string().max(255, 'Địa chỉ tối đa 255 ký tự').optional().or(z.literal('')),
  bio: z.string().max(500, 'Giới thiệu tối đa 500 ký tự').optional(),
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
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Profile Form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phoneNumber || '',
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
      gender: user?.gender || '',
      address: user?.address || '',
      bio: user?.bio || '',
    },
  });

  // Cập nhật defaultValues khi user load xong
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || '',
        phone: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        address: user.address || '',
        bio: user.bio || '',
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
      // Clean data before sending
      const cleanData = {
        fullName: trimAndNormalizeSpaces(data.fullName),
        phoneNumber: trimSpaces(data.phone || ''),
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender || undefined,
        address: data.address ? trimSpaces(data.address) : undefined,
        bio: data.bio ? trimSpaces(data.bio) : undefined,
      };

      const response = await usersApi.updateProfile(cleanData);
      
      // Update local state
      setUser((response as any).data || response);
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
      const url = (response as any).avatarUrl || (response as any).profile?.avatarUrl;

      
      // Update store user locally so it reflects immediately
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

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/profile" className={getButtonClasses("outline", "sm", "h-10 w-10 p-0 border-slate-200")}>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center">
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  activeTab === 'profile' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-5 h-5" />
                Thông tin cá nhân
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        {...profileForm.register('gender')}
                      >
                        <option value="">Chưa chọn</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                      {profileForm.formState.errors.gender && (
                        <p className="text-xs font-semibold text-red-500">{profileForm.formState.errors.gender.message}</p>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Địa chỉ"
                    placeholder="Nhập địa chỉ của bạn (VD: TP.HCM, Việt Nam)"
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
                      <p className="text-xs font-semibold text-red-500">{profileForm.formState.errors.bio.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isSubmittingProfile} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
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
                    <Button type="submit" variant="secondary" disabled={isSubmittingPassword} className="bg-slate-100 text-slate-900 hover:bg-slate-200">
                      Đổi mật khẩu
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
