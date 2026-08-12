'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { DateTimePicker } from '@/components/ui/Input';
import { Activity, AlertTriangle, BarChart3, Calendar, ExternalLink, Network, Settings, Trophy, Video } from 'lucide-react';
import { useOrganizerOps } from '@/features/organizer/ops/hooks/useOrganizerOps';
import { getMatchScorePresentation, resolveMatchSportRules } from '@/features/matches/score-display';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { OperationsWorkspace } from '../manage/components/OperationsWorkspace';
import { useManageState } from '../manage/components/useManageState';
import { BracketTab } from '../manage/components/BracketTab';
import { LivestreamTab } from '../manage/components/LivestreamTab';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { getSportLogo } from '@/constants/sports';
import { getMatchRoundLabel } from '@/utils/match-round-label';
import type { BracketMatch, LivestreamCamera } from '@/features/tournaments/api';

const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  REGISTRATION_OPEN: 'Đang mở đăng ký',
  IN_PROGRESS: 'Đang diễn ra',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};

export default function OrganizerTournamentOpsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bracketManager = useManageState(resolvedParams.id);
  const bracketSectionRef = useRef<HTMLDivElement | null>(null);
  const {
    tournament,
    divisions,
    referees,
    selectedDivisionId,
    setSelectedDivisionId,
    participants,
    matches,
    isLoading,
    error,
    refresh,
    activeParticipantActionId,
    activeMatchActionId,
    kickParticipant,
    updateMatchSchedule,
    applyMatchOperation,
    activityLog,
  } = useOrganizerOps(resolvedParams.id);
  const [bracketViewVersion, setBracketViewVersion] = useState(0);
  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);
  const [activePageTab, setActivePageTab] = useState<'OVERVIEW' | 'BRACKET' | 'OPERATIONS' | 'CAMERA'>('OVERVIEW');
  const bracketSelectedDivisionId = bracketManager.selectedDivisionId;
  const bracketDivisions = bracketManager.divisions;
  const applyDivisionFormValues = bracketManager.applyDivisionFormValues;
  const setBracketSelectedDivisionId = bracketManager.setSelectedDivisionId;
  const sportPresentation = getSportRulePresentation(bracketManager.sportRuleKind);
  const supportsTiebreakInput =
    bracketManager.sportRuleKind === 'TENNIS' ||
    bracketManager.sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const isPickleballSideOut = bracketManager.sportRuleKind === 'PICKLEBALL_SIDE_OUT';

  const bumpBracketViewVersion = () => {
    setBracketViewVersion((current) => current + 1);
  };

  const syncBracketAndOps = async () => {
    await Promise.all([
      bracketManager.refetchDivisionData(),
      refresh(),
    ]);
    bumpBracketViewVersion();
  };

  useEffect(() => {
    if (!selectedDivisionId) {
      return;
    }

    const selectedBracketDivision =
      bracketDivisions.find((division) => division.id === selectedDivisionId) ?? null;

    void Promise.resolve().then(() => {
      if (bracketSelectedDivisionId !== selectedDivisionId) {
        setBracketSelectedDivisionId(selectedDivisionId);
      }

      if (selectedBracketDivision) {
        applyDivisionFormValues(selectedBracketDivision);
      }
    });
  }, [
    applyDivisionFormValues,
    bracketDivisions,
    bracketSelectedDivisionId,
    selectedDivisionId,
    setBracketSelectedDivisionId,
  ]);

  const handleBracketGenerate = async () => {
    await bracketManager.handleGenerateBracket();
    await syncBracketAndOps();
  };

  const handleBracketSaveMatchConfig = async () => {
    await bracketManager.handleSaveMatchConfig();
    await syncBracketAndOps();
  };

  const handleBracketSaveStageDetails = async () => {
    await bracketManager.handleSaveStageDetails();
    await syncBracketAndOps();
  };

  const handleBracketSaveSchedule = async () => {
    await bracketManager.handleSaveSchedule();
    await syncBracketAndOps();
  };

  const handleBracketOpenScheduling = (match: typeof bracketManager.selectedMatch extends never ? never : Parameters<typeof bracketManager.handleOpenScheduling>[0]) => {
    setFocusedMatchId(match.id);
    bracketManager.handleOpenScheduling(match);
  };

  const handleFocusMatchOnBracket = (matchId: string) => {
    setFocusedMatchId(matchId);
    setActivePageTab('BRACKET');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bracketSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const matchNode = document.querySelector<HTMLElement>(`[data-bracket-match-id="${matchId}"]`);
        matchNode?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      });
    });
  };

  const handleOpsUpdateMatchSchedule = async (
    match: typeof matches[number],
    payload: {
      courtName?: string | null;
      courtAddress?: string | null;
      refereeId?: string | null;
      scheduledAt?: string | null;
    },
  ) => {
    await updateMatchSchedule(match, payload);
    await syncBracketAndOps();
  };

  const handleOpsApplyMatchOperation = async (
    match: typeof matches[number],
    payload: Parameters<typeof applyMatchOperation>[1],
  ) => {
    await applyMatchOperation(match, payload);
    await syncBracketAndOps();
  };

  const bracketMatches = useMemo<BracketMatch[]>(
    () =>
      bracketManager.bracket?.stages.flatMap((stage) =>
        stage.groups.flatMap((group) => group.matches),
      ) ?? [],
    [bracketManager.bracket],
  );

  const roundSummary = useMemo(() => {
    const grouped = new Map<string, {
      label: string;
      order: number;
      total: number;
      scheduled: number;
      ongoing: number;
      completed: number;
      missingAssignments: number;
    }>();

    for (const match of matches) {
      const label = getMatchRoundLabel({
        match,
        matches,
        tournamentFormat: match.stage?.type,
      });
      const key = `${match.roundNumber}-${label}`;
      const current = grouped.get(key) ?? {
        label,
        order: match.roundNumber,
        total: 0,
        scheduled: 0,
        ongoing: 0,
        completed: 0,
        missingAssignments: 0,
      };

      current.total += 1;
      if (match.status === 'SCHEDULED') current.scheduled += 1;
      if (match.status === 'ONGOING') current.ongoing += 1;
      if (match.status === 'COMPLETED') current.completed += 1;
      if (!match.courtName || !match.refereeId) current.missingAssignments += 1;
      grouped.set(key, current);
    }

    return Array.from(grouped.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'vi'));
  }, [matches]);

  const conflictSummary = useMemo(() => {
    const courtSlots = new Map<string, number>();
    const refereeSlots = new Map<string, number>();
    const participantSlots = new Map<string, number>();
    const dependencyConflicts = new Set<string>();

    const prerequisitesByMatchId = new Map<string, string[]>();
    for (const bracketMatch of bracketMatches) {
      const winnerNext = bracketMatch.nextMatchId;
      const loserNext = bracketMatch.loserNextMatchId;

      if (winnerNext) {
        prerequisitesByMatchId.set(winnerNext, [
          ...(prerequisitesByMatchId.get(winnerNext) ?? []),
          bracketMatch.id,
        ]);
      }

      if (loserNext) {
        prerequisitesByMatchId.set(loserNext, [
          ...(prerequisitesByMatchId.get(loserNext) ?? []),
          bracketMatch.id,
        ]);
      }
    }

    for (const match of matches) {
      if (!match.scheduledAt) {
        const prerequisites = prerequisitesByMatchId.get(match.id) ?? [];
        const blocked = prerequisites.some((prerequisiteId) => {
          const prerequisite = bracketMatches.find((item) => item.id === prerequisiteId);
          return prerequisite && prerequisite.status !== 'COMPLETED';
        });
        if (blocked) {
          dependencyConflicts.add(match.id);
        }
      } else {
        const slotTime = new Date(match.scheduledAt).toISOString();

        if (match.courtName) {
          const key = `${slotTime}::${match.courtName.trim().toLowerCase()}`;
          courtSlots.set(key, (courtSlots.get(key) ?? 0) + 1);
        }

        if (match.refereeId) {
          const key = `${slotTime}::${match.refereeId}`;
          refereeSlots.set(key, (refereeSlots.get(key) ?? 0) + 1);
        }

        for (const participantId of [match.participant1Id, match.participant2Id]) {
          if (!participantId) {
            continue;
          }
          const key = `${slotTime}::${participantId}`;
          participantSlots.set(key, (participantSlots.get(key) ?? 0) + 1);
        }

        const prerequisites = prerequisitesByMatchId.get(match.id) ?? [];
        const blocked = prerequisites.some((prerequisiteId) => {
          const prerequisite = bracketMatches.find((item) => item.id === prerequisiteId);
          return prerequisite && prerequisite.status !== 'COMPLETED';
        });
        if (blocked) {
          dependencyConflicts.add(match.id);
        }
      }
    }

    const countConflicts = (source: Map<string, number>) =>
      Array.from(source.values()).filter((count) => count > 1).length;

    return {
      court: countConflicts(courtSlots),
      referee: countConflicts(refereeSlots),
      participant: countConflicts(participantSlots),
      dependency: dependencyConflicts.size,
    };
  }, [bracketMatches, matches]);

  const matchInsights = useMemo(() => {
    const matchMap = new Map(bracketMatches.map((match) => [match.id, match]));
    const prerequisitesByMatchId = new Map<string, string[]>();

    for (const bracketMatch of bracketMatches) {
      if (bracketMatch.nextMatchId) {
        prerequisitesByMatchId.set(bracketMatch.nextMatchId, [
          ...(prerequisitesByMatchId.get(bracketMatch.nextMatchId) ?? []),
          bracketMatch.id,
        ]);
      }
      if (bracketMatch.loserNextMatchId) {
        prerequisitesByMatchId.set(bracketMatch.loserNextMatchId, [
          ...(prerequisitesByMatchId.get(bracketMatch.loserNextMatchId) ?? []),
          bracketMatch.id,
        ]);
      }
    }

    const nextInsights: Record<string, {
      hasCustomConfig: boolean;
      customConfigSummary: string[];
      dependencyBlocked: boolean;
      dependencySummary: string[];
    }> = {};

    for (const match of matches) {
      const bracketMatch = matchMap.get(match.id);
      const customConfigSummary: string[] = [];
      const resolvedRules = resolveMatchSportRules({
        matchConfig: bracketMatch?.matchConfig,
        tournament: { sportRules: tournament?.sportRules ?? null },
      });
      const scorePresentation = getMatchScorePresentation(resolvedRules.kind);

      if (bracketMatch?.matchConfig?.setsToWin) {
        customConfigSummary.push(`BO${bracketMatch.matchConfig.setsToWin * 2 - 1}`);
      }
      if (bracketMatch?.matchConfig?.pointsPerSet) {
        customConfigSummary.push(`${bracketMatch.matchConfig.pointsPerSet} ${scorePresentation.scoreUnit}/${scorePresentation.sequenceLabel}`);
      }
      if (bracketMatch?.matchConfig?.deuceEnabled === false) {
        customConfigSummary.push('không yêu cầu cách 2');
      }
      if (bracketMatch?.matchConfig?.tiebreakAt) {
        customConfigSummary.push(`ngưỡng chốt ${bracketMatch.matchConfig.tiebreakAt}`);
      }

      const prerequisiteNames = (prerequisitesByMatchId.get(match.id) ?? [])
        .map((prerequisiteId) => matchMap.get(prerequisiteId))
        .filter((item): item is NonNullable<typeof item> => !!item)
        .filter((item) => item.status !== 'COMPLETED')
        .map((item) => `Trận #${item.matchOrder} chưa xong`);

      nextInsights[match.id] = {
        hasCustomConfig: customConfigSummary.length > 0,
        customConfigSummary,
        dependencyBlocked: prerequisiteNames.length > 0,
        dependencySummary: prerequisiteNames,
      };
    }

    return nextInsights;
  }, [bracketMatches, matches, tournament?.sportRules]);

  const divisionHealth = useMemo(() => {
    const operationalMatches = matches.filter((match) => !(match.isBye || (!!match.winnerId && (!match.participant1Id || !match.participant2Id))));

    return {
      stageCount: bracketManager.bracket?.stages.length ?? 0,
      roundCount: new Set(matches.map((match) => match.roundNumber)).size,
      unscheduledCount: operationalMatches.filter((match) => !match.scheduledAt).length,
      customConfigCount: bracketMatches.filter((match) => !!match.matchConfig).length,
      conflictCount:
        conflictSummary.court + conflictSummary.referee + conflictSummary.participant + conflictSummary.dependency,
    };
  }, [bracketManager.bracket?.stages.length, bracketMatches, conflictSummary, matches]);

  if (isLoading && !tournament) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <LoadingSpinner className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Đang tải panel vận hành giải...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-slate-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <h1 className="text-lg font-bold">Không tải được dữ liệu giải đấu</h1>
            <p className="mt-1 text-sm font-medium">
              Giải đấu không tồn tại hoặc bạn không có quyền truy cập panel vận hành.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const buildPublicTournamentUrl = (tab?: 'bracket') => {
    const params = new URLSearchParams();

    if (tab) {
      params.set('tab', tab);
    }

    if (selectedDivisionId) {
      params.set('divisionId', selectedDivisionId);
    }

    const query = params.toString();
    return `/tournaments/${tournament.id}${query ? `?${query}` : ''}`;
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-4 shadow-sm sm:p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                {getSportLogo(tournament.category?.name) ? (
                  <img src={getSportLogo(tournament.category?.name)!} alt="" className="h-3 w-3 object-contain" />
                ) : null}
                {tournament.category?.name || 'Bộ môn'}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                tournament.status === 'IN_PROGRESS' || tournament.status === 'ONGOING'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                  : 'bg-slate-100 text-slate-655 border-slate-200'
              }`}>
                {TOURNAMENT_STATUS_LABELS[tournament.status] || tournament.status}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{tournament.name}</h1>
              <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-455">
                <Calendar className="h-4 w-4 text-slate-400" />
                Khai mạc: {tournament.startDate ? formatDate(tournament.startDate) : 'Chưa thiết lập'}
              </p>
            </div>
            <p className="max-w-3xl text-xs font-semibold leading-relaxed text-slate-455">
              Theo dõi lịch đấu, tỉ số, trọng tài và các tình huống cần xử lý trong ngày thi đấu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              className="border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
              onClick={() => { window.location.href = `/organizer/tournaments/${tournament.id}/manage`; }}
            >
              <Settings className="mr-2 h-4 w-4 text-slate-400" />
              Về cấu hình
            </Button>
            <Button
              variant="outline"
              className="border-slate-200 bg-slate-50/60 hover:bg-amber-100 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
              onClick={() => window.open(buildPublicTournamentUrl('bracket'), '_blank')}
            >
              <Trophy className="mr-2 h-4 w-4 text-blue-500" />
              Mở sơ đồ công khai
            </Button>
            <Button
              variant="outline"
              className="border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
              onClick={() => window.open(buildPublicTournamentUrl(), '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4 text-slate-400" />
              Xem trang giải
            </Button>
          </div>
        </div>
      </div>

      {/* Division Selector Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Nội dung thi đấu</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Chọn division để xem chi tiết hàng chờ vận hành, danh sách đấu thủ, lịch thi đấu và giải quyết xung đột theo ngữ cảnh.</p>
        </div>
        {divisions.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {divisions.map((division) => {
              const isActive = division.id === selectedDivisionId;
              return (
                <button
                  key={division.id}
                  type="button"
                  onClick={() => setSelectedDivisionId(division.id)}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-left transition-all active:scale-[0.98]',
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/10'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50',
                  )}
                >
                  <span className="block text-xs font-bold">{division.name}</span>
                  <span className={cn('mt-1 block text-[9px] font-bold uppercase tracking-wider', isActive ? 'text-blue-150' : 'text-slate-450')}>
                    {division.matchType}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-slate-700">Giải chưa có division để vận hành</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Hãy quay về cấu hình để tạo hoặc kích hoạt các hình thức thi đấu trước.
            </p>
          </div>
        )}
      </div>

      <div className="sticky top-16 z-30 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur lg:top-20">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {([
            { id: 'OVERVIEW', label: 'Tổng quan', icon: BarChart3 },
            { id: 'BRACKET', label: 'Sơ đồ', icon: Network },
            { id: 'OPERATIONS', label: 'Điều hành', icon: Activity },
            { id: 'CAMERA', label: 'Phát trực tiếp', icon: Video },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activePageTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePageTab(tab.id)}
                className={cn(
                  'flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-bold transition-colors sm:px-3 sm:py-3 sm:text-sm',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activePageTab === 'BRACKET' ? (
      <div ref={bracketSectionRef} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
        <div className="mb-5 space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Sơ đồ thi đấu điều phối trực tiếp</h2>
          <p className="text-sm font-medium text-slate-500">
            Sơ đồ này bám theo division đang chọn ở panel vận hành. Mọi thay đổi cấu hình, khởi tạo bracket, luật theo vòng và lịch trận đều thao tác ngay tại đây.
          </p>
        </div>

        <BracketTab
          key={`${selectedDivisionId}-${bracketViewVersion}`}
          tournament={bracketManager.tournament ?? tournament}
          bracket={bracketManager.bracket}
          selectedDivisionId={selectedDivisionId}
          participants={bracketManager.participants}
          isGeneratingBracket={bracketManager.isGeneratingBracket}
          handleGenerateBracket={handleBracketGenerate}
          handleOpenScheduling={handleBracketOpenScheduling}
          handleOpenRoundModal={bracketManager.handleOpenRoundModal}
          isLimitEnabled={bracketManager.isLimitEnabled}
          setIsLimitEnabled={bracketManager.setIsLimitEnabled}
          maxParticipants={bracketManager.maxParticipants}
          setMaxParticipants={bracketManager.setMaxParticipants}
          matchType={bracketManager.matchType}
          setMatchType={bracketManager.setMatchType}
          availableMatchFormatOptions={bracketManager.availableMatchFormatOptions}
          selectedCategory={bracketManager.selectedCategory}
          sportRuleKind={bracketManager.sportRuleKind}
          setSportRuleKind={bracketManager.setSportRuleKind}
          setsToWin={bracketManager.setsToWin}
          setSetsToWin={bracketManager.setSetsToWin}
          pointsPerSet={bracketManager.pointsPerSet}
          setPointsPerSet={bracketManager.setPointsPerSet}
          winByTwo={bracketManager.winByTwo}
          setWinByTwo={bracketManager.setWinByTwo}
          maxDeucePoints={bracketManager.maxDeucePoints}
          setMaxDeucePoints={bracketManager.setMaxDeucePoints}
          superTiebreakEnabled={bracketManager.superTiebreakEnabled}
          setSuperTiebreakEnabled={bracketManager.setSuperTiebreakEnabled}
          superTiebreakSetIndex={bracketManager.superTiebreakSetIndex}
          setSuperTiebreakSetIndex={bracketManager.setSuperTiebreakSetIndex}
          superTiebreakPoints={bracketManager.superTiebreakPoints}
          setSuperTiebreakPoints={bracketManager.setSuperTiebreakPoints}
          isSavingConfig={bracketManager.isSavingConfig}
          handleSaveMatchConfig={handleBracketSaveMatchConfig}
          bracketTypeState={bracketManager.bracketTypeState}
          setBracketTypeState={bracketManager.setBracketTypeState}
          tiebreakerMode={bracketManager.tiebreakerMode}
          setTiebreakerMode={bracketManager.setTiebreakerMode}
          roundsToPlay={bracketManager.roundsToPlay}
          setRoundsToPlay={bracketManager.setRoundsToPlay}
          tournamentFormat={bracketManager.bracketType ?? undefined}
          rrWinPoints={bracketManager.rrWinPoints}
          setRrWinPoints={bracketManager.setRrWinPoints}
          rrLossPoints={bracketManager.rrLossPoints}
          setRrLossPoints={bracketManager.setRrLossPoints}
          rrTiebreakerRule={bracketManager.rrTiebreakerRule}
          setRrTiebreakerRule={bracketManager.setRrTiebreakerRule}
          numGroups={bracketManager.numGroups}
          setNumGroups={bracketManager.setNumGroups}
          teamsPerGroup={bracketManager.teamsPerGroup}
          setTeamsPerGroup={bracketManager.setTeamsPerGroup}
          teamsAdvancing={bracketManager.teamsAdvancing}
          setTeamsAdvancing={bracketManager.setTeamsAdvancing}
          gskPlayoffType={bracketManager.gskPlayoffType}
          setGskPlayoffType={bracketManager.setGskPlayoffType}
          gskSeedingType={bracketManager.gskSeedingType}
          setGskSeedingType={bracketManager.setGskSeedingType}
          gskRoundsToPlay={bracketManager.gskRoundsToPlay}
          setGskRoundsToPlay={bracketManager.setGskRoundsToPlay}
          handleSaveRoundRobinConfig={bracketManager.handleSaveRoundRobinConfig}
          isSavingRoundRobinConfig={bracketManager.isSavingRoundRobinConfig}
          handleSaveGskConfig={bracketManager.handleSaveGskConfig}
          isSavingGskConfig={bracketManager.isSavingGskConfig}
          handleAdvanceStandings={bracketManager.handleAdvanceStandings}
          isAdvancingStandings={bracketManager.isAdvancingStandings}
          selectedMatchId={focusedMatchId}
          onSelectMatch={(match: import('@/types/tournament').BracketMatch) => setFocusedMatchId(match.id)}
          isLiteMode={tournament.sportRules?.mode === 'LITE'}
          setIsLiteMode={() => {}}
        />
      </div>
      ) : null}

      {activePageTab === 'OVERVIEW' ? (
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        {/* Division Health Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Tình trạng nội dung thi đấu hiện tại</h3>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-150 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Chặng đấu</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{divisionHealth.stageCount}</p>
            </div>
            <div className="rounded-lg border border-slate-150 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-455">Số vòng đấu</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{divisionHealth.roundCount}</p>
            </div>
            <div className="rounded-lg border border-blue-150 bg-blue-50/40 p-4 transition-all hover:bg-blue-50/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-650">Chưa xếp lịch</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{divisionHealth.unscheduledCount}</p>
            </div>
            <div className="rounded-lg border border-amber-150 bg-slate-50/40 p-4 transition-all hover:bg-slate-50/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-650">Cấu hình riêng</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{divisionHealth.customConfigCount}</p>
            </div>
            <div className="rounded-lg border border-rose-150 bg-rose-50/40 p-4 transition-all hover:bg-rose-50/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-650">Xung đột lịch</p>
              <p className="mt-2 text-2xl font-bold text-rose-700">{divisionHealth.conflictCount}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-3">Chi tiết xung đột ngày thi đấu</h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-150 bg-slate-50/30 px-4 py-3 text-xs font-semibold text-slate-700">
                <span>Trùng sân thi đấu:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${conflictSummary.court > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                  {conflictSummary.court}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-150 bg-slate-50/30 px-4 py-3 text-xs font-semibold text-slate-700">
                <span>Trùng trọng tài điều phối:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${conflictSummary.referee > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                  {conflictSummary.referee}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-150 bg-slate-50/30 px-4 py-3 text-xs font-semibold text-slate-700">
                <span>Trùng vận động viên/đội:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${conflictSummary.participant > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                  {conflictSummary.participant}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-150 bg-slate-50/30 px-4 py-3 text-xs font-semibold text-slate-700">
                <span>Sai thứ tự nhánh đấu:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${conflictSummary.dependency > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                  {conflictSummary.dependency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Round Summary Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Nhịp vận hành theo vòng</h3>
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar">
            {roundSummary.map((round) => (
              <div key={`${round.order}-${round.label}`} className="rounded-lg border border-slate-150 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{round.label}</p>
                    <p className="text-[11px] font-semibold text-slate-450 mt-0.5">
                      {round.total} trận đấu • {round.missingAssignments} trận thiếu phân sân/trọng tài
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                    <span className="rounded-lg bg-slate-150 px-2 py-1 text-slate-700">Lịch {round.scheduled}</span>
                    <span className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-1 text-blue-700">Đang đấu {round.ongoing}</span>
                    <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-emerald-700">Xong {round.completed}</span>
                  </div>
                </div>
              </div>
            ))}
            {roundSummary.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <p className="text-xs font-bold text-slate-500">Chưa có dữ liệu vòng thi đấu được khởi tạo.</p>
              </div>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {activePageTab === 'OPERATIONS' ? (
        <OperationsWorkspace
          participants={participants}
          matches={matches}
          referees={referees}
          activeParticipantActionId={activeParticipantActionId}
          activeMatchActionId={activeMatchActionId}
          focusedMatchId={focusedMatchId}
          onFocusMatch={handleFocusMatchOnBracket}
          matchInsights={matchInsights}
          activityLog={activityLog}
          error={error}
          onKickParticipant={kickParticipant}
          onUpdateMatchSchedule={handleOpsUpdateMatchSchedule}
          tournamentSportRules={tournament.sportRules ?? null}
          tournamentStatus={tournament.status}
          onApplyMatchOperation={handleOpsApplyMatchOperation}
        />
      ) : null}

      {activePageTab === 'CAMERA' ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-slate-900">Gán camera theo trận đấu</h2>
            <p className="text-sm font-semibold text-slate-500">
              BTC chọn camera theo từng trận. Trọng tài được phân công mới có thể bắt đầu hoặc dừng phát trực tiếp.
            </p>
          </div>
          <LivestreamTab tournament={bracketManager.tournament ?? tournament} bracket={bracketManager.bracket} />
        </section>
      ) : null}

      {bracketManager.selectedMatch && (
        <Modal
          open={!!bracketManager.selectedMatch}
          onOpenChange={() => bracketManager.setSelectedMatch(null)}
        >
          <ModalContent className="max-w-lg rounded-lg bg-white p-6">
            <ModalHeader>
              <ModalTitle className="text-lg font-bold">Xếp lịch thi đấu</ModalTitle>
            </ModalHeader>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">Sân</label>
                <input
                  value={bracketManager.matchCourtName}
                  onChange={(e) => bracketManager.setMatchCourtName(e.target.value)}
                  placeholder="Tên sân"
                  className="w-full rounded-lg border p-2 text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Giờ thi đấu</label>
                <DateTimePicker
                  value={bracketManager.matchScheduledAt}
                  onChange={bracketManager.setMatchScheduledAt}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Camera / Livestream</label>
                <select
                  value={bracketManager.matchCameraId || ''}
                  onChange={(e) => bracketManager.setMatchCameraId(e.target.value)}
                  className="w-full rounded-lg border p-2 text-sm bg-white text-slate-800"
                >
                  <option value="">-- Chưa gán camera --</option>
                  {bracketManager.cameras?.map((cam: LivestreamCamera) => (
                    <option key={cam.id} value={cam.id}>
                      📷 {cam.name} ({cam.protocol}) - [{cam.status}]
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <input
                  type="checkbox"
                  checked={bracketManager.isCustomMatchConfig}
                  onChange={(e) => bracketManager.setIsCustomMatchConfig(e.target.checked)}
                />
                Cấu hình riêng cho trận này
              </label>
              {bracketManager.isCustomMatchConfig && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Số {sportPresentation.setOptions[0]?.label.includes('game') ? 'game' : 'set'} cần thắng</label>
                    <input
                      type="number"
                      value={bracketManager.matchSetsToWin}
                      onChange={(e) => bracketManager.setMatchSetsToWin(Number(e.target.value))}
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{sportPresentation.setUnitLabel}</label>
                    <input
                      type="number"
                      value={bracketManager.matchPointsPerSet}
                      onChange={(e) => bracketManager.setMatchPointsPerSet(Number(e.target.value))}
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={bracketManager.matchDeuceEnabled}
                      onChange={(e) => bracketManager.setMatchDeuceEnabled(e.target.checked)}
                    />
                    <label className="text-xs font-bold text-slate-500">
                      {sportPresentation.winByTwoLabel}
                    </label>
                  </div>
                  {bracketManager.matchDeuceEnabled && (
                    <div>
                      <label className="text-xs text-slate-500">{sportPresentation.maxScoreLabel}</label>
                      <input
                        type="number"
                        value={bracketManager.matchMaxPoints}
                        onChange={(e) => bracketManager.setMatchMaxPoints(Number(e.target.value))}
                        className="w-full rounded-lg border p-2 text-sm"
                      />
                    </div>
                  )}
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={bracketManager.matchSuperTiebreakEnabled}
                      onChange={(e) => bracketManager.setMatchSuperTiebreakEnabled(e.target.checked)}
                    />
                    <label className="text-xs font-bold text-slate-500">
                      {supportsTiebreakInput ? `Bật ${sportPresentation.tiebreakLabel.toLowerCase()} cho trận này` : 'Dùng super tie-break cho trận này'}
                    </label>
                  </div>
                  {bracketManager.matchSuperTiebreakEnabled && (
                    <div>
                      <label className="text-xs text-slate-500">{sportPresentation.tiebreakLabel}</label>
                      <input
                        type="number"
                        value={bracketManager.matchSuperTiebreakPoints}
                        onChange={(e) => bracketManager.setMatchSuperTiebreakPoints(Number(e.target.value))}
                        className="w-full rounded-lg border p-2 text-sm"
                      />
                    </div>
                  )}
                  <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
                    {sportPresentation.presetSummary}
                    {isPickleballSideOut ? ' Nếu cần chấm pha đang diễn ra, nên dùng bảng điểm trực tiếp thay vì cấu hình tỉ số cuối game ở đây.' : ''}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => bracketManager.setSelectedMatch(null)}>
                  Hủy
                </Button>
                <Button
                  onClick={handleBracketSaveSchedule}
                  disabled={bracketManager.isScheduling}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                  {bracketManager.isScheduling ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
