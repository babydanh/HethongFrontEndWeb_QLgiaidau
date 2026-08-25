import React, { useState, useEffect } from 'react';
import { SeriesLeg } from '@/types/series';
import { Trophy, Calendar, MapPin, ChevronRight, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import { useLocale, useTranslations } from 'next-intl';

interface SeriesScheduleTabProps {
  legs: SeriesLeg[];
}

export const SeriesScheduleTab: React.FC<SeriesScheduleTabProps> = ({ legs }) => {
  const translate = useTranslations('SeriesSchedule');
  const locale = useLocale();
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const [selectedLegId, setSelectedLegId] = useState<string>('');

  useEffect(() => {
    if (legs.length > 0 && !selectedLegId) {
      Promise.resolve().then(() => {
        setSelectedLegId(legs[0].id);
      });
    }
  }, [legs, selectedLegId]);

  const selectedLeg = legs.find(l => l.id === selectedLegId) || legs[0];

  const getTournamentStatusBadge = (status: string) => {
    const configs: Record<string, { text: string; classes: string }> = {
      COMPLETED: {
        text: translate('status.completed'),
        classes: 'bg-slate-800 text-white shadow-2xs'
      },
      REGISTRATION_OPEN: {
        text: translate('status.registrationOpen'),
        classes: 'bg-emerald-600 text-white shadow-2xs animate-pulse'
      },
      REGISTRATION_CLOSED: {
        text: translate('status.registrationClosed'),
        classes: 'bg-slate-700 text-white shadow-2xs'
      },
      IN_PROGRESS: {
        text: translate('status.inProgress'),
        classes: 'bg-rose-600 text-white shadow-2xs'
      },
      ONGOING: {
        text: translate('status.inProgress'),
        classes: 'bg-rose-600 text-white shadow-2xs'
      },
      UPCOMING: {
        text: translate('status.upcoming'),
        classes: 'bg-blue-600 text-white shadow-2xs'
      }
    };

    const current = configs[status] || configs.UPCOMING;

    return (
      <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm shrink-0', current.classes)}>
        {current.text}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Leg Selector Sidebar (3 columns) */}
      <div className="lg:col-span-3 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">{translate('listTitle')}</h3>
        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {legs.map((leg) => {
            const isActive = leg.id === selectedLegId;
            return (
              <button
                key={leg.id}
                onClick={() => setSelectedLegId(leg.id)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-between shrink-0 lg:shrink',
                  isActive
                    ? 'bg-blue-600 text-white border-transparent shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-950'
                )}
              >
                <span className="truncate">{leg.name}</span>
                <ChevronRight className={cn('w-4 h-4 hidden lg:block', isActive ? 'text-white' : 'text-slate-300')} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Section (9 columns) */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        {selectedLeg ? (
          <div className="bg-white p-6 md:p-8 rounded-lg border border-slate-200 shadow-sm">
            {/* Leg Header Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 mb-6 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedLeg.name}</h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {selectedLeg.startDate && selectedLeg.endDate
                    ? `${translate('time')}: ${new Date(selectedLeg.startDate).toLocaleDateString(dateLocale)} — ${new Date(selectedLeg.endDate).toLocaleDateString(dateLocale)}`
                    : translate('timeUnknown')}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100 shadow-sm shrink-0">
                  {translate('directEntry', { count: selectedLeg.directEntrySlots })}
                </span>
                <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 shadow-sm shrink-0">
                  {translate('wildcard', { count: selectedLeg.wildcardSlots })}
                </span>
              </div>
            </div>

            {/* Timeline Tree */}
            {selectedLeg.events && selectedLeg.events.length > 0 ? (
              <div className="relative pl-6 md:pl-8 border-l border-slate-200 flex flex-col gap-8">
                {selectedLeg.events
                  .sort((a, b) => a.order - b.order)
                  .map((event) => {
                    const t = event.tournament;
                    if (!t) return null;
                    const isUpcoming = t.status !== 'COMPLETED' && t.status !== 'CANCELLED';

                    return (
                      <div key={event.id} className="relative group/timeline">
                        {/* Bullet Pin */}
                        <div
                          className={cn(
                            'absolute -left-[31px] md:-left-[39px] top-1.5 w-4 h-4 rounded-full border-4 border-white transition-all duration-300 shadow-sm',
                            isUpcoming ? 'bg-blue-600 ring-4 ring-blue-50' : 'bg-slate-400 ring-4 ring-slate-100'
                          )}
                        ></div>

                        {/* Event Details Card */}
                        <div className="bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 p-4 md:p-5 rounded-lg border border-slate-200 transition-all duration-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                                {translate('eventTournament', { order: event.order })}
                              </span>
                              {event.region && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                                  <MapPin className="w-3 h-3 text-slate-400" /> {event.region}
                                </span>
                              )}
                              {event.pointMultiplier > 1 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                  {translate('pointMultiplier', { multiplier: event.pointMultiplier })}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm md:text-base font-bold text-slate-900 line-clamp-1 group-hover/timeline:text-blue-600 transition-colors">
                              {t.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  {t.startDate ? new Date(t.startDate).toLocaleDateString(dateLocale) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t border-slate-100 md:border-none pt-3 md:pt-0">
                            {getTournamentStatusBadge(t.status)}
                            <Link
                              href={`/tournaments/${t.id}`}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0"
                            >
                              {translate('details')} <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center justify-center">
                <Bookmark className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-800">{translate('emptyTitle')}</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  {translate('emptyDescription')}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

