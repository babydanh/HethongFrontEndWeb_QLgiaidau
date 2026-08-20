'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronLeft, CheckCircle, Info, Loader2 } from 'lucide-react';
import { tournamentsApi, divisionsApi } from '@/features/tournaments/api';
import type { CreateDivisionInput } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { GenderRestriction } from '@/types/tournament';
import type { TournamentFeesConfig } from '@/features/tournaments/api';
import { api } from '@/lib/axios';
import { inboxApi } from '@/features/chat/inbox-api';
import { toApiIsoDateTime } from '@/utils/dateTimeInput';

export default function Step4ReviewSubmit() {
  const translate = useTranslations('OrganizerCreateStep4');
  const { formData, getDivisionsFromFormats, prevStep, reset, setStep, setValidationTarget } = useCreateTournamentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feesConfig, setFeesConfig] = useState<TournamentFeesConfig>({
    feePublicRanked: 100000,
    feePublicUnranked: 50000,
    feeClub: 0,
    pctPublicRanked: 5,
    pctPublicUnranked: 5,
    pctClub: 0,
    allowEntryFees: true,
  });
  const submittingRef = useRef(false);
  const router = useRouter();

  const divisions = getDivisionsFromFormats();
  const primaryDivision = divisions[0];
  const publishFee = formData.tournamentType === 'CLUB'
    ? feesConfig.feeClub
    : formData.isRanked
      ? feesConfig.feePublicRanked
      : feesConfig.feePublicUnranked;

  useEffect(() => {
    const loadFees = async () => {
      try {
        const res = await tournamentsApi.getFeesConfig();
        if (res.data) setFeesConfig(res.data);
      } catch {
        // Keep default fee config when the public config endpoint is unavailable.
      }
    };
    void loadFees();
  }, []);

  const validateTournamentDraft = () => {
    const invalid = (step: number, field: string, message: string): never => {
      setStep(step);
      setValidationTarget({ step, field, message });
      throw new Error(message);
    };
    if (!formData.name.trim()) invalid(1, 'name', translate('validationName'));
    if (formData.description.trim().length < 10) invalid(1, 'description', translate('validationDescription'));
    if (!formData.categoryId) invalid(1, 'categoryId', translate('validationCategory'));
    if (!formData.sportRules || typeof formData.sportRules !== 'object' || !('kind' in formData.sportRules)) {
      invalid(1, 'categoryId', translate('validationSportRules'));
    }
    if (!primaryDivision || divisions.length === 0) invalid(2, 'selectedFormats', translate('validationDivision'));
    if (!formData.registrationStartDate) invalid(3, 'registrationStartDate', translate('validationRegistrationStart'));
    if (!formData.registrationEndDate) invalid(3, 'registrationEndDate', translate('validationRegistrationEnd'));
    if (!formData.startDate) invalid(3, 'startDate', translate('validationCompetitionStart'));
    if (!formData.endDate) invalid(3, 'endDate', translate('validationCompetitionEnd'));
    const registrationStart = new Date(formData.registrationStartDate);
    const registrationEnd = new Date(formData.registrationEndDate);
    const tournamentStart = new Date(formData.startDate);
    const tournamentEnd = new Date(formData.endDate);
    if (registrationStart >= registrationEnd) invalid(3, 'registrationEndDate', translate('validationRegistrationOrder'));
    if (registrationEnd > tournamentStart) invalid(3, 'registrationEndDate', translate('validationRegistrationBeforeCompetition'));
    if (tournamentStart >= tournamentEnd) invalid(3, 'endDate', translate('validationCompetitionOrder'));
    if ((formData.maxParticipants ?? 0) < 2) invalid(1, 'maxParticipants', translate('validationMaxParticipants'));
    if ((formData.entryFee ?? 0) < 0) invalid(3, 'entryFee', translate('validationFee'));
    if (!formData.name.trim()) throw new Error(translate('missingName'));
    if (!formData.categoryId) throw new Error(translate('missingCategory'));
    if (!formData.sportRules || typeof formData.sportRules !== 'object' || !('kind' in formData.sportRules)) {
      throw new Error(translate('missingSportRules'));
    }
    if (!primaryDivision || divisions.length === 0) throw new Error(translate('missingDivision'));

    if (formData.registrationStartDate && formData.registrationEndDate) {
      const registrationStart = new Date(formData.registrationStartDate);
      const registrationEnd = new Date(formData.registrationEndDate);
      if (registrationStart >= registrationEnd) {
        throw new Error(translate('validationRegistrationOrder'));
      }
      if (formData.startDate) {
        const tournamentStart = new Date(formData.startDate);
        if (registrationEnd > tournamentStart) {
          throw new Error(translate('validationRegistrationBeforeCompetition'));
        }
      }
    }

    if (formData.startDate && formData.endDate) {
      const tournamentStart = new Date(formData.startDate);
      const tournamentEnd = new Date(formData.endDate);
      if (tournamentStart >= tournamentEnd) {
        throw new Error(translate('validationCompetitionOrder'));
      }
    }

    if ((formData.maxParticipants ?? 0) < 2) {
      throw new Error(translate('validationMaxParticipants'));
    }
    if ((formData.entryFee ?? 0) < 0) {
      throw new Error(translate('validationFee'));
    }
  };

  const handleCreateTournament = async () => {
    if (submittingRef.current) return;
    let createdTournamentId: string | null = null;
    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      validateTournamentDraft();

      if (!primaryDivision) {
        throw new Error(translate('validationDivision'));
      }

      // 1. Create one tournament. Match formats are stored as tournament_divisions.
      // The standard wizard is the mandatory/advanced path; persist that mode
      // explicitly so later Manage/Ops screens never have to infer it from a
      // missing tournamentConfig field.
      const standardRoundConfig = {
        ...formData.sportRules,
        mode: 'STRICT' as const,
      };
      const isClubTournament = formData.tournamentType === 'CLUB' || Boolean(formData.communityId);

      const effectiveEntryFee = isClubTournament || !feesConfig.allowEntryFees
        ? 0
        : formData.entryFee || 0;
      const finalTournamentData: Record<string, unknown> = {
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description || '',
        tournamentType: formData.tournamentType || 'PUBLIC',
        visibility: formData.visibility || 'PUBLIC',
        matchType: primaryDivision.matchType,
        genderRestriction: primaryDivision.genderRestriction,
        isRanked: formData.isRanked,
        maxParticipants: formData.maxParticipants || 16,
        entryFee: effectiveEntryFee,
        startDate: toApiIsoDateTime(formData.startDate),
        endDate: toApiIsoDateTime(formData.endDate),
        registrationStartDate: toApiIsoDateTime(formData.registrationStartDate),
        registrationEndDate: toApiIsoDateTime(formData.registrationEndDate),
        sportRules: formData.sportRules,
        tournamentConfig: {
          bracketType: formData.format as string,
          maxTeams: formData.maxParticipants || 16,
          minElo: formData.minElo,
          maxElo: formData.maxElo,
          maxCombinedElo: formData.maxCombinedElo,
          maxTeammateGap: formData.maxTeammateGap,
          registrationMode: formData.registrationMode || 'OPEN',
          registrationScope: isClubTournament ? 'CLUB_MEMBERS_ONLY' : 'PUBLIC_OPEN',
          mode: 'STRICT',

          // Team sport (bóng đá): sân 5/7/11 + thể thức nâng cao
          ...(formData.teamSize != null ? { teamSize: formData.teamSize } : {}),
          ...(formData.teamSizeOptions ? { teamSizeOptions: formData.teamSizeOptions } : {}),
          ...(formData.minTeamSize != null ? { minTeamSize: formData.minTeamSize } : {}),
          ...(formData.maxTeamSize != null ? { maxTeamSize: formData.maxTeamSize } : {}),
          ...(formData.maxReserve != null ? { maxReserve: formData.maxReserve } : {}),
          ...(formData.twoLegged != null ? { twoLegged: formData.twoLegged } : {}),
          ...(formData.awayGoalsRule != null ? { awayGoalsRule: formData.awayGoalsRule } : {}),
          ...(formData.penaltyShootout != null ? { penaltyShootout: formData.penaltyShootout } : {}),
          ...(formData.allowDraw != null ? { allowDraw: formData.allowDraw } : {}),
        },
      };

      if (formData.communityId) {
        finalTournamentData.communityId = formData.communityId;
      }

      const tournamentRes = await tournamentsApi.createTournament(finalTournamentData);
      const tournamentId = tournamentRes.data?.id;
      if (!tournamentId) {
        throw new Error(translate('createFailed'));
      }
      createdTournamentId = tournamentId;

      // 2. Create divisions for each selected format under the tournament.
      // Same format may intentionally appear more than once. The division name
      // and its ELO/settings distinguish variants such as Low ELO / High ELO.
      const divisionPromises = divisions.map((div) => {
        const divisionInput: CreateDivisionInput = {
          name: div.name,
          matchType: div.matchType,
          genderRestriction: div.genderRestriction as GenderRestriction,
          maxParticipants: formData.maxParticipants,
          entryFee: effectiveEntryFee,
          bracketType: formData.format as
            | 'SINGLE_ELIMINATION'
            | 'DOUBLE_ELIMINATION'
            | 'ROUND_ROBIN'
            | 'GROUP_STAGE_KNOCKOUT',
          roundConfig: standardRoundConfig,
        };
        return divisionsApi.createDivision(tournamentId, divisionInput);
      });

      await Promise.all(divisionPromises);

      // Auto-share tournament card into Club Chat if created for a community
      if (formData.communityId) {
        try {
          const clubRoomRes: any = await api.get(`/chat/rooms?type=CLUB&communityId=${formData.communityId}`);
          const clubRoom = clubRoomRes.data?.data || clubRoomRes.data;
          if (clubRoom?.id) {
            await inboxApi.sendMessage(
              clubRoom.id,
              translate('autoShareTitle', { name: formData.name }),
              [],
              undefined,
              'TOURNAMENT_SHARE',
              {
                tournamentId,
                title: formData.name,
                sportType: primaryDivision?.name || translate('sportFallback'),
                totalTeams: formData.maxParticipants || 16,
                registeredTeams: 0,
                startDate: formData.startDate,
              },
            );
          }
        } catch {
          // Non-blocking fallback
        }
      }

      toast.success(translate('createdSuccess', { count: divisions.length }));
      reset();

      router.push(`/organizer/tournaments/${tournamentId}/manage`);
    } catch (error) {
      submittingRef.current = false;
      if (createdTournamentId) {
        try {
          await tournamentsApi.deleteTournament(createdTournamentId);
        } catch {
          // Keep the original creation error visible; cleanup is best effort.
        }
      }
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{translate('title')}</h2>
        <p className="text-sm text-slate-500">{translate('subtitle')}</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('tournamentName')}</span>
            <span className="font-semibold text-slate-900">{formData.name}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('divisionCount')}</span>
            <span className="font-semibold text-slate-900">{divisions.length}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('participants')}</span>
            <span className="font-semibold text-slate-900">
              {formData.tournamentType === 'CLUB' ? translate('clubInternal') : translate('open')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('achievementMethod')}</span>
            <span className="font-semibold text-slate-900">
              {formData.isRanked ? translate('ranked') : translate('recreational')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('registrationMode')}</span>
            <span className="font-semibold text-slate-900">
              {formData.registrationMode === 'OPEN'
                ? translate('openRegistration')
                : formData.registrationMode === 'APPROVAL'
                  ? translate('approvalRequired')
                  : translate('inviteOnly')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('visibility')}</span>
            <span className="font-semibold text-slate-900">
              {formData.visibility === 'PRIVATE' ? translate('unlisted') : translate('public')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('entryFeePerPerson')}</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(feesConfig.allowEntryFees ? formData.entryFee || 0 : 0)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('publicationFee')}</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(publishFee)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('registrationOpens')}</span>
            <span className="font-semibold text-slate-900">
              {formData.registrationStartDate ? formatDateTime(formData.registrationStartDate) : translate('notSet')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('registrationEnds')}</span>
            <span className="font-semibold text-slate-900">
              {formData.registrationEndDate ? formatDateTime(formData.registrationEndDate) : translate('notSet')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('competitionStarts')}</span>
            <span className="font-semibold text-slate-900">
              {formData.startDate ? formatDateTime(formData.startDate) : translate('notSet')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('competitionEnds')}</span>
            <span className="font-semibold text-slate-900">
              {formData.endDate ? formatDateTime(formData.endDate) : translate('notSet')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('maxTeams')}</span>
            <span className="font-semibold text-slate-900">
              {formData.maxParticipants ?? translate('notSet')}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="font-bold text-slate-900 mb-3">{translate('divisions')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {divisions.map((div, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-white">
              <p className="font-semibold text-slate-900">{div.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {div.matchType} • {div.genderRestriction}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 text-blue-700 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-xs font-medium leading-relaxed">
          <strong>{translate('note')}:</strong> {translate('draftNote')}
        </p>
      </div>

      <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isSubmitting}
          className="border-slate-200 text-slate-600"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> {translate('back')}
        </Button>
        <Button
          type="button"
          onClick={handleCreateTournament}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> {translate('creating')}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1.5" /> {translate('createTournament')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

