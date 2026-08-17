import type { Tournament } from '@/types/tournament';

type TournamentConfig = NonNullable<Tournament['tournamentConfig']>;

export type RegistrationMode = NonNullable<TournamentConfig['registrationMode']>;

type RegistrationModeTranslate = (key: string) => string;

interface RegistrationModeUi {
  mode: RegistrationMode;
  ctaLabel: string;
  badgeLabel: string;
  badgeClassName: string;
}

const REGISTRATION_MODE_UI: Record<RegistrationMode, RegistrationModeUi> = {
  OPEN: {
    mode: 'OPEN',
    ctaLabel: 'openCta',
    badgeLabel: 'openBadge',
    badgeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  APPROVAL: {
    mode: 'APPROVAL',
    ctaLabel: 'approvalCta',
    badgeLabel: 'approvalBadge',
    badgeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  INVITE_ONLY: {
    mode: 'INVITE_ONLY',
    ctaLabel: 'inviteOnlyCta',
    badgeLabel: 'inviteOnlyBadge',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-600',
  },
};

export function getRegistrationModeUi(
  mode?: TournamentConfig['registrationMode'],
  translate: RegistrationModeTranslate,
): RegistrationModeUi {
  const ui = REGISTRATION_MODE_UI[mode ?? 'OPEN'];
  return { ...ui, ctaLabel: translate(ui.ctaLabel), badgeLabel: translate(ui.badgeLabel) };
}

