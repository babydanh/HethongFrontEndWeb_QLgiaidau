'use client';

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
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
        Cầu lông dùng rally point. UI này hiện điểm trực tiếp theo set, còn cảnh báo/thẻ được ghi ở panel hình phạt phía dưới.
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
