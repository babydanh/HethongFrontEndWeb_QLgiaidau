'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useCreateTournamentStore, resolveMatchFormat } from '@/lib/zustand/createTournamentStore';
import { ChevronLeft, CheckCircle, Info, Loader2 } from 'lucide-react';
import { divisionsApi, tournamentsApi } from '@/features/tournaments/api';
import type { CreateDivisionInput } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';
import { GenderRestriction } from '@/types/tournament';

export default function Step2Confirm() {
  const translate = useTranslations('OrganizerCreateStep2');
  const { formData, prevStep, reset } = useCreateTournamentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const divisionLabel = (() => {
    switch (formData.matchFormat) {
      case 'MALE_SINGLES': return translate('divisionMaleSingles');
      case 'FEMALE_SINGLES': return translate('divisionFemaleSingles');
      case 'MALE_DOUBLES': return translate('divisionMaleDoubles');
      case 'FEMALE_DOUBLES': return translate('divisionFemaleDoubles');
      case 'MIXED_DOUBLES': return translate('divisionMixedDoubles');
    }
  })();
  const router = useRouter();

  const handleCreateDraft = async () => {
    try {
      setIsSubmitting(true);
      
      const rest = formData;

      if (!rest.categoryId) {
        throw new Error(translate('sportRequired'));
      }
      if (!rest.sportRules || typeof rest.sportRules !== 'object' || !('kind' in rest.sportRules)) {
        throw new Error(translate('sportRulesMissing'));
      }

      // 1. Resolve backend matchType + genderRestriction + divisionName from the UI matchFormat
      const { matchType, genderRestriction, divisionName } = resolveMatchFormat(rest.matchFormat || 'MALE_DOUBLES');

      // 2. Tạo một giải đấu; hình thức thi đấu lưu riêng ở tournament_divisions.
      const finalData: Record<string, unknown> = {
        name: rest.name,
        categoryId: rest.categoryId,
        description: rest.description || '',
        tournamentType: rest.tournamentType || 'PUBLIC',
        visibility: rest.visibility || 'PUBLIC',
        matchType,
        genderRestriction,
        isRanked: rest.isRanked,
        maxParticipants: rest.maxParticipants || 16,
        entryFee: 0,
        sportRules: rest.sportRules,
        tournamentConfig: {
          bracketType: 'SINGLE_ELIMINATION',
          maxTeams: rest.maxParticipants || 16,
          minElo: rest.minElo,
          maxElo: rest.maxElo,
          maxCombinedElo: rest.maxCombinedElo,
          maxTeammateGap: rest.maxTeammateGap,
          registrationMode: rest.registrationMode || 'OPEN',
        },
      };

      if (rest.communityId) {
        finalData.communityId = rest.communityId;
      }

      // Call API to create draft
      const res = await tournamentsApi.createTournament(finalData);
      const tournamentId = res?.data?.id;
      if (!tournamentId) {
        throw new Error(translate('createFailed'));
      }

      const divisionInput: CreateDivisionInput = {
        name: divisionName,
        matchType,
        genderRestriction: genderRestriction as GenderRestriction,
        maxParticipants: rest.maxParticipants,
        entryFee: 0,
      };
      await divisionsApi.createDivision(tournamentId, divisionInput);
      
      toast.success(translate('draftCreated'));
      reset(); // Clear persist storage
      
      router.push(`/organizer/tournaments/${tournamentId}/manage`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{translate('confirmTitle')}</h2>
        <p className="text-sm text-slate-500">{translate('confirmSubtitle')}</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h4 className="font-bold text-slate-900">{translate('draftDetailsTitle')}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('tournamentName')}</span>
            <span className="font-semibold text-slate-900">{formData.name}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('competitionContent')}</span>
            <span className="font-semibold text-slate-900">{divisionLabel}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('participantAudience')}</span>
            <span className="font-semibold text-slate-900">
              {formData.tournamentType === 'CLUB' ? translate('clubOnly') : translate('openAudience')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('achievementMethod')}</span>
            <span className="font-semibold text-slate-950">
              {formData.isRanked ? translate('rankedSystem') : translate('casualTournament')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">{translate('maxTeams')}</span>
            <span className="font-semibold text-slate-900">
              {formData.maxParticipants || 16} {translate('teamsUnit')}
            </span>
          </div>

          {formData.isRanked && (formData.minElo !== null || formData.maxElo !== null) && (
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 font-medium">{translate('personalEloLimit')}</span>
              <span className="font-semibold text-slate-900">
                {formData.minElo !== null ? `${formData.minElo}` : '0'} - {formData.maxElo !== null ? `${formData.maxElo}` : translate('noLimit')}
              </span>
            </div>
          )}

          {formData.isRanked && (formData.matchFormat === 'MALE_DOUBLES' || formData.matchFormat === 'FEMALE_DOUBLES' || formData.matchFormat === 'MIXED_DOUBLES') && (formData.maxCombinedElo !== null || formData.maxTeammateGap !== null) && (
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 font-medium">{translate('teammateEloLimit')}</span>
              <span className="font-semibold text-slate-900">
                {formData.maxCombinedElo !== null ? translate('combinedElo', { value: formData.maxCombinedElo }) : ''}
                {formData.maxCombinedElo !== null && formData.maxTeammateGap !== null ? ' | ' : ''}
                {formData.maxTeammateGap !== null ? translate('teammateGap', { value: formData.maxTeammateGap }) : ''}
              </span>
            </div>
          )}

          {formData.description && (
            <div className="flex flex-col gap-1 md:col-span-2">
              <span className="text-slate-400 font-medium">{translate('shortDescription')}</span>
              <span className="text-slate-700">{formData.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 text-blue-700 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed font-medium">
          <p className="font-bold mb-1">{translate('draftProcessTitle')}</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>{translate('draftProcessStatus')}</li>
            <li>{translate('draftProcessVisibility')}</li>
            <li>{translate('draftProcessCustomization')}</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
        <Button 
          type="button" 
          variant="outline" 
          onClick={prevStep} 
          disabled={isSubmitting} 
          className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> {translate('back')}
        </Button>
        <Button 
          type="button" 
          onClick={handleCreateDraft} 
          disabled={isSubmitting} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> {translate('creating')}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1.5" /> {translate('confirmCreateDraft')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

