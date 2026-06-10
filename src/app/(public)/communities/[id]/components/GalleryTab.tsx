'use client';

import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { communitiesApi } from '@/features/communities/api';
import { uploadApi } from '@/features/upload/api';
import toast from 'react-hot-toast';

export default function GalleryTab({ communityId, isOwnerOrMod }: { communityId: string, isOwnerOrMod: boolean }) {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGallery = async () => {
    try {
      setIsLoading(true);
      const res = await communitiesApi.getGallery(communityId);
      setImages(res.data || []);
    } catch (error) {
      console.error('Failed to fetch gallery', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [communityId]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const uploadRes = await uploadApi.uploadImage(file);
      await communitiesApi.addGalleryItem(communityId, { imageUrl: uploadRes.url });
      toast.success('Đã tải ảnh lên thành công!');
      fetchGallery();
    } catch (error) {
      console.error('Upload error', error);
      toast.error('Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá ảnh này?')) return;
    try {
      await communitiesApi.removeGalleryItem(communityId, imageId);
      toast.success('Đã xoá ảnh!');
      fetchGallery();
    } catch (error) {
      console.error('Delete error', error);
      toast.error('Lỗi khi xoá ảnh.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Ảnh hoạt động</h3>
        {isOwnerOrMod && (
          <>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <Button 
              onClick={handleUploadClick}
              disabled={isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {isUploading ? 'Đang tải lên...' : 'Upload ảnh'}
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500">Đang tải dữ liệu...</div>
      ) : images.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed p-12 text-center">
          <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-medium text-lg">Chưa có hình ảnh nào</p>
          <p className="text-slate-500 mt-1">Câu lạc bộ chưa đăng tải hình ảnh hoạt động nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(img => (
            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img src={img.imageUrl} alt="Gallery" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              {isOwnerOrMod && (
                <button 
                  onClick={() => handleDelete(img.id)}
                  className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
