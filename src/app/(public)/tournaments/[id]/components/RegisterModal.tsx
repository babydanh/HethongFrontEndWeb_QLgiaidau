'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { X, Users } from 'lucide-react';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useRouter } from 'next/navigation';

interface Props {
  tournamentId: string;
  tournamentName: string;
  entryFee: number;
  matchType?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterModal({ tournamentId, tournamentName, entryFee, matchType, isOpen, onClose }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSingles = matchType === 'SINGLES';

  const registerSchema = z.object({
    teamName: z.string().optional(),
  });

  type RegisterFormValues = z.infer<typeof registerSchema>;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      teamName: user?.fullName || '',
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: RegisterFormValues) => {
    if (!isAuthenticated || !user) {
      toast.error('Vui lòng đăng nhập để đăng ký tham gia giải đấu');
      window.location.assign(`/login?redirect=/tournaments/${tournamentId}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const rawName = trimAndNormalizeSpaces(data.teamName || '');
      const teamName = rawName.length > 0 ? rawName : (user?.fullName || 'Người chơi');
      const res = await tournamentsApi.register(tournamentId, { teamName });
      const participantId = res?.data?.participant?.id;
      
      toast.success('Đăng ký thành công!');
      reset();
      onClose();
      
      if (entryFee > 0 && participantId) {
        router.push(`/payments/checkout?participantId=${participantId}&tournamentId=${tournamentId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Đăng ký tham gia
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-5">
            Bạn đang đăng ký tham gia giải đấu <strong className="text-slate-900">{tournamentName}</strong>.
          </p>
          
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-semibold mb-0.5">Tên VĐV đăng ký</p>
                <p className="text-base font-bold text-slate-900">{user?.fullName || 'Chưa cập nhật'}</p>
                <p className="text-xs text-slate-500 mt-0.5">Tên mặc định lấy từ tài khoản cá nhân</p>
              </div>
            </div>

            {!isSingles && (
              <Input
                label="Tên đội thi đấu (Mặc định dùng tên chính mình)"
                placeholder={user?.fullName || "Ví dụ: VNDC Sport"}
                defaultValue={user?.fullName || ''}
                {...register('teamName')}
                error={errors.teamName?.message}
              />
            )}
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mt-2">
              <p className="text-xs text-blue-700 font-medium">
                * Lưu ý: Lệ phí tham gia sẽ được thông báo ở bước tiếp theo nếu có. Bằng việc đăng ký, bạn đồng ý với các điều khoản của Ban tổ chức.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-600">
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Đăng ký'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
