import React from 'react';
import { TournamentSeries } from '@/types/series';
import { useTranslations } from 'next-intl';
import { Award, AlertTriangle, HelpCircle, Trophy } from 'lucide-react';

interface SeriesRulesTabProps {
  series: TournamentSeries;
}

export const SeriesRulesTab: React.FC<SeriesRulesTabProps> = ({ series }) => {
  const translate = useTranslations('SeriesRules');
  const { rules } = series;
  
  // Format rank labels
  const getRankName = (rankKey: string) => {
    const rank = parseInt(rankKey);
    if (rank === 1) return `🥇 ${translate('rankChampion')}`;
    if (rank === 2) return `🥈 ${translate('rankRunnerUp')}`;
    if (rank === 3) return `🥉 ${translate('rankThirdFourth')}`;
    if (rank === 5) return `🎖️ ${translate('rankFifthEighth')}`;
    if (rank === 9) return `🎖️ ${translate('rankNinthSixteenth')}`;
    return `🎖️ ${translate('rankAtLeast', { rank: rankKey })}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Point Table System (7 columns) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white p-6 md:p-8 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-500" /> {translate('pointsTitle')}
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {translate('pointsDescription')}
          </p>

          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">{translate('rankHeader')}</th>
                  <th className="py-3.5 px-6 text-right">{translate('pointsHeader')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {Object.entries(rules.pointsByRank)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([rankKey, points]) => (
                    <tr key={rankKey} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-sm">
                        {getRankName(rankKey)}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-blue-600 text-sm">
                        +{points} pts
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rules Explanations (5 columns) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Exclusion Rule Explainer */}
        {rules.exclusionRule && (
          <div className="bg-slate-50/60 p-6 rounded-lg border border-slate-200/60 shadow-sm relative overflow-hidden">
            <h3 className="text-base font-bold text-amber-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600" /> {translate('exclusionTitle')}
            </h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              {translate('exclusionIntro')}
            </p>
            <ul className="list-disc list-inside text-sm text-amber-700/90 mt-2 space-y-1.5 leading-relaxed pl-1">
              <li>{translate('exclusionRuleOne', { threshold: `#${rules.directEntryThreshold}` })}</li>
              <li>{translate('exclusionRuleTwo')}</li>
              <li>{translate('exclusionScope', { scope: translate(rules.exclusionScope === 'CATEGORY' ? 'exclusionScopeCategory' : 'exclusionScopeSeries') })}</li>
            </ul>
          </div>
        )}

        {/* Qualification Process */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" /> {translate('wildcardTitle')}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-3">
            {translate('wildcardIntro')}
          </p>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 leading-relaxed pl-1">
            <li>{translate('wildcardRuleOne')}</li>
            <li>{translate('wildcardRuleTwo', { count: rules.wildcardCount })}</li>
          </ul>
        </div>

        {/* FAQ/Support Info */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 shadow-sm flex items-start gap-4">
          <HelpCircle className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">{translate('supportTitle')}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {translate('supportDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

