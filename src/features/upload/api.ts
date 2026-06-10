import { api } from '@/lib/axios';

import { ApiResponse } from '@/types/api';

export const uploadApi = {
  uploadImage: (file: File): Promise<{ url: string, publicId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<{ url: string, publicId: string }>>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },
};
