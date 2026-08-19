'use client';

import type { SportRuleKind } from '@/types/tournament';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  tournamentsApi, divisionsApi, livestreamApi, LivestreamCamera, Tournament, TournamentFeesConfig, TournamentParticipant,
  BracketStage, BracketMatch, MatchTypeUI, MatchTypeDB, GenderRestriction, Division,
} from '@/features/tournaments/api';
import { venuesApi } from '@/features/venues/api';
import { matchesApi } from '@/features/matches/api';
import type { Match } from '@/types/match';
import { paymentsApi } from '@/features/payments/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import { getPlatformFeeBreakdown } from '@/utils/platform-fee';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { inferSportRuleKindFromCategory, resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { normalizeSportRuleKindForCategory } from '@/features/tournaments/sport-rules/options';
import {
  buildSportRulesPayload,
  buildStageRoundConfigPayload,
  buildStageRoundRulePayload,
} from '@/features/tournaments/sport-rules/payload';
import {
  getAllowedMatchFormatOptions,
  normalizeMatchFormatForCategory,
  type MatchFormatOptionValue,
} from '@/features/tournaments/match-format-options';
import { getTournamentStatusLabel, isTournamentRegistrationClosed } from '@/utils/tournament-status';
import type { StageRoundRuleConfig } from '@/types/tournament';

type RoundConfigRecord = Record<string, unknown>;

const isRoundConfigRecord = (value: unknown): value is RoundConfigRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const mergeRoundConfig = (existing: unknown, incoming: RoundConfigRecord): RoundConfigRecord => {
  const previous = isRoundConfigRecord(existing) ? existing : {};
  const merged: RoundConfigRecord = { ...previous, ...incoming };

  // Stage-specific saves must not erase the other stage's settings.
  for (const key of ['groupsConfig', 'advancementConfig', 'playoffConfig', 'scoring', 'tiebreakerRules', 'rounds']) {
    if (isRoundConfigRecord(previous[key]) && isRoundConfigRecord(incoming[key])) {
      merged[key] = { ...previous[key], ...incoming[key] };
    }
  }

  return merged;
};

export type TournamentReferee = {
  id: string; userId: string; status: string; fullName: string; avatarUrl: string | null;
};
export interface Venue { id: string; name: string; locationAddress: string; }
export interface Court { id: string; courtName: string; }

export function useManageState(id: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Data ──
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [bracket, setBracket] = useState<{ stages: BracketStage[] } | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [feesConfig, setFeesConfig] = useState<TournamentFeesConfig | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [cameras, setCameras] = useState<LivestreamCamera[]>([]);
  const [matchCameraId, setMatchCameraId] = useState<string>('');

  const fetchCameras = useCallback(async () => {
    if (!id) return;
    try {
      const res = await livestreamApi.getCameras(id);
      if (res.data) setCameras(res.data);
    } catch { /* silent */ }
  }, [id]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic'|'schedule'|'registration'|'bracket'|'livestream'|'finance'|'permissions'>('basic');
  const [validationField, setValidationField] = useState<string | null>(null);
  const [basicSubTab, setBasicSubTab] = useState<'general'|'branding'|'prizes'|'contact'>('general');
  const [referees, setReferees] = useState<TournamentReferee[]>([]);
  const [refereeEmail, setRefereeEmail] = useState('');
  const [isAddingReferee, setIsAddingReferee] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [isCreateDivisionModalOpen, setIsCreateDivisionModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [newDivisionMatchType, setNewDivisionMatchType] = useState('MALE_DOUBLES');
  const [newDivisionName, setNewDivisionName] = useState('');
  const [newDivisionBracketType, setNewDivisionBracketType] = useState('SINGLE_ELIMINATION');
  const [newDivisionEloEnabled, setNewDivisionEloEnabled] = useState(false);
  const [newDivisionMinElo, setNewDivisionMinElo] = useState<number | null>(null);
  const [newDivisionMaxElo, setNewDivisionMaxElo] = useState<number | null>(null);
  const [newDivisionMaxParticipants, setNewDivisionMaxParticipants] = useState(16);
  const [newDivisionLimitEnabled, setNewDivisionLimitEnabled] = useState(true);
  const [isCreatingDivision, setIsCreatingDivision] = useState(false);
  const [divisionPendingDelete, setDivisionPendingDelete] = useState<Division | null>(null);
  const [isDeletingDivision, setIsDeletingDivision] = useState(false);

  // ── Basic form ──
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [hideFeaturedCardText, setHideFeaturedCardText] = useState(false);
  const [prizeDescription, setPrizeDescription] = useState('');
  const [contactInfo, setContactInfo] = useState<Record<string,string|undefined>>({});
  const [visibility, setVisibility] = useState<'PUBLIC'|'PRIVATE'>('PUBLIC');
  const [registrationMode, setRegistrationMode] = useState<'OPEN'|'APPROVAL'|'INVITE_ONLY'>('OPEN');
  const [genderRestriction, setGenderRestriction] = useState<'MALE'|'FEMALE'|'MIXED'|''>('');
  const [eloEnabled, setEloEnabled] = useState(false);
  const [eloMin, setEloMin] = useState(0);
  const [eloMax, setEloMax] = useState(3000);
  const [eloMaxCombined, setEloMaxCombined] = useState(5000);
  const [eloMaxGap, setEloMaxGap] = useState(500);

  // ── Schedule ──
  const [venueId, setVenueId] = useState('');
  const [customVenueName, setCustomVenueName] = useState('');
  const [customVenueAddress, setCustomVenueAddress] = useState('');
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [registrationEndDate, setRegistrationEndDate] = useState('');

  // ── Pricing ──
  const [entryFee, setEntryFee] = useState(0);
  const [platformFeePerPlayer, setPlatformFeePerPlayer] = useState(10000);
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [isLimitEnabled, setIsLimitEnabled] = useState(true);
  const [matchType, setMatchType] = useState('DOUBLES');
  const [sportRuleKind, setSportRuleKind] = useState<SportRuleKind>('BADMINTON');
  const [setsToWin, setSetsToWin] = useState(2);
  const [pointsPerSet, setPointsPerSet] = useState(21);
  const [winByTwo, setWinByTwo] = useState(true);
  const [maxDeucePoints, setMaxDeucePoints] = useState(30);
  const [superTiebreakEnabled, setSuperTiebreakEnabled] = useState(false);
  const [superTiebreakSetIndex, setSuperTiebreakSetIndex] = useState(3);
  const [superTiebreakPoints, setSuperTiebreakPoints] = useState(10);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [tiebreakerMode, setTiebreakerMode] = useState<'split'|'playoff'>('split');
  const [roundsToPlay, setRoundsToPlay] = useState(1);
  // ⚠️ isLiteMode = CÁCH TÍNH ĐIỂM (scoring): LITE (tự do) vs STRICT (preset).
  // KHÔNG phải loại giải "giải lite". Loại giải dùng field riêng tournamentConfig.isLite.
  const [isLiteMode, setIsLiteMode] = useState(true);

  // Local safety net for unfinished management forms. This is deliberately
  // separate from the server model: a draft must never change tournament
  // visibility/status until the organizer explicitly saves it.
  const manageDraftKey = `sporto:tournament-manage-draft:${id}`;
  const manageDraftReadyRef = useRef(false);
  const manageDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'restored'>('idle');

  const clearManageDraft = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(manageDraftKey);
    setDraftStatus('idle');
  }, [manageDraftKey]);

  // Round Robin scoring config
  const [rrWinPoints, setRrWinPoints] = useState(3);
  const [rrLossPoints, setRrLossPoints] = useState(0);
  const [rrTiebreakerRule, setRrTiebreakerRule] = useState<'H2H_POINTS' | 'SET_DIFF' | 'POINT_DIFF'>('SET_DIFF');
  const [isSavingRoundRobinConfig, setIsSavingRoundRobinConfig] = useState(false);
  const [bracketTypeState, setBracketTypeState] = useState<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'>('SINGLE_ELIMINATION');

  // Group Stage Knockout config
  const [numGroups, setNumGroups] = useState(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [teamsAdvancing, setTeamsAdvancing] = useState(2);
  const [gskPlayoffType, setGskPlayoffType] = useState<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION'>('SINGLE_ELIMINATION');
  const [gskSeedingType, setGskSeedingType] = useState<'SEEDED' | 'RANDOM'>('SEEDED');
  const [gskRoundsToPlay, setGskRoundsToPlay] = useState(1);
  const [isSavingGskConfig, setIsSavingGskConfig] = useState(false);
  const [isAdvancingStandings, setIsAdvancingStandings] = useState(false);

  // ── Stage modal ──
  const [selectedStage, setSelectedStage] = useState<BracketStage|null>(null);
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number|null>(null);
  const [stageVenueId, setStageVenueId] = useState('');
  const [stageScheduledDate, setStageScheduledDate] = useState('');
  const [stageNotificationNote, setStageNotificationNote] = useState('');
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [stageMaxSets, setStageMaxSets] = useState(3);
  const [stagePointsPerSet, setStagePointsPerSet] = useState(21);
  const [stageWinBy2Points, setStageWinBy2Points] = useState(true);
  const [stageMaxDeucePoints, setStageMaxDeucePoints] = useState(30);
  const [stageSuperTiebreakEnabled, setStageSuperTiebreakEnabled] = useState(false);
  const [stageSuperTiebreakSetIndex, setStageSuperTiebreakSetIndex] = useState(3);
  const [stageSuperTiebreakPoints, setStageSuperTiebreakPoints] = useState(10);

  // ── Lock modal ──
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockSummary, setLockSummary] = useState<{totalParticipants:number;totalPlayers:number;platformFeePerPlayer:number;totalPlatformFee:number;platformFeeRuleLabel:string}|null>(null);

  // ── Phase 2 Open modal ──
  const [isOpening, setIsOpening] = useState(false);

  // ── Phase 3 End modal ──
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endChecklist, setEndChecklist] = useState<{
    totalMatches: number;
    completedMatches: number;
    liveMatches: number;
    hasLiveMatches: boolean;
    allCompleted: boolean;
  } | null>(null);

  // ── Match schedule modal ──
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch|null>(null);
  const [matchCourtId, setMatchCourtId] = useState('');
  const [matchCourtName, setMatchCourtName] = useState('');
  const [matchCourtAddress, setMatchCourtAddress] = useState('');
  const [matchScheduledAt, setMatchScheduledAt] = useState('');
  const [isCustomMatchConfig, setIsCustomMatchConfig] = useState(false);
  const [matchSetsToWin, setMatchSetsToWin] = useState(2);
  const [matchPointsPerSet, setMatchPointsPerSet] = useState(21);
  const [matchDeuceEnabled, setMatchDeuceEnabled] = useState(true);
  const [matchMaxPoints, setMatchMaxPoints] = useState(30);
  const [matchSuperTiebreakEnabled, setMatchSuperTiebreakEnabled] = useState(false);
  const [matchSuperTiebreakPoints, setMatchSuperTiebreakPoints] = useState(10);
  const [isScheduling, setIsScheduling] = useState(false);

  // ── Other ──
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [mockNamesText, setMockNamesText] = useState('');
  const [isSeedingMock, setIsSeedingMock] = useState(false);
  const [isClearingMock, setIsClearingMock] = useState(false);
  const [wildcardEmailOrPhone, setWildcardEmailOrPhone] = useState('');
  const [wildcardPartnerEmailOrPhone, setWildcardPartnerEmailOrPhone] = useState('');
  const [wildcardTeamName, setWildcardTeamName] = useState('');
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [isAssigningWildcard, setIsAssigningWildcard] = useState(false);
  const [activeParticipantActionId, setActiveParticipantActionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasConfigBeforeLock, setHasConfigBeforeLock] = useState(false);
  const [isPayingPlatformFee, setIsPayingPlatformFee] = useState(false);
  const [isPayingPublishFee, setIsPayingPublishFee] = useState(false);
  const [seedingMethod, setSeedingMethod] = useState<'ELO' | 'RANDOM' | 'MANUAL'>('MANUAL');
  const [isAutoSeeding, setIsAutoSeeding] = useState(false);
  // The tournament response already includes its canonical category. Prefer it
  // over the asynchronously loaded category list so changing a division cannot
  // temporarily fall back to the badminton defaults while categories load.
  const selectedCategory = tournament?.category
    ?? categories.find((category) => category.id === categoryId)
    ?? null;
  const availableMatchFormatOptions = getAllowedMatchFormatOptions(selectedCategory);
  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);
  const bracketType = selectedDivision?.bracketType || null;

  const getFormatLabel = (mt: string, gr?: string|null) => {
    if (mt === 'SINGLES') return gr === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam';
    if (mt === 'DOUBLES') return gr === 'FEMALE' ? 'Đôi Nữ' : 'Đôi Nam';
    if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') return 'Đôi Nam Nữ';
    return mt;
  };
  const getBracketLabel = (bt?: Division['bracketType']|null) => {
    if (bt === 'DOUBLE_ELIMINATION') return 'Nhánh thắng/thua';
    if (bt === 'ROUND_ROBIN') return 'Vòng tròn';
    if (bt === 'GROUP_STAGE_KNOCKOUT') return 'Vòng bảng + Loại trực tiếp';
    return 'Loại trực tiếp';
  };

  const publishFeeAmount = (() => {
    if (!tournament || !feesConfig) return 0;
    if (tournament.tournamentType === 'CLUB') return feesConfig.feeClub;
    return tournament.isRanked ? feesConfig.feePublicRanked : feesConfig.feePublicUnranked;
  })();

  const getStatusLabel = (status: Tournament['status']) => getTournamentStatusLabel(status);

  // ── Fetch helpers ──
  const fetchReferees = useCallback(async () => {
    try { const r = await tournamentsApi.getTournamentReferees(id); if(r.data) setReferees(r.data); }
    catch { /* silent */ }
  }, [id]);

  const refetchDivisionData = useCallback(async () => {
    if (!selectedDivisionId) return;
    try {
      const [pRes, bRes] = await Promise.all([
        tournamentsApi.getOrganizerTournamentParticipants(id, selectedDivisionId),
        tournamentsApi.getTournamentBracket(id, selectedDivisionId),
      ]);
      if (pRes.data) setParticipants(pRes.data);
      setBracket(bRes.data || null);
    } catch { /* silent */ }
  }, [id, selectedDivisionId]);

  const fetchDivisions = useCallback(async (tournamentId: string) => {
    try {
      const r = await divisionsApi.getDivisions(tournamentId);
      if (r.data && Array.isArray(r.data)) {
        setDivisions(r.data);
        setSelectedDivisionId(prev => {
          if (r.data.length === 0) return '';
          const reqDiv = searchParams.get('divisionId');
          if (reqDiv && r.data.some(d => d.id === reqDiv)) return reqDiv;
          return r.data.some(d => d.id === prev) ? prev : r.data[0].id;
        });
      } else { setDivisions([]); setSelectedDivisionId(''); }
    } catch { setDivisions([]); setSelectedDivisionId(''); }
  }, [searchParams]);

  const fetchVenueCourts = async (vId: string) => {
    try { const r = await venuesApi.getVenueById(vId); setCourts(r.data?.courts?.map(c => ({id:c.id, courtName:c.name})) || []); }
    catch { setCourts([]); }
  };

  const applyResolvedRuleState = useCallback((resolvedRules: ReturnType<typeof resolveSportRuleView>) => {
    setSportRuleKind(resolvedRules.kind);
    setSetsToWin(resolvedRules.setsToWin);
    setPointsPerSet(resolvedRules.pointsPerSet);
    setWinByTwo(resolvedRules.winByTwo);
    setMaxDeucePoints(resolvedRules.maxPoints);
    setSuperTiebreakEnabled(resolvedRules.hasCustomTiebreakTarget);
    setSuperTiebreakSetIndex(resolvedRules.bestOf);
    setSuperTiebreakPoints(resolvedRules.tiebreakPoints);
    setTiebreakerMode(resolvedRules.tiebreakerMode);
    setRoundsToPlay(resolvedRules.roundsToPlay);
    setIsLiteMode(resolvedRules.mode !== 'STRICT');
  }, []);

  const applyDivisionFormValues = useCallback((selected: Division) => {
    const categoryKind = inferSportRuleKindFromCategory(selectedCategory);
    const rawResolvedRules = resolveSportRuleView(selected.roundConfig, categoryKind);
    // A legacy division may contain a stale kind from another sport. Never let
    // that override the tournament category when the division is selected.
    const normalizedKind = normalizeSportRuleKindForCategory(rawResolvedRules.kind, selectedCategory);
    const resolvedRules = normalizedKind === rawResolvedRules.kind
      ? rawResolvedRules
      : resolveSportRuleView(buildDefaultSportRules(normalizedKind), normalizedKind);
    const roundConfig = selected.roundConfig as Record<string, unknown> | null | undefined;
    const groupsConfig = roundConfig?.groupsConfig as Record<string, unknown> | undefined;
    const advancementConfig = roundConfig?.advancementConfig as Record<string, unknown> | undefined;
    const playoffConfig = roundConfig?.playoffConfig as Record<string, unknown> | undefined;
    const tiebreakerRules = roundConfig?.tiebreakerRules as Record<string, unknown> | undefined;
    const standingsScoring = roundConfig?.scoring as Record<string, unknown> | undefined;

    setMatchType(
      selected.genderRestriction === 'FEMALE'
        ? (selected.matchType === 'SINGLES' ? MatchTypeUI.FEMALE_SINGLES : MatchTypeUI.FEMALE_DOUBLES)
        : selected.genderRestriction === 'MIXED' ? MatchTypeUI.MIXED_DOUBLES
        : (selected.matchType === 'SINGLES' ? MatchTypeUI.MALE_SINGLES : MatchTypeUI.MALE_DOUBLES));
    setMaxParticipants(selected.maxParticipants || 16);
    setIsLimitEnabled(!!selected.maxParticipants);
    setEntryFee(selected.entryFee || 0);
    applyResolvedRuleState(resolvedRules);
    setNumGroups(typeof groupsConfig?.numGroups === 'number' ? groupsConfig.numGroups : 2);
    setTeamsPerGroup(typeof groupsConfig?.teamsPerGroup === 'number' ? groupsConfig.teamsPerGroup : 4);
    setGskRoundsToPlay(typeof groupsConfig?.roundsToPlay === 'number' ? groupsConfig.roundsToPlay : 1);
    setTeamsAdvancing(typeof advancementConfig?.teamsAdvancing === 'number' ? advancementConfig.teamsAdvancing : 2);
    setGskPlayoffType(playoffConfig?.type === 'DOUBLE_ELIMINATION' ? 'DOUBLE_ELIMINATION' : 'SINGLE_ELIMINATION');
    setGskSeedingType(playoffConfig?.seedingType === 'RANDOM' ? 'RANDOM' : 'SEEDED');
    setRrWinPoints(typeof standingsScoring?.winPoints === 'number' ? standingsScoring.winPoints : 3);
    setRrLossPoints(typeof standingsScoring?.lossPoints === 'number' ? standingsScoring.lossPoints : 0);
    const primaryTiebreaker = tiebreakerRules?.primary;
    setRrTiebreakerRule(
      primaryTiebreaker === 'H2H_POINTS' || primaryTiebreaker === 'POINT_DIFF'
        ? primaryTiebreaker
        : 'SET_DIFF',
    );
    const defaultBracketType = (tournament?.tournamentConfig as { bracketType?: string })?.bracketType || 'SINGLE_ELIMINATION';
    setBracketTypeState((selected.bracketType || defaultBracketType) as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT');
  }, [applyResolvedRuleState, selectedCategory, tournament]);

  // ── Handlers ──
  const handleSaveBasicInfo = async () => {
    setIsSavingConfig(true);
    try {
      await tournamentsApi.updateTournament(id, {
        name,
        categoryId,
        description,
        bannerUrl: bannerUrl || null,
        logoUrl: logoUrl || null,
        prizeDescription: prizeDescription || null,
        contactInfo,
        visibility,
        tournamentConfig: {
          ...tournament?.tournamentConfig,
          hideFeaturedCardText,
          mode: isLiteMode ? 'LITE' : 'STRICT',
        },
      });
      if (selectedDivisionId && tournament) {
        const pm: Record<string,{mt:MatchTypeDB;gr:GenderRestriction|null}> = {
          MALE_SINGLES: {mt:MatchTypeDB.SINGLES, gr:GenderRestriction.MALE},
          FEMALE_SINGLES: {mt:MatchTypeDB.SINGLES, gr:GenderRestriction.FEMALE},
          MALE_DOUBLES: {mt:MatchTypeDB.DOUBLES, gr:GenderRestriction.MALE},
          FEMALE_DOUBLES: {mt:MatchTypeDB.DOUBLES, gr:GenderRestriction.FEMALE},
          MIXED_DOUBLES: {mt:MatchTypeDB.MIXED_DOUBLES, gr:GenderRestriction.MIXED},
        };
        const normalizedMatchType = normalizeMatchFormatForCategory(matchType as MatchFormatOptionValue, selectedCategory);
        const mapped = pm[normalizedMatchType] || {mt:MatchTypeDB.DOUBLES, gr:null};

        const currentDiv = divisions.find(d => d.id === selectedDivisionId);
        const hasMatchTypeChanged = currentDiv && (currentDiv.matchType !== mapped.mt || currentDiv.genderRestriction !== mapped.gr);

        const divUpdatePayload: Record<string, unknown> = {
          maxParticipants: isLimitEnabled ? maxParticipants : null,
          isConfigOverride: true,
          roundConfig: buildStageRoundConfigPayload({
            kind: normalizeSportRuleKindForCategory(sportRuleKind, selectedCategory),
            setsToWin,
            pointsPerSet,
            winByTwo,
            maxPoints: winByTwo ? maxDeucePoints : null,
          }),
        };

        if (hasMatchTypeChanged) {
          divUpdatePayload.matchType = mapped.mt;
          divUpdatePayload.genderRestriction = mapped.gr;
        }

        await divisionsApi.updateDivisionConfig(tournament.id, selectedDivisionId, divUpdatePayload);
        await fetchDivisions(id);
      }
      toast.success('Lưu thông tin giải đấu thành công!');
      clearManageDraft();
      await fetchTournamentData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSavingConfig(false); }
  };

  const handleSaveScheduleDetails = async () => {
    setIsSavingConfig(true);
    try {
      const pName = provinces.find(p=>p.code===provinceCode)?.name||'';
      const wName = wards.find(w=>w.code===wardCode)?.name||'';
      const fullAddr = [customVenueAddress.trim(), wName, pName].filter(Boolean).join(', ');
      if (!customVenueName.trim() || !fullAddr) { toast.error('Vui lòng điền tên sân và địa chỉ'); setIsSavingConfig(false); return; }
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) { toast.error('Ngày kết thúc phải sau ngày khai mạc'); setIsSavingConfig(false); return; }
      if (registrationStartDate && registrationEndDate && new Date(registrationEndDate) <= new Date(registrationStartDate)) { toast.error('Hạn chót đăng ký phải sau ngày mở đăng ký'); setIsSavingConfig(false); return; }
      if (startDate && registrationEndDate && new Date(startDate) < new Date(registrationEndDate)) { toast.error('Ngày khai mạc phải sau hạn chốt đăng ký'); setIsSavingConfig(false); return; }

      const venueRes = await venuesApi.createVenue({ name: customVenueName.trim(), locationAddress: fullAddr });
      const finalVenueId = venueRes?.data?.id || null;
      await tournamentsApi.updateTournament(id, {
        venueId: finalVenueId, city: pName || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        registrationStartDate: registrationStartDate ? new Date(registrationStartDate).toISOString() : null,
        registrationEndDate: registrationEndDate ? new Date(registrationEndDate).toISOString() : null,
      });
      toast.success('Lưu thông tin lịch và địa điểm thành công!');
      clearManageDraft();
      await fetchTournamentData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSavingConfig(false); }
  };

  const handleSaveRegistrationSettings = async () => {
    setIsSavingConfig(true);
    try {
      const currentNow = new Date();
      currentNow.setMinutes(currentNow.getMinutes() - 2);

      let finalRegStart = registrationStartDate;
      if (!finalRegStart || new Date(finalRegStart) < currentNow) {
        const now = new Date();
        const pad = (v: number) => String(v).padStart(2, '0');
        finalRegStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setRegistrationStartDate(finalRegStart);
      }

      if (finalRegStart && registrationEndDate && new Date(registrationEndDate) <= new Date(finalRegStart)) {
        toast.error('Hạn chót đăng ký phải sau ngày mở đăng ký');
        setIsSavingConfig(false);
        return;
      }
      if (startDate && registrationEndDate && new Date(startDate) < new Date(registrationEndDate)) {
        toast.error('Ngày khai mạc phải sau hạn chốt đăng ký');
        setIsSavingConfig(false);
        return;
      }

      const regPayload: Record<string, unknown> = {
        visibility,
        registrationStartDate: finalRegStart ? new Date(finalRegStart).toISOString() : null,
        registrationEndDate: registrationEndDate ? new Date(registrationEndDate).toISOString() : null,
        tournamentConfig: {
          ...tournament?.tournamentConfig,
          // Club Lite keeps its frictionless OPEN policy by default, but a
          // public Quick tournament must retain APPROVAL just like the
          // Advanced registration flow.
          registrationMode: tournament?.communityId && (tournament?.isLite || tournament?.tournamentConfig?.isLite)
            ? registrationMode === 'INVITE_ONLY' ? 'INVITE_ONLY' : 'OPEN'
            : registrationMode,
        },
      };
      await tournamentsApi.updateTournament(id, regPayload);

      if (selectedDivisionId) {
        const divData: Record<string, unknown> = eloEnabled
          ? { minElo: eloMin, maxElo: eloMax }
          : { minElo: null, maxElo: null };
        await tournamentsApi.updateDivisionConfig(id, selectedDivisionId, divData);
      }
      toast.success('Lưu thông tin đăng ký thành công!');
      clearManageDraft();
      await fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleParticipantModeration = async (
    participantId: string,
    status: 'COMPLETE' | 'REJECTED',
    successMessage: string,
  ) => {
    setActiveParticipantActionId(participantId);
    try {
      await tournamentsApi.updateParticipantStatus(id, participantId, status);
      toast.success(successMessage);
      await refetchDivisionData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveParticipantActionId(null);
    }
  };

  const handleApproveParticipant = async (participantId: string) => {
    await handleParticipantModeration(participantId, 'COMPLETE', 'Đã duyệt đăng ký thành công!');
  };

  const handleDeleteMockParticipant = async (participantId: string) => {
    setActiveParticipantActionId(participantId);
    try {
      await tournamentsApi.deleteMockParticipant(id, participantId);
      toast.success('Đã xoá dữ liệu mock thành công!');
      await refetchDivisionData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveParticipantActionId(null);
    }
  };

  const handleRejectParticipant = async (participantId: string) => {
    const participant = participants.find((item) => item.id === participantId);
    const isMockParticipant = Boolean(participant?.members?.some((member) => member.isMock));
    if (isMockParticipant) {
      await handleDeleteMockParticipant(participantId);
      return;
    }

    await handleParticipantModeration(participantId, 'REJECTED', 'Đã từ chối đăng ký thành công!');
  };

  const handleKickParticipant = async (participantId: string, reason?: string) => {
    setActiveParticipantActionId(participantId);
    try {
      await tournamentsApi.kickParticipant(id, participantId, reason?.trim() || 'Loại khỏi giải theo điều lệ');
      toast.success('Đã loại đội khỏi giải.');
      await refetchDivisionData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActiveParticipantActionId(null);
    }
  };

  const handleSaveMatchConfig = async () => {
    if (!tournament || !selectedDivisionId) { toast.error('Vui lòng chọn nội dung thi đấu'); return; }
    setIsSavingConfig(true);
    try {
      const pm: Record<string,{mt:MatchTypeDB;gr:GenderRestriction|null}> = {
        MALE_SINGLES:{mt:MatchTypeDB.SINGLES,gr:GenderRestriction.MALE}, FEMALE_SINGLES:{mt:MatchTypeDB.SINGLES,gr:GenderRestriction.FEMALE},
        MALE_DOUBLES:{mt:MatchTypeDB.DOUBLES,gr:GenderRestriction.MALE}, FEMALE_DOUBLES:{mt:MatchTypeDB.DOUBLES,gr:GenderRestriction.FEMALE},
        MIXED_DOUBLES:{mt:MatchTypeDB.MIXED_DOUBLES,gr:GenderRestriction.MIXED},
      };
      const normalizedMatchType = normalizeMatchFormatForCategory(matchType as MatchFormatOptionValue, selectedCategory);
      const mapped = pm[normalizedMatchType] || {mt:MatchTypeDB.DOUBLES, gr:null};
      const selected = divisions.find(d=>d.id===selectedDivisionId);
      const normalizedKind = normalizeSportRuleKindForCategory(sportRuleKind, selectedCategory);
      const nextRoundConfig = mergeRoundConfig(selected?.roundConfig, buildStageRoundConfigPayload({
        kind: normalizedKind,
        setsToWin,
        pointsPerSet,
        winByTwo,
        maxPoints: winByTwo ? maxDeucePoints : null,
        tiebreakPoints: superTiebreakEnabled ? superTiebreakPoints : null,
        tiebreakerMode,
        roundsToPlay,
        rounds: selected?.roundConfig?.rounds || {},
      }));
      const nextSportRules = buildSportRulesPayload({
        kind: normalizedKind,
        setsToWin,
        pointsPerSet,
        winByTwo,
        maxPoints: winByTwo ? maxDeucePoints : null,
        tiebreakPoints: superTiebreakEnabled ? superTiebreakPoints : null,
        tiebreakerMode,
        roundsToPlay,
        mode: isLiteMode ? 'LITE' : 'STRICT',
      });
      await divisionsApi.updateDivisionConfig(tournament.id, selectedDivisionId, {
        matchType: mapped.mt, genderRestriction: mapped.gr,
        bracketType: bracketTypeState,
        maxParticipants: isLimitEnabled ? maxParticipants : null, isConfigOverride: true,
        roundConfig: nextRoundConfig,
      });
      
      // Đồng bộ mode vào tournamentConfig để mobile app (Flutter) có thể nhận diện LITE mode
      await tournamentsApi.updateTournament(tournament.id, {
        tournamentConfig: {
          ...tournament.tournamentConfig,
          mode: isLiteMode ? 'LITE' : 'STRICT',
        }
      });
      
      toast.success('Lưu cấu hình thi đấu thành công!');
      await fetchDivisions(tournament.id);
      setTournament((current) => current ? {
        ...current,
        sportRules: nextSportRules,
        tournamentConfig: {
          ...(current.tournamentConfig || {}),
          mode: isLiteMode ? 'LITE' : 'STRICT',
        }
      } : current);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSavingConfig(false); }
  };

  const handleSaveRoundRobinConfig = async () => {
    if (!tournament || !selectedDivisionId) { toast.error('Vui lòng chọn nội dung thi đấu'); return; }
    setIsSavingRoundRobinConfig(true);
    try {
      const selected = divisions.find((division) => division.id === selectedDivisionId);
      await tournamentsApi.updateDivisionConfig(tournament.id, selectedDivisionId, {
        bracketType: 'ROUND_ROBIN',
        isConfigOverride: true,
        roundConfig: mergeRoundConfig(selected?.roundConfig, {
          ...buildStageRoundConfigPayload({
            kind: normalizeSportRuleKindForCategory(sportRuleKind, selectedCategory),
            setsToWin,
            pointsPerSet,
            winByTwo,
            maxPoints: winByTwo ? maxDeucePoints : null,
            tiebreakPoints: superTiebreakEnabled ? superTiebreakPoints : null,
            tiebreakerMode,
          }),
          scoring: { winPoints: rrWinPoints, drawPoints: 0, lossPoints: rrLossPoints },
          tiebreakerRules: {
            primary: rrTiebreakerRule,
            secondary: ['SET_DIFF', 'H2H_POINTS', 'POINT_DIFF'].filter((rule) => rule !== rrTiebreakerRule),
          },
          roundsToPlay,
        }),
      });
      toast.success('Lưu cấu hình vòng bảng thành công!');
      await refetchDivisionData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSavingRoundRobinConfig(false); }
  };

  const handleAdvanceStandings = async () => {
    if (!tournament || !selectedDivisionId) { toast.error('Vui lòng chọn nội dung thi đấu'); return; }
    setIsAdvancingStandings(true);
    try {
      const rrStage = bracket?.stages?.find((s) => s.type === 'ROUND_ROBIN');
      if (!rrStage) {
        toast.error('Không tìm thấy vòng bảng để chuyển tiếp');
        setIsAdvancingStandings(false);
        return;
      }
      await tournamentsApi.advanceStandings(tournament.id, {
        divisionId: selectedDivisionId,
        stageId: rrStage.id,
      });
      toast.success('Đã cập nhật nhánh knockout từ bảng xếp hạng!');
      await refetchDivisionData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsAdvancingStandings(false); }
  };

  const handleSaveGskConfig = async () => {
    if (!tournament || !selectedDivisionId) { toast.error('Vui lòng chọn nội dung thi đấu'); return; }
    const selected = divisions.find((division) => division.id === selectedDivisionId);
    const eligibleParticipants = participants.filter((participant) => participant.teamStatus === 'COMPLETE' && participant.isPaid).length;
    if (numGroups < 2) { toast.error('Vòng bảng + loại trực tiếp phải có ít nhất 2 bảng'); return; }
    if (teamsPerGroup < 2) { toast.error('Mỗi bảng phải có ít nhất 2 đội'); return; }
    // The division's registration limit (for example 64) is separate from
    // the current group layout. If the organizer already has more eligible
    // teams than the layout can hold, expand each group to the smallest valid
    // capacity instead of rejecting a configuration that can be repaired
    // deterministically. The corrected value is persisted with the division.
    const requiredTeamsPerGroup = eligibleParticipants > 0
      ? Math.ceil(eligibleParticipants / numGroups)
      : teamsPerGroup;
    const effectiveTeamsPerGroup = Math.max(teamsPerGroup, requiredTeamsPerGroup);
    if (effectiveTeamsPerGroup > 128) {
      toast.error('Mỗi bảng không thể vượt quá 128 đội. Hãy tăng số bảng hoặc giảm số đội hợp lệ.');
      return;
    }
    if (effectiveTeamsPerGroup !== teamsPerGroup) {
      setTeamsPerGroup(effectiveTeamsPerGroup);
      toast(`Đã tăng số đội mỗi bảng lên ${effectiveTeamsPerGroup} để đủ chỗ cho ${eligibleParticipants} đội hợp lệ.`, { id: 'gsk-capacity-adjusted' });
    }
    const smallestGroupSize = eligibleParticipants > 0 ? Math.floor(eligibleParticipants / numGroups) : effectiveTeamsPerGroup;
    if (teamsAdvancing < 1 || teamsAdvancing >= smallestGroupSize) {
      toast.error(`Số đội đi tiếp mỗi bảng phải từ 1 đến ${Math.max(1, smallestGroupSize - 1)}`);
      return;
    }
    if (numGroups * teamsAdvancing > 64) {
      toast.error('Knockout hiện hỗ trợ tối đa 64 đội đi tiếp từ vòng bảng');
      return;
    }
    setIsSavingGskConfig(true);
    try {
      await tournamentsApi.updateDivisionConfig(tournament.id, selectedDivisionId, {
        bracketType: 'GROUP_STAGE_KNOCKOUT',
        isConfigOverride: true,
        roundConfig: mergeRoundConfig(selected?.roundConfig, {
          ...buildStageRoundConfigPayload({
            kind: normalizeSportRuleKindForCategory(sportRuleKind, selectedCategory),
            setsToWin,
            pointsPerSet,
            winByTwo,
            maxPoints: winByTwo ? maxDeucePoints : null,
            tiebreakPoints: superTiebreakEnabled ? superTiebreakPoints : null,
            tiebreakerMode,
          }),
          groupsConfig: { numGroups, teamsPerGroup: effectiveTeamsPerGroup, roundsToPlay: gskRoundsToPlay },
          advancementConfig: {
            teamsAdvancing,
            allowWildcardThird: false,
            wildcardTeamsAdvancing: 0,
          },
          playoffConfig: { type: gskPlayoffType, seedingType: gskSeedingType },
          scoring: { winPoints: rrWinPoints, drawPoints: 0, lossPoints: rrLossPoints },
          tiebreakerRules: {
            primary: rrTiebreakerRule,
            secondary: ['SET_DIFF', 'H2H_POINTS', 'POINT_DIFF'].filter((rule) => rule !== rrTiebreakerRule),
          },
        }),
      });
      toast.success('Lưu cấu hình vòng bảng + knockout thành công!');
      await refetchDivisionData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSavingGskConfig(false); }
  };

  const handleSaveFinanceConfig = async () => {
    if (!tournament || !selectedDivisionId) { toast.error('Vui lòng chọn nội dung thi đấu'); return; }
    setIsSavingConfig(true);
    try { await divisionsApi.updateDivision(selectedDivisionId, { entryFee }); toast.success('Lưu cài đặt tài chính thành công!'); await fetchDivisions(tournament.id); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSavingConfig(false); }
  };

  const handleAddReferee = async (e: React.FormEvent) => {
    e.preventDefault(); if (!refereeEmail.trim()) return;
    setIsAddingReferee(true);
    try { await tournamentsApi.addTournamentReferee(id, refereeEmail.trim()); toast.success('Đã gửi lời mời trọng tài!'); setRefereeEmail(''); await fetchReferees(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsAddingReferee(false); }
  };

  const openDivisionEditor = (division: Division) => {
    const divisionFormatKey: MatchFormatOptionValue = division.matchType === MatchTypeDB.MIXED_DOUBLES || division.genderRestriction === GenderRestriction.MIXED
      ? 'MIXED_DOUBLES'
      : division.matchType === MatchTypeDB.SINGLES
        ? division.genderRestriction === GenderRestriction.FEMALE ? 'FEMALE_SINGLES' : 'MALE_SINGLES'
        : division.genderRestriction === GenderRestriction.FEMALE ? 'FEMALE_DOUBLES' : 'MALE_DOUBLES';
    setEditingDivision(division);
    setNewDivisionMatchType(normalizeMatchFormatForCategory(
      divisionFormatKey,
      selectedCategory,
    ));
    setNewDivisionName(division.name);
    setNewDivisionBracketType(division.bracketType ?? 'SINGLE_ELIMINATION');
    setNewDivisionEloEnabled(division.minElo != null || division.maxElo != null);
    setNewDivisionMinElo(division.minElo ?? null);
    setNewDivisionMaxElo(division.maxElo ?? null);
    setNewDivisionMaxParticipants(division.maxParticipants ?? 16);
    setNewDivisionLimitEnabled(division.maxParticipants != null);
    setIsCreateDivisionModalOpen(true);
  };

  const resetDivisionEditor = () => {
    setEditingDivision(null);
    setNewDivisionMatchType(normalizeMatchFormatForCategory('MALE_DOUBLES', selectedCategory));
    setNewDivisionName('');
    setNewDivisionBracketType(divisions[0]?.bracketType ?? 'SINGLE_ELIMINATION');
    setNewDivisionEloEnabled(eloEnabled);
    setNewDivisionMinElo(eloEnabled ? eloMin : null);
    setNewDivisionMaxElo(eloEnabled ? eloMax : null);
    setNewDivisionMaxParticipants(16);
    setNewDivisionLimitEnabled(true);
  };

  const handleCreateDivision = async () => {
    if (!tournament?.id) { toast.error('Không tìm thấy giải đấu'); return; }
    if (!editingDivision && divisions.length >= 20) {
      toast.error('Mỗi giải đấu chỉ được tạo tối đa 20 nội dung thi đấu.');
      return;
    }
    setIsCreatingDivision(true);
    try {
      const pm: Record<string,{mt:MatchTypeDB;gr:GenderRestriction|null}> = {
        MALE_SINGLES:{mt:MatchTypeDB.SINGLES,gr:GenderRestriction.MALE}, FEMALE_SINGLES:{mt:MatchTypeDB.SINGLES,gr:GenderRestriction.FEMALE},
        MALE_DOUBLES:{mt:MatchTypeDB.DOUBLES,gr:GenderRestriction.MALE}, FEMALE_DOUBLES:{mt:MatchTypeDB.DOUBLES,gr:GenderRestriction.FEMALE},
        MIXED_DOUBLES:{mt:MatchTypeDB.MIXED_DOUBLES,gr:GenderRestriction.MIXED},
      };
      const normalizedMatchType = normalizeMatchFormatForCategory(
        newDivisionMatchType as MatchFormatOptionValue,
        selectedCategory,
      );
      const mapped = pm[normalizedMatchType] || {mt:MatchTypeDB.DOUBLES, gr:null};
      const generatedName = getFormatLabel(mapped.mt, mapped.gr);
      const divisionName = newDivisionName.trim() || generatedName;
      const normalizedKind = normalizeSportRuleKindForCategory(
        inferSportRuleKindFromCategory(selectedCategory),
        selectedCategory,
      );
      const defaultRules = buildDefaultSportRules(normalizedKind);
      const divisionPayload = {
        name: divisionName,
        matchType: mapped.mt,
        genderRestriction: mapped.gr,
        bracketType: newDivisionBracketType as Division['bracketType'],
        // A new division follows the tournament-wide schedule by default.
        // Per-division overrides remain available through the division schedule API.
        startDate: tournament.startDate ?? null,
        endDate: tournament.endDate ?? null,
        isConfigOverride: true,
        // Never reset an existing division's detailed scoring setup just
        // because its label, bracket, or ELO limits are being edited.
        roundConfig: editingDivision?.roundConfig ?? buildStageRoundConfigPayload({
          kind: normalizedKind,
          setsToWin: defaultRules.setsToWin,
          pointsPerSet: defaultRules.pointsPerSet,
          winByTwo: defaultRules.winByTwo,
          maxPoints: defaultRules.maxPoints,
          tiebreakPoints: defaultRules.tiebreakPoints,
          roundsToPlay: 1,
        }),
        minElo: newDivisionEloEnabled ? newDivisionMinElo : null,
        maxElo: newDivisionEloEnabled ? newDivisionMaxElo : null,
        maxParticipants: newDivisionLimitEnabled ? newDivisionMaxParticipants : null,
      };
      const res = editingDivision
        ? await divisionsApi.updateDivision(editingDivision.id, divisionPayload)
        : await divisionsApi.createDivision(tournament.id, divisionPayload);
      toast.success(editingDivision ? `Đã cập nhật "${divisionName}".` : `Đã thêm "${divisionName}" thành công!`);
      setIsCreateDivisionModalOpen(false);
      resetDivisionEditor();
      await fetchDivisions(tournament.id);
      if (res.data) setSelectedDivisionId(res.data.id);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsCreatingDivision(false); }
  };

  const requestDeleteDivision = (div: Division) => {
    if (divisions.length <= 1) { toast.error('Giải phải có ít nhất 1 nội dung thi đấu'); return; }
    setDivisionPendingDelete(div);
  };
  const handleConfirmDeleteDivision = async () => {
    if (!divisionPendingDelete || !tournament?.id) return;
    setIsDeletingDivision(true);
    try { await divisionsApi.deleteDivision(divisionPendingDelete.id); toast.success('Đã xóa hình thức!'); setDivisionPendingDelete(null); await fetchDivisions(tournament.id); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsDeletingDivision(false); }
  };

  const handleGenerateBracket = async () => {
    setIsGeneratingBracket(true);
    try {
      toast.loading('Đang khởi tạo sơ đồ thi đấu...', {id:'gen-bracket'});
      await tournamentsApi.generateBracket(
        id,
        selectedDivisionId || undefined,
        bracketTypeState === 'GROUP_STAGE_KNOCKOUT' ? gskSeedingType : undefined,
      );
      toast.success('Khởi tạo sơ đồ thi đấu thành công!', {id:'gen-bracket'});
      await refetchDivisionData();
    } catch (err) { toast.error(getErrorMessage(err), {id:'gen-bracket'}); }
    finally { setIsGeneratingBracket(false); }
  };

  const handleRequestPayout = async (data: {bankName:string;bankAccountNumber:string;bankAccountName:string;amountRequested:number}) => {
    await paymentsApi.requestPayout({ tournamentId: tournament?.id||id, ...data });
  };

  const handleRegenerateInviteCode = async () => {
    try { await tournamentsApi.regenerateInviteCode(id); toast.success('Mã mời đã được tạo lại!'); await fetchTournamentData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handlePublish = async () => {
    const hasDescription = Boolean(tournament?.description?.trim());
    const hasDivisions = Boolean(tournament?.divisions?.length || divisions.length);
    const hasVenue = Boolean(tournament?.venueId || tournament?.locationAddress?.trim());
    const hasDates = Boolean(tournament?.registrationStartDate && tournament?.registrationEndDate && tournament?.startDate && tournament?.endDate);
    const hasValidDates = hasDates && new Date(tournament!.registrationStartDate!) < new Date(tournament!.registrationEndDate!) && new Date(tournament!.registrationEndDate!) <= new Date(tournament!.startDate!);
    const hasContact = Boolean(tournament?.contactInfo && ((tournament.contactInfo as Record<string, string>).email || (tournament.contactInfo as Record<string, string>).phone));
    const invalid = (tab: typeof activeTab, field: string, message: string) => {
      setActiveTab(tab);
      setValidationField(field);
      toast.error(message);
    };
    if (!hasDescription) return invalid('basic', 'description', 'Hãy bổ sung mô tả giải đấu trước khi công bố.');
    if (!hasDivisions) return invalid('basic', 'divisions', 'Hãy tạo ít nhất một bảng thi đấu trước khi công bố.');
    if (!hasVenue) return invalid('schedule', 'venue', 'Hãy nhập tên sân và địa chỉ thi đấu trước khi công bố.');
    if (!hasValidDates) return invalid('schedule', 'dates', 'Hãy kiểm tra đầy đủ ngày giờ đăng ký và thi đấu.');
    if (!hasContact) return invalid('basic', 'contactInfo', 'Hãy bổ sung email hoặc số điện thoại liên hệ BTC.');
    setValidationField(null);
    try {
      setIsLoading(true);
      await tournamentsApi.publishTournament(id);
      toast.success('Giải đấu đã được công bố!');
      await fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPublishFee = async () => {
    if (!tournament) return;
    if (publishFeeAmount <= 0) { await handlePublish(); return; }
    setIsPayingPublishFee(true);
    try {
      const res = await paymentsApi.createPaymentLink({ 
        tournamentId: id, 
        amount: publishFeeAmount,
        purpose: 'TOURNAMENT_PUBLISH_FEE'
      });
      if (res.data?.paymentUrl) { toast.success('Đang chuyển đến thanh toán phí công bố.'); router.push(res.data.paymentUrl); }
      else toast.error('Không có liên kết thanh toán.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsPayingPublishFee(false); }
  };

  const handleDeleteTournament = async () => {
    if (!confirm('Bạn có chắc muốn xóa? Không thể hoàn tác.')) return;
    setIsDeleting(true);
    try {
      const res = await tournamentsApi.deleteTournament(id);
      const rd = res?.data as Record<string,unknown>|undefined;
      toast.success((rd?.message as string) || 'Đã xóa giải đấu!');
      router.push('/organizer/tournaments');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsDeleting(false); }
  };

  const handlePayPlatformFee = async () => {
    setIsPayingPlatformFee(true);
    try {
      const totalPlayers = participants.reduce((s,p) => s + (p.members?.length||0), 0);
      const pf = getPlatformFeeBreakdown(entryFee, tournament?.platformFeePercentage);
      const amount = totalPlayers * pf.feePerPlayer;
      const res = await paymentsApi.createPaymentLink({ tournamentId: id, amount, purpose: 'PLATFORM_FEE' });
      if (res.data?.paymentUrl) { window.open(res.data.paymentUrl, '_blank'); toast.success('Đã mở liên kết thanh toán.'); }
      else toast.error('Không có liên kết thanh toán.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsPayingPlatformFee(false); }
  };

  const handleTournamentStepTransition = async (nextStatus: Tournament['status']) => {
    if (nextStatus === 'UPCOMING') { handleOpenLockModal(); return; }
    if (nextStatus === 'IN_PROGRESS') { handleConfirmOpen(); return; }
    if (nextStatus === 'COMPLETED') { handleOpenEndModal(); return; }
    try { setIsLoading(true); await tournamentsApi.updateTournament(id, { status: nextStatus }); toast.success('Đã cập nhật trạng thái!'); await fetchTournamentData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsLoading(false); }
  };

  const handleOpenLockModal = () => {
    if (!tournament) return;
    if (participants.length < 2) { toast.error('Cần ít nhất 2 đội để chốt'); return; }
    setHasConfigBeforeLock(!!divisions.find(d=>d.id===selectedDivisionId)?.roundConfig?.setsToWin);
    const totalPlayers = participants.reduce((s,p) => s + (p.members?.length||0), 0);
    const pf = getPlatformFeeBreakdown(entryFee, tournament.platformFeePercentage);
    setLockSummary({ totalParticipants: participants.length, totalPlayers, platformFeePerPlayer: pf.feePerPlayer, totalPlatformFee: totalPlayers * pf.feePerPlayer, platformFeeRuleLabel: pf.ruleLabel });
    setIsLockModalOpen(true);
  };

  const handleConfirmLock = async () => {
    setIsLocking(true);
    try { await tournamentsApi.lockTournament(id); toast.success('Chốt danh sách thành công!'); setIsLockModalOpen(false); await fetchTournamentData(); await refetchDivisionData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsLocking(false); }
  };

  const handleConfirmOpen = async () => {
    const phase2RegLocked = tournament?.isRegistrationLocked === true || isTournamentRegistrationClosed(tournament?.status);
    const phase2PaidCheck = !entryFee || Number(entryFee) <= 0 || participants.every((p) => p.teamStatus === 'COMPLETE' ? p.isPaid !== false : true);
    const phase2BracketCheck = divisions.some((d) => d.roundConfig && typeof d.roundConfig === 'object' && Object.keys(d.roundConfig as object).length > 0);
    const phase2HasMinTeams = participants.length >= 2;
    if (!phase2RegLocked) { setActiveTab('registration'); setValidationField('lock'); toast.error('Hãy chốt danh sách đăng ký trước khi khai mạc.'); return; }
    if (!phase2PaidCheck) { setActiveTab('registration'); setValidationField('payment'); toast.error('Vẫn còn đội chưa hoàn tất phí tham gia.'); return; }
    if (!phase2BracketCheck) { setActiveTab('bracket'); setValidationField('bracket'); toast.error('Hãy khởi tạo sơ đồ thi đấu trước khi khai mạc.'); return; }
    if (!phase2HasMinTeams) { setActiveTab('registration'); setValidationField('participants'); toast.error('Cần ít nhất 2 đội tham gia trước khi khai mạc.'); return; }
    setIsOpening(true);
    try { await tournamentsApi.updateTournament(id, { status: 'IN_PROGRESS' }); toast.success('Giải đấu đã khai mạc!'); await fetchTournamentData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsOpening(false); }
  };

  const handleOpenEndModal = async () => {
    // Fetch fresh bracket data to avoid stale state
    let bracketData = bracket;
    try {
      toast.loading('Đang tải dữ liệu sơ đồ thi đấu...', { id: 'end-modal-bracket' });
      if (selectedDivisionId) {
        const bRes = await tournamentsApi.getTournamentBracket(id, selectedDivisionId);
        if (bRes.data) {
          bracketData = bRes.data;
          setBracket(bRes.data);
        }
      }
      toast.dismiss('end-modal-bracket');
    } catch {
      toast.dismiss('end-modal-bracket');
      // Graceful degradation: use current bracket data
    }
    if (!bracketData) {
      setEndChecklist({ totalMatches: 0, completedMatches: 0, liveMatches: 0, hasLiveMatches: false, allCompleted: true });
      setIsEndModalOpen(true);
      return;
    }
    const allMatches = bracketData.stages?.flatMap(stage =>
      stage.groups?.flatMap(group => group.matches || [])
    ) || [];
    const totalMatches = allMatches.length;
    const completedMatches = allMatches.filter(m => m.status === 'COMPLETED').length;
    const liveMatches = allMatches.filter(m => m.status === 'LIVE').length;
    setEndChecklist({
      totalMatches,
      completedMatches,
      liveMatches,
      hasLiveMatches: liveMatches > 0,
      allCompleted: totalMatches > 0 && completedMatches === totalMatches && liveMatches === 0,
    });
    setIsEndModalOpen(true);
  };

  const handleConfirmEnd = async () => {
    if (endChecklist?.hasLiveMatches) {
      toast.error('Không thể kết thúc giải đấu khi còn trận đấu đang diễn ra');
      return;
    }
    setIsEnding(true);
    try { await tournamentsApi.updateTournament(id, { status: 'COMPLETED' }); toast.success('Giải đấu đã kết thúc!'); setIsEndModalOpen(false); await fetchTournamentData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsEnding(false); }
  };

  const handleSeedMockData = async () => {
    if (!mockNamesText.trim()) { toast.error('Nhập danh sách tên'); return; }
    const names = mockNamesText.split('\n').map(n=>n.trim()).filter(Boolean);
    if (!names.length) { toast.error('Nhập ít nhất 1 tên'); return; }
    setIsSeedingMock(true);
    try { await tournamentsApi.seedMockParticipants(id, names, selectedDivisionId||undefined); toast.success(`Đã sinh ${names.length} người chơi ảo!`); setMockNamesText(''); await refetchDivisionData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSeedingMock(false); }
  };

  const handleClearMockData = async () => {
    if (!confirm('Xóa toàn bộ dữ liệu người chơi thử nghiệm?')) return;
    setIsClearingMock(true);
    try { await tournamentsApi.clearMockParticipants(id, selectedDivisionId||undefined); toast.success('Đã dọn dẹp!'); await refetchDivisionData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsClearingMock(false); }
  };

  const handleAssignWildcard = async () => {
    if (!wildcardEmailOrPhone.trim() || !wildcardTeamName.trim()) { toast.error('Nhập đầy đủ thông tin'); return; }
    if (divisions.length > 0 && !selectedDivisionId) { toast.error('Chọn nội dung thi đấu trước'); return; }
    setIsAssigningWildcard(true);
    try { await tournamentsApi.assignReservedSlot(id, wildcardEmailOrPhone.trim(), wildcardTeamName.trim(), wildcardPartnerEmailOrPhone.trim() || undefined, selectedDivisionId||undefined); toast.success('Gán suất đặc cách thành công!'); setWildcardEmailOrPhone(''); setWildcardPartnerEmailOrPhone(''); setWildcardTeamName(''); await refetchDivisionData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsAssigningWildcard(false); }
  };

  const handleAutoSeed = async () => {
    setIsAutoSeeding(true);
    try {
      await tournamentsApi.autoSeedParticipants(id, selectedDivisionId || undefined);
      toast.success('Xếp hạt giống tự động thành công!');
      await refetchDivisionData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsAutoSeeding(false); }
  };

  const handleReorderSeeds = async (reorderedSeeds: { participantId: string; seed: number }[]) => {
    try {
      const seedMap = new Map(reorderedSeeds.map(s => [s.participantId, s.seed]));
      setParticipants(prev => prev.map(p => seedMap.has(p.id) ? { ...p, seed: seedMap.get(p.id)! } : p));
      await tournamentsApi.updateTournamentSeeds(id, reorderedSeeds);
    } catch (err) {
      toast.error(getErrorMessage(err));
      await refetchDivisionData();
    }
  };

  const handleSwapSeeds = async (participantId1: string, participantId2: string) => {
    try {
      const p1 = participants.find(p => p.id === participantId1);
      const p2 = participants.find(p => p.id === participantId2);
      if (!p1 || !p2) {
        toast.error('Không tìm thấy đội');
        return;
      }
      const s1 = p2.seed ?? 0;
      const s2 = p1.seed ?? 0;
      setParticipants(prev => prev.map(p => {
        if (p.id === participantId1) return { ...p, seed: s1 };
        if (p.id === participantId2) return { ...p, seed: s2 };
        return p;
      }));
      await tournamentsApi.updateTournamentSeeds(id, [
        { participantId: participantId1, seed: s1 },
        { participantId: participantId2, seed: s2 },
      ]);
      toast.success('Đã hoán đổi hạt giống!');
    } catch (err) {
      toast.error(getErrorMessage(err));
      await refetchDivisionData();
    }
  };

  const handleOpenRoundModal = (stage: BracketStage, roundNumber: number) => {
    setSelectedStage(stage); setSelectedRoundNumber(roundNumber);
    // For draft group stage legs, use 'leg_N' key to avoid collision with knockout round keys
    const roundKey = stage.id === '__draft_gsk_group__' && roundNumber !== 0
      ? `leg_${roundNumber}`
      : roundNumber.toString();
    const rc = roundNumber === 0
      ? stage.roundConfig
      : stage.roundConfig?.rounds?.[roundKey];
    
    const ruleConfig = rc as StageRoundRuleConfig | undefined | null;
    setStageVenueId(ruleConfig?.venue_id || (roundNumber === 0 ? '' : stage.venueId || ''));
    setStageScheduledDate(ruleConfig?.scheduled_date ? ruleConfig.scheduled_date.substring(0, 16) : (roundNumber === 0 ? '' : stage.scheduledDate ? stage.scheduledDate.substring(0, 16) : ''));
    setStageNotificationNote(ruleConfig?.custom_notes || '');
    const resolvedRules = rc
      ? resolveSportRuleView(rc, sportRuleKind)
      : resolveSportRuleView({
          kind: sportRuleKind,
          setsToWin,
          pointsPerSet,
          winByTwo,
          maxPoints: maxDeucePoints,
          tiebreakPoints: superTiebreakEnabled ? superTiebreakPoints : undefined,
        });
    setStageMaxSets(resolvedRules.bestOf);
    setStagePointsPerSet(resolvedRules.pointsPerSet);
    setStageWinBy2Points(resolvedRules.winByTwo);
    setStageMaxDeucePoints(resolvedRules.maxPoints);
    setStageSuperTiebreakEnabled(resolvedRules.hasCustomTiebreakTarget);
    setStageSuperTiebreakPoints(resolvedRules.tiebreakPoints);
  };

  const handleSaveStageDetails = async () => {
    if (!selectedStage || selectedRoundNumber === null || !tournament) return;
    setIsSavingStage(true);
    try {
      const currentRounds = (selectedStage.roundConfig?.rounds || {}) as Record<string, StageRoundRuleConfig>;
      const normalizedKind = normalizeSportRuleKindForCategory(sportRuleKind, selectedCategory);
      const nextRoundRule = buildStageRoundRulePayload({
        kind: normalizedKind,
        setsToWin: stageMaxSets === 1 ? 1 : stageMaxSets === 3 ? 2 : 3,
        pointsPerSet: stagePointsPerSet,
        winByTwo: stageWinBy2Points,
        maxPoints: stageWinBy2Points ? stageMaxDeucePoints : null,
        tiebreakPoints: stageSuperTiebreakEnabled ? stageSuperTiebreakPoints : null,
        venueId: stageVenueId || null,
        scheduledDate: stageScheduledDate ? new Date(stageScheduledDate).toISOString() : null,
        customNotes: stageNotificationNote.trim() || null,
      });
      if (selectedStage.id === '__draft_gsk_knockout__') {
        const selected = divisions.find((division) => division.id === selectedDivisionId);
        await divisionsApi.updateDivisionConfig(tournament.id, selectedDivisionId, {
          roundConfig: {
            ...(selected?.roundConfig ?? {}),
            kind: normalizedKind,
            rounds: {
              ...currentRounds,
              [selectedRoundNumber.toString()]: nextRoundRule,
            },
          },
        });
        toast.success('Đã lưu cấu hình vòng knockout dự kiến!');
        setSelectedStage(null);
        setSelectedRoundNumber(null);
        await fetchDivisions(tournament.id);
        return;
      }
      
      if (selectedStage.id === '__draft_gsk_group__') {
        const selected = divisions.find((division) => division.id === selectedDivisionId);
        const isStageOverride = selectedRoundNumber === 0;
        // For leg overrides, use 'leg_N' key to avoid collision with knockout round keys
        const legKey = `leg_${selectedRoundNumber}`;
        await divisionsApi.updateDivisionConfig(tournament.id, selectedDivisionId, {
          roundConfig: {
            ...(selected?.roundConfig ?? {}),
            ...(isStageOverride ? nextRoundRule : {}),
            kind: normalizedKind,
            rounds: {
              ...currentRounds,
              ...(isStageOverride ? {} : { [legKey]: nextRoundRule }),
            },
          },
        });
        toast.success(isStageOverride ? 'Đã lưu cấu hình vòng bảng chung!' : `Đã lưu cấu hình Lượt ${selectedRoundNumber}!`);
        setSelectedStage(null);
        setSelectedRoundNumber(null);
        await fetchDivisions(tournament.id);
        return;
      }

      const isStageOverride = selectedRoundNumber === 0;

      await tournamentsApi.updateStage(selectedStage.id, {
        roundConfig: {
          ...buildStageRoundConfigPayload({
            kind: normalizedKind,
            setsToWin,
            pointsPerSet,
            winByTwo,
            maxPoints: winByTwo ? maxDeucePoints : null,
            tiebreakPoints: superTiebreakEnabled ? superTiebreakPoints : null,
            tiebreakerMode,
            roundsToPlay,
          }),
          ...selectedStage.roundConfig,
          ...(isStageOverride ? nextRoundRule : {}), // Apply overrides to top-level if stage override
          kind: normalizedKind,
          rounds: isStageOverride ? currentRounds : {
            ...currentRounds,
            [selectedRoundNumber.toString()]: nextRoundRule,
          },
        },
      });
      toast.success('Cập nhật cấu hình vòng đấu thành công!');
      setSelectedStage(null); setSelectedRoundNumber(null); await refetchDivisionData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSavingStage(false); }
  };

  const handleOpenScheduling = (match: BracketMatch) => {
    setSelectedMatch(match); setMatchCourtName(match.courtName||''); setMatchCourtAddress(match.courtAddress||'');
    setMatchScheduledAt(match.scheduledAt ? match.scheduledAt.substring(0,16) : '');
    setMatchCameraId('');
    void livestreamApi.getMatchPlayback(match.id).then((res) => {
      if (res.data?.cameraName) {
        const foundCam = cameras.find((c) => c.name === res.data?.cameraName);
        if (foundCam) setMatchCameraId(foundCam.id);
      }
    }).catch(() => {});
    if (match.matchConfig && Object.keys(match.matchConfig).length > 0) {
      const resolvedRules = resolveSportRuleView(match.matchConfig, sportRuleKind);
      setIsCustomMatchConfig(true);
      setMatchSetsToWin(resolvedRules.setsToWin);
      setMatchPointsPerSet(resolvedRules.pointsPerSet);
      setMatchDeuceEnabled(resolvedRules.winByTwo);
      setMatchMaxPoints(resolvedRules.maxPoints);
      setMatchSuperTiebreakEnabled(resolvedRules.hasCustomTiebreakTarget);
      setMatchSuperTiebreakPoints(resolvedRules.tiebreakPoints);
    } else {
      setIsCustomMatchConfig(false);
      const stage = bracket?.stages.find(s => s.groups.some(g => g.id === match.groupId));
      const rc = stage?.roundConfig?.rounds?.[match.roundNumber?.toString()];
      if (!match.courtName) {
        if (rc?.venue_id) {
          const roundVenue = venues.find((v) => v.id === rc.venue_id);
          setMatchCourtName(roundVenue ? roundVenue.name : rc.venue_id);
          setMatchCourtAddress(roundVenue?.locationAddress || '');
        } else {
          setMatchCourtName(tournament?.venue?.name || customVenueName || tournament?.locationAddress || '');
          setMatchCourtAddress(tournament?.venue?.locationAddress || customVenueAddress || tournament?.locationAddress || '');
        }
      }
      if (!match.scheduledAt && rc?.scheduled_date) {
        setMatchScheduledAt(rc.scheduled_date.substring(0, 16));
      }
      const resolvedRules = rc
        ? resolveSportRuleView(rc, sportRuleKind)
        : resolveSportRuleView({
            kind: sportRuleKind,
            setsToWin,
            pointsPerSet,
            winByTwo,
            maxPoints: maxDeucePoints,
            tiebreakPoints: superTiebreakEnabled ? superTiebreakPoints : undefined,
          });
      setMatchSetsToWin(resolvedRules.setsToWin);
      setMatchPointsPerSet(resolvedRules.pointsPerSet);
      setMatchDeuceEnabled(resolvedRules.winByTwo);
      setMatchMaxPoints(resolvedRules.maxPoints);
      setMatchSuperTiebreakEnabled(resolvedRules.hasCustomTiebreakTarget);
      setMatchSuperTiebreakPoints(resolvedRules.tiebreakPoints);
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedMatch) return;
    setIsScheduling(true);
    try {
      const normalizedKind = normalizeSportRuleKindForCategory(sportRuleKind, selectedCategory);
      await tournamentsApi.updateMatchSchedule(selectedMatch.id, {
        courtName: matchCourtName || null, courtAddress: matchCourtAddress || null,
        scheduledAt: matchScheduledAt ? new Date(matchScheduledAt).toISOString() : null,
        matchConfig: isCustomMatchConfig ? buildSportRulesPayload({
          kind: normalizedKind,
          setsToWin: matchSetsToWin,
          pointsPerSet: matchPointsPerSet,
          winByTwo: matchDeuceEnabled,
          maxPoints: matchDeuceEnabled ? matchMaxPoints : null,
          tiebreakPoints: matchSuperTiebreakEnabled ? matchSuperTiebreakPoints : null,
        }) : null,
      });
      toast.success('Cập nhật lịch thi đấu thành công!');
      setSelectedMatch(null); await fetchTournamentData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsScheduling(false); }
  };

  const fetchTournamentData = useCallback(async () => {
    try {
      const tRes = await tournamentsApi.getTournamentById(id);
      if (tRes.data) {
        const t = tRes.data; setTournament(t);
        setName(t.name); setCategoryId(t.categoryId); setDescription(t.description||''); setBannerUrl(t.bannerUrl||''); setLogoUrl(t.logoUrl||'');
        setPrizeDescription(t.prizeDescription||''); setContactInfo(t.contactInfo||{}); setVisibility(t.visibility||'PUBLIC'); setGenderRestriction(t.genderRestriction||'');
        setHideFeaturedCardText(t.tournamentConfig?.hideFeaturedCardText === true);
        setRegistrationMode(t.tournamentConfig?.registrationMode || 'OPEN');
        setVenueId(t.venueId||'');
        const quickConfig = t.tournamentConfig as Record<string, unknown> | undefined;
        const quickLocation = quickConfig?.location as {
          venueName?: string;
          address?: string;
          display?: string;
        } | undefined;
        const quickSchedule = quickConfig?.schedule as {
          registrationStartDate?: string;
          registrationEndDate?: string;
          startDate?: string;
          endDate?: string;
        } | undefined;
        if (t.venue) {
          setCustomVenueName(t.venue.name || '');
          setCustomVenueAddress(t.venue.locationAddress || '');
        } else if (quickLocation) {
          setCustomVenueName(quickLocation.venueName || '');
          setCustomVenueAddress(quickLocation.address || quickLocation.display || '');
        }
        setStartDate((t.startDate || quickSchedule?.startDate)?.substring(0,16) || '');
        setEndDate((t.endDate || quickSchedule?.endDate)?.substring(0,16) || '');
        setRegistrationStartDate((t.registrationStartDate || quickSchedule?.registrationStartDate)?.substring(0,16) || '');
        setRegistrationEndDate((t.registrationEndDate || quickSchedule?.registrationEndDate)?.substring(0,16) || '');
        setEntryFee(t.entryFee||0); setMaxParticipants(t.maxParticipants||16); setIsLimitEnabled(!!t.maxParticipants);
        let ui = MatchTypeUI.MALE_DOUBLES;
        if (t.matchType === MatchTypeDB.SINGLES) ui = t.genderRestriction === GenderRestriction.FEMALE ? MatchTypeUI.FEMALE_SINGLES : MatchTypeUI.MALE_SINGLES;
        else if (t.matchType === MatchTypeDB.DOUBLES) ui = t.genderRestriction === GenderRestriction.FEMALE ? MatchTypeUI.FEMALE_DOUBLES : MatchTypeUI.MALE_DOUBLES;
        else if (t.matchType === MatchTypeDB.MIXED_DOUBLES || t.matchType === 'MIXED') ui = MatchTypeUI.MIXED_DOUBLES;
        setMatchType(ui);

        const categoryObj = t.category ?? null;
        const categoryFallbackKind = inferSportRuleKindFromCategory(categoryObj);
        const resolvedRules = resolveSportRuleView(t.sportRules, categoryFallbackKind);
        applyResolvedRuleState(resolvedRules);

        if (t.parentId) await fetchDivisions(t.parentId); else await fetchDivisions(id);
        if (t.venueId) await fetchVenueCourts(t.venueId);
        // Nạp danh sách trận đấu (dùng cho export kết quả toàn giải ở bước kết thúc)
        try {
          const mRes = await matchesApi.getMatches({ tournamentId: id, limit: 100 });
          if (mRes.data) {
            setMatches(mRes.data);
          }
        } catch { /* không chặn luồng chính */ }
      }
      return tRes.data;
    } catch { toast.error('Không thể tải thông tin giải đấu'); return null; }
  }, [applyResolvedRuleState, fetchDivisions, id]);

  // ── Init ──
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const t = await fetchTournamentData();
      if (t?.id) {
        await fetchDivisions(t.id);
        try {
          const [vRes, cRes, fRes, pList] = await Promise.all([venuesApi.getVenues(), categoriesApi.getCategories(), tournamentsApi.getFeesConfig(), regionsApi.getProvinces()]);
          if (vRes.data) setVenues(vRes.data);
          if (cRes.data) setCategories(cRes.data);
          if (fRes.data) setFeesConfig(fRes.data);
          setProvinces(pList);
          await fetchCameras();
        } catch { /* silent */ }
      }
      setIsLoading(false);
    };
    void Promise.resolve().then(() => {
      void init();
    });
  }, [fetchDivisions, fetchTournamentData]);

  // Restore an unfinished form once the canonical server values are loaded.
  useEffect(() => {
    if (isLoading || !tournament || manageDraftReadyRef.current || typeof window === 'undefined') return;
    manageDraftReadyRef.current = true;
    const raw = window.localStorage.getItem(manageDraftKey);
    if (!raw) return;
    void Promise.resolve().then(() => {
      try {
        const draft = JSON.parse(raw) as Record<string, unknown>;
        if (draft.tournamentId !== tournament.id) return;
        const text = (key: string, fallback: string) => typeof draft[key] === 'string' ? String(draft[key]) : fallback;
        setName(text('name', name)); setCategoryId(text('categoryId', categoryId)); setDescription(text('description', description));
        setBannerUrl(text('bannerUrl', bannerUrl)); setLogoUrl(text('logoUrl', logoUrl));
        setPrizeDescription(text('prizeDescription', prizeDescription));
        setCustomVenueName(text('customVenueName', customVenueName)); setCustomVenueAddress(text('customVenueAddress', customVenueAddress));
        setProvinceCode(text('provinceCode', provinceCode)); setWardCode(text('wardCode', wardCode));
        setStartDate(text('startDate', startDate)); setEndDate(text('endDate', endDate));
        setRegistrationStartDate(text('registrationStartDate', registrationStartDate)); setRegistrationEndDate(text('registrationEndDate', registrationEndDate));
        if (draft.visibility === 'PUBLIC' || draft.visibility === 'PRIVATE') setVisibility(draft.visibility);
        if (draft.registrationMode === 'OPEN' || draft.registrationMode === 'APPROVAL' || draft.registrationMode === 'INVITE_ONLY') setRegistrationMode(draft.registrationMode);
        if (typeof draft.maxParticipants === 'number') setMaxParticipants(draft.maxParticipants);
        if (typeof draft.entryFee === 'number') setEntryFee(draft.entryFee);
        if (typeof draft.genderRestriction === 'string') setGenderRestriction(draft.genderRestriction as typeof genderRestriction);
        if (typeof draft.matchType === 'string') setMatchType(draft.matchType);
        if (typeof draft.eloEnabled === 'boolean') setEloEnabled(draft.eloEnabled);
        setDraftStatus('restored');
        toast.success('Đã khôi phục bản nháp quản lý giải.', { id: 'manage-draft-restored' });
      } catch {
        window.localStorage.removeItem(manageDraftKey);
      }
    });
  }, [isLoading, tournament, manageDraftKey, name, categoryId, description, bannerUrl, logoUrl, prizeDescription, customVenueName, customVenueAddress, provinceCode, wardCode, startDate, endDate, registrationStartDate, registrationEndDate, genderRestriction]);

  // Debounced autosave for the fields people most often forget to save.
  useEffect(() => {
    if (!manageDraftReadyRef.current || !tournament || typeof window === 'undefined') return;
    if (manageDraftTimerRef.current) clearTimeout(manageDraftTimerRef.current);
    manageDraftTimerRef.current = setTimeout(() => {
      const draft = {
        tournamentId: tournament.id, updatedAt: new Date().toISOString(),
        name, categoryId, description, bannerUrl, logoUrl, prizeDescription, customVenueName, customVenueAddress,
        provinceCode, wardCode, startDate, endDate, registrationStartDate, registrationEndDate,
        visibility, registrationMode, maxParticipants, entryFee, genderRestriction, matchType, eloEnabled,
      };
      window.localStorage.setItem(manageDraftKey, JSON.stringify(draft));
      setDraftStatus('saved');
    }, 700);
    return () => { if (manageDraftTimerRef.current) clearTimeout(manageDraftTimerRef.current); };
  }, [tournament, manageDraftKey, name, categoryId, description, bannerUrl, logoUrl, prizeDescription, customVenueName, customVenueAddress, provinceCode, wardCode, startDate, endDate, registrationStartDate, registrationEndDate, visibility, registrationMode, maxParticipants, entryFee, genderRestriction, matchType, eloEnabled]);

  useEffect(() => {
    if (!tournament) {
      return;
    }

    const selectedCategory = tournament.category || categories.find((category) => category.id === categoryId || category.slug === categoryId) || null;
    const fallbackKind = inferSportRuleKindFromCategory(selectedCategory);
    const resolvedRules = resolveSportRuleView(tournament.sportRules, fallbackKind);
    // Lite creation stores the free-scoring policy in tournamentConfig. Older
    // Lite records may have sportRules without an explicit mode, so keep the
    // management UI on Lite instead of silently switching them to Strict.
    const tournamentConfig = tournament.tournamentConfig as Record<string, unknown> | undefined;
    const resolvedWithTournamentMode =
      tournamentConfig?.mode === 'LITE' || tournamentConfig?.scoringMode === 'FREE'
        ? { ...resolvedRules, mode: 'LITE' as const }
        : resolvedRules;

    void Promise.resolve().then(() => {
      const normalizedKind = normalizeSportRuleKindForCategory(resolvedWithTournamentMode.kind, selectedCategory);
      const effectiveRules = normalizedKind === resolvedWithTournamentMode.kind
        ? resolvedWithTournamentMode
        : resolveSportRuleView(buildDefaultSportRules(normalizedKind), normalizedKind);

      applyResolvedRuleState(effectiveRules);
      if (normalizedKind !== resolvedWithTournamentMode.kind) {
        setTournament((current) => current ? {
          ...current,
          sportRules: buildSportRulesPayload({
            kind: normalizedKind,
            setsToWin: effectiveRules.setsToWin,
            pointsPerSet: effectiveRules.pointsPerSet,
            winByTwo: effectiveRules.winByTwo,
            maxPoints: effectiveRules.maxPoints,
            tiebreakPoints: effectiveRules.hasCustomTiebreakTarget ? effectiveRules.tiebreakPoints : null,
            tiebreakerMode: effectiveRules.tiebreakerMode,
            roundsToPlay: effectiveRules.roundsToPlay,
            mode: isLiteMode ? 'LITE' : 'STRICT',
          }),
        } : current);
      }
      const normalizedMatchType = normalizeMatchFormatForCategory(
        matchType as 'MALE_SINGLES' | 'FEMALE_SINGLES' | 'MALE_DOUBLES' | 'FEMALE_DOUBLES' | 'MIXED_DOUBLES',
        selectedCategory,
      );
      if (normalizedMatchType !== matchType) {
        setMatchType(normalizedMatchType);
      }

      const normalizedNewDivisionMatchType = normalizeMatchFormatForCategory(
        newDivisionMatchType as 'MALE_SINGLES' | 'FEMALE_SINGLES' | 'MALE_DOUBLES' | 'FEMALE_DOUBLES' | 'MIXED_DOUBLES',
        selectedCategory,
      );
      if (normalizedNewDivisionMatchType !== newDivisionMatchType) {
        setNewDivisionMatchType(normalizedNewDivisionMatchType);
      }
    });
  }, [applyResolvedRuleState, categories, categoryId, matchType, newDivisionMatchType, tournament]);

  useEffect(() => {
    if (!selectedDivisionId) {
      return;
    }

    const selected = divisions.find((d) => d.id === selectedDivisionId);
    if (selected) {
      void Promise.resolve().then(() => {
        applyDivisionFormValues(selected);
      });
    }

    void Promise.resolve().then(() => {
      void refetchDivisionData();
    });
  }, [refetchDivisionData, selectedDivisionId, divisions, applyDivisionFormValues]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void fetchDivisions(id);
    });
  }, [fetchDivisions, id]);

  useEffect(() => {
    if (provinceCode) {
      void regionsApi.getWardsByProvince(provinceCode).then(setWards).catch(() => {});
      return;
    }

    void Promise.resolve().then(() => {
      setWards([]);
    });
  }, [provinceCode]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'operations') {
      router.replace(`/organizer/tournaments/${id}/ops`);
      return;
    }

    if (['basic','schedule','registration','bracket','livestream','finance','permissions'].includes(tab || '')) {
      void Promise.resolve().then(() => {
        setActiveTab(tab as typeof activeTab);
      });
    }
  }, [id, router, searchParams]);

  const inviteLink = visibility === 'PRIVATE' || registrationMode === 'INVITE_ONLY'
    ? `${window.location.origin}/tournaments/${id}/register?invite=${tournament?.inviteCode ?? ''}`
    : `${window.location.origin}/tournaments/${id}`;

  return {
    tournament, setTournament, participants, setParticipants, matches, setMatches, bracket, setBracket,
    venues, setVenues, categories, setCategories, feesConfig, setFeesConfig, courts, setCourts,
    isLoading, setIsLoading, activeTab, setActiveTab, validationField, setValidationField, basicSubTab, setBasicSubTab,
    draftStatus, clearManageDraft,
    referees, setReferees, refereeEmail, setRefereeEmail, isAddingReferee, setIsAddingReferee,
    divisions, setDivisions, selectedDivisionId, setSelectedDivisionId,
    isCreateDivisionModalOpen, setIsCreateDivisionModalOpen, editingDivision, openDivisionEditor, resetDivisionEditor,
    newDivisionMatchType, setNewDivisionMatchType, newDivisionName, setNewDivisionName, newDivisionBracketType, setNewDivisionBracketType,
    newDivisionEloEnabled, setNewDivisionEloEnabled, newDivisionMinElo, setNewDivisionMinElo, newDivisionMaxElo, setNewDivisionMaxElo,
    newDivisionMaxParticipants, setNewDivisionMaxParticipants,
    newDivisionLimitEnabled, setNewDivisionLimitEnabled,
    isCreatingDivision, setIsCreatingDivision, divisionPendingDelete, setDivisionPendingDelete, isDeletingDivision, setIsDeletingDivision,
    name, setName, categoryId, setCategoryId, description, setDescription,
    bannerUrl, setBannerUrl, logoUrl, setLogoUrl, hideFeaturedCardText, setHideFeaturedCardText, prizeDescription, setPrizeDescription,
    contactInfo, setContactInfo, visibility, setVisibility, registrationMode, setRegistrationMode, genderRestriction, setGenderRestriction,
    venueId, setVenueId, customVenueName, setCustomVenueName, customVenueAddress, setCustomVenueAddress,
    provinces, setProvinces, wards, setWards,
    provinceCode, setProvinceCode, wardCode, setWardCode,
    startDate, setStartDate, endDate, setEndDate, registrationStartDate, setRegistrationStartDate, registrationEndDate, setRegistrationEndDate,
    entryFee, setEntryFee, platformFeePerPlayer, setPlatformFeePerPlayer,
    maxParticipants, setMaxParticipants, isLimitEnabled, setIsLimitEnabled, sportRuleKind, setSportRuleKind,
    matchType, setMatchType, setsToWin, setSetsToWin, pointsPerSet, setPointsPerSet, winByTwo, setWinByTwo,
    maxDeucePoints, setMaxDeucePoints, superTiebreakEnabled, setSuperTiebreakEnabled,
    superTiebreakSetIndex, setSuperTiebreakSetIndex, superTiebreakPoints, setSuperTiebreakPoints,
    isSavingConfig, setIsSavingConfig, tiebreakerMode, setTiebreakerMode, roundsToPlay, setRoundsToPlay,
    bracketType,
    bracketTypeState, setBracketTypeState,
    rrWinPoints, setRrWinPoints, rrLossPoints, setRrLossPoints,
    rrTiebreakerRule, setRrTiebreakerRule,
    numGroups, setNumGroups, teamsPerGroup, setTeamsPerGroup, teamsAdvancing, setTeamsAdvancing,
    gskPlayoffType, setGskPlayoffType, gskSeedingType, setGskSeedingType,
    gskRoundsToPlay, setGskRoundsToPlay,
    isSavingRoundRobinConfig, setIsSavingRoundRobinConfig,
    isSavingGskConfig, setIsSavingGskConfig, isAdvancingStandings, setIsAdvancingStandings,
    availableMatchFormatOptions,
    selectedStage, setSelectedStage, selectedRoundNumber, setSelectedRoundNumber,
    stageVenueId, setStageVenueId, stageScheduledDate, setStageScheduledDate, stageNotificationNote, setStageNotificationNote,
    isSavingStage, setIsSavingStage, stageMaxSets, setStageMaxSets, stagePointsPerSet, setStagePointsPerSet,
    stageWinBy2Points, setStageWinBy2Points, stageMaxDeucePoints, setStageMaxDeucePoints,
    stageSuperTiebreakEnabled, setStageSuperTiebreakEnabled, stageSuperTiebreakSetIndex, setStageSuperTiebreakSetIndex,
    stageSuperTiebreakPoints, setStageSuperTiebreakPoints,
    isLockModalOpen, setIsLockModalOpen, isLocking, setIsLocking, lockSummary, setLockSummary,
    isOpening, setIsOpening,
    isEndModalOpen, setIsEndModalOpen, isEnding, setIsEnding, endChecklist, setEndChecklist,
    selectedCategory,
    selectedMatch, setSelectedMatch, matchCourtId, setMatchCourtId, matchCourtName, setMatchCourtName,
    matchCourtAddress, setMatchCourtAddress, matchScheduledAt, setMatchScheduledAt,
    cameras, setCameras, fetchCameras, matchCameraId, setMatchCameraId,
    isCustomMatchConfig, setIsCustomMatchConfig,
    matchSetsToWin, setMatchSetsToWin, matchPointsPerSet, setMatchPointsPerSet,
    matchDeuceEnabled, setMatchDeuceEnabled, matchMaxPoints, setMatchMaxPoints,
    matchSuperTiebreakEnabled, setMatchSuperTiebreakEnabled, matchSuperTiebreakPoints, setMatchSuperTiebreakPoints,
    isScheduling, setIsScheduling, isDeleting, setIsDeleting, hasConfigBeforeLock, setHasConfigBeforeLock,
    isPayingPlatformFee, setIsPayingPlatformFee, isPayingPublishFee, setIsPayingPublishFee,
    newGalleryUrl, setNewGalleryUrl, isAddingImage, setIsAddingImage,
    isLiteMode, setIsLiteMode,
    mockNamesText, setMockNamesText, isSeedingMock, setIsSeedingMock, isClearingMock, setIsClearingMock,
    wildcardEmailOrPhone, setWildcardEmailOrPhone, wildcardPartnerEmailOrPhone, setWildcardPartnerEmailOrPhone, wildcardTeamName, setWildcardTeamName,
    eloEnabled, setEloEnabled, eloMin, setEloMin, eloMax, setEloMax, eloMaxCombined, setEloMaxCombined, eloMaxGap, setEloMaxGap,
    seedingMethod, setSeedingMethod, isAutoSeeding, setIsAutoSeeding,
    activeParticipantActionId, setActiveParticipantActionId,
    isGeneratingBracket, setIsGeneratingBracket, isAssigningWildcard, setIsAssigningWildcard,
    // actions
    fetchTournamentData, fetchDivisions, fetchReferees, refetchDivisionData, applyDivisionFormValues, fetchVenueCourts,
    handleSaveBasicInfo, handleSaveScheduleDetails, handleSaveRegistrationSettings, handleSaveMatchConfig, handleSaveFinanceConfig,
    handleAddReferee, handleCreateDivision, requestDeleteDivision, handleConfirmDeleteDivision,
    handleGenerateBracket, handleRequestPayout, handleRegenerateInviteCode,
    handlePublish, handlePayPublishFee, handleDeleteTournament, handlePayPlatformFee,
    handleTournamentStepTransition, handleOpenLockModal, handleConfirmLock,
    handleConfirmOpen,
    handleOpenEndModal, handleConfirmEnd,
    handleSeedMockData, handleClearMockData, handleAssignWildcard, handleAutoSeed, handleSwapSeeds, handleReorderSeeds, handleApproveParticipant, handleRejectParticipant, handleKickParticipant,
    handleOpenRoundModal, handleSaveStageDetails,
    handleOpenScheduling, handleSaveSchedule,
    handleSaveRoundRobinConfig, handleAdvanceStandings, handleSaveGskConfig,
    // helpers
    getFormatLabel, getBracketLabel, getStatusLabel, publishFeeAmount, inviteLink,
  };
}
