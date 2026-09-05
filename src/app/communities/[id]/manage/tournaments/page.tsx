'use client';

import { useEffect, useState, use } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { communitiesApi, Community } from '@/features/communities/api';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { isLiteTournament } from '@/features/tournaments/lite-qr';
import { categoriesApi, Category } from '@/features/categories/api';
import { getSportLogo } from '@/constants/sports';
import { Trophy, Calendar, Users, Plus, Settings, Eye, ChevronLeft, ShieldCheck, Lock, Clock, RotateCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';
import { useAuthStore } from '@/lib/zustand/authStore';

type LiteSport = 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';

const mapCategoryToLiteSport = (cat?: { slug?: string; name?: string } | null): LiteSport => {
  if (!cat) return 'badminton';
  const slug = (cat.slug || cat.name || '').toLowerCase();
  if (slug.includes('badminton') || slug.includes('cầu lông') || slug.includes('cau long')) return 'badminton';
  if (slug.includes('tennis') || slug.includes('quần vợt') || slug.includes('quan vot')) return 'tennis';
  if (slug.includes('pickleball')) return 'pickleball';
  if (slug.includes('table_tennis') || slug.includes('table-tennis') || slug.includes('bóng bàn') || slug.includes('bong ban') || slug.includes('tabletennis')) return 'table_tennis';
  if (slug.includes('football') || slug.includes('bóng đá') || slug.includes('bong da') || slug.includes('soccer')) return 'football';
  if (['badminton', 'tennis', 'pickleball', 'table_tennis', 'football'].includes(slug)) {
    return slug as LiteSport;
  }
  return 'badminton';
};

const DAYS_OF_WEEK: { value: number; key: string }[] = [
  { value: 1, key: 'monday' },
  { value: 2, key: 'tuesday' },
  { value: 3, key: 'wednesday' },
  { value: 4, key: 'thursday' },
  { value: 5, key: 'friday' },
  { value: 6, key: 'saturday' },
  { value: 0, key: 'sunday' },
];

export default function ClubTournamentsPage({ params }: { params: Promise<{ id: string }> }) {
  const translate = useTranslations('Match');
  const locale = useLocale();
  type CommunityTournamentMatchType = 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [community, setCommunity] = useState<Community | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLiteModalOpen, setIsLiteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const hasSystemAdmin = currentUser?.roles?.some((role) =>
    role.toUpperCase() === 'ADMIN',
  ) === true;
  const hasSystemOrganizer = currentUser?.roles?.some((role) =>
    ['ORGANIZER', 'ADMIN'].includes(role.toUpperCase()),
  ) === true;
  const isJoinedClubManager =
    ['OWNER', 'MODERATOR'].includes((community?.myRole ?? '').toUpperCase());
  const canCreateClubLite = hasSystemAdmin || isJoinedClubManager;
  const canCreateClubAdvanced =
    hasSystemOrganizer && (hasSystemAdmin || isJoinedClubManager);

  // Form states for normal creation
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneyCategory, setNewTourneyCategory] = useState('');
  const [newTourneyMatchType, setNewTourneyMatchType] = useState<CommunityTournamentMatchType>('DOUBLES');
  const [newTourneyMaxParticipants, setNewTourneyMaxParticipants] = useState(16);
  const [newTourneyStartDate, setNewTourneyStartDate] = useState('');
  const [newTourneyEndDate, setNewTourneyEndDate] = useState('');
  const [newTourneyEntryFee, setNewTourneyEntryFee] = useState(0);

  // Form states for Lite creation
  const [liteName, setLiteName] = useState('');
  const [liteSport, setLiteSport] = useState<LiteSport>('badminton');
  const [liteGenderRestriction, setLiteGenderRestriction] = useState<'MALE' | 'FEMALE' | ''>('');
  const [liteTeamSize, setLiteTeamSize] = useState<5 | 7 | 11>(7);
  const [liteMaxReserve, setLiteMaxReserve] = useState(5);
  const [liteFormat, setLiteFormat] = useState<'singles' | 'doubles' | 'mixed_doubles'>('singles');
  const [liteBracketType, setLiteBracketType] = useState<'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout'>('single_elimination');
  const [liteMaxTeams, setLiteMaxTeams] = useState(16);
  const [liteStartDate, setLiteStartDate] = useState(() => {
    const now = new Date();
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [liteStartTime, setLiteStartTime] = useState('18:00');
  const [liteDurationHours, setLiteDurationHours] = useState<number>(1);
  const [liteDurationMinutes, setLiteDurationMinutes] = useState<number>(30);
  const [liteIsRecurring, setLiteIsRecurring] = useState(false);
  const [liteRecurringFrequency, setLiteRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [liteRecurringDaysOfWeek, setLiteRecurringDaysOfWeek] = useState<number[]>([6]);
  const [liteRecurringTimeOfDay, setLiteRecurringTimeOfDay] = useState('18:00');
  const [liteRecurringAdvanceDays, setLiteRecurringAdvanceDays] = useState<number>(0);
  const [liteIsRanked, setLiteIsRanked] = useState(true);

  const getCategoryDisplayName = (category?: { slug?: string; name?: string } | null) => {
    if (!category) return translate('communityTournamentSportFallback');
    const value = `${category.slug || ''} ${category.name || ''}`.toLowerCase();
    if (value.includes('badminton') || value.includes('cầu lông') || value.includes('cau long')) return translate('liteSportBadminton');
    if (value.includes('tennis') || value.includes('quần vợt') || value.includes('quan vot')) return translate('liteSportTennis');
    if (value.includes('pickleball')) return translate('liteSportPickleball');
    if (value.includes('table_tennis') || value.includes('table-tennis') || value.includes('table tennis') || value.includes('bóng bàn') || value.includes('bong ban')) return translate('liteSportTableTennis');
    if (value.includes('football') || value.includes('soccer') || value.includes('bóng đá') || value.includes('bong da')) return translate('liteSportFootball');
    return category.name || translate('communityTournamentSportFallback');
  };

  const fetchData = async () => {
    try {
      const cRes = await communitiesApi.getCommunityById(id);
      const commData = (cRes as { data?: Community })?.data || (cRes as unknown as Community);
      setCommunity(commData);

      const tRes = await communitiesApi.getTournaments(id);
      setTournaments((tRes as { data?: Tournament[] })?.data || (tRes as unknown as Tournament[]) || []);

      const catRes = await categoriesApi.getCategories();
      if (catRes.data) {
        setCategories(catRes.data);
        if (commData?.categories?.[0]) {
          setNewTourneyCategory(commData.categories[0].id);
          const mappedSport = mapCategoryToLiteSport(commData.categories[0]);
          if (mappedSport) setLiteSport(mappedSport);
        } else if (catRes.data.length > 0) {
          setNewTourneyCategory(catRes.data[0].id);
        }
      }
    } catch (err) {
      toast.error(translate('communityClubTournamentLoadFailed'));
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    init();
  }, [id]);

  const handleOpenAdvancedTournamentCreate = () => {
    router.push(`/organizer/tournaments/create?communityId=${id}&source=club&mode=advanced`);
  };

  const handleCreateLiteTournament = async () => {
    if (!liteName.trim()) {
      toast.error(translate('communityTournamentNameRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await tournamentsApi.createLiteTournament({
        name: liteName.trim(),
        sport: liteSport,
        communityId: id,
        format: liteSport === 'football' ? 'doubles' : liteFormat,
        ...(liteSport !== 'football' && liteFormat === 'mixed_doubles' ? { genderRestriction: 'MIXED' as const } : {}),
        ...(liteSport === 'football'
          ? { genderRestriction: liteGenderRestriction || undefined, teamSize: liteTeamSize, maxReserve: liteMaxReserve }
          : {}),
        bracketType: liteBracketType,
        maxTeams: liteMaxTeams,
        description: translate('communityQuickTournamentDescription', { club: community?.name || '' }),
        isRanked: liteIsRanked,
        startDate: liteStartDate || undefined,
        startTime: liteStartTime || undefined,
        durationMinutes: (liteDurationHours * 60) + liteDurationMinutes,
        durationHours: liteDurationHours + (liteDurationMinutes / 60),
        isRecurring: liteIsRecurring,
        recurringFrequency: liteIsRecurring ? liteRecurringFrequency : undefined,
        recurringDayOfWeek: liteIsRecurring ? (liteRecurringDaysOfWeek[0] ?? 6) : undefined,
        recurringDaysOfWeek: liteIsRecurring ? liteRecurringDaysOfWeek : undefined,
        recurringTimeOfDay: liteIsRecurring ? liteRecurringTimeOfDay : undefined,
        recurringAdvanceDays: liteIsRecurring ? liteRecurringAdvanceDays : undefined,
      });

      toast.success(translate('communityTournamentQuickCreated'));
      setIsLiteModalOpen(false);

      // Reset form
      setLiteName('');
      setLiteSport('badminton');
      setLiteGenderRestriction('');
      setLiteTeamSize(7);
      setLiteMaxReserve(5);
      setLiteFormat('singles');
      setLiteBracketType('single_elimination');
      setLiteMaxTeams(16);

      // Redirect directly to the dedicated quick-tournament manage page.
      const newId = res?.id;
      if (newId) {
        router.push(`/lite/tournaments/${newId}/manage`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClubTournament = async () => {
    if (!newTourneyName.trim()) {
      toast.error(translate('communityTournamentNameRequired'));
      return;
    }

    let createdParentId: string | null = null;
    let createdTournamentId: string | null = null;
    try {
      setIsSubmitting(true);

      // 1. Create Parent Tournament first
      const parentRes = await tournamentsApi.createParentTournament({
        name: newTourneyName.trim(),
        description: translate('communityInternalTournamentDescription', { club: community?.name || '' }),
      });

      const parentId = parentRes.data?.id;
      if (!parentId) {
        throw new Error(translate('communityTournamentParentCreateFailed'));
      }
      createdParentId = parentId;

      // 2. Create the first division (tournament) under this parent
      const data = {
        parentId,
        name: newTourneyName.trim(),
        categoryId: newTourneyCategory,
        communityId: id,
        tournamentType: 'CLUB' as const,
        matchType: newTourneyMatchType,
        maxParticipants: newTourneyMaxParticipants,
        entryFee: 0,
        sportRules: {
          setsToWin: 2,
          pointsPerSet: 21,
          winByTwo: true,
        },
        tournamentConfig: {
          bracketType: 'SINGLE_ELIMINATION',
          maxTeams: newTourneyMaxParticipants,
        },
      };

      const res = await tournamentsApi.createTournament(data);
      createdTournamentId = res?.data?.id ?? null;
      toast.success(translate('communityTournamentCreated'));
      setIsCreateModalOpen(false);

      // Reset form
      setNewTourneyName('');
      setNewTourneyMatchType('DOUBLES');
      setNewTourneyMaxParticipants(16);

      // Refresh list
      fetchData();

      // Redirect directly to the manage page of the newly created tournament
      const newId = res?.data?.id;
      if (newId) {
        router.push(`/organizer/tournaments/${newId}/manage`);
      }
    } catch (err) {
      if (createdTournamentId) {
        try {
          await tournamentsApi.deleteTournament(createdTournamentId);
        } catch {
          // Best-effort cleanup; preserve the original error for the user.
        }
      }
      if (createdParentId) {
        try {
          await tournamentsApi.deleteParentTournament(createdParentId);
        } catch {
          // Best-effort cleanup; preserve the original error for the user.
        }
      }
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'DRAFT':
        return <Badge className="bg-slate-100 text-slate-700">{translate('communityTournamentDraftHidden')}</Badge>;
      case 'REGISTRATION_OPEN':
        return <Badge className="bg-emerald-600 text-white font-bold shadow-2xs border-transparent">{translate("communityOpenRegistrationBadge")}</Badge>;
      case 'REGISTRATION_CLOSED':
        return <Badge className="bg-slate-700 text-white font-bold shadow-2xs border-transparent">{translate('statusRegistrationClosed')}</Badge>;
      case 'UPCOMING':
        return <Badge className="bg-blue-600 text-white font-bold shadow-2xs border-transparent">{translate('statusUpcoming')}</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-rose-600 text-white font-bold shadow-2xs border-transparent animate-pulse">{translate('statusInProgress')}</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-slate-800 text-white font-bold shadow-2xs border-transparent">{translate('statusCompleted')}</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-600 text-white font-bold shadow-2xs border-transparent">{translate('statusCancelled')}</Badge>;
      default:
        return <Badge className="bg-slate-700 text-white font-bold shadow-2xs border-transparent">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">{translate('loading')}</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{translate('communityNotFoundTitle')}</h2>
          <p className="text-slate-500 mt-2">{translate('communityNotFoundDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Back Link */}
        <Link href={`/communities/${community.id}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-6">
          <ChevronLeft className="w-4 h-4" /> {translate('backToCommunity')}
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{translate('communityTournamentManageTitle')}</h1>
            <p className="text-slate-500 mt-1 font-medium flex items-center gap-1">
              {translate('communityTournamentClubLabel')} <span className="text-slate-800 font-bold">{community.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {canCreateClubLite && (
              <Button
                onClick={() => router.push(`/communities/${community.id}/create-lite`)}
                className="font-bold flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> {translate('communityTournamentQuickButton')}
              </Button>
            )}
            {canCreateClubAdvanced && (
              <Button
                onClick={handleOpenAdvancedTournamentCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> {translate('communityTournamentAdvancedButton')}
              </Button>
            )}
          </div>
        </div>

        {/* Description Banner */}
        <div className="bg-slate-50 text-emerald-950 p-4 rounded-lg border border-slate-200 flex items-start gap-3 text-xs leading-relaxed font-semibold mb-8">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-950 text-sm">{translate('communityTournamentPolicyTitle')}</p>
            <p className="mt-1 text-emerald-700">
              {translate('communityTournamentPolicyDescription')}
            </p>
          </div>
        </div>

        {/* Tournaments Grid */}
        {tournaments.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{translate('communityTournamentEmptyTitle')}</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto">
              {translate('communityTournamentEmptyDescription')}
            </p>
            {canCreateClubLite && (
              <Button
                onClick={() => router.push(`/communities/${community.id}/create-lite`)}
                className="mt-6"
              >
                {translate('communityTournamentQuickButton')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {(() => {
                          const logo = getSportLogo(t.category?.name);
                          return logo ? <img src={logo} alt="" className="w-2.5 h-2.5 object-contain" /> : null;
                        })()}
                        {getCategoryDisplayName(t.category)}
                      </span>
                      {isLiteTournament(t) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          {translate('communityTournamentLiteLabel')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          {translate('communityTournamentAdvancedLabel')}
                        </span>
                      )}
                      {Boolean((t.tournamentConfig as Record<string, any>)?.recurring?.enabled || (t.tournamentConfig as Record<string, any>)?.recurring?.frequency) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <RotateCw className="w-2.5 h-2.5" /> {translate('communityTournamentRecurringBadge')}
                        </span>
                      )}
                    </div>
                    {getStatusBadge(t.status)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{t.name}</h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-450" />
                      {t.startDate ? new Date(t.startDate).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US') : translate('communityTournamentScheduledFallback')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-450" />
                      {t.matchType === 'SINGLES' ? translate('communityTournamentSinglesFormat') : translate('communityTournamentDoublesFormat')} {translate('communityTournamentTeamCount', { count: t.maxParticipants || 16 })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  {isLiteTournament(t) ? (
                    <Link href={`/lite/tournaments/${t.id}/manage`} className="flex-1">
                      <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1">
                        <Settings className="w-3.5 h-3.5" /> {translate('communityTournamentQuickManage')}
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/organizer/tournaments/${t.id}/manage`} className="flex-1">
                      <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1">
                        <Settings className="w-3.5 h-3.5" /> {translate('communityTournamentAdvancedManage')}
                      </Button>
                    </Link>
                  )}
                  <Link href={`/tournaments/${t.id}`} target="_blank" className="flex-1">
                    <Button variant="outline" className="w-full text-xs font-bold flex items-center justify-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {translate('communityTournamentViewPage')}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {isCreateModalOpen && (
          <Modal open={isCreateModalOpen} onOpenChange={(open) => { if (!open) setIsCreateModalOpen(false); }}>
            <ModalContent className="bg-white rounded-xl p-6 max-h-[90vh] overflow-y-auto w-full max-w-lg shadow-xl">
              <ModalHeader>
                <ModalTitle className="text-xl font-bold text-slate-900">
                  {translate('communityTournamentCreateInternalTitle')}
                </ModalTitle>
              </ModalHeader>
              <div className="space-y-4 mt-4">
                <Input
                  label={translate('communityTournamentNameLabel')}
                  placeholder={translate('communityTournamentNamePlaceholder')}
                  value={newTourneyName}
                  onChange={(e) => setNewTourneyName(e.target.value)}
                />

                {(() => {
                  const clubCategory = community?.categories?.[0];
                  const isClubLocked = Boolean(clubCategory);
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">{translate('communityTournamentSelectSport')}</label>
                        {isClubLocked && clubCategory && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Lock className="w-3 h-3" /> {translate('communityTournamentLockedByClub', { name: getCategoryDisplayName(clubCategory) })}
                          </span>
                        )}
                      </div>
                      <select
                        value={newTourneyCategory}
                        onChange={(e) => setNewTourneyCategory(e.target.value)}
                        disabled={isClubLocked}
                        className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{getCategoryDisplayName(cat)}</option>
                        ))}
                      </select>
                      {isClubLocked && clubCategory && (
                        <p className="text-xs text-slate-500 font-medium">
                          🔒 {translate('communityTournamentLockedDescription', { name: getCategoryDisplayName(clubCategory) })}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">{translate('communityTournamentContentLabel')}</label>
                    <select
                      value={newTourneyMatchType}
                      onChange={(e) => setNewTourneyMatchType(e.target.value as CommunityTournamentMatchType)}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SINGLES">{translate('communityTournamentSinglesFormat')}</option>
                      <option value="DOUBLES">{translate('communityTournamentDoublesFormat')}</option>
                      <option value="MIXED_DOUBLES">{translate('communityTournamentMixedFormat')}</option>
                    </select>
                  </div>

                  <Input
                    label={translate('communityTournamentMaxTeamsLabel')}
                    type="number"
                    value={newTourneyMaxParticipants}
                    onChange={(e) => setNewTourneyMaxParticipants(Number(e.target.value))}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isSubmitting}
                    className="border-slate-200 text-slate-650 font-medium hover:bg-slate-50"
                  >
                    {translate('communityTournamentCancel')}
                  </Button>
                  <Button
                    onClick={handleCreateClubTournament}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
                  >
                    {isSubmitting ? translate('communityTournamentCreating') : translate('communityTournamentCreateAction')}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}

        {isLiteModalOpen && (
          <Modal open={isLiteModalOpen} onOpenChange={(open) => { if (!open) setIsLiteModalOpen(false); }}>
            <ModalContent className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <ModalHeader>
                <ModalTitle className="text-xl font-bold text-slate-900">
                  {translate('communityTournamentCreateLiteTitle')}
                </ModalTitle>
              </ModalHeader>
              <div className="space-y-4 mt-4">
                <Input
                  label={translate('communityTournamentQuickNameLabel')}
                  placeholder={translate('communityTournamentQuickNamePlaceholder')}
                  value={liteName}
                  onChange={(e) => setLiteName(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    const clubCategory = community?.categories?.[0];
                    const isClubLocked = Boolean(clubCategory);
                    return (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-slate-700">{translate('communityTournamentSportLabel')}</label>
                          {isClubLocked && clubCategory && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Lock className="w-3 h-3" /> {translate('communityTournamentLockedByClubShort')}
                            </span>
                          )}
                        </div>
                        <select
                          value={liteSport}
                          onChange={(e) => {
                            const nextSport = e.target.value as LiteSport;
                            setLiteSport(nextSport);
                            if (nextSport === 'football') setLiteFormat('doubles');
                          }}
                          disabled={isClubLocked}
                          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                        >
                          {categories.filter((category) => category.isActive !== false).map((category) => (
                            <option key={category.id} value={mapCategoryToLiteSport(category)}>
                              {getCategoryDisplayName(category)}
                            </option>
                          ))}
                        </select>
                        {isClubLocked && clubCategory && (
                          <p className="text-xs text-slate-500 font-medium">
                            🔒 {translate('communityTournamentLockedSportDescription', { name: getCategoryDisplayName(clubCategory) })}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-750 text-slate-700">{translate('communityTournamentFormatLabel')}</label>
                    <select
                      value={liteFormat}
                      onChange={(e) => setLiteFormat(e.target.value as 'singles' | 'doubles' | 'mixed_doubles')}
                      disabled={liteSport === 'football'}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="singles">{translate('communityTournamentSinglesFormat')}</option>
<option value="doubles">{translate('communityTournamentDoublesFormat')}</option>
                      <option value="mixed_doubles">{translate('communityTournamentMixedFormat')}</option>
                    </select>
                  </div>
                </div>

                {liteSport === 'football' && (
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">{translate('communityTournamentTeamLineupLabel')}</label>
                      <select value={liteTeamSize} onChange={(e) => setLiteTeamSize(Number(e.target.value) as 5 | 7 | 11)} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700">
                        <option value={5}>{translate('communityTournamentField5')}</option>
                        <option value={7}>{translate('communityTournamentField7')}</option>
                        <option value={11}>{translate('communityTournamentField11')}</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">{translate('communityTournamentGenderLabel')}</label>
                      <select value={liteGenderRestriction} onChange={(e) => setLiteGenderRestriction(e.target.value as 'MALE' | 'FEMALE' | '')} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700">
                        <option value="">{translate('communityTournamentNoRestriction')}</option>
                        <option value="MALE">{translate('communityTournamentMale')}</option>
                        <option value="FEMALE">{translate('communityTournamentFemale')}</option>
                      </select>
                    </div>
                    <Input label={translate('communityTournamentReserveLabel')} type="number" min={0} max={20} value={liteMaxReserve} onChange={(e) => setLiteMaxReserve(Math.max(0, Math.min(20, Number(e.target.value) || 0)))} />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">{translate('communityTournamentBracketLabel')}</label>
                    <select
                      value={liteBracketType}
                      onChange={(e) => setLiteBracketType(e.target.value as 'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout')}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single_elimination">{translate('bracketSingleElimination')}</option>
                      <option value="double_elimination">{translate('bracketDoubleElimination')}</option>
                      <option value="round_robin">{translate('bracketRoundRobin')}</option>
                      <option value="group_stage_knockout">{translate('bracketGroupStageKnockout')}</option>
                    </select>
                    {liteBracketType === 'group_stage_knockout' && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        {translate('communityTournamentGroupStageHint')}
                      </p>
                    )}
                  </div>

                  <Input
                    label={translate('communityTournamentMaxTeamsLiteLabel')}
                    type="number"
                    value={liteMaxTeams}
                    onChange={(e) => setLiteMaxTeams(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-500" /> {translate('communityTournamentStartDate')}
                    </label>
                    <input
                      type="date"
                      value={liteStartDate}
                      onChange={(e) => setLiteStartDate(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-500" /> {translate('communityTournamentStartTime')}
                    </label>
                    <input
                      type="time"
                      value={liteStartTime}
                      onChange={(e) => setLiteStartTime(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Thời lượng thi đấu dự kiến
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={168}
                        value={liteDurationHours}
                        onChange={(e) => setLiteDurationHours(Math.max(0, Number(e.target.value) || 0))}
                        className="text-sm font-medium"
                        placeholder="Giờ"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">giờ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        step={5}
                        value={liteDurationMinutes}
                        onChange={(e) => setLiteDurationMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                        className="text-sm font-medium"
                        placeholder="Phút"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">phút</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Tổng thời lượng: <strong className="text-slate-700">{liteDurationHours} giờ {liteDurationMinutes > 0 ? `${liteDurationMinutes} phút` : ''}</strong>
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <RotateCw className={`w-4 h-4 ${liteIsRecurring ? 'text-emerald-600' : 'text-slate-500'}`} />
                        {translate('recurringTitle')}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        {translate('recurringDescription')}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={liteIsRecurring}
                      onClick={() => setLiteIsRecurring(!liteIsRecurring)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                        liteIsRecurring ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          liteIsRecurring ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {liteIsRecurring && (
                    <div className="pt-2.5 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-slate-700">{translate('communityTournamentFrequency')}</label>
                          <select
                            value={liteRecurringFrequency}
                            onChange={(e) => setLiteRecurringFrequency(e.target.value as typeof liteRecurringFrequency)}
                            className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          >
                            <option value="WEEKLY">{translate('frequencyWeekly')}</option>
                            <option value="BIWEEKLY">{translate('frequencyBiweekly')}</option>
                            <option value="DAILY">{translate('frequencyDaily')}</option>
                            <option value="MONTHLY">{translate('frequencyMonthly')}</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" /> {translate('communityTournamentRecurringTime')}
                          </label>
                          <input
                            type="time"
                            value={liteRecurringTimeOfDay}
                            onChange={(e) => setLiteRecurringTimeOfDay(e.target.value)}
                            className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                          />
                        </div>
                      </div>

                      {liteRecurringFrequency !== 'DAILY' && liteRecurringFrequency !== 'MONTHLY' && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            {translate('recurringWeekdaysLabel', { count: liteRecurringDaysOfWeek.length })}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {DAYS_OF_WEEK.map(({ value, key }: { value: number; key: string }) => {
                              const isSelected = liteRecurringDaysOfWeek.includes(value);
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setLiteRecurringDaysOfWeek((prev) => {
                                      if (prev.includes(value)) {
                                        if (prev.length === 1) return prev;
                                        return prev.filter((d) => d !== value);
                                      } else {
                                        return [...prev, value].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
                                      }
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {translate(key)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                                            {/* Mở đăng ký trước bao nhiêu ngày */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-700">
                          {translate('advanceDaysLabel')}
                        </label>
                        <select
                          value={liteRecurringAdvanceDays}
                          onChange={(e) => setLiteRecurringAdvanceDays(Number(e.target.value))}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                        >
                          <option value={0}>{translate('advanceSameDay')}</option>
                          <option value={1}>{translate('advanceOneDay')}</option>
                          <option value={2}>{translate('advanceTwoDays')}</option>
                          <option value={3}>{translate('advanceThreeDays')}</option>
                          <option value={7}>{translate('advanceOneWeek')}</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                        🔄 <strong>{translate('automaticScheduleLabel')}</strong> {translate('automaticScheduleDescription')}{' '}
                        <strong className="text-emerald-950 font-bold">{liteRecurringTimeOfDay}</strong>{' '}
                        {liteRecurringFrequency === 'DAILY'
                          ? translate('frequencyDailyShort')
                          : liteRecurringFrequency === 'MONTHLY'
                          ? translate('communityTournamentMonthlySchedule', { day: liteStartDate ? new Date(liteStartDate).getDate() : 15 })
                              : translate('communityTournamentWeeklySchedule', { days: liteRecurringDaysOfWeek
                              .map((d) => { const day = DAYS_OF_WEEK.find((item) => item.value === d); return day ? translate(day.key) : null; })
                              .filter(Boolean)
                              .join(', '), frequency: liteRecurringFrequency === 'BIWEEKLY' ? translate('frequencyBiweeklyShort') : translate('frequencyWeeklyShort') })}.
                        <br />
                        <span className="text-emerald-700 text-[11px] mt-1 inline-block">
                          📢 {translate('memberNotificationDescription')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsLiteModalOpen(false)}
                    disabled={isSubmitting}
                    className="border-slate-200 text-slate-650 font-medium hover:bg-slate-50"
                  >
                    {translate('communityTournamentCancel')}
                  </Button>
                  <Button
                    onClick={handleCreateLiteTournament}
                    disabled={isSubmitting}
                    className="font-bold px-5"
                  >
                    {isSubmitting ? translate('communityTournamentCreating') : translate('communityTournamentCreateQuickAction')}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}
      </div>
    </div>
  );
}
