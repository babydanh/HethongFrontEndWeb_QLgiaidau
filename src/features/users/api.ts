import { api } from '@/lib/axios';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  bio?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapUserProfile = (data: any): UserProfile => {
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
  getUsers: (params?: Record<string, unknown>) => api.get('/users', { params }).then(res => res.data.data),
  searchUsers: (q: string) => api.get(`/users/search/public?q=${encodeURIComponent(q)}`).then(res => res.data.data),
  getProfile: () => api.get('/users/profile').then(res => {
    const mapped = mapUserProfile(res.data.data);
    return mapped;
  }),
  getUserById: (id: string) => api.get(`/users/${id}`).then(res => res.data.data),
  updateProfile: <T>(data: T) => api.patch('/users/profile', data).then(res => mapUserProfile(res.data.data)),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => mapUserProfile(res.data.data));
  },
  changePassword: <T>(data: T) => api.patch('/users/change-password', data).then(res => res.data.data),
  deleteUser: (id: string) => api.delete(`/users/${id}`).then(res => res.data.data),
};
