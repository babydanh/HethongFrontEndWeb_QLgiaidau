import type { MatchScore } from '@/types/match';
import type { ResolvedSportRuleView } from '@/features/tournaments/sport-rules/normalize';

export interface ScoreRuleWarning {
  id: string;
  message: string;
}

const buildSequenceLabel = (rules: ResolvedSportRuleView, index: number) =>
  `${rules.kind === 'PICKLEBALL_SIDE_OUT' ? 'Ván' : 'Set'} ${index + 1}`;

export function getScoreRuleWarnings(
  sets: MatchScore[],
  rules: ResolvedSportRuleView,
): ScoreRuleWarning[] {
  const warnings: ScoreRuleWarning[] = [];
  let p1Won = 0;
  let p2Won = 0;

  sets.forEach((set, index) => {
    const label = buildSequenceLabel(rules, index);
    const team1Score = set.team1Score;
    const team2Score = set.team2Score;
    const hasStarted = team1Score > 0 || team2Score > 0;

    if (!hasStarted) {
      return;
    }

    if (team1Score === team2Score) {
      warnings.push({
        id: `draw-${index}`,
        message: `${label} đang hòa ${team1Score}-${team2Score}. Nếu đã chốt kết quả thì cần sửa lại hoặc bật chế độ ngoại lệ.`,
      });
      return;
    }

    const winnerScore = Math.max(team1Score, team2Score);
    const loserScore = Math.min(team1Score, team2Score);

    if (team1Score > team2Score) {
      p1Won += 1;
    } else {
      p2Won += 1;
    }

    if (!set.isFinished) {
      return;
    }

    if (rules.kind === 'TENNIS') {
      const isValidStandardTennisSet =
        (winnerScore === 6 && loserScore <= 4) ||
        (winnerScore === 7 && (loserScore === 5 || loserScore === 6));

      if (!isValidStandardTennisSet) {
        warnings.push({
          id: `tennis-${index}`,
          message: `${label} có tỷ số ${team1Score}-${team2Score}, lệch khỏi mẫu tennis chuẩn 6-x hoặc 7-5/7-6.`,
        });
      }
      return;
    }

    if (!rules.winByTwo) {
      if (winnerScore < rules.pointsPerSet) {
        warnings.push({
          id: `target-${index}`,
          message: `${label} đang chốt ở ${team1Score}-${team2Score} nhưng bên thắng chưa chạm mốc ${rules.pointsPerSet}.`,
        });
      }
      return;
    }

    if (winnerScore < rules.pointsPerSet) {
      warnings.push({
        id: `min-target-${index}`,
        message: `${label} đang chốt ở ${team1Score}-${team2Score} nhưng bên thắng chưa đủ ${rules.pointsPerSet} điểm.`,
      });
      return;
    }

    const reachedCap = winnerScore === rules.maxPoints;
    if (!reachedCap && winnerScore - loserScore < 2) {
      warnings.push({
        id: `margin-${index}`,
        message: `${label} đang chốt ở ${team1Score}-${team2Score} nhưng chưa đủ cách biệt 2 điểm theo cấu hình mặc định.`,
      });
    }

    if (winnerScore > rules.maxPoints) {
      warnings.push({
        id: `cap-${index}`,
        message: `${label} vượt trần ${rules.maxPoints} điểm của cấu hình hiện tại.`,
      });
    }
  });

  if (p1Won > rules.setsToWin || p2Won > rules.setsToWin) {
    warnings.push({
      id: 'too-many-wins',
      message: `Một bên đang có số ${rules.kind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set'} thắng vượt mức cần thiết (${rules.setsToWin}).`,
    });
  }

  return warnings;
}
