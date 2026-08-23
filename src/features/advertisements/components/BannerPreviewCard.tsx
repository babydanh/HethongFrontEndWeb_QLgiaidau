'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Code,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  MapPin,
  Monitor,
  Search,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  Battery,
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
type SampleLayout = 'slide' | 'stack';

type PreviewSample = {
  id: string;
  kicker: string;
  title: string;
  detail: string;
  cta: string;
};

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
}) => {
  const translate = useTranslations('AdminBanners');
  const previewSamples: PreviewSample[] = [
    {
      id: 'sample-primary',
      kicker: translate('previewSamplePrimaryKicker'),
      title: translate('previewSamplePrimaryTitle'),
      detail: translate('previewSamplePrimaryDetail'),
      cta: translate('previewSamplePrimaryCta'),
    },
    {
      id: 'sample-community',
      kicker: translate('previewSampleCommunityKicker'),
      title: translate('previewSampleCommunityTitle'),
      detail: translate('previewSampleCommunityDetail'),
      cta: translate('previewSampleCommunityCta'),
    },
    {
      id: 'sample-event',
      kicker: translate('previewSampleEventKicker'),
      title: translate('previewSampleEventTitle'),
      detail: translate('previewSampleEventDetail'),
      cta: translate('previewSampleEventCta'),
    },
  ];
  const isApp = APP_SLOTS.includes(placementSlot);
  const isSidebar = placementSlot === 'HOMEPAGE_SIDEBAR';
  const isHorizontal = placementSlot === 'TOURNAMENTS_BOTTOM' || placementSlot === 'MATCHES_BOTTOM';
  const isHeader = placementSlot === 'GLOBAL_HEADER';
  const isAppFeed = placementSlot === 'APP_HOME_FEED' || placementSlot === 'APP_COMMUNITY_FEED';
  const isAppMatches = placementSlot === 'APP_MATCHES_BOTTOM';
  const isAppDetail = placementSlot === 'APP_TOURNAMENT_DETAIL';

  const [previewMode, setPreviewMode] = useState<PreviewMode>('page');
  const [viewport, setViewport] = useState<PreviewViewport>(isApp ? 'mobile' : 'desktop');
  const [imageError, setImageError] = useState(false);
  const [sampleCount, setSampleCount] = useState(3);
  const [sampleLayout, setSampleLayout] = useState<SampleLayout>(isSidebar ? 'stack' : 'slide');
  const [sampleIndex, setSampleIndex] = useState(0);
  const [showSamples, setShowSamples] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect -- reset preview controls when the placement/device context changes */
  useEffect(() => {
    setViewport(isApp ? 'mobile' : 'desktop');
    setSampleLayout(isSidebar ? 'stack' : 'slide');
    setSampleCount(3);
    setSampleIndex(0);
  }, [isApp, isSidebar]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- reset the preview error when the selected image changes */
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    if (isHorizontal) return compact ? 'aspect-[8/1]' : 'aspect-[5.5/1] sm:aspect-[7/1] md:aspect-[8/1]';
    if (isAppFeed) return compact ? 'aspect-[16/9]' : 'aspect-[16/9] max-w-[340px]';
    if (isAppMatches) return compact ? 'aspect-[320/50]' : 'aspect-[320/50] max-w-[340px]';
    if (isAppDetail) return compact ? 'aspect-[3/1]' : 'aspect-[3/1] max-w-[360px]';
    return compact ? 'aspect-[5.5/1]' : 'aspect-[3.5/1] sm:aspect-[4.5/1] md:aspect-[5.5/1]';
  };

  const renderAd = (compact = false) => {
    if (bannerType === 'CUSTOM_HTML') {
      return (
        <div
          className={`flex w-full ${getAspectClass(compact)} flex-col justify-center rounded-xl border border-dashed border-violet-300 bg-violet-50/90 px-3 py-2 text-violet-800 shadow-xs`}
        >
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
            <Code className="h-3 w-3 text-violet-600" />
            {translate('previewScriptTitle')}
          </div>
          <p className="mt-1 line-clamp-1 text-[8.5px] leading-tight text-violet-600">
            {translate('previewScriptHelp')}
          </p>
          <span className="mt-1 inline-flex w-fit rounded bg-violet-100 px-1.5 py-0.5 text-[8px] font-semibold text-violet-700">
            {translate('previewScriptNotExecuted')}
          </span>
        </div>
      );
    }

    if (!imageUrl || imageError) {
      return (
        <div
          className={`flex w-full ${getAspectClass(compact)} flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-2.5 text-center transition-all`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100/70 text-blue-600">
            <ImageIcon className="h-3.5 w-3.5" />
          </div>
          <p className="text-[10px] font-bold text-blue-900">
            {imageError ? translate('previewImageError') : translate('previewNoImage')}
          </p>
          <span className="rounded bg-blue-100/60 px-1.5 py-0.5 font-mono text-[8px] font-bold text-blue-700">
            {slotBadge}
          </span>
        </div>
      );
    }

    return (
      <div
        className={`group relative w-full ${getAspectClass(compact)} overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-xs`}
      >
        <img
          src={imageUrl}
          alt={title || translate('previewAdLabel')}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <span className="absolute right-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
          {translate('previewAdLabel')}
        </span>
      </div>
    );
  };

  const renderSampleBanner = (sample: PreviewSample, compact = false) => (
    <div className={`relative w-full ${getAspectClass(compact)} overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${compact ? 'p-2' : 'p-3'}`}>
      <div className="absolute inset-0 bg-slate-200" />
      <ImageIcon className="absolute right-4 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-300" />
      <div className="relative flex h-full flex-col justify-between text-slate-800">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded border border-slate-300 bg-white/85 px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-slate-500">
            {translate('previewSampleBadge')}
          </span>
          <span className="text-[8px] font-semibold text-slate-500">SportO</span>
        </div>
        <div className="max-w-[78%]">
          <p className="text-[7.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">{sample.kicker}</p>
          <p className={`mt-0.5 font-black leading-tight tracking-tight text-slate-900 ${compact ? 'text-[10px]' : 'text-[13px]'}`}>{sample.title}</p>
          <p className={`mt-1 leading-tight text-slate-600 ${compact ? 'line-clamp-1 text-[7px]' : 'line-clamp-2 text-[8.5px]'}`}>{sample.detail}</p>
          <span className={`inline-flex rounded-md bg-slate-800 px-2 font-bold text-white ${compact ? 'mt-1 py-0.5 text-[7px]' : 'mt-2 py-1 text-[8px]'}`}>{sample.cta}</span>
        </div>
      </div>
    </div>
  );

  const renderPreviewItem = (sample: PreviewSample | null, compact = false) => {
    if (!sample) {
      return (
        <div className="relative">
          {renderAd(compact)}
          <span className="absolute left-2 top-2 rounded-md bg-blue-600/90 px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-white shadow-sm">
            {translate('previewCurrentBanner')}
          </span>
        </div>
      );
    }
    return renderSampleBanner(sample, compact);
  };

  const renderPreviewSamples = (compact = false) => {
    const previewItems: (PreviewSample | null)[] = showSamples
      ? [null, ...previewSamples].slice(0, sampleCount)
      : [null];
    const safeIndex = Math.min(sampleIndex, previewItems.length - 1);

    if (sampleLayout === 'stack') {
      return (
        <div className="space-y-2">
          {previewItems.map((item, index) => (
            <div key={item?.id || 'current-banner'} className="relative">
              {renderPreviewItem(item, compact)}
              {index === 0 && previewItems.length > 1 && (
                <span className="absolute bottom-2 right-2 rounded bg-blue-600/90 px-1.5 py-0.5 text-[7px] font-semibold text-white">
                  {translate('previewCurrentBanner')}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="overflow-hidden rounded-xl">
          {renderPreviewItem(previewItems[safeIndex], compact)}
        </div>
        {previewItems.length > 1 && (
          <>
            <button
              type="button"
              aria-label={translate('previewPrevious')}
              onClick={() => setSampleIndex((current) => (current - 1 + previewItems.length) % previewItems.length)}
              className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-slate-900/55 text-white shadow-sm backdrop-blur-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={translate('previewNext')}
              onClick={() => setSampleIndex((current) => (current + 1) % previewItems.length)}
              className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-slate-900/55 text-white shadow-sm backdrop-blur-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/40 px-1.5 py-1">
              {previewItems.map((item, index) => (
                <button
                  key={item?.id || 'current-banner-dot'}
                  type="button"
                  aria-label={translate('previewSlide', { current: index + 1, total: previewItems.length })}
                  aria-current={safeIndex === index ? 'true' : undefined}
                  onClick={() => setSampleIndex(index)}
                  className={`h-1.5 rounded-full transition-all focus:outline-hidden focus-visible:ring-1 focus-visible:ring-white ${safeIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderBrowserBar = () => (
    <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-100/90 px-3 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="flex items-center gap-1 rounded-md bg-white px-2.5 py-0.5 text-[9px] font-medium text-slate-500 shadow-2xs">
        <Lock className="h-2.5 w-2.5 text-emerald-600" />
        <span>sporto.asia</span>
      </div>
      <div className="w-8" />
    </div>
  );

  const renderWebHeader = () => (
    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
      <div className="flex items-center gap-4">
        <span className="text-xs font-black italic tracking-tight text-blue-600">SportO</span>
        <div className="hidden items-center gap-3 text-[9px] font-bold text-slate-500 sm:flex">
          <span className="text-blue-600 underline underline-offset-4">{translate('previewHome')}</span>
          <span className="hover:text-slate-900">{translate('previewTournaments')}</span>
          <span className="hover:text-slate-900">{translate('previewMatches')}</span>
          <span className="hover:text-slate-900">{translate('previewRanking')}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        <Search className="h-3 w-3" />
        <Bell className="h-3 w-3" />
        <span className="h-4.5 w-4.5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 ring-1 ring-blue-200" />
      </div>
    </div>
  );

  const renderTournamentCard = () => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="relative h-12 bg-slate-200 px-3 py-1.5 text-slate-600">
        <span className="rounded border border-slate-300 bg-white/90 px-1 py-0.5 text-[7.5px] font-extrabold uppercase text-slate-600">
          {translate('previewFeatured')}
        </span>
        <Trophy className="absolute bottom-1.5 right-2.5 h-6 w-6 text-slate-400" />
      </div>
      <div className="space-y-1 p-2.5">
        <p className="truncate text-[10px] font-bold text-slate-800">{translate('previewTournamentTitle')}</p>
        <div className="flex flex-wrap gap-x-2 text-[8px] text-slate-400">
          <span className="inline-flex items-center gap-0.5">
            <CalendarDays className="h-2.5 w-2.5" />
            {translate('previewTournamentDate')}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Users className="h-2.5 w-2.5" />
            {translate('previewTournamentPlayers')}
          </span>
        </div>
      </div>
    </div>
  );

  const renderMatchRow = (index: number) => (
    <div
      key={index}
      className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 shadow-2xs"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[8.5px] font-bold text-blue-600">
          {index + 1}
        </span>
        <div>
          <p className="text-[9px] font-bold text-slate-700">
            {translate('previewPlayerOne')} <span className="text-slate-400">vs</span> {translate('previewPlayerTwo')}
          </p>
          <p className="inline-flex items-center gap-0.5 text-[7.5px] text-slate-400">
            <MapPin className="h-2 w-2" />
            {translate('previewCourt')}
          </p>
        </div>
      </div>
      <span className="text-[9px] font-extrabold text-slate-600">{index === 0 ? '21 – 18' : '13:30'}</span>
    </div>
  );

  const renderSidebarWidget = () => (
    <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">{translate('previewTopPlayers')}</span>
        <span className="text-[8px] font-semibold text-blue-600">{translate('previewThisWeek')}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[8px] text-slate-600">
          <span>🥇 Nguyễn Minh Danh</span>
          <span className="font-bold text-blue-600">1,450</span>
        </div>
        <div className="flex items-center justify-between text-[8px] text-slate-600">
          <span>🥈 Trần Ngọc Trâm</span>
          <span className="font-bold text-slate-700">1,380</span>
        </div>
      </div>
    </div>
  );

  const renderPageMockup = () => {
    if (isApp || viewport === 'mobile') {
      return (
        <div className="mx-auto w-full max-w-[320px] rounded-[32px] border-[5px] border-slate-800 bg-slate-900 p-1 shadow-xl">
          <div className="overflow-hidden rounded-[26px] bg-slate-50">
            {/* Phone Status Bar */}
            <div className="flex items-center justify-between bg-slate-900 px-4 py-1.5 text-[8.5px] font-semibold text-white">
              <span>9:41</span>
              <div className="h-2.5 w-14 rounded-full bg-slate-800" />
              <div className="flex items-center gap-1">
                <Wifi className="h-2.5 w-2.5" />
                <Battery className="h-2.5 w-2.5" />
              </div>
            </div>

            {/* Mobile App Bar */}
            <div className="border-b border-slate-200 bg-white px-3.5 py-2.5 text-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-semibold text-slate-500">{translate('previewGreeting')}</p>
                  <p className="text-[11px] font-black tracking-tight">{translate('previewDiscover')}</p>
                </div>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                  <Bell className="h-3 w-3 text-slate-500" />
                </span>
              </div>
            </div>

            {/* App Body Content */}
            <div className="space-y-2.5 p-3">
              {isAppDetail && (
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-800">
                  <p className="text-[7.5px] uppercase tracking-wider text-slate-500">
                    {translate('previewTournamentLabel')}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold">{translate('previewTournamentTitle')}</p>
                </div>
              )}

              {isAppMatches ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-800">{translate('previewLiveMatches')}</p>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </div>
                  {renderMatchRow(0)}
                  {renderMatchRow(1)}
                  <div className="pt-1">{renderPreviewSamples(true)}</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-800">
                      {isAppFeed ? translate('previewFeaturedTournaments') : translate('previewTournamentLabel')}
                    </p>
                    <span className="text-[8.5px] font-semibold text-blue-600">{translate('previewSeeAll')}</span>
                  </div>
                  {renderPreviewSamples(true)}
                  {renderTournamentCard()}
                  <div className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-2xs">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                      <Users className="h-3 w-3" />
                    </span>
                    <div>
                      <p className="text-[8.5px] font-bold text-slate-700">{translate('previewClubActivity')}</p>
                      <p className="text-[7.5px] text-slate-400">{translate('previewClubActivityMeta')}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Home Indicator */}
            <div className="flex justify-center pb-1.5 pt-1">
              <div className="h-1 w-20 rounded-full bg-slate-300" />
            </div>
          </div>
        </div>
      );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {renderBrowserBar()}
        {renderWebHeader()}

        <div className="space-y-3 p-3.5">
          {isHeader && (
            <div className="mb-2">
              {renderPreviewSamples(true)}
            </div>
          )}

          <div className="flex items-end justify-between border-b border-slate-100 pb-2">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-blue-600">
                {translate('previewGreeting')}
              </p>
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
                {translate('previewDiscover')}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold text-slate-400">
              <MapPin className="h-2.5 w-2.5" />
              {translate('previewLocation')}
            </span>
          </div>

          {isSidebar ? (
            <div className="grid grid-cols-[minmax(0,1fr)_165px] gap-3 items-start">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-800">{translate('previewFeaturedTournaments')}</h4>
                  <span className="text-[8.5px] font-semibold text-blue-600">{translate('previewSeeAll')}</span>
                </div>
                {renderTournamentCard()}
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-800">{translate('previewLiveMatches')}</h4>
                  <span className="text-[8.5px] text-slate-400">{translate('previewToday')}</span>
                </div>
                {renderMatchRow(0)}
              </div>

              <div className="space-y-2.5">
                {renderPreviewSamples(true)}
                {renderSidebarWidget()}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {renderTournamentCard()}
                {renderTournamentCard()}
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-800">
                  {isHorizontal ? translate('previewLiveMatches') : translate('previewLatestActivity')}
                </h4>
                <span className="text-[8.5px] font-semibold text-blue-600">{translate('previewSeeAll')}</span>
              </div>
              <div className="space-y-1.5">
                {renderMatchRow(0)}
                {renderMatchRow(1)}
              </div>
              {renderPreviewSamples(true)}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-3">
      {/* Top Preview Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          {translate('previewTitle')}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-[9.5px] font-bold text-slate-600 shadow-2xs">
          {slotBadge}
        </span>
      </div>

      {/* Mode & Device Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={previewMode === 'page'}
            onClick={() => setPreviewMode('page')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
              previewMode === 'page'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            {translate('previewModePage')}
          </button>
          <button
            type="button"
            aria-pressed={previewMode === 'placement'}
            onClick={() => setPreviewMode('placement')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
              previewMode === 'placement'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Eye className="h-3 w-3" />
            {translate('previewModePlacement')}
          </button>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg bg-slate-200/60 p-0.5">
          <button
            type="button"
            disabled={isApp}
            aria-pressed={viewport === 'desktop'}
            onClick={() => setViewport('desktop')}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9.5px] font-bold transition-all ${
              isApp
                ? 'cursor-not-allowed text-slate-300'
                : viewport === 'desktop'
                  ? 'bg-white text-slate-800 shadow-2xs cursor-default'
                  : 'text-slate-500 hover:text-slate-800 cursor-pointer'
            }`}
          >
            <Monitor className="h-3 w-3" />
            {translate('previewDesktop')}
          </button>
          <button
            type="button"
            aria-pressed={viewport === 'mobile'}
            onClick={() => setViewport('mobile')}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9.5px] font-bold transition-all ${
              viewport === 'mobile'
                ? 'bg-white text-slate-800 shadow-2xs cursor-default'
                : 'text-slate-500 hover:text-slate-800 cursor-pointer'
            }`}
          >
            <Smartphone className="h-3 w-3" />
            {translate('previewMobile')}
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold text-slate-800">{translate('previewSampleTitle')}</p>
            <p className="text-[8.5px] text-slate-500">{translate('previewSampleHelp')}</p>
          </div>
          <button
            type="button"
            aria-pressed={showSamples}
            aria-label={showSamples ? translate('previewHideSamples') : translate('previewShowSamples')}
            onClick={() => setShowSamples((visible) => !visible)}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            {showSamples ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showSamples ? translate('previewHideSamples') : translate('previewShowSamples')}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold text-slate-600">{translate('previewSampleCount')}</span>
            <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 shadow-2xs">
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={sampleCount === count}
                  onClick={() => {
                    setSampleCount(count);
                    setSampleIndex(0);
                  }}
                  className={`h-6 min-w-6 rounded-md px-1.5 text-[9px] font-bold ${sampleCount === count ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              aria-pressed={sampleLayout === 'slide'}
              onClick={() => setSampleLayout('slide')}
              className={`rounded-md px-2 py-1 text-[9px] font-bold ${sampleLayout === 'slide' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {translate('previewSlideMode')}
            </button>
            <button
              type="button"
              aria-pressed={sampleLayout === 'stack'}
              onClick={() => setSampleLayout('stack')}
              className={`rounded-md px-2 py-1 text-[9px] font-bold ${sampleLayout === 'stack' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {translate('previewStackMode')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="transition-all duration-300">
        {previewMode === 'page' ? (
          renderPageMockup()
        ) : (
          <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            {renderPreviewSamples()}
          </div>
        )}
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5">
          <span className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
            {translate('previewPosition')}
          </span>
          <span className="font-bold text-slate-700">{slotBadge}</span>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5">
          <span className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
            {translate('previewDevice')}
          </span>
          <span className="font-bold text-slate-700">
            {viewport === 'mobile' ? translate('previewMobile') : translate('previewDesktop')}
          </span>
        </div>
      </div>

      {targetUrl && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[10px]">
          <span className="text-[9px] font-bold text-slate-400">{translate('previewTarget')}</span>
          <span className="inline-flex max-w-[260px] items-center gap-1 truncate font-semibold text-blue-600">
            {targetUrl}
          </span>
        </div>
      )}
    </div>
  );
};
