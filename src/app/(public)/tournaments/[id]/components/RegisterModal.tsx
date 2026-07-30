'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { tournamentsApi } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
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

export default function RegisterModal({ tournamentId, tournamentName, entryFee, isOpen, onClose }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      toast.error('Vui lòng đăng nhập để đăng ký tham gia giải đấu');
      window.location.assign(`/login?redirect=/tournaments/${tournamentId}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const teamName = user?.fullName || 'Người chơi';
      const res = await tournamentsApi.register(tournamentId, { teamName });
      const participantId = res?.data?.participant?.id;
      const payableEntryFee = Number(res?.data?.entryFee ?? entryFee);
      
      toast.success('Đăng ký thành công!');
      onClose();
      
      if (payableEntryFee > 0 && participantId) {
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
          
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-semibold mb-0.5">VĐV Đăng ký</p>
                <p className="text-base font-bold text-slate-900">{user?.fullName || 'Chưa cập nhật'}</p>
                <p className="text-xs text-slate-500 mt-0.5">Tự động sử dụng tên tài khoản cá nhân</p>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-lg mt-1">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                * Lưu ý: Lệ phí tham gia sẽ được thông báo ở bước tiếp theo nếu có. Bằng việc đăng ký, bạn đồng ý với các điều khoản của Ban tổ chức.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-600">
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Đăng ký'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
