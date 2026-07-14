'use client';

import { useEffect, useState } from 'react';
import type { Tournament, BracketStage, BracketMatch } from '@/features/tournaments/api';
import { tournamentsApi } from '@/features/tournaments/api';
import { getSportRuleKind } from '@/features/tournaments/sport-rules/normalize';
import { Trophy, Info, Loader2 } from 'lucide-react';
import type { OnScheduleMatch, OnSelectBracketMatch, BracketTabProps } from './bracket';
import { UPPER_SET, LOWER_SET } from './bracket';
import { SingleElimView } from './bracket';
import { DoubleElimView } from './bracket';
import { RoundRobinView } from './bracket';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Props extends BracketTabProps {
  tournament: Tournament;
  tiebreakerMode?: 'split' | 'playoff';
}

/**
 * Determine the type‑specific label for a stage.
 */
function stageTypeLabel(type: string): string {
  switch (type) {
    case 'SINGLE_ELIMINATION':
      return 'Loại trực tiếp';
    case 'DOUBLE_ELIMINATION':
      return 'Nhánh thắng nhánh thua';
    case 'ROUND_ROBIN':
      return 'Vòng tròn tính điểm';
    default:
      return type;
  }
}

function stageNameLabel(name: string): string {
  const upperName = (name ?? '').toUpperCase();
  if (upperName.includes('DOUBLE ELIMINATION STAGE') || upperName.includes('DOUBLE_ELIMINATION')) {
    return 'Vòng đấu Nhánh thắng nhánh thua';
  }
  if (upperName.includes('ELIMINATION STAGE')) {
    return 'Vòng đấu Loại trực tiếp';
  }
  if (upperName.includes('ROUND ROBIN STAGE') || upperName.includes('ROUND_ROBIN')) {
    return 'Vòng đấu Vòng tròn tính điểm';
  }
  if (name === 'Winners Bracket') return 'Nhánh thắng';
  if (name === 'Losers Bracket') return 'Nhánh thua';
  return name;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROUP VIEW — dispatches to the correct bracket renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function GroupView({
  group,
  stageType,
  onScheduleMatch,
  tiebreakerMode,
  tournamentId,
  stageId,
  selectedMatchId,
  onSelectMatch,
  fallbackSportRuleKind,
  roundConfig,
}: {
  group: { id: string; name: string; matches: BracketMatch[] };
  stageType: string;
  onScheduleMatch?: OnScheduleMatch;
  onSelectMatch?: OnSelectBracketMatch;
  tiebreakerMode?: 'split' | 'playoff';
  tournamentId?: string;
  stageId?: string;
  selectedMatchId?: string | null;
  fallbackSportRuleKind?: BracketTabProps['fallbackSportRuleKind'];
  roundConfig?: BracketStage['roundConfig'];
}) {
  const { matches } = group;

  if (!matches.length) {
    return (
      <div className="text-center py-10 text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-xl">
        Chưa có trận đấu nào trong bảng {group.name}.
      </div>
    );
  }

  if (stageType === 'ROUND_ROBIN') {
    return <RoundRobinView matches={matches} tiebreakerMode={tiebreakerMode} onScheduleMatch={onScheduleMatch} selectedMatchId={selectedMatchId} onSelectMatch={onSelectMatch} tournamentId={tournamentId} stageId={stageId} fallbackSportRuleKind={fallbackSportRuleKind} roundConfig={roundConfig} />;
  }

  if (stageType === 'DOUBLE_ELIMINATION') {
    const upper = matches.filter((m) =>
      UPPER_SET.has((m.bracketBranch ?? '').toUpperCase()),
    );
    const lower = matches.filter((m) =>
      LOWER_SET.has((m.bracketBranch ?? '').toUpperCase()),
    );
    const gf = matches.filter(
      (m) => m.bracketBranch === 'GRAND_FINALS',
    );

    if (upper.length > 0 || lower.length > 0) {
      return (
        <DoubleElimView
          upperMatches={upper}
          lowerMatches={lower}
          gfMatches={gf}
          onScheduleMatch={onScheduleMatch}
          selectedMatchId={selectedMatchId}
          onSelectMatch={onSelectMatch}
          fallbackSportRuleKind={fallbackSportRuleKind}
        />
      );
    }
  }

  return (
    <SingleElimView
      matches={matches}
      onScheduleMatch={onScheduleMatch}
      selectedMatchId={selectedMatchId}
      onSelectMatch={onSelectMatch}
      fallbackSportRuleKind={fallbackSportRuleKind}
    />
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN BRACKET TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function BracketTab({
  tournament,
  tournamentId,
  divisionId,
  onScheduleMatch,
  tiebreakerMode,
  selectedMatchId,
  onSelectMatch,
  fallbackSportRuleKind,
}: Props) {
  const effectiveTournamentId = tournamentId ?? tournament.id;
  const effectiveSportRuleKind =
    fallbackSportRuleKind ?? getSportRuleKind(tournament.sportRules);
  const [stages, setStages] = useState<BracketStage[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBracket = async () => {
      setIsLoading(true);
      try {
        const res = await tournamentsApi.getTournamentBracket(
          effectiveTournamentId,
          divisionId,
        );
        if (res.data?.stages) {
          setStages(res.data.stages);
          setActiveStageId(res.data.stages[0]?.id ?? null);
        }
      } catch (err) {
        console.error(
          'Failed to fetch bracket:',
          { tournamentId: effectiveTournamentId, divisionId },
          err,
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchBracket();
  }, [divisionId, effectiveTournamentId]);

  const activeStage = stages.find((s) => s.id === activeStageId);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300 mb-3" />
        <p className="text-sm text-slate-400 font-medium">
          Đang tải sơ đồ thi đấu...
        </p>
      </div>
    );
  }

  // ── Empty ──
  if (!stages.length) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <Info className="w-3.5 h-3.5" />
          <span>
            Phân hạng:{' '}
            <strong className="text-slate-600">{tournament.name}</strong>
          </span>
          {tournament.genderRestriction && (
            <span className="text-slate-300">
              • {tournament.genderRestriction}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl">
          <Trophy className="w-12 h-12 text-slate-200 mb-3" />
          <h4 className="font-bold text-slate-600 mb-1">Chưa có nhánh đấu</h4>
          <p className="text-slate-400 text-sm text-center max-w-xs">
            Nhánh đấu sẽ xuất hiện sau khi Ban tổ chức hoàn tất danh sách đăng
            ký.
          </p>
        </div>
      </div>
    );
  }

  // ── Main ──
  return (
    <div className="flex flex-col gap-5">
      {/* Division info bar */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold pb-2 border-b border-slate-100">
        <Info className="w-3.5 h-3.5" />
        <span>
          Phân hạng:{' '}
          <strong className="text-slate-700">{tournament.name}</strong>
        </span>
        {tournament.genderRestriction && (
          <span className="text-slate-300">
            • {tournament.genderRestriction}
          </span>
        )}
      </div>

      {/* Stage tabs */}
      {stages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStageId(s.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                activeStageId === s.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {stageNameLabel(s.name)}
            </button>
          ))}
        </div>
      )}

      {/* Active stage content */}
      {activeStage && (
        <div className="flex flex-col gap-8">
          {/* Stage header */}
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {stageNameLabel(activeStage.name)}
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Thể thức: {stageTypeLabel(activeStage.type)}
            </p>
          </div>

          {/* Groups */}
          {activeStage.type === 'DOUBLE_ELIMINATION' ? (
            <div>
              {(() => {
                const allMatches = activeStage.groups.flatMap((g) => g.matches);
                const upper = allMatches.filter((m) =>
                  UPPER_SET.has((m.bracketBranch ?? '').toUpperCase()),
                );
                const lower = allMatches.filter((m) =>
                  LOWER_SET.has((m.bracketBranch ?? '').toUpperCase()),
                );
                const gf = allMatches.filter(
                  (m) => m.bracketBranch === 'GRAND_FINALS',
                );
                return (
                  <DoubleElimView
                    upperMatches={upper}
                    lowerMatches={lower}
                    gfMatches={gf}
                    onScheduleMatch={onScheduleMatch}
                    selectedMatchId={selectedMatchId}
                    onSelectMatch={onSelectMatch}
                    fallbackSportRuleKind={effectiveSportRuleKind}
                  />
                );
              })()}
            </div>
          ) : (
            activeStage.groups.map((group) => (
              <div key={group.id}>
                {activeStage.groups.length > 1 && (
                  <h4 className="font-bold text-slate-700 text-sm border-l-4 border-blue-500 pl-3 mb-4">
                    {group.name}
                  </h4>
                )}
                <GroupView
                  group={group}
                  stageType={activeStage.type}
                  onScheduleMatch={onScheduleMatch}
                  tiebreakerMode={tiebreakerMode}
                  tournamentId={effectiveTournamentId}
                  stageId={activeStage?.id}
                  selectedMatchId={selectedMatchId}
                  onSelectMatch={onSelectMatch}
                  fallbackSportRuleKind={effectiveSportRuleKind}
                  roundConfig={activeStage?.roundConfig}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
