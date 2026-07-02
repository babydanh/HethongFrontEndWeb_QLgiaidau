import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';
import type { UserChangeRequest, UserProfile } from '@/types/user';
export type { UserChangeRequest, UserProfile };

interface RawUserProfileResponse {
  id?: string;
  email?: string;
  profile?: {
    fullName?: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    phone?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    provinceCode?: string;
    isGenderLocked?: boolean;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
  [key: string]: unknown;
}

const mapUserProfile = (data: RawUserProfileResponse): UserProfile => {
  return {
    ...data,
    fullName: data.profile?.fullName,
    avatarUrl: data.profile?.avatarUrl,
    coverUrl: data.profile?.coverUrl,
    bio: data.profile?.bio,
    phoneNumber: data.profile?.phone || data.profile?.phoneNumber,
    dateOfBirth: data.profile?.dateOfBirth,
    gender: data.profile?.gender,
    address: data.profile?.address,
    provinceCode: data.profile?.provinceCode,
    isEmailVerified: data.isEmailVerified as boolean | undefined,
    isPhoneVerified: data.isPhoneVerified as boolean | undefined,
    isGenderLocked: data.profile?.isGenderLocked as boolean | undefined,
    bankName: data.profile?.bankName,
    bankAccountNumber: data.profile?.bankAccountNumber,
    bankAccountName: data.profile?.bankAccountName,
  } as UserProfile;
};

export const usersApi = {
  getUsers: (params?: Record<string, unknown>) => api.get<ApiResponse<UserProfile[]>>('/users', { params }).then(res => res.data),
  searchUsers: (q: string) => api.get<ApiResponse<UserProfile[]>>(`/users/search/public?q=${encodeURIComponent(q)}`).then(res => res.data),
  searchUsersByQuery: (q: string) => api.get<ApiResponse<UserProfile[]>>(`/users/search?q=${encodeURIComponent(q)}`).then(res => res.data),
  getProfile: () => api.get<ApiResponse<RawUserProfileResponse>>('/users/profile').then(res => {
    const mapped = mapUserProfile(res.data);
    return mapped;
  }),
  getUserById: (id: string) => api.get<ApiResponse<UserProfile>>(`/users/${id}`).then(res => res.data),
  updateProfile: <T>(data: T) => api.patch<ApiResponse<RawUserProfileResponse>>('/users/profile', data).then(res => mapUserProfile(res.data)),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<RawUserProfileResponse>>('/users/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => mapUserProfile(res.data));
  },
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<RawUserProfileResponse>>('/users/profile/cover', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => mapUserProfile(res.data));
  },
  changePassword: <T>(data: T) => api.patch<ApiResponse<{ message: string }>>('/users/change-password', data).then(res => res.data),
  deleteUser: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/users/${id}`).then(res => res.data),
  createChangeRequest: (data: { requestType: 'GENDER' | 'EMAIL'; newValue: string }) =>
    api.post<ApiResponse<UserChangeRequest>>('/users/change-requests', data).then(res => res.data),
  deleteAccount: (data: { password?: string }) => api.post<ApiResponse<{ message: string }>>('/users/delete-account', data).then(res => res.data),
  getAdminChangeRequests: (params?: { status?: string }) =>
    api.get<ApiResponse<UserChangeRequest[]>>('/users/admin/change-requests', { params }).then(res => res.data),
  approveChangeRequest: (id: string, data?: { adminNote?: string }) =>
    api.patch<ApiResponse<UserChangeRequest>>(`/users/admin/change-requests/${id}/approve`, data).then(res => res.data),
  rejectChangeRequest: (id: string, data?: { adminNote?: string }) =>
    api.patch<ApiResponse<UserChangeRequest>>(`/users/admin/change-requests/${id}/reject`, data).then(res => res.data),
};
