'use client';

import { useEffect, useState, use } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Trophy, Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { divisionsApi, Division, tournamentsApi, Tournament } from '@/features/tournaments/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatDate, formatCurrency } from '@/utils/format';
import type { TournamentDisplayLabels } from '@/utils/tournament-display';
import toast from 'react-hot-toast';

type RegisterFormValues = {
  teamName?: string;
  partnerEmailOrPhone?: string;
};

const getDivisionMatchLabel = (matchType?: string | null, genderRestriction?: string | null, labels?: TournamentDisplayLabels) => {
  const genderLabel =
genderRestriction === 'MALE' ? (labels?.maleGender ?? 'Male') :
    genderRestriction === 'FEMALE' ? (labels?.femaleGender ?? 'Female') :
    genderRestriction === 'MIXED' ? (labels?.mixedGender ?? 'Mixed') : '';

  if (matchType === 'SINGLES') {
    return (labels?.singlesFormat ?? 'Singles {gender}').replace('{gender}', genderLabel).replace(/\s+/g, ' ').trim();
  }
  if (matchType === 'DOUBLES') {
    return (labels?.doublesFormat ?? 'Doubles {gender}').replace('{gender}', genderLabel).replace(/\s+/g, ' ').trim();
  }
  if (matchType === 'MIXED_DOUBLES') {
    return labels?.mixedDoublesFormat ?? 'Mixed doubles';
  }
  return labels?.unknownFormat ?? 'Unknown';
};

const getDivisionBracketLabel = (bracketType?: string | null, labels?: TournamentDisplayLabels) => {
  if (bracketType === 'SINGLE_ELIMINATION') {
    return labels?.bracketSingleElimination ?? 'Single elimination';
  }
  if (bracketType === 'DOUBLE_ELIMINATION') {
    return labels?.bracketDoubleElimination ?? 'Double elimination';
  }
  if (bracketType === 'ROUND_ROBIN') {
    return labels?.bracketRoundRobin ?? 'Round robin';
  }
  return labels?.unknownBracket ?? 'Unknown';
};

export default function JoinTournamentPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const resolvedParams = use(params);
  const inviteCode = resolvedParams.inviteCode;
  
  const router = useRouter();
    const translate = useTranslations('Common');
  const inviteTranslate = useTranslations('TournamentInviteJoin');
  const displayTranslate = useTranslations('TournamentDisplay');
  const displayLabels: TournamentDisplayLabels = {
    maleGender: displayTranslate('maleGender'),
    femaleGender: displayTranslate('femaleGender'),
    mixedGender: displayTranslate('mixedGender'),
    singlesFormat: displayTranslate('singlesFormat'),
    doublesFormat: displayTranslate('doublesFormat'),
    mixedDoublesFormat: displayTranslate('mixedDoublesFormat'),
    unknownFormat: displayTranslate('unknownFormat'),
    bracketSingleElimination: displayTranslate('bracketSingleElimination'),
    bracketDoubleElimination: displayTranslate('bracketDoubleElimination'),
    bracketRoundRobin: displayTranslate('bracketRoundRobin'),
    bracketGroupStageKnockout: displayTranslate('bracketGroupStageKnockout'),
  };
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState(searchParams.get('divisionId') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerSchema = z.object({
    teamName: z.string().max(100, inviteTranslate('teamNameTooLong')).optional(),
    partnerEmailOrPhone: z.string().optional(),
  });
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setIsLoading(true);
        const res = await tournamentsApi.getTournamentByInviteCode(inviteCode);
        if (res.data) {
          setTournament(res.data);

          try {
            const divisionRes = await divisionsApi.getDivisions(res.data.id);
            const availableDivisions = divisionRes.data || [];
            setDivisions(availableDivisions);

            if (availableDivisions.length > 0) {
              const preferredDivision = selectedDivisionId
                ? availableDivisions.find((division) => division.id === selectedDivisionId)
                : null;
              const nextDivisionId = preferredDivision?.id ?? availableDivisions[0].id;
              setSelectedDivisionId(nextDivisionId);
            } else {
              setSelectedDivisionId('');
            }
          } catch (divisionErr) {
            console.error('Failed to fetch divisions for invite flow', divisionErr);
            setDivisions([]);
          }
        } else {
          toast.error(translate('invalidInvite'));
          router.push('/tournaments');
        }
      } catch {
        toast.error(translate('invalidInvite'));
        router.push('/tournaments');
      } finally {
        setIsLoading(false);
      }
    };

    if (inviteCode) {
      fetchTournament();
    }
  }, [inviteCode, router]);

  const onSubmit = async (data: RegisterFormValues) => {
    if (!isAuthenticated || !user) {
      toast.error(translate('loginToRegister'));
      const redirectParams = new URLSearchParams();
      if (selectedDivisionId) {
        redirectParams.set('divisionId', selectedDivisionId);
      }
      const redirectUrl = `/tournaments/join/${inviteCode}${redirectParams.toString() ? `?${redirectParams.toString()}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanData = {
        teamName: data.teamName ? trimAndNormalizeSpaces(data.teamName) : '',
        memberIds: [user.id],
        partnerEmailOrPhone: data.partnerEmailOrPhone ? trimAndNormalizeSpaces(data.partnerEmailOrPhone) : undefined,
        tournamentDivisionId: selectedDivisionId || undefined,
      };

      const res = await tournamentsApi.joinTournamentByInviteCode(inviteCode, cleanData);
      const participantId = res?.data?.participantId;

      toast.success(translate('registrationSuccess'));
      
      const entryFee = Number(selectedDivision?.entryFee || tournament?.entryFee || 0);
      if (entryFee > 0 && participantId && tournament) {
        const params = new URLSearchParams({
          participantId,
          tournamentId: tournament.id,
        });
        if (selectedDivisionId) {
          params.set('divisionId', selectedDivisionId);
        }
        router.push(`/payments/checkout?${params.toString()}`);
      } else if (tournament) {
        const params = new URLSearchParams();
        if (selectedDivisionId) {
          params.set('divisionId', selectedDivisionId);
        }
        router.push(`/tournaments/${tournament.id}${params.toString() ? `?${params.toString()}` : ''}`);
      } else {
        router.push('/tournaments');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium text-sm">{translate('loadingTournament')}</p>
      </div>
    );
  }

  if (!tournament) return null;

  const availableDivisions = divisions;
  const selectedDivision = availableDivisions.find((div) => div.id === selectedDivisionId) || null;
  const effectiveDivision = selectedDivision ?? tournament;
  const entryFeeVal = Number(selectedDivision?.entryFee || tournament.entryFee || 0);
  const selectedDivisionLabel = getDivisionMatchLabel(
    effectiveDivision.matchType,
    effectiveDivision.genderRestriction,
    displayLabels,
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <button 
          onClick={() => router.push('/tournaments')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {translate('backToList')}
        </button>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
            <div className="absolute top-4 right-4 bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded-md">
              {translate('invited')}
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-tight text-white">{tournament.name}</h1>
            
            {tournament.description && (
              <p className="text-slate-300 text-xs line-clamp-2 mb-4 leading-relaxed">
                {tournament.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold text-slate-300 border-t border-slate-700/50 pt-4 mt-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{tournament.startDate ? formatDate(tournament.startDate) : translate('notScheduled')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400 text-xs" />
                <span className="truncate">{tournament.locationAddress || translate('notUpdated')}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>
                  {translate('format')}: {tournament.format === 'SINGLE_ELIMINATION' ? displayTranslate('bracketSingleElimination') :
                             tournament.format === 'DOUBLE_ELIMINATION' ? displayTranslate('bracketDoubleElimination') :
                             tournament.format === 'ROUND_ROBIN' ? displayTranslate('bracketRoundRobin') : tournament.format}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> {inviteTranslate('registerTitle')}
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                {inviteTranslate('registerDescription')}
              </p>
            </div>

            {availableDivisions.length > 0 && selectedDivision && (
              <div className="space-y-3 pb-2 border-b border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">{inviteTranslate('eventContent')}</label>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs text-blue-900">
                    {inviteTranslate('registrationFor')} <span className="font-bold">{selectedDivision.name} ({selectedDivisionLabel})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                      {getDivisionBracketLabel(selectedDivision.bracketType, displayLabels)}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                      {inviteTranslate('participantCount', { count: selectedDivision._count?.participants ?? 0 })}
                    </span>
                  </div>
                </div>
                {availableDivisions.length > 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableDivisions.map((div) => {
                      const isActive = selectedDivisionId === div.id;
                      const matchLabel = getDivisionMatchLabel(div.matchType, div.genderRestriction, displayLabels);
                      const bracketLabel = getDivisionBracketLabel(div.bracketType, displayLabels);
                      const participantCount = div._count?.participants ?? 0;

                      return (
                        <button
                          key={div.id}
                          type="button"
                          onClick={() => setSelectedDivisionId(div.id)}
                          disabled={isSubmitting}
                          className={`relative min-h-[104px] flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-lg border text-xs font-bold transition-all w-full cursor-pointer ${
                            isActive
                              ? 'text-white border-transparent shadow-md'
                              : 'bg-white text-slate-650 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeInviteDivision"
                              className="absolute inset-0 bg-blue-600 rounded-lg z-0"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex flex-col items-center gap-0.5">
                            <span className="text-sm font-bold leading-tight">{div.name}</span>
                            <span className={`text-[10px] font-bold ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                              {matchLabel}
                            </span>
                            <span className={`text-[9px] font-bold ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                              {bracketLabel} • {participantCount} hồ sơ tham gia
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {inviteTranslate('selectedContent')}
                      </p>
                      <h3 className="text-base font-bold text-slate-900">{selectedDivision.name}</h3>
                      <p className="text-xs font-semibold text-slate-500">
                        {selectedDivisionLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold">
                        {getDivisionBracketLabel(selectedDivision.bracketType, displayLabels)}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                        {selectedDivision._count?.participants ?? 0}
                        {selectedDivision.maxParticipants ? ` / ${selectedDivision.maxParticipants}` : ''} {inviteTranslate('registrations')}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                        {entryFeeVal > 0 ? formatCurrency(entryFeeVal) : inviteTranslate('free')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {effectiveDivision.matchType === 'SINGLES' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">{inviteTranslate('competitionName')}</p>
                  <p className="text-sm font-bold text-slate-900">{user?.fullName || translate('notUpdated')}</p>
                  <p className="text-xs text-slate-500 mt-1">{inviteTranslate('competitionNameHint')}</p>
                </div>
              ) : (
                <Input
                  label={inviteTranslate('teamName')}
                  placeholder={inviteTranslate('teamNamePlaceholder')}
                  {...register('teamName')}
                  error={errors.teamName?.message}
                />
              )}

              {(effectiveDivision.matchType === 'DOUBLES' || effectiveDivision.matchType === 'MIXED_DOUBLES') && (
                <>
                  <Input
                    label={translate('partnerLabel')}
                    placeholder={translate('partnerInvitePlaceholder')}
                    {...register('partnerEmailOrPhone')}
                    error={errors.partnerEmailOrPhone?.message}
                  />
                  <p className="text-xs text-slate-400 -mt-3">
                    {translate('partnerAccountHint')}
                  </p>
                </>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">{inviteTranslate('entryFee')}</span>
                  <span className="font-bold text-slate-900">
                    {entryFeeVal > 0 ? formatCurrency(entryFeeVal) : inviteTranslate('free')}
                  </span>
                </div>
              </div>

              {!isAuthenticated ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 leading-relaxed">
                  {inviteTranslate('loginRedirectNotice')}
                </div>
              ) : null}

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-md shadow-blue-500/10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {translate('processingRegistration')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {!isAuthenticated ? translate('loginAndRegister') : translate('confirmParticipation')}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
