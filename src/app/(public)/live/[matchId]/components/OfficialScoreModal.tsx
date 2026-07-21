'use client';

import { Shield, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import { LiveMatchControlPanel } from './LiveMatchControlPanel';
import type { LiveMatchControlPanelProps } from './LiveMatchControlPanel';

interface OfficialScoreModalProps extends LiveMatchControlPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfficialScoreModal({
  open,
  onOpenChange,
  match,
  team1Name,
  team2Name,
  isSubmitting,
  scorePresentation,
  activeSetIndex,
  ...controlProps
}: OfficialScoreModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92vh] w-[95vw] max-w-7xl overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl">
        <div className="grid max-h-[92vh] grid-cols-1 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="flex flex-col border-b border-slate-800 bg-slate-950 p-6 text-white lg:border-b-0 lg:border-r lg:border-slate-850">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bảng trọng tài</p>
                <h3 className="mt-0.5 text-lg font-bold leading-tight text-white">Chấm điểm & Nghiệp vụ</h3>
              </div>
            </div>

            <div className="mt-8 space-y-4 flex-grow">
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Đội hình thi đấu</p>
                <p className="text-sm font-bold text-white leading-snug">{team1Name}</p>
                <div className="my-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">VS</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <p className="text-sm font-bold text-white leading-snug">{team2Name}</p>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 space-y-3.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Môn thi đấu</p>
                  <p className="mt-1 text-sm font-semibold text-slate-200">{scorePresentation.sportLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vòng hiện tại</p>
                  <p className="mt-1 text-sm font-semibold text-slate-200">Vòng {match.roundNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Set hiện tại</p>
                  <p className="mt-1 text-sm font-semibold text-slate-200">Set {activeSetIndex !== undefined ? activeSetIndex + 1 : 1}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trạng thái trận</p>
                  <div className="mt-1.5 inline-flex rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/20">
                    {match.status === 'ONGOING'
                      ? 'Đang diễn ra'
                      : match.status === 'COMPLETED'
                        ? 'Đã hoàn tất'
                        : match.status === 'CANCELLED'
                          ? 'Đã hủy'
                          : 'Sắp diễn ra'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-slate-400">
              <span className="font-bold text-slate-300 block mb-1">💡 Lưu ý trọng tài:</span>
              Mọi thay đổi điểm số sẽ cập nhật thời gian thực lên màn hình live công khai của khán giả.
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <ModalHeader className="border-b border-slate-200 px-6 py-5 text-left">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <ModalTitle className="text-2xl font-bold text-slate-900">
                    Điều khiển điểm số trận
                  </ModalTitle>
                  <ModalDescription className="mt-2 text-sm font-medium text-slate-500">
                    Cập nhật tỷ số, xử phạt, ngoại lệ và quyết định đặc biệt theo đúng preset của từng môn.
                  </ModalDescription>
                  <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
                    Môn: {scorePresentation.sportLabel}
                  </div>
                </div>
                <div
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold',
                    isSubmitting
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700',
                  )}
                >
                  <TimerReset className="h-3.5 w-3.5" />
                  {isSubmitting ? 'Đang đồng bộ dữ liệu' : 'Sẵn sàng thao tác'}
                </div>
              </div>
            </ModalHeader>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
              <LiveMatchControlPanel
                match={match}
                team1Name={team1Name}
                team2Name={team2Name}
                isSubmitting={isSubmitting}
                scorePresentation={scorePresentation}
                activeSetIndex={activeSetIndex}
                {...controlProps}
              />
            </div>

            <div className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700"
                  onClick={() => onOpenChange(false)}
                >
                  Đóng bảng trọng tài
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
