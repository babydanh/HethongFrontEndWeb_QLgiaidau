import type { Tournament } from '@/features/tournaments/api';

export type TournamentStatus = Tournament['status'];

const normalizeRawStatus = (status?: string | null) => (status ?? '').trim().toUpperCase();

export const normalizeTournamentStatus = (status?: string | null): TournamentStatus => {
  const normalized = normalizeRawStatus(status);

  switch (normalized) {
    case 'DRAFT':
    case 'PENDING_APPROVAL':
    case 'PENDING_DELETE':
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
    case 'LIVE':
      return 'IN_PROGRESS';
    case 'PUBLISHED':
    case 'REGISTRATION':
      return 'REGISTRATION_OPEN';
    default:
      return 'DRAFT';
  }
};

export const getTournamentStatusLabel = (status?: string | null, labels?: Partial<Record<string, string>>) => {
  switch (normalizeTournamentStatus(status)) {
    case 'DRAFT':
      return labels?.DRAFT ?? 'Nháp';
    case 'PENDING_APPROVAL':
      return labels?.PENDING_APPROVAL ?? 'Chờ duyệt công bố';
    case 'PENDING_DELETE':
      return labels?.PENDING_DELETE ?? 'Đang chờ xóa';
    case 'UPCOMING':
      return labels?.UPCOMING ?? 'Sắp diễn ra';
    case 'REGISTRATION_OPEN':
      return labels?.REGISTRATION_OPEN ?? 'Mở đăng ký';
    case 'REGISTRATION_CLOSED':
      return labels?.REGISTRATION_CLOSED ?? 'Đã khóa đăng ký';
    case 'IN_PROGRESS':
    case 'ONGOING':
      return labels?.IN_PROGRESS ?? 'Đang thi đấu';
    case 'COMPLETED':
      return labels?.COMPLETED ?? 'Đã kết thúc';
    case 'CANCELLED':
      return labels?.CANCELLED ?? 'Đã hủy';
    default:
      return normalizeRawStatus(status) || 'Nháp';
  }
};

export const getTournamentStatusClassName = (status?: string | null) => {
  switch (normalizeTournamentStatus(status)) {
    case 'DRAFT':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'PENDING_DELETE':
      return 'bg-rose-50 text-rose-600 border-rose-200';
    case 'UPCOMING':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'REGISTRATION_OPEN':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REGISTRATION_CLOSED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'IN_PROGRESS':
    case 'ONGOING':
      return 'bg-blue-600 text-white border-blue-700';
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-600 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export const isTournamentDraft = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'DRAFT';

export const isTournamentPendingApproval = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'PENDING_APPROVAL';

export const isTournamentPendingDelete = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'PENDING_DELETE';

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
  normalizeTournamentStatus(status) === 'REGISTRATION_OPEN';

export const isTournamentInRegistrationWindow = (tournament?: { status?: string | null; registrationStartDate?: string | null; registrationEndDate?: string | null }) => {
  if (!tournament) return false;
  const status = normalizeTournamentStatus(tournament.status);
  if (status === 'REGISTRATION_CLOSED' || status === 'IN_PROGRESS' || status === 'ONGOING' || status === 'COMPLETED' || status === 'CANCELLED' || status === 'DRAFT') {
    return false;
  }
  if (status === 'REGISTRATION_OPEN') return true;
  if (status === 'UPCOMING') {
    const now = Date.now();
    const start = tournament.registrationStartDate ? new Date(tournament.registrationStartDate).getTime() : 0;
    const end = tournament.registrationEndDate ? new Date(tournament.registrationEndDate).getTime() : Infinity;
    if (start > 0 && now >= start && now <= end) {
      return true;
    }
  }
  return false;
};

