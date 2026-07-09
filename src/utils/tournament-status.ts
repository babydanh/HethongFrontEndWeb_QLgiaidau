import type { Tournament } from '@/features/tournaments/api';

export type TournamentStatus = Tournament['status'];

const normalizeRawStatus = (status?: string | null) => (status ?? '').trim().toUpperCase();

export const normalizeTournamentStatus = (status?: string | null): TournamentStatus => {
  const normalized = normalizeRawStatus(status);

  switch (normalized) {
    case 'DRAFT':
    case 'PENDING_APPROVAL':
    case 'UPCOMING':
    case 'REGISTRATION_OPEN':
    case 'REGISTRATION_CLOSED':
    case 'IN_PROGRESS':
    case 'ONGOING':
    case 'COMPLETED':
    case 'CANCELLED':
      return normalized as TournamentStatus;
    case 'FINISHED':
      return 'COMPLETED';
    case 'ACTIVE':
      return 'IN_PROGRESS';
    default:
      return 'DRAFT';
  }
};

export const getTournamentStatusLabel = (status?: string | null) => {
  switch (normalizeTournamentStatus(status)) {
    case 'DRAFT':
      return 'Nháp';
    case 'PENDING_APPROVAL':
      return 'Chờ duyệt công bố';
    case 'UPCOMING':
      return 'Sắp diễn ra';
    case 'REGISTRATION_OPEN':
      return 'Mở đăng ký';
    case 'REGISTRATION_CLOSED':
      return 'Đã khóa đăng ký';
    case 'IN_PROGRESS':
    case 'ONGOING':
      return 'Đang thi đấu';
    case 'COMPLETED':
      return 'Đã kết thúc';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return normalizeRawStatus(status) || 'Nháp';
  }
};

export const getTournamentStatusClassName = (status?: string | null) => {
  switch (normalizeTournamentStatus(status)) {
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'PENDING_APPROVAL':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'UPCOMING':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'REGISTRATION_OPEN':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REGISTRATION_CLOSED':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'IN_PROGRESS':
    case 'ONGOING':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const isTournamentDraft = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'DRAFT';

export const isTournamentPendingApproval = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'PENDING_APPROVAL';

export const isTournamentUpcoming = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'UPCOMING';

export const isTournamentRegistrationClosed = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'REGISTRATION_CLOSED';

export const isTournamentRegistrationOpen = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'REGISTRATION_OPEN';

export const isTournamentInProgress = (status?: string | null) => {
  const normalized = normalizeTournamentStatus(status);
  return normalized === 'IN_PROGRESS' || normalized === 'ONGOING';
};

export const isTournamentCompleted = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'COMPLETED';

export const isTournamentCancelled = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'CANCELLED';

export const isTournamentOpenForRegistration = (status?: string | null) =>
  isTournamentRegistrationOpen(status) || isTournamentUpcoming(status);
