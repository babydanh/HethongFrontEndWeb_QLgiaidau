'use client';

import { Award, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function RankingsTab({ communityId }: { communityId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Bảng xếp hạng</h3>
        <Button variant="outline" className="text-slate-600 border-slate-200">
          <Filter className="w-4 h-4 mr-2" />
          Lọc
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-12 text-center border-dashed border-b border-slate-200">
          <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-medium text-lg">Chưa có dữ liệu xếp hạng</p>
          <p className="text-slate-500 mt-1 max-w-md mx-auto">
            Hệ thống tính điểm xếp hạng (Elo) sẽ tự động cập nhật khi các thành viên tham gia thi đấu các giải đấu của cộng đồng.
          </p>
        </div>
      </div>
    </div>
  );
}
