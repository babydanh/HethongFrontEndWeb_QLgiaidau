import { api } from '@/lib/axios';

export const uploadApi = {
  uploadImage: async (file: File): Promise<{ url: string, publicId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },
};
