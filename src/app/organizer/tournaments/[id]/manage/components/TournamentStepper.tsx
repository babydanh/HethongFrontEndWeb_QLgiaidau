import React from 'react';
import { Check, ChevronRight, Users, GitMerge, Play, Trophy, FileText, Loader2, Download } from 'lucide-react';
import { Tournament } from '@/features/tournaments/api';
import { Button } from '@/components/ui/Button';
import {
  Modal, ModalContent, ModalHeader, ModalTitle,
} from '@/components/ui/Modal';
import { isTournamentCompleted,
  isTournamentDraft,
  isTournamentPendingApproval,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentRegistrationClosed,
  isTournamentUpcoming,
} from '@/utils/tournament-status';
import type { Match } from '@/types/match';
import { exportTournamentResultsExcel } from '@/utils/exportTournament';
import { useLocale, useTranslations } from 'next-intl';

interface TournamentStepperProps {
  tournament: Tournament;
  onPublish: () => void;
  onNextStep: (nextStatus: Tournament['status']) => void;
  onPayPlatformFee?: () => void;
  publishFeeAmount?: number;
  isLoading?: boolean;
  onOpenTournament?: () => void;
  isOpening?: boolean;
  // Phase 3 end modal
  isEndModalOpen?: boolean;
  setIsEndModalOpen?: (open: boolean) => void;
  handleConfirmEnd?: () => void;
  isEnding?: boolean;
  endChecklist?: {
    totalMatches: number;
    completedMatches: number;
    liveMatches: number;
    hasLiveMatches: boolean;
    allCompleted: boolean;
  } | null;
  participants?: { isPaid: boolean; teamStatus?: string }[];
    divisions?: { id: string; roundConfig?: unknown }[];
    matches?: Match[];
  }

export function TournamentStepper({ tournament, onPublish, onNextStep, onPayPlatformFee, publishFeeAmount = 0, isLoading,
  onOpenTournament, isOpening = false,
  isEndModalOpen, setIsEndModalOpen, handleConfirmEnd, isEnding = false, endChecklist = null,
  participants = [], divisions = [], matches = [],
  }: TournamentStepperProps) {
  const translate = useTranslations('OrganizerTournamentStepper');
  const locale = useLocale();
  const getStepIndex = () => {
    if (isTournamentDraft(tournament.status)) return -1;
    if (isTournamentUpcoming(tournament.status) || isTournamentRegistrationClosed(tournament.status)) return 1;
    if (isTournamentOpenForRegistration(tournament.status)) return 0;
    if (isTournamentInProgress(tournament.status)) return 2;
    if (isTournamentCompleted(tournament.status)) return 3;
    return -1;
  };

  const currentStep = getStepIndex();
  const isRegistrationClosed = isTournamentRegistrationClosed(tournament.status);

  // Publish validation checks
  const publishChecks = {
    hasDescription: tournament.description != null && tournament.description.trim() !== '',
    hasDivisions: tournament.divisions && tournament.divisions.length > 0,
    hasVenue: (tournament.venueId != null) || (tournament.locationAddress && tournament.locationAddress.trim() !== ''),
    hasValidDates: tournament.registrationStartDate && tournament.registrationEndDate && tournament.startDate && 
      (new Date(tournament.registrationStartDate) < new Date(tournament.registrationEndDate)) &&
      (new Date(tournament.registrationEndDate) < new Date(tournament.startDate)),
    hasContact: tournament.contactInfo && typeof tournament.contactInfo === 'object' && 
      ((tournament.contactInfo as Record<string, string>).email || (tournament.contactInfo as Record<string, string>).phone),
  };
  const canPublish = publishChecks.hasDescription && publishChecks.hasDivisions && publishChecks.hasVenue && publishChecks.hasValidDates && publishChecks.hasContact;

  // Phase 2 — Khai mạc giải đấu (inline checklist)
  const phase2Divs = divisions.length > 0 ? divisions : ((tournament.divisions ?? []) as { id: string; roundConfig?: unknown }[]);
  const phase2PaidCheck = !tournament.entryFee || Number(tournament.entryFee) <= 0 || (participants.length > 0 && participants.every((p) => p.teamStatus === 'COMPLETE' ? (p as { isPaid: boolean }).isPaid !== false : true));
  const phase2BracketCheck = phase2Divs.length > 0 && phase2Divs.some((d) => d.roundConfig && typeof d.roundConfig === 'object' && Object.keys(d.roundConfig as object).length > 0);
  const phase2RegLocked = tournament.isRegistrationLocked === true || isTournamentRegistrationClosed(tournament.status) || isTournamentUpcoming(tournament.status);
  const phase2HasVenue = !!(tournament.venueId || tournament.venue || (tournament.locationAddress && tournament.locationAddress.trim()));
  const phase2HasSchedule = !!(tournament.startDate);
  const phase2HasMinTeams = participants.length >= 2;
  const phase2MandatoryPass = phase2RegLocked && phase2PaidCheck && phase2BracketCheck && phase2HasMinTeams;

  const phase2Checks = [
    { key: 'regLocked', label: translate('checks.registrationLocked'), mandatory: true, pass: phase2RegLocked },
    { key: 'paid', label: translate('checks.paid'), mandatory: true, pass: phase2PaidCheck },
    { key: 'bracket', label: translate('checks.bracket'), mandatory: true, pass: phase2BracketCheck },
    { key: 'minTeams', label: translate('checks.minimumTeams'), mandatory: true, pass: phase2HasMinTeams },
    { key: 'schedule', label: translate('checks.schedule'), mandatory: false, pass: phase2HasSchedule },
    { key: 'venue', label: translate('checks.venue'), mandatory: false, pass: phase2HasVenue },
  ];

  const steps = [
    {
      title: translate('steps.registration.title'),
      icon: <Users className="w-4 h-4" />,
      description: translate('steps.registration.description'),
      actionText: translate('steps.registration.action'),
      onClick: () => onNextStep('UPCOMING'),
      canProgress: currentStep === 0,
    },
    {
      title: translate('steps.schedule.title'),
      icon: <GitMerge className="w-4 h-4" />,
      description: translate('steps.schedule.description'),
      actionText: translate('steps.schedule.action'),
      onClick: () => onOpenTournament?.(),
      canProgress: currentStep === 1,
    },
    {
      title: translate('steps.inProgress.title'),
      icon: <Play className="w-4 h-4" />,
      description: translate('steps.inProgress.description'),
      actionText: translate('steps.inProgress.action'),
      onClick: () => onNextStep('COMPLETED'),
      canProgress: currentStep === 2,
    },
    {
      title: translate('steps.completed.title'),
      icon: <Trophy className="w-4 h-4" />,
      description: translate('steps.completed.description'),
      actionText: null,
      onClick: () => {},
      canProgress: false,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" /> {translate('progressTitle')}
      </h3>
      
      {isTournamentDraft(tournament.status) && (
        <div className="flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-lg border border-dashed border-slate-300 mb-6">
          <h4 className="font-bold text-slate-700 mb-2">{translate('draftTitle')}</h4>
          <p className="text-sm text-slate-500 mb-3 max-w-md text-center">
            {translate('draftDescription')}
          </p>
          {publishFeeAmount > 0 && (
            <p className="text-xs text-blue-700 font-semibold mb-3 text-center">
              {translate('publishFeeNotice', { amount: publishFeeAmount.toLocaleString(locale) })}
            </p>
          )}
          <div className="bg-slate-50 text-slate-700 text-[13px] px-4 py-3 rounded-lg mb-5 max-w-lg border border-slate-200">
            <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {translate('importantBeforePublish')}
            </span>
            <p className="mb-2 font-medium">{translate('publishChecklistDescription')}</p>
            {(() => {
                // Tự động kiểm tra tiến trình đã điền thông tin của giải đấu theo luật backend mới
                const hasDescription = tournament.description != null && tournament.description.trim() !== '';
                const hasDivisions = tournament.divisions && tournament.divisions.length > 0;
                const hasVenue = (tournament.venueId != null) || (tournament.locationAddress && tournament.locationAddress.trim() !== '');
              
                // Validate ngày hợp lệ
                const hasValidDates = tournament.registrationStartDate && 
                                      tournament.registrationEndDate && 
                                      tournament.startDate && 
                                      (new Date(tournament.registrationStartDate) < new Date(tournament.registrationEndDate)) &&
                                      (new Date(tournament.registrationEndDate) < new Date(tournament.startDate));

                const hasContact = tournament.contactInfo && 
                                   (typeof tournament.contactInfo === 'object') && 
                                   ((tournament.contactInfo as Record<string, string>).email || (tournament.contactInfo as Record<string, string>).phone);

                const canPublish = hasDescription && hasDivisions && hasVenue && hasValidDates && hasContact;

                return (
                <div className="space-y-3 mt-3">
                  {/* Mô tả giải đấu */}
                  <div className="flex items-center justify-between text-xs font-bold bg-white/40 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        hasDescription ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10' : 'border-rose-300 bg-rose-50 text-rose-600'
                      }`}>
                        {hasDescription ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="font-bold text-[10px]">✕</span>}
                      </span>
                      <span className={hasDescription ? 'text-slate-400 line-through' : 'text-slate-700'}>
                        {translate('checklist.basicInfo')}
                      </span>
                    </div>
                    {!hasDescription && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-150 shrink-0">
                        {translate('checklist.notFilled')}
                      </span>
                    )}
                  </div>

                  {/* Bảng thi đấu */}
                  <div className="flex items-center justify-between text-xs font-bold bg-white/40 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        hasDivisions ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10' : 'border-rose-300 bg-rose-50 text-rose-600'
                      }`}>
                        {hasDivisions ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="font-bold text-[10px]">✕</span>}
                      </span>
                      <span className={hasDivisions ? 'text-slate-400 line-through' : 'text-slate-700'}>
                        {translate('checklist.division')}
                      </span>
                    </div>
                    {!hasDivisions && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-150 shrink-0">
                        {translate('checklist.missingDivision')}
                      </span>
                    )}
                  </div>

                  {/* Địa điểm */}
                  <div className="flex items-center justify-between text-xs font-bold bg-white/40 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        hasVenue ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10' : 'border-rose-300 bg-rose-50 text-rose-600'
                      }`}>
                        {hasVenue ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="font-bold text-[10px]">✕</span>}
                      </span>
                      <span className={hasVenue ? 'text-slate-400 line-through' : 'text-slate-700'}>
                        {translate('checklist.venue')}
                      </span>
                    </div>
                    {!hasVenue && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-150 shrink-0">
                        {translate('checklist.notFilled')}
                      </span>
                    )}
                  </div>

                  {/* Khung thời gian */}
                  <div className="flex items-center justify-between text-xs font-bold bg-white/40 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        hasValidDates ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10' : 'border-rose-300 bg-rose-50 text-rose-600'
                      }`}>
                        {hasValidDates ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="font-bold text-[10px]">✕</span>}
                      </span>
                      <span className={hasValidDates ? 'text-slate-400 line-through' : 'text-slate-700'}>
                        {translate('checklist.validDates')}
                      </span>
                    </div>
                    {!hasValidDates && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-150 shrink-0">
                        {translate('checklist.invalidDates')}
                      </span>
                    )}
                  </div>

                  {/* Thông tin liên hệ */}
                  <div className="flex items-center justify-between text-xs font-bold bg-white/40 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        hasContact ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10' : 'border-rose-300 bg-rose-50 text-rose-600'
                      }`}>
                        {hasContact ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="font-bold text-[10px]">✕</span>}
                      </span>
                      <span className={hasContact ? 'text-slate-400 line-through' : 'text-slate-700'}>
                        {translate('checklist.contact')}
                      </span>
                    </div>
                    {!hasContact && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-150 shrink-0">
                        {translate('checklist.notFilled')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {/* Ràng buộc & Khóa thông tin sau khi công bố */}
            <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-1.5 text-[11px] text-amber-900 font-semibold">
              <span className="block text-xs font-bold text-amber-950 uppercase tracking-wider">{translate('publishedConstraints.title')}</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-650 font-medium">
                <li><strong className="text-amber-900">{translate('publishedConstraints.immutableLabel')}</strong> {translate('publishedConstraints.immutableText')}</li>
                <li><strong className="text-amber-900">{translate('publishedConstraints.lockedLabel')}</strong> {translate('publishedConstraints.lockedText')}</li>
                <li><strong className="text-emerald-800">{translate('publishedConstraints.flexibleLabel')}</strong> {translate('publishedConstraints.flexibleText')}</li>
              </ul>
            </div>
            <p className="mt-3 text-[10px] italic text-amber-700 font-semibold">{translate('publishedConstraints.dateNote')}</p>
          </div>
          <Button
            onClick={onPublish}
            disabled={isLoading || !canPublish}
            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg shadow-md shadow-blue-500/20 transition-all ${
              !canPublish ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {publishFeeAmount > 0 ? translate('payAndPublish') : translate('publish')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {isTournamentPendingApproval(tournament.status) && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <span className="mt-0.5 text-lg text-amber-600" aria-hidden="true">⏳</span>
          <div>
            <h4 className="font-bold text-amber-900">{translate('pendingApprovalTitle')}</h4>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">{translate('pendingApprovalDescription')}</p>
          </div>
        </div>
      )}

      <div className={`relative flex flex-col md:flex-row justify-between ${isTournamentDraft(tournament.status) || isTournamentPendingApproval(tournament.status) ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Progress bar background line for desktop */}
        <div className="hidden md:block absolute top-6 left-8 right-8 h-1 bg-slate-100 rounded -z-10" />
        {/* Active progress line */}
        <div 
          className="hidden md:block absolute top-6 left-8 h-1 bg-blue-600 rounded -z-10 transition-all duration-500"
          style={{ width: `${Math.max(0, (currentStep / (steps.length - 1)) * 100)}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div key={idx} className="flex flex-col items-center flex-1 relative mb-6 md:mb-0">
              {/* Step Icon Circle */}
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm mb-3 transition-colors ${
                  isCompleted ? 'bg-emerald-500 text-white' : 
                  isActive ? 'bg-blue-600 text-white ring-4 ring-blue-50' : 
                  'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-6 h-6 font-bold" /> : step.icon}
              </div>
              
              {/* Step Info */}
              <div className="text-center">
                <div className={`font-bold text-sm ${isActive ? 'text-blue-700' : isCompleted ? 'text-slate-800' : 'text-slate-500'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 max-w-[140px] leading-tight mx-auto">
                  {step.description}
                </div>
              </div>

              {/* Action Button for Active Step */}
              {isActive && step.actionText && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={step.onClick}
                    disabled={isLoading || isOpening || (idx === 1 && !phase2MandatoryPass)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 h-8 px-4 rounded-full shadow-md shadow-blue-500/20"
                  >
                    {step.actionText} <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

            {/* Step 4 — Completed tournament: show only the export action */}
            {isTournamentCompleted(tournament.status) && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                <div>
                  <p className="text-sm font-bold text-emerald-900">{translate('completedTitle')}</p>
                  <p className="mt-0.5 text-xs font-medium text-emerald-700">
                    {translate('completedDescription')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => exportTournamentResultsExcel(tournament.name, matches)}
                  disabled={matches.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 h-8 px-4 rounded-full shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  {matches.length === 0 ? translate('noMatches') : translate('exportResults', { count: matches.length })}
                </Button>
              </div>
            )}

            {/* Phase 2 — Tournament opening (inline checklist) */}
      {currentStep === 1 && !isTournamentDraft(tournament.status) && isRegistrationClosed && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 mt-4 mb-2 text-xs">
          <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-600" /> {translate('openingChecklistTitle')}
          </h4>
          <div className="space-y-2.5">
            {phase2Checks.map((check) => (
              <div key={check.key} className={`flex items-center justify-between text-xs font-bold bg-white/60 p-2.5 rounded-lg border transition-all ${
                check.pass ? 'border-emerald-100' : 'border-rose-100'
              }`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                    check.pass
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                      : check.mandatory
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-slate-300 bg-slate-50 text-slate-400'
                  }`}>
                    {check.pass
                      ? <Check className="w-3.5 h-3.5 stroke-[3]" />
                      : <span className="font-bold text-[10px]">✕</span>
                    }
                  </span>
                  <span className={`truncate ${check.pass ? 'text-slate-400 line-through' : check.mandatory ? 'text-slate-700' : 'text-slate-500'}`}>
                    {check.mandatory
                      ? <>                        <span className="text-rose-600 mr-1">[{translate('mandatory')}]</span>{check.label}</>
                      : <>                        <span className="text-slate-400 mr-1">[{translate('flexible')}]</span>{check.label}</>
                    }
                  </span>
                </div>
                {!check.pass && check.mandatory && (
                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-150 shrink-0 ml-2">
                    {translate('notPassed')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 3 — Tournament completion checklist modal */}
      {isEndModalOpen && (
        <Modal open={isEndModalOpen} onOpenChange={(open) => { if (!open) setIsEndModalOpen?.(false); }}>
          <ModalContent className="bg-white rounded-lg p-6 max-w-xl">
            <ModalHeader><ModalTitle className="text-xl font-bold text-slate-900">{translate('endModalTitle')}</ModalTitle></ModalHeader>
            <div className="space-y-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-semibold">
                {translate('endWarning')}
              </div>
              {(() => {
                const hasMatches = endChecklist && endChecklist.totalMatches > 0;
                const allDone = endChecklist?.allCompleted ?? true;
                const total = endChecklist?.totalMatches ?? 0;
                const completed = endChecklist?.completedMatches ?? 0;
                const live = endChecklist?.liveMatches ?? 0;

                const checks = [
                  { key: 'matchesComplete', label: translate('endChecks.matchesComplete', { completed, total }), pass: !hasMatches || allDone },
                  { key: 'noLiveMatches', label: translate('endChecks.noLiveMatches', { live }), pass: !hasMatches || !endChecklist?.hasLiveMatches },
                ];

                return (
                  <div className="space-y-3">
                    {checks.map((check) => (
                      <div key={check.key} className={`flex items-center justify-between text-xs font-bold bg-white/40 p-2.5 rounded-lg border transition-all ${
                        check.pass ? 'border-emerald-100' : 'border-rose-100'
                      }`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                            check.pass
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                              : 'border-rose-300 bg-rose-50 text-rose-600'
                          }`}>
                            {check.pass
                              ? <Check className="w-3.5 h-3.5 stroke-[3]" />
                              : <span className="font-bold text-[10px]">✕</span>
                            }
                          </span>
                          <span className={`truncate ${check.pass ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {check.label}
                          </span>
                        </div>
                        {!check.pass && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-150 shrink-0 ml-2">
                            {translate('notPassed')}
                          </span>
                        )}
                      </div>
                    ))}
                    {!hasMatches && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 font-semibold text-center">
                        {translate('noMatchesCanEnd')}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsEndModalOpen?.(false)} disabled={isEnding}>
                  {translate('cancel')}
                </Button>
                <Button onClick={handleConfirmEnd} disabled={isEnding || !!endChecklist?.hasLiveMatches} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg">
                  {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} {translate('endTournament')}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
