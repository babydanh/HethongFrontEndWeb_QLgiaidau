import type { Tournament } from '@/types/tournament';

type TournamentConfig = NonNullable<Tournament['tournamentConfig']>;

export type RegistrationMode = NonNullable<TournamentConfig['registrationMode']>;

interface RegistrationModeUi {
  mode: RegistrationMode;
  ctaLabel: string;
  badgeLabel: string;
  badgeClassName: string;
}

const REGISTRATION_MODE_UI: Record<RegistrationMode, RegistrationModeUi> = {
  OPEN: {
    mode: 'OPEN',
    ctaLabel: 'Đăng ký tham gia',
    badgeLabel: 'Đăng ký tự do',
    badgeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  APPROVAL: {
    mode: 'APPROVAL',
    ctaLabel: 'Gửi yêu cầu tham gia',
    badgeLabel: 'BTC xét duyệt',
    badgeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  INVITE_ONLY: {
    mode: 'INVITE_ONLY',
    ctaLabel: 'Đăng ký bằng mã mời',
    badgeLabel: 'Cần mã mời',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-600',
  },
};

export function getRegistrationModeUi(
  mode?: TournamentConfig['registrationMode'],
): RegistrationModeUi {
  return REGISTRATION_MODE_UI[mode ?? 'OPEN'];
}

