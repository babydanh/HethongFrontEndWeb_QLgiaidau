'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building,
  FileWarning,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UserCog,
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
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Duyệt đổi thông tin',
    description: 'Kiểm tra yêu cầu đổi email hoặc giới tính nhạy cảm.',
    href: '/moderation/change-requests',
    icon: UserCog,
    tone: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  {
    title: 'Báo cáo vi phạm',
    description: 'Đọc hồ sơ tố cáo và chốt hướng xử lý ban đầu.',
    href: '/moderation/reports',
    icon: ShieldAlert,
    tone: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  {
    title: 'Tranh chấp trận đấu',
    description: 'So sánh chênh lệch điểm số trước khi chuyển cho admin xử lý.',
    href: '/moderation/disputes',
    icon: FileWarning,
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    title: 'Duyệt giải đấu',
    description: 'Duyệt giải mới trước khi lên hệ thống xếp hạng và công khai.',
    href: '/moderation/tournaments',
    icon: Trophy,
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
  },
];

export default function ModerationDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">
          Khu điều phối
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-900">
          Điều phối kiểm duyệt an toàn
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Khu này dành cho người điều phối và admin xử lý các case duyệt, xác minh, báo cáo và tranh chấp.
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
              className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`inline-flex rounded-2xl border p-3 ${item.tone}`}>
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
