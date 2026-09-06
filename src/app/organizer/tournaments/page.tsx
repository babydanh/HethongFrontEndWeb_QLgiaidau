'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tournamentsApi, divisionsApi, Division } from '@/features/tournaments/api';
import { isClubLiteTournament } from '@/features/tournaments/lite-qr';
import { Calendar, Users, Plus, Eye, Settings, Trash2, RotateCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { Tournament } from '@/types/tournament';
import { getSportLogo } from '@/constants/sports';
import { getTournamentStatusClassName, getTournamentStatusLabel } from '@/utils/tournament-status';
import { BRAND } from '@/constants/brand';
import TournamentBannerCover from '@/components/ui/TournamentBannerCover';
import { useAuthStore } from '@/lib/zustand/authStore';
import { OrganizerVerificationBanner } from '@/components/organizer/OrganizerVerificationBanner';

interface ParentWithDivisions {
  id: string;
  name: string;
  createdAt?: string | null;
  description?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  communityId?: string | null;
  isLite?: boolean;
  tournamentConfig?: Tournament['tournamentConfig'];
  divisions: Tournament[];
  isStandalone?: boolean;
  status?: Tournament['status'];
}

const getDefaultBanner = () => {
  return BRAND.assets.defaultTournamentLogo;
};

const getFormatLabel = (matchType: string, genderRestriction?: string | null, translate?: (key: string) => string) => {
  const mt = matchType || '';
  const gr = genderRestriction || '';
  if (mt === 'SINGLES') {
    return gr === 'FEMALE' ? (translate?.('formatSinglesWomen') ?? 'Women’s singles') : (translate?.('formatSinglesMen') ?? 'Men’s singles');
  }
  if (mt === 'DOUBLES') {
    return gr === 'FEMALE' ? (translate?.('formatDoublesWomen') ?? 'Women’s doubles') : (translate?.('formatDoublesMen') ?? 'Men’s doubles');
  }
  if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
    return translate?.('formatMixedDoubles') ?? 'Mixed doubles';
  }
  return mt;
};


export default function MyTournamentsPage() {
  const router = useRouter();
  const translate = useTranslations('OrganizerTournaments');
  const locale = useLocale();
  const [parents, setParents] = useState<ParentWithDivisions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const parentsRef = useRef<ParentWithDivisions[]>([]);
  const listRequestRef = useRef<Promise<void> | null>(null);
  const divisionCacheRef = useRef(new Map<string, Tournament[]>());

  const fetchTournaments = useCallback(async () => {
    if (listRequestRef.current) return listRequestRef.current;

    const request = (async () => {
      try {
        setIsLoading(true);
        // Parent detail already contains its divisions; keep this fan-out limited
        // to parent records and never clear a previously rendered snapshot on error.
        const res = await tournamentsApi.getMyParentTournaments();
        let parentsWithDivisions: ParentWithDivisions[] = [];

        if (res.data) {
          const parentDetails = await Promise.allSettled(
            res.data.map(async (p: { id: string }) => {
              const detail = await tournamentsApi.getParentTournamentById(p.id);
              return detail.data;
            }),
          );
          parentsWithDivisions = parentDetails.flatMap((result) =>
            result.status === 'fulfilled' && result.value ? [result.value] : [],
          );
        }

        // Fetch older standalone tournaments sequentially. This avoids a burst of
        // /divisions requests when an organizer owns many legacy tournaments.
        const oldRes = await tournamentsApi.getMyTournaments();
        if (oldRes.data) {
          const standaloneTournaments = oldRes.data.filter(t => !t.parentId);
          const pseudoParents: ParentWithDivisions[] = [];

          for (const t of standaloneTournaments) {
            let divisionsList = divisionCacheRef.current.get(t.id) ?? [];
            if (divisionsList.length === 0) {
              if (Array.isArray(t.divisions) && t.divisions.length > 0) {
                divisionsList = t.divisions.map((div) => {
                  const d = div as Partial<Division>;
                  return {
                    ...div,
                    tournamentConfig: {
                      bracketType: d.bracketType || undefined,
                      roundConfig: d.roundConfig || undefined,
                    },
                    format: d.bracketType || '',
                    currency: 'VND',
                    organizerId: t.organizerId || '',
                  };
                }) as unknown as Tournament[];
                divisionCacheRef.current.set(t.id, divisionsList);
              } else {
                try {
                  const divRes = await divisionsApi.getDivisions(t.id);
                  if (Array.isArray(divRes.data) && divRes.data.length > 0) {
                    divisionsList = divRes.data.map((div) => ({
                      ...div,
                      tournamentConfig: {
                        bracketType: div.bracketType || undefined,
                        roundConfig: div.roundConfig || undefined,
                      },
                      format: div.bracketType || '',
                      currency: 'VND',
                      organizerId: t.organizerId || '',
                    })) as unknown as Tournament[];
                    divisionCacheRef.current.set(t.id, divisionsList);
                  }
                } catch {
                  console.error(`Failed to fetch divisions for tournament ${t.id}`);
                }
              }
            }

            // Keep the tournament card usable even when its optional division
            // enrichment is rate-limited or temporarily unavailable.
            if (divisionsList.length === 0) divisionsList = [t];

            pseudoParents.push({
              id: t.id,
              name: t.name,
              createdAt: t.createdAt,
              description: t.description,
              bannerUrl: t.bannerUrl,
              logoUrl: t.logoUrl,
              communityId: t.communityId,
              isLite: t.isLite,
              tournamentConfig: t.tournamentConfig,
              divisions: divisionsList,
              isStandalone: true,
              status: t.status,
            });
          }
          parentsWithDivisions = [...parentsWithDivisions, ...pseudoParents];
        }

        const sortedParents = [...parentsWithDivisions].sort((a, b) => {
          const aDate = a.createdAt ?? a.divisions.find((division) => division.createdAt)?.createdAt;
          const bDate = b.createdAt ?? b.divisions.find((division) => division.createdAt)?.createdAt;
          const aTime = aDate ? new Date(aDate).getTime() : Number.NEGATIVE_INFINITY;
          const bTime = bDate ? new Date(bDate).getTime() : Number.NEGATIVE_INFINITY;
          return bTime - aTime;
        });
        parentsRef.current = sortedParents;
        setParents(sortedParents);
        } catch {
        // Keep the last successful cards visible during transient 429/network errors.
        if (parentsRef.current.length === 0) toast.error(translate('loadError'));
      } finally {
        setIsLoading(false);
      }
    })();

    listRequestRef.current = request;
    try {
      await request;
    } finally {
      if (listRequestRef.current === request) listRequestRef.current = null;
    }
  }, [translate]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  const handleDeleteParent = async (id: string, isStandalone: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(translate('deleteConfirm'))) return;
    try {
      let res;
      if (isStandalone) {
        res = await tournamentsApi.deleteTournament(id);
      } else {
        res = await tournamentsApi.deleteParentTournament(id);
      }

      // Check if delete is pending review
      const resData = res?.data as unknown as { pendingDelete?: boolean; message?: string } | undefined;
      if (resData?.pendingDelete) {
        toast.success(resData.message || translate('pendingDeleteSuccess'));
        fetchTournaments();
      } else {
        setParents(parents.filter(p => p.id !== id));
        toast.success(translate('deleteSuccess'));
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      // Hiện rõ lý do từ backend (vd: chưa hoàn tiền, đang chờ hoàn tiền)
      toast.error(msg || translate('deleteError'));
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PENDING_DELETE') {
      return <Badge className="bg-rose-50 text-rose-700 border-slate-200">{translate('statusPendingDelete')}</Badge>;
    }

    return <Badge className={getTournamentStatusClassName(status)}>{getTournamentStatusLabel(status, {
      DRAFT: translate('statusDraft'),
      PENDING_APPROVAL: translate('statusPendingApproval'),
      PENDING_DELETE: translate('statusPendingDelete'),
      UPCOMING: translate('statusUpcoming'),
      REGISTRATION_OPEN: translate('statusRegistrationOpen'),
      REGISTRATION_CLOSED: translate('statusRegistrationClosed'),
      IN_PROGRESS: translate('statusInProgress'),
      ONGOING: translate('statusInProgress'),
      COMPLETED: translate('statusCompleted'),
      CANCELLED: translate('statusCancelled'),
    })}</Badge>;
  };

  const user = useAuthStore((state) => state.user);

  if (isLoading && parents.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">{translate('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 md:py-12 md:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Verification Status & Onboarding Banner */}
        <OrganizerVerificationBanner
          isEmailVerified={user?.isEmailVerified}
          email={user?.email}
        />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-900">{translate('title')}</h1>
            <p className="text-slate-500 mt-1 text-xs md:text-sm font-medium">{translate('subtitle')}</p>
          </div>
          <Link href="/organizer/tournaments/create">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm shadow-md shadow-blue-500/20 h-auto">
              <Plus className="w-4 h-4 md:w-5 md:h-5" /> {translate('create')}
            </Button>
          </Link>
        </div>

        {parents.length === 0 ? (
          <div className="bg-white rounded-lg p-6 md:p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center max-w-xl mx-auto">
            <div className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.assets.logoIcon} alt={BRAND.name} className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900">{translate('emptyTitle')}</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-sm">
              {translate('emptyDescription')}
            </p>
            <Link href="/organizer/tournaments/create" className="mt-6">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">{translate('createFirst')}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parents.map((parent) => {
              const divisions = parent.divisions || [];
              const firstDivision = divisions[0];
              const participantCounts = divisions.map((div: Tournament) => {
                const summaryCount = div._summary?.participantCount;
                if (typeof summaryCount === 'number' && Number.isFinite(summaryCount)) return summaryCount;
                const count = div._count?.participants;
                return typeof count === 'number' && Number.isFinite(count) ? count : null;
              });
              const totalParticipants = participantCounts.some((count) => count === null)
                ? null
                : participantCounts.reduce((acc: number, count) => acc + (count ?? 0), 0);
              const participantCountLabel = totalParticipants === null
                ? translate('participantCountUnavailable')
                : translate('participantCount', { count: totalParticipants });
              const managementTournamentId = parent.isStandalone ? parent.id : (firstDivision?.id || parent.id);
              const isClubLite = isClubLiteTournament(parent) || isClubLiteTournament(firstDivision);
              const publicHref = `/tournaments/${managementTournamentId}`;
              const manageHref = isClubLite
                ? `/lite/tournaments/${managementTournamentId}/manage`
                : `/organizer/tournaments/${managementTournamentId}/manage`;
              const opsHref = `/organizer/tournaments/${managementTournamentId}/ops`;

              return (
                <div
                  key={parent.id}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Visual Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden group">
                    <Link href={manageHref} className="block w-full h-full">
                      <TournamentBannerCover
                        bannerUrl={parent.bannerUrl || firstDivision?.bannerUrl}
                        tournamentName={parent.name}
                        categoryName={firstDivision?.category?.name || parent.name}
                      />
                    </Link>

                    {/* Scope & Rank Badges (Top-Left) */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm w-fit ${
                        firstDivision?.tournamentType === 'CLUB' ? 'bg-amber-600/90' : 'bg-blue-600/90'
                      }`}>
                        {firstDivision?.tournamentType === 'CLUB' ? translate('scopeClub') : translate('scopeOpen')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm w-fit ${
                        firstDivision?.isRanked ? 'bg-amber-500/90' : 'bg-slate-600/90'
                      }`}>
                        {firstDivision?.isRanked ? translate('ranked') : translate('unranked')}
                      </span>
                      {divisions.some(div => {
                        const cfg = div.tournamentConfig;
                        return Boolean(cfg?.recurring?.enabled || cfg?.recurring?.frequency);
                      }) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm w-fit bg-purple-600/95 flex items-center gap-1">
                          <RotateCw className="w-2.5 h-2.5" /> {translate('recurring')}
                        </span>
                      )}
                    </div>

                    {/* Status & Action Badges */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
                      <div className="flex items-center gap-1.5">
                        {firstDivision && getStatusBadge(
                          parent.status ||
                          divisions.find((d: Tournament) => d.status && d.status !== 'DRAFT')?.status ||
                          // The parent endpoint only returns published divisions.
                          'REGISTRATION_OPEN'
                        )}
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap">
                          {divisions.length}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={(e) => handleDeleteParent(parent.id, parent.isStandalone || false, e)}
                        title={translate('deleteTitle')}
                        className="w-6 h-6 rounded-full shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Category Name Badge (neatly positioned, high contrast, no blur) */}
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="flex items-center gap-1 bg-slate-900/95 text-white px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider w-fit">
                        {(() => {
                          const logo = getSportLogo(firstDivision?.category?.name);
                          return logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logo} alt={firstDivision?.category?.name || ''} className="w-3 h-3 object-contain brightness-150" />
                          ) : null;
                        })()}
                        {firstDivision?.category?.name || 'MULTISPORT'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 md:p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2 md:mb-3">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 line-clamp-1" title={parent.name}>
                          {parent.name}
                        </h3>
                        <Link
                          href={publicHref}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-[10px] font-bold text-slate-500 hover:text-blue-700 underline underline-offset-2"
                        >
                          {translate('viewPublic')}
                        </Link>
                      </div>

                      {/* Division Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3 md:mb-4">
                        {divisions.slice(0, 3).map((div: Tournament) => {
                          const displayDivName = (div.name && div.name.toLowerCase() !== parent.name.toLowerCase())
                            ? div.name
                            : getFormatLabel(div.matchType || '', div.genderRestriction, translate);

                          return (
                            <button
                              key={div.id}
                              onClick={() => {
                                const divisionIsClubLite = isClubLiteTournament(parent) || isClubLiteTournament(div);
                                const divisionManageHref = divisionIsClubLite
                                  ? `/lite/tournaments/${parent.isStandalone ? parent.id : div.id}/manage`
                                  : parent.isStandalone
                                  ? `/organizer/tournaments/${parent.id}/manage?divisionId=${div.id}`
                                  : `/organizer/tournaments/${div.id}/manage`;
                                router.push(divisionManageHref);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-[11px] md:text-xs font-semibold border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all cursor-pointer active:scale-95"
                            >
                              {div.tournamentConfig?.bracketType && (
                                <span className="text-slate-400 mr-0.5">
                                  {div.tournamentConfig.bracketType === 'SINGLE_ELIMINATION'
                                    ? translate('bracketSingle')
                                    : div.tournamentConfig.bracketType === 'DOUBLE_ELIMINATION'
                                    ? translate('bracketDouble')
                                    : div.tournamentConfig.bracketType === 'ROUND_ROBIN'
                                    ? translate('bracketRoundRobin')
                                    : translate('bracketGroup')}
                                </span>
                              )}
                              <span>{displayDivName}</span>
                            </button>
                          );
                        })}
                        {divisions.length > 3 && (
                          <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[11px] font-bold border border-slate-200">
                            +{divisions.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:gap-3 pt-2.5 md:pt-3 border-t border-slate-100 text-slate-500 text-[11px] md:text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{firstDivision?.startDate ? new Intl.DateTimeFormat(locale).format(new Date(firstDivision.startDate)) : translate('notScheduled')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{participantCountLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="bg-slate-50 border-t border-slate-100 p-3 md:p-4">
                    {firstDivision ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Link href={manageHref}>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 font-bold shadow-sm text-[11px] md:text-sm h-9 md:h-10 active:scale-95 transition-transform px-0">
                            <Settings className="w-3.5 h-3.5" /> {translate('manage')}
                          </Button>
                        </Link>
                        <Link href={opsHref}>
                          <Button variant="outline" className="w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1 font-bold text-[11px] md:text-sm h-9 md:h-10 active:scale-95 transition-transform px-0">
                            <Eye className="w-3.5 h-3.5" /> {translate('operations')}
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Button disabled className="w-full bg-slate-300 text-white font-bold h-9 md:h-10 text-sm">
                        {translate('noRounds')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
