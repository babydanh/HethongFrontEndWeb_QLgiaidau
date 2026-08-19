'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, DollarSign, Loader2, Trash2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TournamentTypeChoiceModal } from '@/components/TournamentTypeChoiceModal';
import { communitiesApi } from '@/features/communities/api';
import { tournamentsApi } from '@/features/tournaments/api';
import { isLiteTournament } from '@/features/tournaments/lite-qr';
import { getSportLogo } from '@/constants/sports';
import { formatDate } from '@/utils/format';
import { Tournament } from '@/types/tournament';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  getTournamentStatusClassName,
  getTournamentStatusLabel,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentUpcoming,
  isTournamentCompleted,
  isTournamentDraft,
} from '@/utils/tournament-status';

export default function TournamentsTab({ 
  communityId, 
  isOwnerOrMod 
}: { 
  communityId: string; 
  isOwnerOrMod: boolean; 
}) {
  const router = useRouter();
  const translate = useTranslations('Common');
  const locale = useLocale();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'ALL' | 'CLUB' | 'PUBLIC'>('ALL');
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isGrouped: boolean } | null>(null);

  const fetchTournaments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await communitiesApi.getTournaments(communityId);
      const data = res.data || [];
      setTournaments(data);
    } catch (error) {
      console.error('Failed to fetch community tournaments', error);
    } finally {
      setIsLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    if (communityId) {
      Promise.resolve().then(() => {
        fetchTournaments();
      });
    }
  }, [communityId, fetchTournaments]);

  const handleDeleteTournament = (id: string, isGrouped: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ id, isGrouped });
  };

  const performDeleteTournament = async (id: string, isGrouped: boolean) => {
    try {
      if (isGrouped) {
        await tournamentsApi.deleteParentTournament(id);
      } else {
        await tournamentsApi.deleteTournament(id);
      }
      toast.success(translate('tournamentDeleted'));
      fetchTournaments();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, translate('deleteTournamentFailed')));
    }
  };

  const getStatusBadge = (status: Tournament['status']) => {
    if (isTournamentDraft(status)) return null;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getTournamentStatusClassName(status)}`}>
        {(isTournamentInProgress(status) || isTournamentOpenForRegistration(status) || isTournamentUpcoming(status)) && (
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
        )}
        {isTournamentCompleted(status) && <span className="w-1.5 h-1.5 rounded-full bg-current"></span>}
        {getTournamentStatusLabel(status)}
      </span>
    );
  };

  const getTypeBadge = (type: Tournament['tournamentType']) => {
    if (type === 'CLUB') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          {translate('communityClubOnlyBadge')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        {translate('communityOpenBadge')}
      </span>
    );
  };

  const filteredTournaments = tournaments.filter(t => {
    // Hide DRAFT tournaments from non-owners/non-moderators
    if (!isOwnerOrMod && t.status === 'DRAFT') {
      return false;
    }
    // 1. Filter by Tournament Type
    if (activeTypeFilter !== 'ALL' && t.tournamentType !== activeTypeFilter) {
      return false;
    }
    // 2. Filter by Status
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'UPCOMING') return isTournamentUpcoming(t.status) || isTournamentOpenForRegistration(t.status);
    return t.status === activeFilter;
  });

  // Group divisions under parentId
  const groupedTournaments = (() => {
    const groups: Record<string, Tournament[]> = {};
    const standalones: Tournament[] = [];

    filteredTournaments.forEach(t => {
      if (t.parentId) {
        if (!groups[t.parentId]) {
          groups[t.parentId] = [];
        }
        groups[t.parentId].push(t);
      } else {
        standalones.push(t);
      }
    });

    interface GroupedItem {
      id: string;
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      entryFee?: number;
      tournamentType?: 'CLUB' | 'PUBLIC';
      status: Tournament['status'];
      divisions: Tournament[];
    }

    const result: GroupedItem[] = [];

    Object.entries(groups).forEach(([parentId, divs]) => {
      // Sort divisions so representation is consistent
      divs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      const representative = divs[0];
      
      // Determine overall status
      let overallStatus: Tournament['status'] = representative.status;
      if (divs.some(d => isTournamentInProgress(d.status))) {
        overallStatus = 'ONGOING';
      } else if (divs.some(d => isTournamentOpenForRegistration(d.status))) {
        overallStatus = 'REGISTRATION_OPEN';
      } else if (divs.every(d => isTournamentCompleted(d.status))) {
        overallStatus = 'COMPLETED';
      }

      result.push({
        id: parentId,
        name: representative.name,
        description: representative.description,
        startDate: representative.startDate,
        endDate: representative.endDate,
        entryFee: Number(representative.entryFee),
        tournamentType: representative.tournamentType,
        status: overallStatus,
        divisions: divs,
      });
    });

    standalones.forEach(t => {
      result.push({
        id: t.id,
        name: t.name,
        description: t.description,
        startDate: t.startDate,
        endDate: t.endDate,
        entryFee: Number(t.entryFee),
        tournamentType: t.tournamentType,
        status: t.status,
        divisions: [t],
      });
    });

    return result;
  })();

  const getFormatLabel = (matchType?: string, genderRestriction?: string | null) => {
    const mt = matchType || '';
    const gr = genderRestriction || '';
    if (mt === 'SINGLES') {
      return gr === 'FEMALE' ? translate('communitySinglesFemale') : translate('communitySinglesMale');
    }
    if (mt === 'DOUBLES') {
      return gr === 'FEMALE' ? translate('communityDoublesFemale') : translate('communityDoublesMale');
    }
    if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
      return translate('communityMixedDoubles');
    }
    return mt === 'DOUBLES' ? translate('communityDoubles') : mt === 'SINGLES' ? translate('communitySingles') : translate('communityMixedDoubles');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Scope Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'ALL', label: translate('allTournaments') },
            { key: 'CLUB', label: translate('clubTournaments') },
            { key: 'PUBLIC', label: translate('publicTournaments') },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveTypeFilter(opt.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTypeFilter === opt.key
                  ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isOwnerOrMod && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => router.push(`/communities/${communityId}/manage/tournaments`)}
              variant="outline"
              className="w-full sm:w-auto border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold shadow-sm transition-all"
            >
              {translate('communityTournamentManageTitle')}
            </Button>
            <Button 
              onClick={() => setIsChoiceModalOpen(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all"
            >
              + {translate('communityTournamentCreateButton')}
            </Button>
          </div>
        )}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'ALL', label: translate('allStatuses') },
          { key: 'UPCOMING', label: translate('upcoming') },
          { key: 'ONGOING', label: translate('ongoing') },
          { key: 'COMPLETED', label: translate('completed') },
        ] as const).map(opt => (
          <button
            key={opt.key}
            onClick={() => setActiveFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              activeFilter === opt.key
                ? 'border-blue-600 text-blue-700 bg-blue-50 shadow-sm'
                : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <p className="text-slate-500 text-sm">{translate('loadingTournaments')}</p>
        </div>
      ) : groupedTournaments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 border-dashed p-12 text-center">
          <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-medium text-lg">{translate('noTournaments')}</p>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
            {translate('communityTournamentFilterEmpty')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupedTournaments.map((t) => (
            <div 
              key={t.id}
              onClick={() => router.push(`/tournaments/${t.divisions[0].id}`)}
              className="group cursor-pointer bg-white border border-slate-200 hover:border-blue-500/80 rounded-lg p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getTypeBadge(t.tournamentType)}
                        {getStatusBadge(t.status)}
                        
                        {/* Lite vs Advanced Badge */}
                        {t.divisions.some(d => isLiteTournament(d)) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            {translate('quickCreateLite')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            {translate('communityTournamentAdvancedLabel')}
                          </span>
                        )}

                        {/* Ranked or Unranked Badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          t.divisions[0]?.isRanked
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {t.divisions[0]?.isRanked ? translate('eloCounted') : translate('eloNotCounted')}
                        </span>

                        {/* Series / Parent Badge */}
                        {t.divisions[0]?.parentId && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {translate('seriesLabel')}
                          </span>
                        )}

                        {/* Sport Category Badge */}
                        {t.divisions[0]?.category?.name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {(() => {
                              const logo = getSportLogo(t.divisions[0].category.name);
                              return logo ? <img src={logo} alt="" className="w-3 h-3 object-contain" /> : null;
                            })()}
                            {t.divisions[0].category.name}
                          </span>
                        )}

                        {t.divisions.some(d => {
                          const cfg = d.tournamentConfig;
                          return Boolean(cfg?.recurring?.enabled || cfg?.recurring?.frequency);
                        }) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <RotateCw className="w-2.5 h-2.5" /> {translate('recurring')}
                          </span>
                        )}

                        {isOwnerOrMod && (
                          <button
                            onClick={(e) => handleDeleteTournament(t.id, !!t.divisions[0].parentId, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 ml-1"
                            title={translate('communityTournamentDeleteTitle')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded text-[9px] font-bold uppercase tracking-wider">
                        {t.divisions.length} {translate('divisionCount', { count: t.divisions.length })}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base line-clamp-1 mt-1">
                      {t.name}
                    </h3>
                  </div>
                </div>



                {/* Division Tags */}
                <div className="flex flex-wrap gap-1 mb-3 mt-2">
                  {t.divisions.map((div) => {
                    const label = getFormatLabel(div.matchType, div.genderRestriction);
                    return (
                      <span 
                        key={div.id} 
                        className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-600 text-[9px] border border-slate-200 font-bold"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>

                {/* Note for Lite Tournaments */}
                {t.divisions.some(d => isLiteTournament(d)) && (
                  <div className="mb-3 text-[11px] text-amber-800 bg-amber-50/90 px-3 py-1.5 rounded-lg border border-amber-200/80 font-medium">
                    <span><strong>{translate('communityTournamentLiteNote')}</strong></span>
                  </div>
                )}

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {t.startDate ? formatDate(t.startDate) : translate('dateNotSet')} - {t.endDate ? formatDate(t.endDate) : translate('dateNotSet')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      {translate('entryFeeLabel')}: {t.entryFee && t.entryFee > 0 ? `${t.entryFee.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} ${translate('currencyVnd')}` : translate('free')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 transition-colors">
                  {translate('viewDetails')} →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <TournamentTypeChoiceModal
        communityId={communityId}
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
      />

      {/* Delete Tournament Confirmation Modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={translate('deleteTournamentTitle')}
        description={translate('deleteTournamentDescription')}
        confirmLabel={translate('deleteTournamentConfirm')}
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            const target = deleteTarget;
            setDeleteTarget(null);
            performDeleteTournament(target.id, target.isGrouped);
          }
        }}
      />
    </div>
  );
}
