import { Tournament } from '@/features/tournaments/api';
import { Button } from '@/components/ui/Button';
import { Trophy, AlertCircle, User } from 'lucide-react';
import { useAuthStore } from '@/lib/zustand/authStore';

interface Props {
  tournament: Tournament;
}

export default function OverviewTab({ tournament }: Props) {
  const { user } = useAuthStore();
  const isOwner = user?.id === tournament.organizerId;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 flex flex-col gap-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" /> Giới thiệu giải đấu
          </h3>
          <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed">
            {tournament.description ? (
              <p>{tournament.description}</p>
            ) : (
              <p className="italic text-slate-400">Ban tổ chức chưa cập nhật thông tin giới thiệu cho giải đấu này.</p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Thông tin chi tiết
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-2">Giải thưởng</span>
              <p className="text-slate-700 font-medium text-sm">Cúp Vô Địch + Kỷ niệm chương. Giải thưởng tiền mặt sẽ thông báo sau.</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-2">Thể thức</span>
              <p className="text-slate-700 font-medium text-sm">
                {tournament.format === 'SINGLE_ELIMINATION' ? 'Loại trực tiếp' : 
                 tournament.format === 'DOUBLE_ELIMINATION' ? 'Nhánh thắng/Nhánh thua' : 
                 tournament.format === 'ROUND_ROBIN' ? 'Vòng tròn tính điểm' : 
                 tournament.format}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Trạng thái</span>
              <p className="text-slate-700 font-medium text-sm">
                {tournament.status === 'UPCOMING' ? 'Sắp diễn ra' : 
                 tournament.status === 'ONGOING' ? 'Đang diễn ra' : 
                 tournament.status === 'COMPLETED' ? 'Đã kết thúc' : 
                 tournament.status === 'CANCELLED' ? 'Đã hủy' : 
                 tournament.status === 'DRAFT' ? 'Bản nháp' : tournament.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-6 flex flex-col gap-6">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Ban tổ chức</span>
            <div className="font-bold text-slate-900 flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-slate-900 font-bold">{tournament.organizer?.fullName || 'Ẩn danh'}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Tổ chức giải đấu</p>
              </div>
            </div>
          </div>
          
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Lệ phí tham gia</span>
            <div className="text-xl font-black text-emerald-600">
              {tournament.entryFee && tournament.entryFee > 0 
                ? `${tournament.entryFee.toLocaleString('vi-VN')} ${tournament.currency || 'VND'}` 
                : 'Miễn phí'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Phí đăng ký tham gia</p>
          </div>

          {tournament.status === 'UPCOMING' && !isOwner && (
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2">
              Đăng ký ngay
            </Button>
          )}
          {isOwner && tournament.status === 'UPCOMING' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2">
              <p className="text-sm text-blue-800 font-medium text-center">
                Bạn là chủ sở hữu giải đấu này
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
