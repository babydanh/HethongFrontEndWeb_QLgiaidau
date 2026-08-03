'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Code,
  Eye,
  Image as ImageIcon,
  MapPin,
  Monitor,
  Search,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AdBannerType, AdPlacementSlot } from '../api';

interface BannerPreviewCardProps {
  bannerType: AdBannerType;
  placementSlot: AdPlacementSlot;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  targetUrl?: string | null;
  ctaText?: string | null;
  customHtml?: string | null;
}

type PreviewMode = 'placement' | 'page';
type PreviewViewport = 'desktop' | 'mobile';

const APP_SLOTS: AdPlacementSlot[] = [
  'APP_HOME_FEED',
  'APP_MATCHES_BOTTOM',
  'APP_COMMUNITY_FEED',
  'APP_TOURNAMENT_DETAIL',
];

export const BannerPreviewCard: React.FC<BannerPreviewCardProps> = ({
  bannerType,
  placementSlot,
  title,
  imageUrl,
  targetUrl,
  customHtml,
}) => {
  const translate = useTranslations('AdminBanners');
  const isApp = APP_SLOTS.includes(placementSlot);
  const isSidebar = placementSlot === 'HOMEPAGE_SIDEBAR';
  const isHorizontal = placementSlot === 'TOURNAMENTS_BOTTOM' || placementSlot === 'MATCHES_BOTTOM';
  const isHeader = placementSlot === 'GLOBAL_HEADER';
  const isAppFeed = placementSlot === 'APP_HOME_FEED' || placementSlot === 'APP_COMMUNITY_FEED';
  const isAppMatches = placementSlot === 'APP_MATCHES_BOTTOM';
  const isAppDetail = placementSlot === 'APP_TOURNAMENT_DETAIL';

  const [previewMode, setPreviewMode] = useState<PreviewMode>('placement');
  const [viewport, setViewport] = useState<PreviewViewport>(isApp ? 'mobile' : 'desktop');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setViewport(isApp ? 'mobile' : 'desktop');
  }, [isApp]);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const slotBadge = isSidebar
    ? '300 × 250 · 4:3'
    : isHeader
      ? '970 × 90 · 8:1'
      : isAppFeed
        ? '16:9 · Card'
        : isAppMatches
          ? '320 × 50 · Mobile'
          : isAppDetail
            ? '3:1 · Mobile'
            : '728 × 90 · Leaderboard';

  const getAspectClass = (compact = false) => {
    if (isSidebar) return compact ? 'aspect-[4/3]' : 'aspect-[4/3] max-w-[320px]';
    if (isHeader) return compact ? 'aspect-[8/1]' : 'aspect-[6/1] sm:aspect-[8/1]';
    if (isAppFeed) return compact ? 'aspect-[16/9]' : 'aspect-[16/9] max-w-[340px]';
    if (isAppMatches) return compact ? 'aspect-[320/50]' : 'aspect-[320/50] max-w-[340px]';
    if (isAppDetail) return compact ? 'aspect-[3/1]' : 'aspect-[3/1] max-w-[360px]';
    return compact ? 'aspect-[5.5/1]' : 'aspect-[3.5/1] sm:aspect-[4.5/1] md:aspect-[5.5/1]';
  };

  const renderAd = (compact = false) => {
    if (bannerType === 'CUSTOM_HTML') {
      return (
        <div className={`flex w-full ${getAspectClass(compact)} flex-col justify-center rounded-xl border border-dashed border-violet-300 bg-violet-50 px-4 py-3 text-violet-800`}>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
            <Code className="h-3.5 w-3.5" />
            {translate('previewScriptTitle')}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed">{translate('previewScriptHelp')}</p>
          <span className="mt-1.5 inline-flex w-fit rounded bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
            {translate('previewScriptNotExecuted')}
          </span>
        </div>
      );
    }

    if (!imageUrl || imageError) {
      return (
        <div className={`flex w-full ${getAspectClass(compact)} flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/90 p-5 text-center text-slate-400`}>
          <ImageIcon className="h-7 w-7 text-slate-300" />
          <p className="text-[11px] font-semibold text-slate-500">{imageError ? translate('previewImageError') : translate('previewNoImage')}</p>
          <p className="max-w-[240px] text-[10px] text-slate-400">{imageError ? translate('previewImageErrorHelp') : translate('previewNoImageHelp')}</p>
        </div>
      );
    }

    return (
      <div className={`relative w-full ${getAspectClass(compact)} overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm`}>
        <img
          src={imageUrl}
          alt={title || translate('previewAdLabel')}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
        <span className="absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
          {translate('previewAdLabel')}
        </span>
      </div>
    );
  };

  const renderWebHeader = () => (
    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2.5">
      <div className="flex items-center gap-5">
        <span className="text-sm font-black italic tracking-tight text-blue-600">SportO</span>
        <div className="hidden items-center gap-4 text-[9px] font-semibold text-slate-500 sm:flex">
          <span className="text-blue-600">{translate('previewHome')}</span>
          <span>{translate('previewTournaments')}</span>
          <span>{translate('previewMatches')}</span>
          <span>{translate('previewRanking')}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-slate-400"><Search className="h-3.5 w-3.5" /><Bell className="h-3.5 w-3.5" /><span className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" /></div>
    </div>
  );

  const renderTournamentCard = (compact = false) => (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${compact ? '' : 'min-h-[118px]'}`}>
      <div className="relative h-14 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 px-3 py-2">
        <span className="rounded bg-white/90 px-1.5 py-0.5 text-[8px] font-bold uppercase text-blue-700">{translate('previewFeatured')}</span>
        <Trophy className="absolute bottom-2 right-3 h-7 w-7 text-white/70" />
      </div>
      <div className="space-y-1.5 p-3">
        <p className="truncate text-[11px] font-bold text-slate-800">{translate('previewTournamentTitle')}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{translate('previewTournamentDate')}</span><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{translate('previewTournamentPlayers')}</span></div>
      </div>
    </div>
  );

  const renderMatchRow = (index: number) => (
    <div key={index} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-[9px] font-bold text-sky-600">{index + 1}</span><div><p className="text-[10px] font-semibold text-slate-700">{translate('previewPlayerOne')} <span className="text-slate-400">vs</span> {translate('previewPlayerTwo')}</p><p className="inline-flex items-center gap-1 text-[8px] text-slate-400"><MapPin className="h-2.5 w-2.5" />{translate('previewCourt')}</p></div></div><span className="text-[10px] font-bold text-slate-500">{index === 0 ? '21 – 18' : '13:30'}</span>
    </div>
  );

  const renderPageMockup = () => {
    if (isApp || viewport === 'mobile') {
      return (
        <div className="mx-auto w-full max-w-[360px] rounded-[26px] border-[6px] border-slate-800 bg-slate-50 p-1.5 shadow-xl">
          <div className="overflow-hidden rounded-[18px] bg-slate-50">
            <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-[10px] font-bold text-white"><span className="italic">SportO</span><span>{translate('previewApp')}</span></div>
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between"><div><p className="text-[9px] font-semibold text-slate-400">{translate('previewGreeting')}</p><p className="text-xs font-bold text-slate-800">{translate('previewDiscover')}</p></div><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm"><Bell className="h-3.5 w-3.5 text-slate-500" /></span></div>
              {isAppDetail && <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 p-3 text-white"><p className="text-[8px] uppercase tracking-wider text-white/70">{translate('previewTournamentLabel')}</p><p className="mt-1 text-xs font-bold">{translate('previewTournamentTitle')}</p></div>}
              {isAppMatches ? <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-[11px] font-bold text-slate-800">{translate('previewLiveMatches')}</p><ChevronRight className="h-3 w-3 text-slate-400" /></div>{renderMatchRow(0)}{renderMatchRow(1)}{renderAd(true)}</div> : <><div className="flex items-center justify-between"><p className="text-[11px] font-bold text-slate-800">{isAppFeed ? translate('previewFeaturedTournaments') : translate('previewTournamentLabel')}</p><span className="text-[9px] font-semibold text-blue-600">{translate('previewSeeAll')}</span></div>{renderAd(true)}{renderTournamentCard(true)}<div className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-500"><Users className="h-3.5 w-3.5" /></span><div><p className="text-[9px] font-bold text-slate-700">{translate('previewClubActivity')}</p><p className="text-[8px] text-slate-400">{translate('previewClubActivityMeta')}</p></div></div></>}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-lg">
        {renderWebHeader()}
        <div className="space-y-4 p-4">
          {isHeader && renderAd(true)}
          <div className="flex items-end justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-wider text-blue-600">{translate('previewGreeting')}</p><h3 className="text-base font-extrabold tracking-tight text-slate-900">{translate('previewDiscover')}</h3></div><span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-500"><MapPin className="h-3 w-3" />{translate('previewLocation')}</span></div>
          {isSidebar ? <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-4"><div className="space-y-3"><div className="flex items-center justify-between"><h4 className="text-[11px] font-bold text-slate-800">{translate('previewFeaturedTournaments')}</h4><span className="text-[9px] font-semibold text-blue-600">{translate('previewSeeAll')}</span></div>{renderTournamentCard()}<div className="flex items-center justify-between"><h4 className="text-[11px] font-bold text-slate-800">{translate('previewLiveMatches')}</h4><span className="text-[9px] text-slate-400">{translate('previewToday')}</span></div>{renderMatchRow(0)}</div><div>{renderAd(true)}</div></div> : <><div className="grid grid-cols-2 gap-3">{renderTournamentCard(true)}{renderTournamentCard(true)}</div><div className="flex items-center justify-between"><h4 className="text-[11px] font-bold text-slate-800">{isHorizontal ? translate('previewLiveMatches') : translate('previewLatestActivity')}</h4><span className="text-[9px] font-semibold text-blue-600">{translate('previewSeeAll')}</span></div><div className="space-y-2">{renderMatchRow(0)}{renderMatchRow(1)}</div>{renderAd(true)}</>}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600"><Sparkles className="h-3.5 w-3.5" />{translate('previewTitle')}</span><span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] text-slate-500">{slotBadge}</span></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-1.5"><div className="flex items-center gap-1"><button type="button" aria-pressed={previewMode === 'placement'} onClick={() => setPreviewMode('placement')} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${previewMode === 'placement' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Eye className="h-3.5 w-3.5" />{translate('previewModePlacement')}</button><button type="button" aria-pressed={previewMode === 'page'} onClick={() => setPreviewMode('page')} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${previewMode === 'page' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Sparkles className="h-3.5 w-3.5" />{translate('previewModePage')}</button></div><div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5"><button type="button" disabled={isApp} aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${isApp ? 'cursor-not-allowed text-slate-300' : viewport === 'desktop' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><Monitor className="h-3 w-3" />{translate('previewDesktop')}</button><button type="button" aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${viewport === 'mobile' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><Smartphone className="h-3 w-3" />{translate('previewMobile')}</button></div></div>
      {previewMode === 'page' ? renderPageMockup() : <div className="flex justify-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-4">{renderAd()}</div>}
      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500"><div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"><span className="block text-[9px] uppercase tracking-wider text-slate-400">{translate('previewPosition')}</span><span className="font-semibold text-slate-700">{slotBadge}</span></div><div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"><span className="block text-[9px] uppercase tracking-wider text-slate-400">{translate('previewDevice')}</span><span className="font-semibold text-slate-700">{viewport === 'mobile' ? translate('previewMobile') : translate('previewDesktop')}</span></div></div>
      {targetUrl && <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500"><span className="text-[10px] text-slate-400">{translate('previewTarget')}</span><span className="inline-flex max-w-[280px] items-center gap-1 truncate font-medium text-blue-600">{targetUrl}</span></div>}
    </div>
  );
};
