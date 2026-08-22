import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { TournamentSeries, SeriesLeg } from '@/types/series';
import { Trophy, Calendar, MapPin, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils/cn';

interface SeriesOverviewTabProps {
  series: TournamentSeries;
  legs: SeriesLeg[];
}

export const SeriesOverviewTab: React.FC<SeriesOverviewTabProps> = ({ series, legs }) => {
  const translate = useTranslations('SeriesDetail');
  const commonTranslate = useTranslations('Common');
  const locale = useLocale();
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  // Find the next upcoming tournament event in the ongoing/upcoming legs
  const allEvents = legs.flatMap(l => l.events || []);
  const upcomingEvent = allEvents
    .filter(e => e.tournament && e.tournament.status !== 'COMPLETED' && e.tournament.status !== 'CANCELLED')
    .sort((a, b) => {
      const aDate = new Date(a.tournament?.startDate || '');
      const bDate = new Date(b.tournament?.startDate || '');
      return aDate.getTime() - bDate.getTime();
    })[0];

  const formattedPrize = series.totalPrize
    ? new Intl.NumberFormat(dateLocale, { style: 'currency', currency: 'VND' }).format(series.totalPrize)
    : translate('formatAgreement');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Description & Intro (8 columns) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Editor.js Content View */}
        <div className="bg-white p-6 md:p-8 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" /> {translate('overviewHeading')}
          </h2>
          {series.description ? (
            <div 
              className="prose prose-slate max-w-none text-sm md:text-base leading-relaxed text-slate-600 space-y-4 editorjs-content-view"
              dangerouslySetInnerHTML={{ __html: series.description }}
            />
          ) : (
            <p className="text-slate-400 text-sm">{translate('descriptionMissing')}</p>
          )}
        </div>
      </div>

      {/* Sidebar Info & Featured Event (4 columns) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Series Quick Metrics Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-lg border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl"></div>
          
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400" /> {translate('quickInfo')}
          </h3>

          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs text-slate-400">{translate('totalPrize')}</span>
              <div className="text-2xl font-bold text-amber-400 mt-0.5">{formattedPrize}</div>
            </div>
            
            <div className="h-px bg-slate-800"></div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400">{translate('legsPlayed')}</span>
                <div className="text-lg font-bold text-white mt-0.5">{translate('legCount', { count: series._count?.legs || 0 })}</div>
              </div>
              <div>
                <span className="text-xs text-slate-400">{translate('eventsLabel')}</span>
                <div className="text-lg font-bold text-white mt-0.5">{translate('eventCount', { count: series._count?.events || 0 })}</div>
              </div>
            </div>

            <div className="h-px bg-slate-800"></div>

            <div>
              <span className="text-xs text-slate-400">{commonTranslate('organizerLabel')}</span>
              <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-[9px]">
                  {series.organizer?.avatarUrl ? (
                    <img src={series.organizer.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    'O'
                  )}
                </div>
                {series.organizer?.fullName}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Upcoming Tournament Event Card */}
        {upcomingEvent && upcomingEvent.tournament && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {translate('nextTournament')}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-3 line-clamp-2 hover:text-blue-600 transition-colors">
                <Link href={`/tournaments/${upcomingEvent.tournamentId}`}>
                  {upcomingEvent.tournament.name}
                </Link>
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {new Date(upcomingEvent.tournament.startDate || '').toLocaleDateString(dateLocale)}
                </span>
              </div>
              {upcomingEvent.region && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{translate('regionLabel', { region: upcomingEvent.region })}</span>
                </div>
              )}
            </div>

            <Link
              href={`/tournaments/${upcomingEvent.tournamentId}`}
              className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all duration-200"
            >
              {commonTranslate('viewTournamentAction')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

