'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Trophy, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Tournament } from '@/features/tournaments/api';
import BracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';

interface TournamentBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
}

export default function TournamentBracketModal({
  isOpen,
  onClose,
  tournament,
}: TournamentBracketModalProps) {
  const translate = useTranslations('TournamentBracketModal');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 text-white shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-md shadow-blue-500/20">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {translate('bracketLabel')}
              </span>
              {tournament.category?.name && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  {tournament.category.name}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md sm:max-w-xl">
              {tournament.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <span>{translate('viewTournament')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={translate('closeTitle')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-950/60 p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-3 sm:p-6 overflow-hidden">
          <BracketTab tournament={tournament} />
        </div>
      </div>
    </div>
  );
}
