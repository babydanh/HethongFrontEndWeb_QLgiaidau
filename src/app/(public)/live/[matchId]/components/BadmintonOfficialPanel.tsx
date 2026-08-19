'use client';

import { useTranslations } from 'next-intl';
import { RallyScoreControls } from './RallyScoreControls';

interface BadmintonOfficialPanelProps {
  team1Name: string;
  team2Name: string;
  currentPointTeam1: string;
  currentPointTeam2: string;
  isSubmitting: boolean;
  onUpdatePoints: (team: 1 | 2, action: 'inc' | 'dec') => void;
}

export function BadmintonOfficialPanel({
  team1Name,
  team2Name,
  currentPointTeam1,
  currentPointTeam2,
  isSubmitting,
  onUpdatePoints,
}: BadmintonOfficialPanelProps) {
  const translate = useTranslations('OrganizerScoring');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
        {translate('badmintonLiveDescription')}
      </div>
      <RallyScoreControls
        team1Name={team1Name}
        team2Name={team2Name}
        currentPointTeam1={currentPointTeam1}
        currentPointTeam2={currentPointTeam2}
        isSubmitting={isSubmitting}
        onUpdatePoints={onUpdatePoints}
      />
    </div>
  );
}
