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
    { label: 'Đăng ký', icon: Users },
    { label: 'Lịch & Bảng', icon: GitMerge },
    { label: 'Thi đấu', icon: Play },
    { label: 'Hoàn tất', icon: Trophy },
  ];

  return (
    <div className="mb-4 rounded-xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Owner Pill + Status + Stepper */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
              Quản trị
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

          {/* Stepper Timeline (lấy từ logic và visual của manage/page.tsx) */}
          <div className="hidden sm:flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200/70">
            {stepperSteps.map((step, idx) => {
              const isDone = idx < stepIdx || isTournamentCompleted(tournament.status);
              const isCurrent =
                idx === stepIdx && !isTournamentCompleted(tournament.status);

              return (
                <div key={step.label} className="flex items-center">
                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                      isCurrent
                        ? 'bg-white text-blue-600 shadow-2xs border border-blue-200/80 font-bold'
                        : isDone
                          ? 'text-emerald-600'
                          : 'text-slate-400 opacity-60'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isDone ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : idx + 1}
                    </span>
                    <span className="whitespace-nowrap">{step.label}</span>
                  </div>

                  {idx < stepperSteps.length - 1 && (
                    <span className="mx-1 text-slate-300 text-xs">›</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Action Buttons (Đúng theo logic gốc của manage/page.tsx) */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* 1. Nút Vận hành (Live Operations) */}
          <Button
            size="sm"
            onClick={() => {
              window.location.href = `/organizer/tournaments/${tournament.id}/ops`;
            }}
            className="h-8 bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Zap className="mr-1.5 h-3.5 w-3.5 text-blue-200" />
            Vận hành
          </Button>

          {/* 2. Nút chuyển bước theo trạng thái */}
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

          {/* 3. Nút Quản lý nâng cao */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = `/organizer/tournaments/${tournament.id}/manage`;
            }}
            className="h-8 border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Settings className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            Quản lý nâng cao
          </Button>
        </div>
      </div>
    </div>
  );
}
