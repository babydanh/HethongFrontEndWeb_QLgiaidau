'use client';

import { Community } from '@/features/communities/api';
import { formatDate } from '@/utils/format';
import { MapPin, ShieldCheck, Calendar, Info, FileText, Link as LinkIcon } from 'lucide-react';

import { MapView } from '@/components/map/MapView';

export default function AboutTab({ community }: { community: Community }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 border-b pb-4">
        <Info className="w-5 h-5 text-emerald-600" />
        Về câu lạc bộ này
      </h3>
      
      {community.description ? (
        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap mb-8 text-base">
          {community.description}
        </p>
      ) : (
        <p className="text-slate-400 italic mb-8">Câu lạc bộ này chưa có thông tin giới thiệu.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" /> Thông tin
            </h4>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Khu vực:</span>
                <span className="col-span-2 text-slate-800">{community.locationAddress || 'Chưa cập nhật'}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Trạng thái:</span>
                <span className="col-span-2 flex items-center gap-1 text-slate-800">
                  {community.status === 'APPROVED' ? (
                    <><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đã xác thực</>
                  ) : (
                    <><span className="w-2 h-2 rounded-full bg-amber-500"></span> Chờ duyệt</>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Chế độ:</span>
                <span className="col-span-2 text-slate-800">
                  {community.visibility === 'PUBLIC' ? 'Công khai' : community.visibility === 'PRIVATE' ? 'Riêng tư' : 'Hạn chế'}
                  {' · '}
                  {community.joinMode === 'OPEN' ? 'Mở tự do' : community.joinMode === 'APPROVAL' ? 'Cần duyệt' : 'Chỉ mời'}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Ngày lập:</span>
                <span className="col-span-2 text-slate-800">
                  {community.createdAt ? formatDate(community.createdAt) : 'N/A'}
                </span>
              </div>
            </div>
            {community.lat && community.lng && (
              <div className="mt-6">
                <MapView lat={community.lat} lng={community.lng} popupText={community.name} className="h-48" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {community.rules && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> Nội quy
              </h4>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {community.rules}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
