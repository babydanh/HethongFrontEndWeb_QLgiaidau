'use client';

import { useEffect, useState } from 'react';
import { paymentsApi } from '@/features/payments/api';
import { 
  Users, 
  Building, 
  Trophy, 
  DollarSign, 
  ArrowUpRight, 
  TrendingUp,
  Percent
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalCommunities: number;
  totalTournaments: number;
  totalAmountProcessed: string;
  totalPlatformFee: string;
  totalPayoutProcessed: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentsApi.getAdminStats()
      .then((res) => {
        if (res && res.data) {
          setStats(res.data);
        } else {
          setError('Không lấy được dữ liệu thống kê');
        }
      })

      .catch((err) => {
        console.error('Fetch stats error:', err);
        setError('Đã xảy ra lỗi khi kết nối máy chủ');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
              <div className="w-12 h-4 bg-slate-800 rounded"></div>
            </div>
            <div className="w-24 h-8 bg-slate-800 rounded"></div>
            <div className="w-32 h-4 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 text-center text-rose-300">
        <p className="font-semibold">{error || 'Có lỗi xảy ra'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all"
        >
          Tải lại trang
        </button>
      </div>
    );
  }

  const cards = [
    {
      name: 'Người dùng',
      value: stats.totalUsers,
      subText: 'Tổng số tài khoản đã đăng ký',
      icon: Users,
      color: 'from-blue-500 to-cyan-500 shadow-blue-500/10',
    },
    {
      name: 'Cộng đồng (CLB)',
      value: stats.totalCommunities,
      subText: 'Tổng số câu lạc bộ thể thao',
      icon: Building,
      color: 'from-purple-500 to-indigo-500 shadow-purple-500/10',
    },
    {
      name: 'Giải đấu',
      value: stats.totalTournaments,
      subText: 'Giải đã và đang tổ chức',
      icon: Trophy,
      color: 'from-amber-500 to-orange-500 shadow-amber-500/10',
    },
    {
      name: 'Doanh thu giải đấu',
      value: formatCurrency(stats.totalAmountProcessed),
      subText: 'Tổng lệ phí thu được',
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-500 shadow-emerald-500/10',
    },
    {
      name: 'Hoa hồng phí sàn (5%)',
      value: formatCurrency(stats.totalPlatformFee),
      subText: 'Phần hoa hồng nền tảng giữ lại',
      icon: Percent,
      color: 'from-rose-500 to-pink-500 shadow-rose-500/10',
    },
    {
      name: 'Đã giải ngân cho BTC',
      value: formatCurrency(stats.totalPayoutProcessed),
      subText: 'Số tiền rút đã được duyệt',
      icon: TrendingUp,
      color: 'from-sky-500 to-blue-500 shadow-sky-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Tổng Quan Hệ Thống
        </h2>
        <p className="text-slate-400 text-sm">
          Xem nhanh tình trạng hoạt động và tài chính của nền tảng TournaMaster
        </p>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all duration-300"
            >
              {/* Gradient card glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="flex justify-between items-center mb-4">
                <div className="p-3 bg-slate-800 rounded-xl group-hover:bg-slate-700 transition-colors">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Live
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight group-hover:translate-x-1 transition-transform">
                  {card.value}
                </h3>
                <p className="text-sm font-semibold text-slate-300 mt-2">
                  {card.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {card.subText}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-800/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-lg font-bold text-blue-300">
            Duyệt & Quản lý
          </h3>
          <p className="text-sm text-slate-300 max-w-xl">
            Các cộng đồng mới thành lập và yêu cầu thanh toán từ ban tổ chức đang chờ sự phê duyệt của bạn. Hãy điều hướng qua thanh Menu bên trái để xử lý ngay.
          </p>
        </div>
        <div className="flex gap-4">
          <a 
            href="/admin/communities" 
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            Duyệt Cộng đồng
          </a>
          <a 
            href="/admin/payouts" 
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold border border-slate-700 rounded-xl transition-all active:scale-95"
          >
            Duyệt Rút tiền
          </a>
        </div>
      </div>
    </div>
  );
}
