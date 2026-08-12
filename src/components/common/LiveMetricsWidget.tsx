'use client';

import { useEffect, useState } from 'react';
import { socketClient } from '@/lib/socket';
import { Activity, ShieldAlert, Cpu, Network } from 'lucide-react';
import { useAuthStore } from '@/lib/zustand/authStore';

interface Metrics {
  connections: number;
  eventLoopLag: number;
  bufferedSize: number;
}

export default function LiveMetricsWidget() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();

  // Xác định xem có quyền xem widget hay không: là môi trường localhost HOẶC tài khoản ADMIN
  const isVisible = (() => {
    if (user?.roles?.includes('ADMIN')) return true;
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1';
    }
    return false;
  })();

  // Effect 1: Đánh dấu component đã mounted ở client (asynchronous để tránh cascading render)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Effect 2: Kết nối WebSocket và nhận dữ liệu (Chỉ khi widget được MỞ và đã mounted)
  useEffect(() => {
    if (!mounted || !isVisible || isMinimized) return;

    const socket = socketClient.getMatchSocket();
    
    if (!socket.connected) {
      socket.connect();
    }

    const handleSystemMetrics = (rawPayload: string) => {
      try {
        const payload = JSON.parse(rawPayload) as Metrics;
        setMetrics(payload);
      } catch (err) {
        console.error('Failed to parse system metrics', err);
      }
    };

    socket.on('system:metrics', handleSystemMetrics);

    return () => {
      socket.off('system:metrics', handleSystemMetrics);
      // Đóng kết nối lập tức khi thu nhỏ hoặc unmount để tránh tạo kết nối dư thừa
      socket.disconnect();
    };
  }, [mounted, isVisible, isMinimized]);

  if (!mounted) return null; // Tránh lỗi Hydration SSR
  if (!isVisible) return null; // Ẩn hoàn toàn với khách thường, chỉ cho admin hoặc localhost xem

  // Xác định trạng thái Led dựa trên độ trễ Event Loop
  const getStatusColor = () => {
    if (!metrics) return 'bg-slate-400';
    if (metrics.eventLoopLag > 100) return 'bg-rose-500 shadow-rose-500/50';
    if (metrics.eventLoopLag > 50) return 'bg-amber-500 shadow-amber-500/50';
    return 'bg-emerald-500 shadow-emerald-500/50';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono select-none">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-950/85 text-zinc-400 backdrop-blur-md transition-all hover:bg-zinc-900 hover:text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)] cursor-pointer"
          title="Xem giám sát hiệu năng"
        >
          <span className={`absolute top-0 right-0 h-2.5 w-2.5 rounded-full border border-zinc-950 animate-pulse ${getStatusColor()}`} />
          <Activity className="w-4 h-4" />
        </button>
      ) : (
        <div className="w-56 rounded-lg border border-white/10 bg-zinc-950/90 p-3.5 text-xs text-zinc-300 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-[10px] text-zinc-400 uppercase tracking-wider">
              <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_1px] ${getStatusColor()}`} />
              Hệ thống (Dev)
            </span>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold transition-all px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
            >
              Thu nhỏ
            </button>
          </div>

          {/* Stats Rows */}
          <div className="flex flex-col gap-2">
            {/* Active Connections */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-zinc-450" />
                Kết nối (Conns)
              </span>
              <span className="font-semibold text-white text-right">
                {metrics ? `${metrics.connections} client` : '...'}
              </span>
            </div>

            {/* Event Loop delay */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-zinc-450" />
                Event Loop (Lag)
              </span>
              <span className={`font-semibold text-right ${
                metrics && metrics.eventLoopLag > 50 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {metrics ? `${metrics.eventLoopLag} ms` : '...'}
              </span>
            </div>

            {/* Socket buffer */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-450" />
                Bộ đệm (Buffer)
              </span>
              <span className={`font-semibold text-right ${
                metrics && metrics.bufferedSize > 100 ? 'text-rose-400 animate-pulse' : 'text-white'
              }`}>
                {metrics ? `${metrics.bufferedSize} KB` : '...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

