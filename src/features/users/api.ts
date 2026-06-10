import { api } from '@/lib/axios';

import { UserProfile } from '@/types/user';
export type { UserProfile };

interface RawUserProfileResponse {
  id?: string;
  email?: string;
  profile?: {
    fullName?: string;
    avatarUrl?: string;
    bio?: string;
    phone?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
  };
  [key: string]: unknown;
}

const mapUserProfile = (data: RawUserProfileResponse): UserProfile => {
  return {
    ...data,
    fullName: data.profile?.fullName,
    avatarUrl: data.profile?.avatarUrl,
    bio: data.profile?.bio,
    phoneNumber: data.profile?.phone || data.profile?.phoneNumber,
    dateOfBirth: data.profile?.dateOfBirth,
    gender: data.profile?.gender,
    address: data.profile?.address,
  } as UserProfile;
};

export const usersApi = {
  getUsers: (params?: Record<string, unknown>) => api.get('/users', { params }).then(res => res.data),
  searchUsers: (q: string) => api.get(`/users/search/public?q=${encodeURIComponent(q)}`).then(res => res.data),
  getProfile: () => api.get('/users/profile').then(res => {
    const mapped = mapUserProfile(res.data);
    return mapped;
  }),
  getUserById: (id: string) => api.get(`/users/${id}`).then(res => res.data),
  updateProfile: <T>(data: T) => api.patch('/users/profile', data).then(res => mapUserProfile(res.data)),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => mapUserProfile(res.data));
  },
  changePassword: <T>(data: T) => api.patch('/users/change-password', data).then(res => res.data),
  deleteUser: (id: string) => api.delete(`/users/${id}`).then(res => res.data),
};
