'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TournamentParticipant } from '@/types/tournament';
import { Division } from '@/features/tournaments/api';

interface WildcardManagerCardProps {
  divisions: Division[];
  selectedDivisionId: string;
  setSelectedDivisionId: (id: string) => void;
  wildcardEmailOrPhone: string;
  setWildcardEmailOrPhone: (val: string) => void;
  wildcardPartnerEmailOrPhone: string;
  setWildcardPartnerEmailOrPhone: (val: string) => void;
  wildcardTeamName: string;
  setWildcardTeamName: (val: string) => void;
  isAssigningWildcard: boolean;
  handleAssignWildcard: () => void;
  participants: TournamentParticipant[];
  handleRejectParticipant?: (participantId: string) => Promise<void>;
}

export function WildcardManagerCard({
  divisions,
  selectedDivisionId,
  setSelectedDivisionId,
  wildcardEmailOrPhone,
  setWildcardEmailOrPhone,
  wildcardPartnerEmailOrPhone,
  setWildcardPartnerEmailOrPhone,
  wildcardTeamName,
  setWildcardTeamName,
  isAssigningWildcard,
  handleAssignWildcard,
  participants,
  handleRejectParticipant,
}: WildcardManagerCardProps) {
  const registrationTranslate = useTranslations('tournamentManage.registration');
  const displayTranslate = useTranslations('tournaments.display');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600" /> {registrationTranslate('wildcardTitle')}
        </h3>
        <p className="text-xs text-slate-500 mt-1 font-semibold">{registrationTranslate('wildcardDescription')}</p>
      </div>

      {/* Division Selector */}
      {divisions.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{registrationTranslate('contentSelectionLabel')}</label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
            {divisions.map((div) => {
              const isActive = div.id === selectedDivisionId;
              const genderLabel = div.genderRestriction === 'FEMALE'
                ? displayTranslate('femaleGender')
                : div.genderRestriction === 'MIXED'
                  ? displayTranslate('mixedGender')
                  : displayTranslate('maleGender');
              const matchLabel = div.matchType === 'SINGLES'
                ? displayTranslate('singlesFormat', { gender: genderLabel })
                : div.matchType === 'DOUBLES'
                  ? div.genderRestriction === 'MIXED'
                    ? displayTranslate('mixedDoublesFormat')
                    : displayTranslate('doublesFormat', { gender: genderLabel })
                  : displayTranslate('mixedDoublesFormat');
              const bracketLabel = div.bracketType === 'DOUBLE_ELIMINATION' ? displayTranslate('bracketDoubleElimination')
                : div.bracketType === 'ROUND_ROBIN' ? displayTranslate('bracketRoundRobin') : displayTranslate('bracketSingleElimination');
              const count = div._count?.participants ?? 0;
              return (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => {
                    setSelectedDivisionId(div.id);
                    setWildcardPartnerEmailOrPhone('');
                  }}
                  className={`relative w-full cursor-pointer rounded-lg border px-3 py-2.5 text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-650 hover:border-emerald-200 hover:text-emerald-700'
                  }`}
                >
                  <span className="block text-sm font-bold">{div.name}</span>
                  <span className="block text-[10px] font-semibold text-slate-500 mt-0.5">
                    {matchLabel} • {bracketLabel} • {registrationTranslate('profilesCount', { count })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected division form */}
      {(() => {
        const selDiv = divisions.find((d) => d.id === selectedDivisionId);
        const isDoubles = selDiv?.matchType === 'DOUBLES' || selDiv?.matchType === 'MIXED_DOUBLES';
        return (
          <div className="space-y-3">
            {/* Player 1 Email */}
            <Input
              label={registrationTranslate('playerEmailPhoneLabel')}
              placeholder={registrationTranslate('playerEmailPhonePlaceholder')}
              value={wildcardEmailOrPhone}
              onChange={(e) => setWildcardEmailOrPhone(e.target.value)}
              className="bg-white text-xs h-10"
              disabled={isAssigningWildcard}
            />

            {/* Partner email for doubles */}
            {isDoubles && (
              <Input
                label={registrationTranslate('teammateLabel')}
                placeholder={registrationTranslate('teammatePlaceholder')}
                value={wildcardPartnerEmailOrPhone}
                onChange={(e) => setWildcardPartnerEmailOrPhone(e.target.value)}
                className="bg-white text-xs h-10"
                disabled={isAssigningWildcard}
              />
            )}

            {/* Team Name */}
            <Input
              label={registrationTranslate('wildcardTeamNameLabel')}
              placeholder={registrationTranslate('wildcardTeamNamePlaceholder')}
              value={wildcardTeamName}
              onChange={(e) => setWildcardTeamName(e.target.value)}
              className="bg-white text-xs h-10"
              disabled={isAssigningWildcard}
            />

            <Button
              onClick={handleAssignWildcard}
              disabled={isAssigningWildcard || !wildcardEmailOrPhone.trim() || !wildcardTeamName.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
            >
              {isAssigningWildcard ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {registrationTranslate('assigningWildcard')}</>
              ) : (
                <><CheckCircle className="w-3.5 h-3.5" /> {registrationTranslate('assignWildcard')}</>
              )}
            </Button>
          </div>
        );
      })()}

      {/* Wildcard Participants List */}
      {(() => {
        const wildcards = participants.filter((p) => p.isWildcard);
        if (wildcards.length === 0) return null;
        return (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
              {registrationTranslate('assignedWildcards', { count: wildcards.length })}
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {wildcards.map((p) => {
                const divName = divisions.find((d) => d.id === p.tournamentDivisionId)?.name || '';
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{p.teamName}</span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                          {registrationTranslate('wildcardBadge')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {p.members?.map((m) => m.fullName).filter(Boolean).join(', ') || registrationTranslate('noName')}
                        {divName ? ` • ${divName}` : ''}
                      </p>
                    </div>
                    {handleRejectParticipant && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(registrationTranslate('wildcardRemoveConfirm', { name: p.teamName }))) {
                            await handleRejectParticipant(p.id);
                          }
                        }}
                        className="ml-2 rounded-lg p-1.5 text-rose-500 hover:bg-rose-100 transition-colors cursor-pointer"
                        title={registrationTranslate('removeWildcard')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
