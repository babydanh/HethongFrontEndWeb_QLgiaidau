'use client';

import { Shield, TimerReset } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import { LiveMatchControlPanel } from './LiveMatchControlPanel';
import type { LiveMatchControlPanelProps } from './LiveMatchControlPanel';

interface OfficialScoreModalProps extends LiveMatchControlPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfficialScoreModal({
  open,
  onOpenChange,
  match,
  team1Name,
  team2Name,
  isSubmitting,
  scorePresentation,
  activeSetIndex,
  ...controlProps
}: OfficialScoreModalProps) {
  const translate = useTranslations('LiveMatch');
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="h-[96dvh] max-h-[96dvh] w-[calc(100vw-0.5rem)] max-w-[calc(100vw-0.5rem)] min-w-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[95vw] sm:max-w-7xl sm:rounded-3xl">
        <div className="grid h-full min-h-0 min-w-0 max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-1">
          {/* Left Sidebar: clean, high contrast dark theme without ugly white borders */}
          <div className="flex max-h-[20dvh] min-w-0 max-w-full flex-col justify-between overflow-y-auto overflow-x-hidden bg-slate-900 p-4 text-white sm:max-h-[26dvh] sm:p-5 lg:max-h-none lg:overflow-y-auto lg:p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{translate('officialBoard')}</p>
                  <h3 className="text-base font-bold text-white leading-tight">{translate('officialScoring')}</h3>
                </div>
              </div>

              {/* Match lineup without white outline frames */}
              <div className="space-y-2 py-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">{translate('lineupLabel')}</p>
                <div className="rounded-xl bg-slate-800/70 p-3 space-y-2">
                  <p className="text-sm sm:text-base font-bold text-white leading-snug">{team1Name}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-700" />
                    <span className="text-[10px] font-extrabold text-slate-400">VS</span>
                    <div className="h-px flex-1 bg-slate-700" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-white leading-snug">{team2Name}</p>
                </div>
              </div>

              {/* Match info without white outline frames */}
              <div className="space-y-2.5 rounded-xl bg-slate-800/50 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">{translate('sportLabel')}</span>
                  <span className="font-bold text-white">{scorePresentation.sportLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">{translate('currentRoundLabel')}</span>
                  <span className="font-bold text-white">{translate('roundValue', { round: match.roundNumber })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">{translate('currentSetLabel')}</span>
                  <span className="font-bold text-emerald-400">{translate('setValue', { set: activeSetIndex !== undefined ? activeSetIndex + 1 : 1 })}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                  <span className="font-semibold text-slate-400">{translate('matchStatusLabel')}</span>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                    {match.status === 'ONGOING'
                      ? translate('statusInProgress')
                      : match.status === 'COMPLETED'
                        ? translate('statusCompleted')
                        : match.status === 'CANCELLED'
                          ? translate('statusCancelled')
                          : translate('statusUpcoming')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 hidden pt-3 border-t border-slate-800 text-[11px] leading-relaxed text-slate-400 lg:block">
              <span className="font-bold text-slate-300 block mb-0.5">{translate('refereeNote')}</span>
              {translate('refereeNoteDescription')}
            </div>
          </div>

          {/* Right Area */}
          <div className="flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden bg-white">
            <ModalHeader className="border-b border-slate-100 px-4 py-3 text-left sm:px-6 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ModalTitle className="text-base font-extrabold text-slate-900 sm:text-xl">
                    {translate('scoringControlsTitle')}
                  </ModalTitle>
                  <div className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase text-blue-700">
                    {scorePresentation.sportLabel}
                  </div>
                </div>
                <div
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold gap-1.5',
                    isSubmitting
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700',
                  )}
                >
                  <TimerReset className="h-3.5 w-3.5" />
                  {isSubmitting ? translate('syncing') : translate('ready')}
                </div>
              </div>
            </ModalHeader>

            <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-slate-50/50 p-2 sm:p-4 md:p-5">
              <LiveMatchControlPanel
                match={match}
                team1Name={team1Name}
                team2Name={team2Name}
                isSubmitting={isSubmitting}
                scorePresentation={scorePresentation}
                activeSetIndex={activeSetIndex}
                {...controlProps}
              />
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => onOpenChange(false)}
                >
                  {translate('closeOfficialBoard')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
