'use client';

import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Copy, Download, QrCode, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isScannableLiteJoinUrl } from '@/features/tournaments/lite-qr';

type LiteInviteQrProps = {
  inviteUrl: string;
  tournamentName: string;
  compact?: boolean;
};

export function LiteInviteQr({ inviteUrl, tournamentName, compact = false }: LiteInviteQrProps) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const isValid = isScannableLiteJoinUrl(inviteUrl);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Đã sao chép link mời!');
    } catch {
      toast.error('Không thể sao chép link.');
    }
  };

  const downloadQr = () => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('Không thể tải mã QR.');
      return;
    }
    const anchor = document.createElement('a');
    anchor.download = `qr-moi-${tournamentName.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'giai-lite'}.png`;
    anchor.href = canvas.toDataURL('image/png');
    anchor.click();
  };

  const shareInvite = async () => {
    const shareData = {
      title: `Tham gia giải ${tournamentName}`,
      text: `Quét mã QR hoặc mở link để tham gia giải ${tournamentName}`,
      url: inviteUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyInvite();
  };

  if (!isValid) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700">
        Chưa thể tạo mã QR vì link mời không hợp lệ.
      </div>
    );
  }

  const qrSize = compact ? 176 : 224;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Mã QR tham gia giải Lite">
      <div className={`grid gap-4 ${compact ? 'sm:grid-cols-[200px_1fr]' : 'md:grid-cols-[248px_1fr]'} items-center`}>
        <div className="flex flex-col items-center">
          <div ref={canvasWrapRef} className="rounded-lg border border-slate-200 bg-white p-3">
            <QRCodeCanvas
              value={inviteUrl}
              size={qrSize}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#0f172a"
              title={`Mã QR tham gia giải ${tournamentName}`}
            />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <QrCode className="h-3.5 w-3.5" /> Dùng camera điện thoại để quét
          </p>
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Mã QR tham gia giải</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Người chơi quét bằng camera điện thoại. Link HTTPS sẽ mở trang đăng nhập và quay lại màn tham gia giải.
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
            <p className="break-all font-mono text-xs text-blue-700">{inviteUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copyInvite} className="gap-1.5 font-medium">
              <Copy className="h-3.5 w-3.5" /> Sao chép link
            </Button>
            <Button size="sm" variant="outline" onClick={shareInvite} className="gap-1.5 font-medium">
              <Share2 className="h-3.5 w-3.5" /> Chia sẻ
            </Button>
            <Button size="sm" variant="outline" onClick={downloadQr} className="gap-1.5 font-medium">
              <Download className="h-3.5 w-3.5" /> Tải QR PNG
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
