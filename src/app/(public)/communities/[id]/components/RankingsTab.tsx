'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Award, Trophy, Loader2, Crown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Category } from '@/types/category';
import { rankingsApi, PlayerRanking, FootballTeamRanking } from '@/features/rankings/api';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { getRankRingClass } from '@/components/ui/RankAvatar';
import { getCanonicalTierName, getEloMatchTypeLabel } from '@/features/rankings/elo-display';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';

interface RankingsTabProps {
  communityId: string;
  categories: Category[];
  onGoToTournaments?: () => void;
}

type MatchType = 'ALL' | 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';

export default function RankingsTab({ communityId, categories, onGoToTournaments }: RankingsTabProps) {
  const translate = useTranslations('Common');
  const eloTranslate = useTranslations('EloDisplay');
  const rankTranslate = useTranslations('CommunityRankings');
  const matchTypeLabels = {
    SINGLES: translate('matchTypeSingles'),
    DOUBLES: translate('matchTypeDoubles'),
    MIXED_DOUBLES: translate('matchTypeMixedDoubles'),
    categoryFallback: eloTranslate('categoryFallback'),
  };
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );
  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>('ALL');
  const [selectedGender, setSelectedGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [teamRankings, setTeamRankings] = useState<FootballTeamRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [myRanking, setMyRanking] = useState<PlayerRanking | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { user } = useAuthStore();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id;

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      queueMicrotask(() => setSelectedCategoryId(categories[0].id));
    }
  }, [categories, selectedCategoryId]);

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const isFootball = Boolean(activeCategory && (
    activeCategory.slug.toLowerCase().includes('football') ||
    activeCategory.name.toLowerCase().includes('bóng đá') ||
    activeCategory.name.toLowerCase().includes('bong da')
  ));

  const fetchRankings = useCallback(async () => {
    if (!selectedCategoryId) return;
    try {
      if (isFootball) {
        const res = await rankingsApi.getFootballTeamRankings({
          categoryId: selectedCategoryId,
          communityId,
          limit: 20,
        });
        setTeamRankings(res.data || []);
        setRankings([]);
        setMyRanking(null);
        return;
      }
      const res = await rankingsApi.getRankings({
        scope: 'COMMUNITY',
        communityId,
        categoryId: selectedCategoryId,
        ...(selectedMatchType !== 'ALL' ? { matchType: selectedMatchType } : {}),
        ...(selectedMatchType !== 'ALL' ? { genderRestriction: selectedGender } : {}),
        limit: 20,
      });
      const nextRankings = res.data || [];
      setRankings(nextRankings);
      if (userId) {
        const userRes = await rankingsApi.getUserRankings(userId);
        const own = userRes.communityRanks?.find((rank) =>
          rank.communityId === communityId &&
          rank.categoryId === selectedCategoryId &&
          (selectedMatchType === 'ALL' || rank.matchType === selectedMatchType) &&
          (selectedMatchType === 'ALL' || selectedMatchType === 'MIXED_DOUBLES' || rank.genderRestriction === selectedGender),
        );
        setMyRanking(own || null);
      } else {
        setMyRanking(null);
      }
    } catch (err) {
      console.error('Failed to fetch community rankings:', err);
    }
  }, [communityId, selectedCategoryId, selectedMatchType, selectedGender, userId, isFootball]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedCategoryId) return;

    const loadData = async () => {
      setIsLoading(true);
      await fetchRankings();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadData();

    pollingRef.current = setInterval(() => {
      if (isMounted) {
        fetchRankings();
      }
    }, 30000);

    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedCategoryId, fetchRankings]);

  const matchTypes: MatchType[] = ['ALL', 'SINGLES', 'DOUBLES', 'MIXED_DOUBLES'];

  const filtered = searchQuery.trim()
    ? rankings.filter(p => {
        const query = searchQuery.toLowerCase();
        return p.user?.fullName?.toLowerCase().includes(query) ||
          p.user1?.fullName?.toLowerCase().includes(query) ||
          p.user2?.fullName?.toLowerCase().includes(query);
      })
    : rankings;
  const filteredTeams = searchQuery.trim()
    ? teamRankings.filter((team) => team.teamName.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : teamRankings;

  const isSearching = searchQuery.trim().length > 0;
  const topThree = isSearching ? [] : filtered.slice(0, 3);
  const restRankings = isSearching ? filtered : filtered.slice(3, 20);

  const podiumOrder: (PlayerRanking | null)[] = [null, null, null];
  if (topThree[1]) podiumOrder[0] = topThree[1];
  if (topThree[0]) podiumOrder[1] = topThree[0];
  if (topThree[2]) podiumOrder[2] = topThree[2];

  const podiumTiers = [
    { color: 'text-amber-400', bg: 'bg-amber-50', border: 'border-amber-300', label: '🥇' },
    { color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-300', label: '🥈' },
    { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', label: '🥉' },
  ];

  const getWinRate = (p: PlayerRanking) =>
    p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0;

  const { openUserProfile } = useUserProfileModalStore();

  const rankingName = (p: PlayerRanking) =>
    p.user1 && p.user2
      ? `${p.user1.fullName} / ${p.user2.fullName}`
      : p.user?.fullName || '---';

  const rankingAvatars = (p: PlayerRanking, sizeClass: string) => {
    const members = p.user1 && p.user2 ? [p.user1, p.user2] : p.user ? [p.user] : [];
    const ringClass = getRankRingClass(p.eloPoints, p.tier?.name || p.tierName, p.matchesPlayed);
    return (
      <div className={`flex items-center shrink-0 rounded-full ring-2 ${ringClass}`}>
        {members.map((member, index) => (
          <div
            key={member.id}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              openUserProfile(
                {
                  id: member.id,
                  fullName: member.fullName,
                  avatarUrl: member.avatarUrl,
                },
                rect,
                communityId,
              );
            }}
            className={`${sizeClass} rounded-full overflow-hidden bg-slate-100 border-2 border-white relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110 z-10 ${index > 0 ? '-ml-2' : ''}`}
            title={translate('viewProfileAria', { name: member.fullName })}
          >
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-slate-500">
                {member.fullName?.charAt(0) || '?'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
        <Award className="w-16 h-16 text-slate-350 mx-auto mb-4" />
        <p className="text-slate-700 font-bold text-lg">{translate('sportNotConfigured')}</p>
        <p className="text-slate-500 mt-1 max-w-sm mx-auto text-xs leading-relaxed">
          {translate('clubNoEloSportDescription')}
        </p>
      </div>
    );
  }

  if (isFootball) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Trophy className="h-5 w-5 text-amber-500" /> {translate('teamRankingsTitle')}</h3>
          <p className="text-xs text-slate-500">{translate('teamRankingsDescription')}</p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={translate('teamSearchPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {isLoading ? (
          <div className="flex justify-center rounded-lg border border-slate-200 bg-white py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : filteredTeams.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-14 text-center"><Award className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="font-bold text-slate-800">{rankTranslate('noRankedTeams')}</p><p className="mt-1 text-xs text-slate-500">{rankTranslate('teamsAppearAfterRankedFootballMatch')}</p></div>
        ) : (
          <div className="space-y-2">
            {filteredTeams.map((team, index) => (
              <div key={team.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="w-7 text-center text-xs font-black text-slate-400">#{index + 1}</span>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
                  {team.logoUrl ? <img src={team.logoUrl} alt="" className="h-full w-full object-cover" /> : team.teamName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{team.teamName}</p><p className="text-[11px] text-slate-500">{rankTranslate('teamRecord', { wins: team.matchesWon, played: team.matchesPlayed, streak: team.winStreak })}</p></div>
                <div className="text-right"><p className="text-sm font-black text-blue-600">{team.eloPoints} ELO</p><p className="text-[10px] text-slate-400">{rankTranslate('teamPeak', { elo: team.peakElo ?? team.eloPoints })}</p></div>
              </div>
            ))}
          </div>
        )}
        <p className="text-center text-[10px] italic text-slate-400">{translate('autoRefreshNotice')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> {rankTranslate('title')}
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">
            {rankTranslate('topMembers')} •{' '}
            {activeCategory?.name || ''} {selectedMatchType === 'ALL' ? rankTranslate('allFormats') : getEloMatchTypeLabel(selectedMatchType, matchTypeLabels)}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex w-full items-center gap-2.5">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={rankTranslate('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 hover:bg-slate-50 transition-all cursor-pointer shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4 text-blue-600" />
          <span>{rankTranslate('filters')}</span>
        </button>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-0 sm:items-center sm:p-4" onMouseDown={() => setIsFilterOpen(false)}>
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><div><h4 className="text-base font-black text-slate-900">{rankTranslate('filterTitle')}</h4><p className="mt-0.5 text-xs text-slate-500">{rankTranslate('filterDescription')}</p></div><button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label={rankTranslate('closeFilters')}><X className="h-4 w-4" /></button></div>
            <div className="space-y-4">
              {categories.length > 1 && <div><p className="mb-2 text-xs font-bold text-slate-500">{rankTranslate('sport')}</p><div className="flex flex-wrap gap-2">{categories.map((cat) => <button key={cat.id} type="button" onClick={() => setSelectedCategoryId(cat.id)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedCategoryId === cat.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700'}`}>{cat.name}</button>)}</div></div>}
              <div><p className="mb-2 text-xs font-bold text-slate-500">{rankTranslate('format')}</p><div className="flex flex-wrap gap-2">{matchTypes.map((mt) => <button key={mt} type="button" onClick={() => { setSelectedMatchType(mt); if (mt === 'MIXED_DOUBLES') setSelectedGender('MALE'); }} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedMatchType === mt ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700'}`}>{mt === 'ALL' ? rankTranslate('allFormats') : getEloMatchTypeLabel(mt, matchTypeLabels)}</button>)}</div></div>
              {selectedMatchType !== 'ALL' && selectedMatchType !== 'MIXED_DOUBLES' && <div><p className="mb-2 text-xs font-bold text-slate-500">{rankTranslate('gender')}</p><div className="flex gap-2">{(['MALE', 'FEMALE'] as const).map((gender) => <button key={gender} type="button" onClick={() => setSelectedGender(gender)} className={`rounded-lg border px-4 py-2 text-xs font-bold ${selectedGender === gender ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700'}`}>{gender === 'MALE' ? rankTranslate('male') : rankTranslate('female')}</button>)}</div></div>}
            </div>
            <button type="button" onClick={() => setIsFilterOpen(false)} className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-black text-white hover:bg-blue-700">{rankTranslate('applyFilters')}</button>
          </div>
        </div>
      )}

      {myRanking && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">
            {rankings.findIndex((rank) => rank.id === myRanking.id) >= 0
              ? `#${rankings.findIndex((rank) => rank.id === myRanking.id) + 1}`
              : rankTranslate('outsideTop20')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-blue-900">{rankTranslate('yourRanking')}</p>
            <p className="text-sm font-bold text-slate-800 truncate">{myRanking.user?.fullName || rankTranslate('you')}</p>
          </div>
          <span className="text-sm font-black text-blue-700">{myRanking.eloPoints} ELO</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200/80 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="text-sm text-slate-450 font-bold animate-pulse">{rankTranslate('loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-16 text-center">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-800 font-bold text-lg">
              {searchQuery ? rankTranslate('noMemberFound') : rankTranslate('noRankedMatches')}
            </p>
            <p className="text-slate-450 mt-2 max-w-sm mx-auto text-xs leading-relaxed font-semibold">
              {searchQuery
                ? rankTranslate('tryDifferentSearch')
                : rankTranslate('membersAppearAfterParticipating')}
            </p>
            {!searchQuery && onGoToTournaments && (
              <button
                type="button"
                onClick={onGoToTournaments}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                {translate('viewTournamentAction')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Podium */}
          {topThree.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-4 px-2 pt-4">
              {[0, 1, 2].map((i) => {
                const p = podiumOrder[i];
                if (!p) return <div key={i} className="flex-1 max-w-[140px] h-32 border border-dashed rounded-lg bg-slate-50/50" />;

                const mc = podiumTiers[i];
                const rankLabel = ['II', 'I', 'III'][i];
                const isCenter = i === 1;

                return (
                  <div key={p.id} className={`flex-1 max-w-[140px] flex flex-col items-center ${isCenter ? '-translate-y-3 flex-[1.2] max-w-[170px]' : ''}`}>
                    <div className="flex flex-col items-center mb-2">
                      {isCenter && (
                        <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-xs -mb-2 z-10 shadow-md border-2 border-white">
                          <Crown className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={`rounded-full ${mc.bg} border-2 ${mc.border} relative ${isCenter ? 'w-14 h-14 border-[3px] shadow-md' : 'w-11 h-11'}`}>
                        {rankingAvatars(p, isCenter ? 'w-14 h-14' : 'w-11 h-11')}
                      </div>
                      <p className={`${isCenter ? 'text-sm' : 'text-[11px]'} font-bold text-slate-700 mt-1.5 truncate max-w-full text-center leading-tight`}>
                        {rankingName(p)}
                      </p>
                      <span className={`${isCenter ? 'text-sm' : 'text-xs'} font-bold ${mc.color}`}>
                        {p.eloPoints} ELO
                      </span>
                      <EloTierBadge
                        elo={p.eloPoints}
                        tierName={getCanonicalTierName(p)}
                        categoryName={p.categoryName || activeCategory?.name}
                        size="sm"
                        className="mt-1 scale-[0.85] origin-center"
                      />
                    </div>
                    <div className={`w-full ${mc.bg} rounded-t-lg border ${mc.border} flex items-center justify-center ${isCenter ? 'h-28 bg-amber-100/70 border-2 shadow-sm' : 'h-24'}`}>
                      <span className={`text-2xl font-black ${mc.color}/60 ${isCenter ? 'text-3xl text-amber-500' : ''}`}>{rankLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ranks 4-20 List */}
          {restRankings.length > 0 && (
            <div className="space-y-1.5 mt-4">
              {restRankings.map((player) => {
                const rank = rankings.findIndex((item) => item.id === player.id) + 1;
                const winRate = getWinRate(player);
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 bg-white rounded-lg border border-slate-200/80 px-4 py-2.5 hover:bg-slate-50/50 transition-colors shadow-sm"
                  >
                    <span className="w-6 text-center text-xs font-bold text-slate-400">#{rank}</span>
                    {rankingAvatars(player, 'w-8 h-8')}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 truncate">{rankingName(player)}</span>
                      <EloTierBadge
                        elo={player.eloPoints}
                        tierName={getCanonicalTierName(player)}
                        categoryName={player.categoryName || activeCategory?.name}
                        size="sm"
                        className="shrink-0 scale-[0.85] origin-left"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 w-10 text-right shrink-0">{winRate}%</span>
                    <span className="text-[10px] font-bold text-slate-600 w-12 text-right shrink-0">
                      {player.matchesWon}-{player.matchesPlayed - player.matchesWon}
                    </span>
                    <span className="text-xs font-bold text-blue-600 w-16 text-right shrink-0">{player.eloPoints}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Polling indicator */}
      <p className="text-[10px] text-slate-400 text-center italic">{translate('autoRefreshNotice')}</p>
    </div>
  );
}
