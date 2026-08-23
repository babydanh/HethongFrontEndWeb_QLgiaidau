import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Code, Eye, EyeOff, Image as ImageIcon, Monitor, Smartphone } from 'lucide-react';
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
type PreviewReference = 1 | 2 | 3 | 4 | 5 | 6;

type PreviewSample = {
  id: string;
  kicker: string;
  title: string;
  detail: string;
  cta: string;
};

const PREVIEW_REFERENCES: PreviewReference[] = [1, 2, 3, 4, 5, 6];
const APP_SLOTS: AdPlacementSlot[] = [
  'APP_HOME_FEED',
  'APP_MATCHES_BOTTOM',
  'APP_COMMUNITY_FEED',
  'APP_TOURNAMENT_DETAIL',
];

const REFERENCE_HINT_KEYS: Record<PreviewReference, 'previewReference1Hint' | 'previewReference2Hint' | 'previewReference3Hint' | 'previewReference4Hint' | 'previewReference5Hint' | 'previewReference6Hint'> = {
  1: 'previewReference1Hint',
  2: 'previewReference2Hint',
  3: 'previewReference3Hint',
  4: 'previewReference4Hint',
  5: 'previewReference5Hint',
  6: 'previewReference6Hint',
};

export const BannerPreviewCard: React.FC<BannerPreviewCardProps> = ({
  bannerType,
  placementSlot,
  title,
  description,
  imageUrl,
  targetUrl,
  ctaText,
  customHtml,
}) => {
  const translate = useTranslations('AdminBanners');
  const isApp = APP_SLOTS.includes(placementSlot);
  const isSidebar = placementSlot === 'HOMEPAGE_SIDEBAR';
  const isHorizontal = placementSlot === 'TOURNAMENTS_BOTTOM' || placementSlot === 'MATCHES_BOTTOM';
  const isHeader = placementSlot === 'GLOBAL_HEADER';
  const isAppMatches = placementSlot === 'APP_MATCHES_BOTTOM';

  const defaultReference: PreviewReference = isSidebar
    ? 1
    : placementSlot === 'TOURNAMENTS_BOTTOM'
      ? 2
      : placementSlot === 'MATCHES_BOTTOM'
        ? 3
        : placementSlot === 'GLOBAL_HEADER'
          ? 4
          : isApp
            ? 6
            : 5;

  const [previewMode, setPreviewMode] = useState<PreviewMode>('page');
  const [viewport, setViewport] = useState<PreviewViewport>(isApp ? 'mobile' : 'desktop');
  const [sampleCount, setSampleCount] = useState(3);
  const [sampleLayout, setSampleLayout] = useState<SampleLayout>(isSidebar ? 'stack' : 'slide');
  const [sampleIndex, setSampleIndex] = useState(0);
  const [showSamples, setShowSamples] = useState(true);
  const [previewReference, setPreviewReference] = useState<PreviewReference>(defaultReference);
  const [imageError, setImageError] = useState(false);

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

  /* eslint-disable react-hooks/set-state-in-effect -- reset local preview controls when the placement changes */
  useEffect(() => {
    setViewport(isApp ? 'mobile' : 'desktop');
    setSampleLayout(isSidebar ? 'stack' : 'slide');
    setSampleCount(3);
    setSampleIndex(0);
    setPreviewReference(defaultReference);
  }, [defaultReference, isApp, isSidebar]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const slotBadge = isApp
    ? translate('previewAppPlacement')
    : isSidebar
      ? translate('previewSidebarPlacement')
      : isHeader
        ? translate('previewHeaderPlacement')
        : isHorizontal
          ? translate('previewBottomPlacement')
          : translate('previewDetailPlacement');

  const referenceHints: Record<PreviewReference, string> = {
    1: translate(REFERENCE_HINT_KEYS[1]),
    2: translate(REFERENCE_HINT_KEYS[2]),
    3: translate(REFERENCE_HINT_KEYS[3]),
    4: translate(REFERENCE_HINT_KEYS[4]),
    5: translate(REFERENCE_HINT_KEYS[5]),
    6: translate(REFERENCE_HINT_KEYS[6]),
  };

  const aspectClass = (compact = false) => {
    if (isSidebar) return compact ? 'aspect-[4/3]' : 'aspect-[4/3]';
    if (isHorizontal || isHeader) return 'aspect-[8/1]';
    if (isAppMatches) return 'aspect-[6.4/1]';
    return compact ? 'aspect-[16/9]' : 'aspect-[3/1]';
  };

  const renderCurrentBanner = (compact = false) => {
    if (bannerType === 'CUSTOM_HTML') {
      return (
        <div className={`flex w-full ${aspectClass(compact)} items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-slate-500`}>
          <div className="flex items-center gap-1.5 text-[9px] font-semibold">
            <Code className="h-3.5 w-3.5" />
            {translate('previewHtmlPlaceholder')}
          </div>
        </div>
      );
    }

    if (!imageUrl || imageError) {
      return (
        <div className={`flex w-full ${aspectClass(compact)} items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-slate-500`}>
          <div>
            <ImageIcon className="mx-auto mb-1 h-4 w-4 text-slate-400" />
            <p className="text-[9px] font-semibold">{title || translate('previewNoImage')}</p>
            <p className="mt-0.5 text-[8px] text-slate-400">{translate('previewCurrentBanner')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative w-full ${aspectClass(compact)} overflow-hidden rounded-lg border border-slate-200 bg-slate-100`}>
        <img src={imageUrl} alt={title || translate('previewAdLabel')} onError={() => setImageError(true)} className="h-full w-full object-cover" />
        <span className="absolute left-1.5 top-1.5 rounded border border-white/70 bg-white/90 px-1.5 py-0.5 text-[7px] font-bold uppercase text-slate-600">
          {translate('previewCurrentBanner')}
        </span>
      </div>
    );
  };

  const renderSampleBanner = (sample: PreviewSample, compact = false) => (
    <div className={`relative w-full ${aspectClass(compact)} overflow-hidden rounded-lg border border-slate-200 bg-slate-200 ${compact ? 'p-2' : 'p-3'}`}>
      <ImageIcon className="absolute right-3 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-300" />
      <div className="relative flex h-full max-w-[82%] flex-col justify-between text-slate-800">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded border border-slate-300 bg-white/90 px-1.5 py-0.5 text-[7px] font-bold uppercase text-slate-500">{translate('previewSampleBadge')}</span>
          <span className="text-[8px] font-semibold text-slate-500">SportO</span>
        </div>
        <div>
          <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-slate-500">{sample.kicker}</p>
          <p className={`mt-0.5 font-black leading-tight text-slate-900 ${compact ? 'text-[10px]' : 'text-[13px]'}`}>{sample.title}</p>
          <p className={`mt-0.5 line-clamp-1 leading-tight text-slate-600 ${compact ? 'text-[7px]' : 'text-[8px]'}`}>{sample.detail}</p>
          <span className={`inline-flex rounded bg-slate-800 px-2 font-bold text-white ${compact ? 'mt-1 py-0.5 text-[7px]' : 'mt-1.5 py-0.5 text-[8px]'}`}>{sample.cta}</span>
        </div>
      </div>
    </div>
  );

  const renderPreviewItem = (sample: PreviewSample | null, compact = false) => sample ? renderSampleBanner(sample, compact) : renderCurrentBanner(compact);

  const renderSamples = (compact = false) => {
    const items: (PreviewSample | null)[] = showSamples ? [null, ...previewSamples].slice(0, sampleCount) : [null];
    const safeIndex = Math.min(sampleIndex, items.length - 1);

    if (sampleLayout === 'stack') {
      return (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item?.id ?? 'current'} className="relative">
              {renderPreviewItem(item, compact)}
              {index === 0 && items.length > 1 && <span className="absolute bottom-1.5 left-1.5 rounded border border-white/70 bg-white/90 px-1.5 py-0.5 text-[7px] font-bold text-slate-600">{translate('previewCurrentBanner')}</span>}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="overflow-hidden rounded-lg">{renderPreviewItem(items[safeIndex], compact)}</div>
        {items.length > 1 && (
          <>
            <button type="button" aria-label={translate('previewPrevious')} onClick={() => setSampleIndex((index) => (index - 1 + items.length) % items.length)} className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-700 shadow-sm">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={translate('previewNext')} onClick={() => setSampleIndex((index) => (index + 1) % items.length)} className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-700 shadow-sm">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white/90 px-1.5 py-1">
              {items.map((item, index) => (
                <button key={item?.id ?? 'current-dot'} type="button" aria-label={translate('previewSlide', { current: index + 1, total: items.length })} aria-current={safeIndex === index ? 'true' : undefined} onClick={() => setSampleIndex(index)} className={`h-1.5 rounded-full ${safeIndex === index ? 'w-4 bg-slate-700' : 'w-1.5 bg-slate-300'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderPagination = () => (
    <div className="flex items-center justify-center gap-1.5 border-t border-slate-200 pt-2">
      <span className="px-1.5 py-1 text-[8px] text-slate-400">{translate('previewPrevious')}</span>
      <span className="rounded border border-slate-200 bg-white px-2 py-1 text-[8px] text-slate-600">1</span>
      <span className="rounded bg-slate-700 px-2 py-1 text-[8px] font-semibold text-white">2</span>
      <span className="rounded border border-slate-200 bg-white px-2 py-1 text-[8px] text-slate-600">3</span>
      <span className="px-1.5 py-1 text-[8px] text-slate-600">{translate('previewNext')}</span>
    </div>
  );

  const renderPlacementFrame = () => {
    const sidebar = previewReference === 1 || previewReference === 5;
    const pagination = previewReference === 2 || previewReference === 3;
    const footer = previewReference === 4 || previewReference === 6;

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-[10px] font-bold text-slate-800">SportO</span>
          <span className="text-[8px] text-slate-500">{referenceHints[previewReference]}</span>
        </div>
        {sidebar ? (
          <div className="grid grid-cols-[minmax(0,1fr)_150px] items-start gap-3 p-3">
            <div className="space-y-2">
              <div className="h-8 rounded border border-slate-200 bg-slate-100" />
              <div className="grid grid-cols-2 gap-2"><div className="h-16 rounded border border-slate-200 bg-slate-50" /><div className="h-16 rounded border border-slate-200 bg-slate-50" /></div>
              <div className="h-8 rounded border border-slate-200 bg-slate-50" />
            </div>
            <div className="space-y-2">
              {renderSamples(true)}
              <div className="rounded border border-slate-200 bg-slate-50 p-2 text-[8px] text-slate-500">{previewReference === 1 ? translate('previewTopPlayers') : translate('previewOrganizer')}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-3 gap-2"><div className="h-12 rounded border border-slate-200 bg-slate-100" /><div className="h-12 rounded border border-slate-200 bg-slate-100" /><div className="h-12 rounded border border-slate-200 bg-slate-100" /></div>
            <div className="h-8 rounded border border-slate-200 bg-slate-50" />
            {pagination && renderPagination()}
            <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-1.5">{renderSamples(true)}</div>
            {footer && (
              <div className="border-t border-slate-200 pt-3"><div className="grid grid-cols-3 gap-3 text-[8px] text-slate-500"><div><p className="font-bold text-slate-700">SportO</p><p>{translate('previewFooterTagline')}</p></div><div><p className="font-bold text-slate-700">{translate('previewFooterProduct')}</p><p>{translate('previewTournaments')}</p></div><div><p className="font-bold text-slate-700">{translate('previewFooterLegal')}</p><p>{translate('previewPrivacy')}</p></div></div></div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-800">{translate('previewTitle')}</span><span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[9px] font-bold text-slate-600">{slotBadge}</span></div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <div className="flex gap-1"><button type="button" aria-pressed={previewMode === 'page'} onClick={() => setPreviewMode('page')} className={`rounded-md px-2.5 py-1 text-[9px] font-bold ${previewMode === 'page' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>{translate('previewModePage')}</button><button type="button" aria-pressed={previewMode === 'placement'} onClick={() => setPreviewMode('placement')} className={`rounded-md px-2.5 py-1 text-[9px] font-bold ${previewMode === 'placement' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>{translate('previewModePlacement')}</button></div>
        <div className="flex gap-1"><button type="button" disabled={isApp} aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')} className={`rounded-md px-2 py-1 text-[9px] font-bold ${viewport === 'desktop' && !isApp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Monitor className="mr-1 inline h-3 w-3" />{translate('previewDesktop')}</button><button type="button" aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')} className={`rounded-md px-2 py-1 text-[9px] font-bold ${viewport === 'mobile' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Smartphone className="mr-1 inline h-3 w-3" />{translate('previewMobile')}</button></div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold text-slate-800">{translate('previewSampleTitle')}</p><p className="text-[8px] text-slate-500">{translate('previewSampleHelp')}</p></div><button type="button" aria-pressed={showSamples} onClick={() => setShowSamples((visible) => !visible)} className="inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-white px-2 text-[9px] font-bold text-slate-700">{showSamples ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{showSamples ? translate('previewHideSamples') : translate('previewShowSamples')}</button></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-1.5"><span className="text-[9px] font-semibold text-slate-600">{translate('previewSampleCount')}</span><div className="flex rounded bg-white p-0.5">{[1, 2, 3].map((count) => <button key={count} type="button" aria-pressed={sampleCount === count} onClick={() => { setSampleCount(count); setSampleIndex(0); }} className={`h-6 min-w-6 rounded px-1.5 text-[9px] font-bold ${sampleCount === count ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{count}</button>)}</div></div><div className="flex rounded bg-white p-0.5"><button type="button" aria-pressed={sampleLayout === 'slide'} onClick={() => setSampleLayout('slide')} className={`rounded px-2 py-1 text-[9px] font-bold ${sampleLayout === 'slide' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>{translate('previewSlideMode')}</button><button type="button" aria-pressed={sampleLayout === 'stack'} onClick={() => setSampleLayout('stack')} className={`rounded px-2 py-1 text-[9px] font-bold ${sampleLayout === 'stack' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>{translate('previewStackMode')}</button></div></div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5"><span className="text-[9px] font-semibold text-slate-600">{translate('previewReferenceLabel')}</span><div className="flex gap-1">{PREVIEW_REFERENCES.map((reference) => <button key={reference} type="button" aria-pressed={previewReference === reference} aria-label={translate('previewReference', { number: reference })} onClick={() => setPreviewReference(reference)} className={`h-6 min-w-6 rounded px-1.5 text-[9px] font-bold ${previewReference === reference ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{reference}</button>)}</div><span className="text-[8px] text-slate-400">{referenceHints[previewReference]}</span></div>

      <div>{previewMode === 'page' ? renderPlacementFrame() : <div className="rounded-lg border border-slate-200 bg-white p-2">{renderSamples()}</div>}</div>

      <div className="grid grid-cols-2 gap-2 text-[9px]"><div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5"><span className="block text-[8px] font-bold uppercase text-slate-400">{translate('previewPosition')}</span><span className="font-bold text-slate-700">{slotBadge}</span></div><div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5"><span className="block text-[8px] font-bold uppercase text-slate-400">{translate('previewDevice')}</span><span className="font-bold text-slate-700">{viewport === 'mobile' ? translate('previewMobile') : translate('previewDesktop')}</span></div></div>

      {targetUrl && <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px]"><span className="font-bold text-slate-400">{translate('previewTarget')}</span><span className="max-w-[250px] truncate font-semibold text-slate-600">{targetUrl}</span></div>}
      {description && <p className="sr-only">{description}</p>}
      {ctaText && <span className="sr-only">{ctaText}</span>}
      {customHtml && <span className="sr-only">{customHtml}</span>}
    </div>
  );
};
