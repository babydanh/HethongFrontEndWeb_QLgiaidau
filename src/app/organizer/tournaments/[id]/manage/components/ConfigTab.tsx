'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Settings, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { Tournament, BracketStage } from '@/types/tournament';
import { getSportRuleKind, inferSportRuleKindFromCategory } from '@/features/tournaments/sport-rules/normalize';
import { normalizeSportRuleKindForCategory } from '@/features/tournaments/sport-rules/options';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { isTournamentRegistrationClosed, isTournamentRegistrationOpen } from '@/utils/tournament-status';

interface ConfigTabProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  isLimitEnabled: boolean;
  setIsLimitEnabled: (val: boolean) => void;
  maxParticipants: number;
  setMaxParticipants: (val: number) => void;
  matchType: string;
  setMatchType: (val: string) => void;
  setsToWin: number;
  setSetsToWin: (val: number) => void;
  pointsPerSet: number;
  setPointsPerSet: (val: number) => void;
  winByTwo: boolean;
  setWinByTwo: (val: boolean) => void;
  isSavingConfig: boolean;
  handleSaveMatchConfig: () => void;
  handleUpdateStageRoundConfig: (stageId: string, config: Record<string, unknown>) => void;
  bracketTypeState: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT';
  setBracketTypeState: (val: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT') => void;
}

export function ConfigTab({
  tournament,
  bracket,
  isLimitEnabled,
  setIsLimitEnabled,
  maxParticipants,
  setMaxParticipants,
  matchType,
  setMatchType,
  setsToWin,
  setSetsToWin,
  pointsPerSet,
  setPointsPerSet,
  winByTwo,
  setWinByTwo,
  isSavingConfig,
  handleSaveMatchConfig,
  handleUpdateStageRoundConfig,
  bracketTypeState,
  setBracketTypeState,
}: ConfigTabProps) {
  const translate = useTranslations('TournamentDetail');
  const isRegistrationOpen = isTournamentRegistrationOpen(tournament.status) || isTournamentRegistrationClosed(tournament.status);
  // Category is authoritative. Older tournaments can contain a stale
  // sportRules.kind from the previous preset, which must not relabel the UI.
  const sportRuleKind = normalizeSportRuleKindForCategory(
    getSportRuleKind(tournament.sportRules),
    tournament.category ?? null,
  );
  const presentation = getSportRulePresentation(sportRuleKind, translate);
  const setUnitLabel = presentation.setUnitLabel;
  const winByTwoLabel = presentation.winByTwoLabel;
  const [maxParticipantsDraft, setMaxParticipantsDraft] = React.useState(
    () => String(maxParticipants),
  );

  React.useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setMaxParticipantsDraft(String(maxParticipants));
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [maxParticipants]);

  const commitMaxParticipants = () => {
    const parsed = Number(maxParticipantsDraft);
    const normalized = Number.isFinite(parsed) && parsed > 0
      ? Math.min(128, Math.max(2, parsed))
      : maxParticipants;
    setMaxParticipants(normalized);
    setMaxParticipantsDraft(String(normalized));
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b pb-2 mb-4">
        <h2 className="text-xl font-bold text-slate-900">{translate('configurationTitle')}</h2>
      </div>

      {tournament.inviteCode && (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white p-2 rounded-lg border shadow-sm shrink-0">
            <QRCodeSVG value={tournament.inviteCode} size={120} level="M" />
          </div>
          <div className="space-y-2 text-center md:text-left flex-1">
            <h3 className="text-lg font-bold text-blue-900">{translate('inviteCodeTitle')}</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              {translate('inviteCodeDescription', { code: tournament.inviteCode })}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2 bg-slate-50 border p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">{translate('registrationLimit')}</label>
            <input
              type="checkbox"
              checked={isLimitEnabled}
              onChange={(e) => setIsLimitEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>
          {isLimitEnabled && (
            <Input
              label={translate('maxRegistrationTeams')}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={maxParticipantsDraft}
              onChange={(e) => setMaxParticipantsDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
              onBlur={commitMaxParticipants}
              className="bg-white text-xs mt-1"
            />
          )}
          {!isLimitEnabled && (
            <p className="text-xs font-semibold text-slate-400 mt-2">{translate('unlimitedRegistration')}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 bg-slate-50 border p-4 rounded-lg">
          <label className="text-sm font-semibold text-slate-700">{translate('matchContent')}</label>
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
            disabled={isRegistrationOpen}
            className={`border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-11 ${isRegistrationOpen ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="MALE_SINGLES">{translate('maleSingles')}</option>
            <option value="FEMALE_SINGLES">{translate('femaleSingles')}</option>
            <option value="MALE_DOUBLES">{translate('maleDoubles')}</option>
            <option value="FEMALE_DOUBLES">{translate('femaleDoubles')}</option>
            <option value="MIXED_DOUBLES">{translate('mixedDoubles')}</option>
          </select>
          {isRegistrationOpen && (
            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
              <span>⚠</span> {translate('cannotChangeContent')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 bg-slate-50 border p-4 rounded-lg">
          <label className="text-sm font-semibold text-slate-700">{translate('formatTitle')}</label>
          <select
            value={bracketTypeState}
            onChange={(e) => setBracketTypeState(e.target.value as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT')}
            disabled={isRegistrationOpen}
            className={`border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-11 ${isRegistrationOpen ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="SINGLE_ELIMINATION">{translate('singleEliminationFormat')}</option>
            <option value="DOUBLE_ELIMINATION">{translate('doubleEliminationFormat')}</option>
            <option value="ROUND_ROBIN">{translate('roundRobinFormat')}</option>
            <option value="GROUP_STAGE_KNOCKOUT">{translate('groupStagePlayoffFormat')}</option>
          </select>
          {isRegistrationOpen && (
            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
              <span>⚠</span> {translate('cannotChangeFormat')}
            </p>
          )}
          {bracketTypeState === 'ROUND_ROBIN' && isLimitEnabled && maxParticipants > 15 && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed font-medium">
                <strong className="font-bold text-amber-950">⚠️ {translate('registrationLimit')}:</strong> {translate('roundRobinWarning', { participants: maxParticipants })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sport Rules Card */}
      <div className="bg-slate-50 rounded-lg border p-5 space-y-4">
        <h4 className="font-bold text-slate-800 border-b pb-2">{translate('rulesDefaultsTitle')}</h4>
        <p className="text-xs font-semibold text-slate-500">
          {presentation.sportLabel}: {presentation.scoringLabel}. {presentation.presetSummary}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">{translate('setsToWin')}</label>
            <select
              value={setsToWin}
              onChange={(e) => setSetsToWin(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {presentation.setOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <Input
            label={setUnitLabel}
            type="number"
            value={pointsPerSet}
            onChange={(e) => setPointsPerSet(Number(e.target.value))}
            placeholder={presentation.maxScorePlaceholder}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="winByTwo_tab"
            checked={winByTwo}
            onChange={(e) => setWinByTwo(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="winByTwo_tab" className="text-sm font-semibold text-slate-700 cursor-pointer">
            {winByTwoLabel}
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleSaveMatchConfig}
          disabled={isSavingConfig}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
        >
          {isSavingConfig ? translate('saving') : translate('saveDefaultConfiguration')}
        </Button>
      </div>
    </div>
  );
}
