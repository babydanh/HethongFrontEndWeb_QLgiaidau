'use client';

import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Plus, Trash2, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { communitiesApi } from '@/features/communities/api';
import { uploadApi } from '@/features/upload/api';
import toast from 'react-hot-toast';

interface GalleryImage {
  id: string;
  imageUrl: string;
}

export default function GalleryTab({ communityId, isOwnerOrMod }: { communityId: string, isOwnerOrMod: boolean }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGallery = async () => {
    try {
      if (!isLoading) {
        setIsLoading(true);
      }
      const res = await communitiesApi.getGallery(communityId);
      setImages(res.data || []);
    } catch (error) {
      console.error('Failed to fetch gallery', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchGallery();
    });
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

  const handleDelete = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 border-dashed p-12 text-center">
          <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-medium text-lg">Chưa có hình ảnh nào</p>
          <p className="text-slate-500 mt-1">Câu lạc bộ chưa đăng tải hình ảnh hoạt động nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div 
              key={img.id} 
              onClick={() => setLightboxIndex(idx)}
              className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer hover:opacity-95 transition-opacity"
            >
              <img src={img.imageUrl} alt="Gallery" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              {isOwnerOrMod && (
                <button 
                  onClick={(e) => handleDelete(img.id, e)}
                  className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-rose-50 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Fullscreen Slide Modal */}
      {lightboxIndex !== null && images.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center select-none animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button 
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md transition-all z-[10000] active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Arrow */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(prev => (prev === 0 ? images.length - 1 : prev! - 1));
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all z-[10000] active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Arrow */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(prev => (prev === images.length - 1 ? 0 : prev! + 1));
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all z-[10000] active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Image slide */}
          <div className="relative w-full max-w-5xl h-[80vh] px-4 flex items-center justify-center">
            <img 
              src={images[lightboxIndex].imageUrl} 
              alt={`Gallery detail ${lightboxIndex}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
            />
          </div>

          {/* Bottom Index indicator */}
          <div className="text-white/60 text-xs font-bold mt-4 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full backdrop-blur-sm">
            Hình ảnh {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
