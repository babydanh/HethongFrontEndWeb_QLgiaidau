'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  GitMerge,
  Layers,
  MapPin,
  Play,
  Settings,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { Tournament } from '@/types/tournament';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  getTournamentStatusClassName,
  getTournamentStatusLabel,
  isTournamentCompleted,
  isTournamentInProgress,
  isTournamentRegistrationClosed,
  isTournamentUpcoming,
} from '@/utils/tournament-status';
import { exportTournamentResultsExcel } from '@/utils/exportTournament';
import type { Match } from '@/types/match';

interface TournamentOwnerTopBarProps {
  tournament: Tournament;
  matches?: Match[];
  participantCount?: number;
  divisionCount?: number;
  onStepTransition?: (nextStatus: Tournament['status']) => void;
  onConfirmOpen?: () => void;
  onConfirmEnd?: () => void;
  isLoading?: boolean;
}

export function TournamentOwnerTopBar({
  tournament,
  matches = [],
  participantCount = 0,
  divisionCount = 0,
  onStepTransition,
  onConfirmOpen,
  onConfirmEnd,
  isLoading = false,
}: TournamentOwnerTopBarProps) {
  const translate = useTranslations('OrganizerManage');
  const locale = useLocale();

  const statusLabels: Record<string, string> = {
    DRAFT: translate('status.statusDraft') || 'Nháp',
    PENDING_APPROVAL: translate('status.statusPendingApproval') || 'Chờ duyệt công bố',
    PENDING_DELETE: translate('status.statusPendingDelete') || 'Đang chờ xóa',
    UPCOMING: translate('status.statusUpcoming') || 'Sắp diễn ra',
    REGISTRATION_OPEN: translate('status.statusRegistrationOpen') || 'Mở đăng ký',
    REGISTRATION_CLOSED: translate('status.statusRegistrationClosed') || 'Đã khóa đăng ký',
    IN_PROGRESS: translate('status.statusInProgress') || 'Đang thi đấu',
    COMPLETED: translate('status.statusCompleted') || 'Đã kết thúc',
    CANCELLED: translate('status.statusCancelled') || 'Đã hủy',
  };
  const statusLabel = getTournamentStatusLabel(tournament.status, statusLabels);
  const totalMatches = tournament._summary?.matchesTotal ?? matches.length;
  const completedMatches =
    tournament._summary?.matchesCompleted ??
    matches.filter((m) => m.status === 'COMPLETED').length;

  // 0: Đăng ký, 1: Lịch/Chuẩn bị, 2: Đang diễn ra, 3: Hoàn tất
  const stepIdx = isTournamentCompleted(tournament.status)
    ? 3
    : isTournamentInProgress(tournament.status)
      ? 2
      : isTournamentRegistrationClosed(tournament.status) ||
          isTournamentUpcoming(tournament.status)
        ? 1
        : 0;

  const stepperSteps = [
    { label: '1. Đăng ký', icon: Users },
    { label: '2. Lịch & Bảng', icon: GitMerge },
    { label: '3. Đang đấu', icon: Play },
    { label: '4. Hoàn tất', icon: Trophy },
  ];

  return (
    <div className="mb-4 rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-3.5 sm:p-4 text-white shadow-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Owner Badge + Stepper Timeline */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-blue-500/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-blue-300 border border-blue-400/30">
              ⚡ Quản Trị Giải
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${getTournamentStatusClassName(
                tournament.status,
              )}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel}
            </span>
          </div>

          {/* Stepper Steps Mini */}
          <div className="flex items-center bg-white/10 px-2.5 py-1 rounded-xl border border-white/15 backdrop-blur-xs">
            {stepperSteps.map((step, idx) => {
              const isDone = idx < stepIdx || isTournamentCompleted(tournament.status);
              const isCurrent =
                idx === stepIdx && !isTournamentCompleted(tournament.status);
              const StepIcon = step.icon;

              return (
                <div key={step.label} className="flex items-center">
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/30'
                        : isDone
                          ? 'text-emerald-400'
                          : 'text-slate-400 opacity-60'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3 w-3 text-emerald-400 stroke-[3]" />
                    ) : (
                      <StepIcon className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline whitespace-nowrap">
                      {step.label}
                    </span>
                  </div>

                  {idx < stepperSteps.length - 1 && (
                    <span className="mx-1 text-slate-500 text-xs">›</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Main Action: Vận hành live / Nhập điểm */}
          <Button
            size="sm"
            onClick={() => {
              window.location.href = `/organizer/tournaments/${tournament.id}/ops`;
            }}
            className="h-8 bg-blue-500 px-3 text-xs font-bold text-white hover:bg-blue-600 shadow-xs transition-colors"
          >
            <Zap className="mr-1.5 h-3.5 w-3.5 text-blue-100" />
            Vận hành / Nhập điểm
          </Button>

          {/* Phase Transition buttons */}
          {tournament.status === 'REGISTRATION_OPEN' && (
            <Button
              size="sm"
              onClick={() => onStepTransition?.('UPCOMING')}
              disabled={isLoading}
              className="h-8 bg-amber-500 hover:bg-amber-600 px-3 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <ChevronRight className="mr-1 h-3.5 w-3.5" /> Khóa đăng ký
            </Button>
          )}

          {(isTournamentUpcoming(tournament.status) ||
            isTournamentRegistrationClosed(tournament.status)) && (
            <Button
              size="sm"
              onClick={onConfirmOpen}
              disabled={isLoading}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <Play className="mr-1 h-3.5 w-3.5 fill-current" /> Khai mạc giải
            </Button>
          )}

          {isTournamentInProgress(tournament.status) && (
            <Button
              size="sm"
              onClick={onConfirmEnd}
              disabled={isLoading}
              className="h-8 bg-indigo-600 hover:bg-indigo-700 px-3 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <Trophy className="mr-1 h-3.5 w-3.5" /> Hoàn tất giải
            </Button>
          )}

          {isTournamentCompleted(tournament.status) && (
            <Button
              size="sm"
              onClick={() =>
                exportTournamentResultsExcel(tournament.name, matches, locale)
              }
              disabled={matches.length === 0}
              className="h-8 bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Xuất kết quả
            </Button>
          )}

          {/* Fallback to full management workspace */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-slate-700 bg-slate-800/80 px-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <Settings className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                Quản lý nâng cao
                <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = `/organizer/tournaments/${tournament.id}/manage`;
                }}
                className="cursor-pointer text-xs font-medium"
              >
                <Settings className="mr-2 h-3.5 w-3.5 text-blue-500" />
                Không gian quản lý chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = `/organizer/tournaments/${tournament.id}/manage#manage-bracket-workspace`;
                }}
                className="cursor-pointer text-xs font-medium"
              >
                <Trophy className="mr-2 h-3.5 w-3.5 text-amber-500" />
                Cấu hình sơ đồ & Hạt giống
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
