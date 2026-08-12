'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import {
  ArrowRight,
  Building,
  FileWarning,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UserCog,
  Clock,
} from 'lucide-react';

const moderationCards = [
  {
    title: 'Duyệt sao uy tín',
    description: 'Xác minh hồ sơ người chơi và xử lý đơn đang chờ.',
    href: '/moderation/verification',
    icon: ShieldCheck,
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    title: 'Duyệt cộng đồng',
    description: 'Phê duyệt hoặc từ chối câu lạc bộ mới gửi lên hệ thống.',
    href: '/moderation/communities',
    icon: Building,
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    title: 'Duyệt đổi thông tin',
    description: 'Kiểm tra yêu cầu đổi email hoặc giới tính nhạy cảm.',
    href: '/moderation/change-requests',
    icon: UserCog,
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    title: 'Báo cáo vi phạm',
    description: 'Đọc hồ sơ tố cáo, xử lý và chuyển cấp khi vượt thẩm quyền.',
    href: '/moderation/reports',
    icon: ShieldAlert,
    tone: 'border-slate-200 bg-rose-50 text-rose-700',
  },
  {
    title: 'Duyệt giải đấu',
    description: 'Duyệt giải mới trước khi lên hệ thống xếp hạng và công khai.',
    href: '/moderation/tournaments',
    icon: Trophy,
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
  },
];

const getResponseItems = <T,>(response: ApiResponse<T[]> | undefined): T[] =>
  Array.isArray(response?.data) ? response.data : [];

export default function ModerationDashboardPage() {
  const [pendingCounts, setPendingCounts] = useState({
    verifications: 0,
    communities: 0,
    changeRequests: 0,
    tournaments: 0,
  });

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const [verifRes, commRes, changeRes, tourRes] = await Promise.allSettled([
          api.get<ApiResponse<any[]>>('/admin/verification-tickets?status=PENDING'),
          api.get<ApiResponse<any[]>>('/communities/pending'),
          api.get<ApiResponse<any[]>>('/admin/change-requests?status=PENDING'),
          api.get<ApiResponse<any[]>>('/admin/tournaments?status=PENDING_APPROVAL'),
        ]);
        setPendingCounts({
          verifications: verifRes.status === 'fulfilled' ? getResponseItems(verifRes.value).length : 0,
          communities: commRes.status === 'fulfilled' ? getResponseItems(commRes.value).length : 0,
          changeRequests: changeRes.status === 'fulfilled' ? getResponseItems(changeRes.value).length : 0,
          tournaments: tourRes.status === 'fulfilled' ? getResponseItems(tourRes.value).length : 0,
        });
      } catch (_) {}
    };
    fetchPending();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner thông báo */}
      {(pendingCounts.verifications + pendingCounts.communities + pendingCounts.changeRequests + pendingCounts.tournaments) > 0 ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-lg font-bold">
                {pendingCounts.verifications + pendingCounts.communities + pendingCounts.changeRequests + pendingCounts.tournaments}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-1000 animate-pulse" />
                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">Có việc cần xử lý ngay</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingCounts.verifications > 0 && (
                  <a href="/moderation/verification" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Sao uy tín ({pendingCounts.verifications})
                  </a>
                )}
                {pendingCounts.communities > 0 && (
                  <a href="/moderation/communities" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    <Building className="w-3.5 h-3.5" />
                    CLB ({pendingCounts.communities})
                  </a>
                )}
                {pendingCounts.changeRequests > 0 && (
                  <a href="/moderation/change-requests" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    <UserCog className="w-3.5 h-3.5" />
                    Đổi TT ({pendingCounts.changeRequests})
                  </a>
                )}
                {pendingCounts.tournaments > 0 && (
                  <a href="/moderation/tournaments" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    <Trophy className="w-3.5 h-3.5" />
                    Giải đấu ({pendingCounts.tournaments})
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
          Khu điều phối
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Điều phối kiểm duyệt an toàn
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Khu này dành cho người điều phối và admin xử lý các case duyệt, xác minh, báo cáo và chế tài.
          Các hành động nặng như hoàn nguyên kết quả, khóa vĩnh viễn hoặc cấu hình hệ thống vẫn nằm ở khu admin.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moderationCards.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`inline-flex rounded-lg border p-3 ${item.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                Mở màn xử lý
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

