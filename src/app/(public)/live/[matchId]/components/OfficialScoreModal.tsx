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
      <ModalContent className="h-[92dvh] max-h-[92dvh] w-[calc(100vw-1rem)] max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl sm:w-[95vw] sm:rounded-[28px]">
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-1">
          <div className="flex max-h-[24dvh] flex-col overflow-y-auto border-b border-slate-800 bg-slate-950 p-3 text-white lg:max-h-none lg:overflow-visible lg:border-b-0 lg:border-r lg:border-slate-850 lg:p-6">
            <div className="flex items-center gap-3">
                <div className="hidden h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 sm:flex">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bảng trọng tài</p>
                <h3 className="mt-0.5 text-lg font-bold leading-tight text-white">Chấm điểm & Nghiệp vụ</h3>
              </div>
            </div>

            <div className="mt-3 grid flex-grow gap-2 sm:grid-cols-2 lg:mt-8 lg:block lg:space-y-4">
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3 lg:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Đội hình thi đấu</p>
                <p className="text-sm font-bold text-white leading-snug">{team1Name}</p>
                <div className="my-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">VS</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <p className="text-sm font-bold text-white leading-snug">{team2Name}</p>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3 lg:space-y-3.5 lg:p-4">
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

            <div className="mt-3 hidden rounded-lg border border-white/5 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-slate-400 lg:block">
              <span className="font-bold text-slate-300 block mb-1">💡 Lưu ý trọng tài:</span>
              Mọi thay đổi điểm số sẽ cập nhật thời gian thực lên màn hình live công khai của khán giả.
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
              <ModalHeader className="border-b border-slate-200 px-3 py-2.5 text-left sm:px-5 sm:py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <ModalTitle className="text-base font-bold text-slate-900 sm:text-xl">
                    Điều khiển điểm số
                  </ModalTitle>
                  <div className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase text-blue-700">
                    {scorePresentation.sportLabel}
                  </div>
                </div>
                <div
                    className={cn(
                    'inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold sm:gap-1.5 sm:px-2.5 sm:text-xs',
                    isSubmitting
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700',
                  )}
                >
                    <TimerReset className="hidden h-3.5 w-3.5 sm:block" />
                  {isSubmitting ? 'Đang đồng bộ' : 'Sẵn sàng'}
                </div>
              </div>
            </ModalHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-2 py-2 sm:px-4 sm:py-4">
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

            <div className="border-t border-slate-200 bg-white px-3 py-2 sm:px-6 sm:py-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="w-full border-slate-200 text-slate-700 sm:w-auto"
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
