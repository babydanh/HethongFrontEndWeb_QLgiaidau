'use client';

import { useEffect, useState, useMemo } from 'react';
import { paymentsApi } from '@/features/payments/api';
import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';
import { 
  Users, 
  Building, 
  Trophy, 
  DollarSign, 
  Percent,
  TrendingUp,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface MetricItem {
  value: number;
  change: number;
}

interface Metrics {
  gmv: MetricItem;
  netRevenue: MetricItem;
  heldEscrow: MetricItem;
  transactionsCount: MetricItem;
  totalUsers: MetricItem;
  totalCommunities: MetricItem;
  totalTournaments: MetricItem;
}

interface ChartRow {
  period: string;
  gmv: number;
  revenue: number;
  count: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch metrics and stats dynamically based on groupBy
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!loading) {
        setLoading(true);
      }
      try {
        const res = await api.get<ApiResponse<Metrics>>('/admin/dashboard/metrics', { params: { groupBy } });
        if (res && res.data) {
          setMetrics(res.data);
        } else {
          setError('Không lấy được dữ liệu thống kê tổng hợp');
        }
      } catch (err) {
        console.error('Fetch dashboard metrics error:', err);
        setError('Đã xảy ra lỗi khi kết nối máy chủ');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchMetrics();
    }, 0);
    return () => clearTimeout(timer);
  }, [groupBy]);

  // Fetch chart data when filters change
  useEffect(() => {
    const fetchChartData = async () => {
      if (!chartLoading) {
        setChartLoading(true);
      }
      const params: Record<string, string> = { groupBy };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      try {
        const res = await api.get<ApiResponse<ChartRow[]>>('/admin/dashboard/revenue-chart', { params });
        if (res && res.data) {
          setChartData(res.data);
        }
      } catch (err) {
        console.error('Fetch chart data error:', err);
      } finally {
        setChartLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchChartData();
    }, 0);
    return () => clearTimeout(timer);
  }, [groupBy, startDate, endDate]);

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatShortPeriod = (periodStr: string) => {
    try {
      const date = new Date(periodStr);
      if (isNaN(date.getTime())) return periodStr;
      
      if (groupBy === 'day') {
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      }
      if (groupBy === 'week') {
        return `Tuần ${date.getDate()}/${date.getMonth() + 1}`;
      }
      if (groupBy === 'year') {
        return date.getFullYear().toString();
      }
      // Month
      return date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' });
    } catch {
      return periodStr;
    }
  };

  // Compute stats card data dynamically
  const cards = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        name: 'Người dùng',
        value: metrics.totalUsers.value,
        change: metrics.totalUsers.change,
        subText: 'Tổng số tài khoản đã đăng ký',
        icon: Users,
        color: 'from-blue-500 to-indigo-500 shadow-blue-500/10',
      },
      {
        name: 'Cộng đồng (CLB)',
        value: metrics.totalCommunities.value,
        change: metrics.totalCommunities.change,
        subText: 'Tổng số câu lạc bộ thể thao',
        icon: Building,
        color: 'from-purple-500 to-indigo-500 shadow-purple-500/10',
      },
      {
        name: 'Giải đấu',
        value: metrics.totalTournaments.value,
        change: metrics.totalTournaments.change,
        subText: 'Giải đã và đang tổ chức',
        icon: Trophy,
        color: 'from-amber-500 to-orange-500 shadow-amber-500/10',
      },
      {
        name: 'Tổng GMV Giao dịch',
        value: formatCurrency(metrics.gmv.value),
        change: metrics.gmv.change,
        subText: 'Tổng lệ phí thanh toán qua cổng',
        icon: DollarSign,
        color: 'from-emerald-500 to-teal-500 shadow-emerald-500/10',
      },
      {
        name: 'Hoa hồng nền tảng (Net Revenue)',
        value: formatCurrency(metrics.netRevenue.value),
        change: metrics.netRevenue.change,
        subText: `Phần doanh thu thu về (Escrow phí)`,
        icon: Percent,
        color: 'from-rose-500 to-pink-500 shadow-rose-500/10',
      },
      {
        name: 'Escrow đang giữ',
        value: formatCurrency(metrics.heldEscrow.value),
        change: metrics.heldEscrow.change,
        subText: 'Lệ phí đang khóa chờ giải ngân',
        icon: TrendingUp,
        color: 'from-sky-500 to-blue-500 shadow-sky-500/10',
      },
    ];
  }, [metrics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
                <div className="w-12 h-4 bg-slate-100 rounded"></div>
              </div>
              <div className="w-24 h-8 bg-slate-100 rounded"></div>
              <div className="w-32 h-4 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-96 bg-white border border-slate-200 rounded-2xl p-6 animate-pulse flex items-center justify-center">
          <div className="text-slate-400">Đang tải biểu đồ thống kê...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700">
        <p className="font-semibold">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all"
        >
          Tải lại trang
        </button>
      </div>
    );
  }

  const getCompareText = () => {
    switch (groupBy) {
      case 'day': return '24h qua';
      case 'week': return '7 ngày qua';
      case 'year': return 'năm qua';
      case 'month':
      default:
        return '30 ngày qua';
    }
  };

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">
            Tổng Quan Hệ Thống & Tài Chính
          </h2>
          <p className="text-slate-500 text-sm">
            Báo cáo chi tiết tài chính, doanh thu (GMV & Net Revenue) cùng các chỉ số vận hành
          </p>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="flex justify-between items-center mb-4">
                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                {card.change !== undefined && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    card.change > 0 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : card.change < 0 
                        ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {card.change > 0 ? `+${card.change}%` : `${card.change}%`}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight group-hover:translate-x-1 transition-transform">
                  {card.value}
                </h3>
                <p className="text-sm font-semibold text-slate-700 mt-2">
                  {card.name}
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <span>{card.subText}</span>
                  {card.change !== undefined && (
                    <span className="text-slate-400 font-medium">({getCompareText()})</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Chart Block */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Phân Tích Doanh Thu
            </h3>
            <p className="text-xs text-slate-500">
              Đối chiếu chênh lệch giữa tổng giá trị giao dịch (GMV) và hoa hồng thực nhận của sàn (Net Revenue)
            </p>
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Interval buttons */}
            <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex gap-1">
              {(['day', 'week', 'month', 'year'] as const).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setGroupBy(interval)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    groupBy === interval
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {interval === 'day' ? 'Ngày' : interval === 'week' ? 'Tuần' : interval === 'month' ? 'Tháng' : 'Năm'}
                </button>
              ))}
            </div>

            {/* Date pickers */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none focus:ring-0 w-28"
                placeholder="Từ ngày"
              />
              <span className="text-slate-400 text-xs">—</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none focus:ring-0 w-28"
                placeholder="Đến ngày"
              />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-[10px] text-rose-600 hover:text-rose-700 ml-1 font-bold underline"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chart render */}
        <div className="h-96 relative">
          {chartLoading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2 text-slate-600 text-xs">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Đang đồng bộ dữ liệu...</span>
              </div>
            </div>
          )}

          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
              Không có dữ liệu giao dịch trong khoảng thời gian đã chọn.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={formatShortPeriod} 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#1e293b' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#0f172a' }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(value: number | string | readonly (string | number)[] | undefined, name: string | number | undefined) => {
                    if (value === undefined || Array.isArray(value)) return [String(value || ''), String(name || '')];
                    if (name === 'revenue') return [formatCurrency(value as string | number), 'Hoa hồng sàn (Net)'];
                    if (name === 'gmv') return [formatCurrency(value as string | number), 'Tổng giao dịch (GMV)'];
                    return [value as string | number, String(name || '')];
                  }}
                  labelFormatter={(label) => {
                    try {
                      const date = new Date(label);
                      if (isNaN(date.getTime())) return label;
                      return date.toLocaleDateString('vi-VN', { dateStyle: 'long' });
                    } catch {
                      return label;
                    }
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                  formatter={(value) => value === 'gmv' ? 'Tổng giá trị giao dịch (GMV)' : 'Doanh thu sàn (Net Revenue)'}
                />
                <Area 
                  type="monotone" 
                  dataKey="gmv" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorGmv)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick Navigation Panel */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-lg font-bold text-blue-700">
            Duyệt & Quản lý
          </h3>
          <p className="text-sm text-slate-600 max-w-xl">
            Các yêu cầu thanh toán rút tiền, cấp sao uy tín, và khiếu nại tranh chấp kết quả trận đấu đang chờ sự phê duyệt của bạn. Hãy xử lý ngay.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <a 
            href="/admin/disputes" 
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
          >
            Giải quyết tranh chấp
            <ArrowUpRight className="w-4 h-4" />
          </a>
          <a 
            href="/admin/payouts" 
            className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold border border-slate-200 rounded-xl transition-all active:scale-95"
          >
            Duyệt Rút tiền
          </a>
        </div>
      </div>
    </div>
  );
}
