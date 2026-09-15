'use client';

import React from 'react';
import { ExternalLink, Globe, Handshake, ImageIcon, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import SponsorLogo from '@/components/tournaments/SponsorLogo';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/utils/error';
import { uploadApi } from '@/features/upload/api';
import {
  SPONSOR_TIERS,
  type SponsorPayload,
  type SponsorTier,
  type TournamentSponsor,
  tournamentsApi,
} from '@/features/tournaments/api';
import { getSponsorTierStyle } from '@/features/tournaments/sponsor-tier-style';

interface SponsorSettingsPanelProps {
  tournamentId: string;
}

type SponsorDraft = {
  displayName: string;
  tier: SponsorTier;
  logoUrl: string;
  websiteUrl: string;
  isPublic: boolean;
};

const emptyDraft = (): SponsorDraft => ({
  displayName: '',
  tier: 'GOLD',
  logoUrl: '',
  websiteUrl: '',
  isPublic: true,
});

const toDraft = (sponsor: TournamentSponsor): SponsorDraft => ({
  displayName: sponsor.displayName || '',
  tier: sponsor.tier || 'GOLD',
  logoUrl: sponsor.logoUrl || '',
  websiteUrl: sponsor.websiteUrl || '',
  isPublic: sponsor.status === 'PUBLISHED' && (sponsor.isPublic ?? true),
});

export default function SponsorSettingsPanel({ tournamentId }: SponsorSettingsPanelProps) {
  const translate = useTranslations('OrganizerBasicInfo');
  const [sponsors, setSponsors] = React.useState<TournamentSponsor[]>([]);
  const [drafts, setDrafts] = React.useState<Record<string, SponsorDraft>>({});
  const [newDraft, setNewDraft] = React.useState<SponsorDraft>(emptyDraft);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [uploadingId, setUploadingId] = React.useState<string | null>(null);

  const loadSponsors = React.useCallback(async () => {
    try {
      const response = await tournamentsApi.getOrganizerSponsors(tournamentId);
      const items = Array.isArray(response.data) ? response.data : [];
      setSponsors(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.id, toDraft(item)])));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [tournamentId]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void loadSponsors(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSponsors]);

  const updateDraft = (id: string, patch: Partial<SponsorDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const validateDraft = (draft: SponsorDraft) => {
    if (!draft.displayName.trim() || !draft.logoUrl.trim()) {
      toast.error(translate('sponsors.requiredFields'));
      return false;
    }
    if (draft.websiteUrl.trim()) {
      const normalizedUrl = draft.websiteUrl.trim();
      if (!/^https?:\/\//i.test(normalizedUrl) && !normalizedUrl.includes('.')) {
        toast.error(translate('sponsors.invalidUrl'));
        return false;
      }
    }
    return true;
  };

  const toPayload = (draft: SponsorDraft): SponsorPayload => {
    let website = draft.websiteUrl.trim() || null;
    if (website && !/^https?:\/\//i.test(website)) {
      website = `https://${website}`;
    }
    return {
      displayName: draft.displayName.trim(),
      tier: draft.tier,
      logoUrl: draft.logoUrl.trim(),
      websiteUrl: website,
      shortDescription: null,
      displayOrder: 0,
      status: draft.isPublic ? 'PUBLISHED' : 'DRAFT',
      isPublic: draft.isPublic,
      startAt: null,
      endAt: null,
    };
  };

  const saveSponsor = async (sponsorId: string) => {
    const draft = drafts[sponsorId];
    if (!draft || !validateDraft(draft)) return;
    setSavingId(sponsorId);
    try {
      await tournamentsApi.updateSponsor(tournamentId, sponsorId, toPayload(draft));
      toast.success(translate('sponsors.saved'));
      setExpandedId(null);
      await loadSponsors();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const addSponsor = async () => {
    if (!validateDraft(newDraft)) return;
    setIsAdding(true);
    try {
      await tournamentsApi.createSponsor(tournamentId, toPayload(newDraft));
      toast.success(translate('sponsors.created'));
      setNewDraft(emptyDraft());
      setIsAddFormOpen(false);
      await loadSponsors();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsAdding(false);
    }
  };

  const archiveSponsor = async (sponsorId: string) => {
    if (!window.confirm(translate('sponsors.archiveConfirm'))) return;
    setSavingId(sponsorId);
    try {
      await tournamentsApi.archiveSponsor(tournamentId, sponsorId);
      toast.success(translate('sponsors.archived'));
      await loadSponsors();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const uploadLogo = async (target: 'new' | string, file?: File) => {
    if (!file) return;
    setUploadingId(target);
    try {
      const result = await uploadApi.uploadImage(file);
      if (target === 'new') setNewDraft((current) => ({ ...current, logoUrl: result.url }));
      else updateDraft(target, { logoUrl: result.url });
      toast.success(translate('sponsors.logoUploaded'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingId(null);
    }
  };

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'SP';

  const renderPreview = (draft: SponsorDraft) => {
    const isPubliclyReady = draft.isPublic;
    const tierStyle = getSponsorTierStyle(draft.tier);
    const tierLabel = translate(`sponsors.tiers.${draft.tier}`);
    const displayName = draft.displayName.trim() || translate('sponsors.previewPlaceholder');

    return (
      <aside
        className={cn('rounded-2xl border p-3 bg-slate-50/50 flex flex-col justify-between', tierStyle.surfaceClassName)}
        aria-label={translate('sponsors.previewTitle')}
      >
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={cn('truncate text-[10px] font-black uppercase tracking-wider', tierStyle.accentClassName)}>
              {translate('sponsors.previewTitle')}
            </span>
            <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', tierStyle.badgeClassName)}>
              {tierLabel}
            </span>
          </div>

          <div className={cn('rounded-xl border border-t-2 bg-white p-3 shadow-xs', tierStyle.accentBorderClassName)}>
            <div className="flex flex-col items-center text-center">
              <SponsorLogo
                logoUrl={draft.logoUrl}
                alt={displayName}
                initials={getInitials(displayName)}
                className={cn('h-16 w-full max-w-[170px] rounded-lg border p-2', tierStyle.logoFrameClassName)}
                imageClassName="h-full w-full"
              />
              <p className="mt-2.5 w-full truncate text-xs font-black text-slate-900">{displayName}</p>
              <span className={cn('mt-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide', tierStyle.badgeClassName)}>
                {tierLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2 text-[10px] font-semibold">
          <span className="text-slate-500">Trạng thái:</span>
          <span className={cn('inline-flex items-center gap-1.5', isPubliclyReady ? 'text-emerald-600' : 'text-slate-400')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', isPubliclyReady ? 'bg-emerald-500' : 'bg-slate-300')} />
            {isPubliclyReady ? translate('sponsors.previewAlwaysVisible') : translate('sponsors.previewNotPublic')}
          </span>
        </div>
      </aside>
    );
  };

  const renderEditor = (
    draft: SponsorDraft,
    onChange: (patch: Partial<SponsorDraft>) => void,
    target: 'new' | string
  ) => {
    const isUploading = uploadingId === target;

    return (
      <div className="space-y-4">
        {/* Upload Logo area */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            {translate('sponsors.logoUrl')} <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            <label className="group relative flex h-20 w-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-amber-400 hover:bg-amber-50/40">
              {draft.logoUrl ? (
                <>
                  <img
                    src={draft.logoUrl}
                    alt="Logo"
                    className="h-full w-full object-contain p-1.5 rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-amber-600">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-[10px] font-bold">{translate('sponsors.uploadLogo')}</span>
                    </>
                  )}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={isUploading}
                className="hidden"
                onChange={(event) => {
                  void uploadLogo(target, event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-600">
                {draft.logoUrl ? 'Bấm vào ảnh để thay đổi logo mới' : 'Tải lên logo nhà tài trợ (PNG, JPG, SVG)'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Kích thước khuyến nghị: tỷ lệ 16:9 hoặc hình vuông, nền trong suốt.
              </p>
              {draft.logoUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ logoUrl: '' })}
                  className="mt-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600"
                >
                  Xóa ảnh
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Col: Name & Tier */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-slate-700">
            <span>{translate('sponsors.name')} <span className="text-rose-500">*</span></span>
            <input
              type="text"
              value={draft.displayName}
              onChange={(event) => onChange({ displayName: event.target.value })}
              placeholder="VD: Yonex, Victor, Red Bull..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              maxLength={160}
            />
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-700">
            <span>{translate('sponsors.tier')}</span>
            <select
              value={draft.tier}
              onChange={(event) => onChange({ tier: event.target.value as SponsorTier })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {SPONSOR_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {translate(`sponsors.tiers.${tier}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Website link */}
        <label className="block space-y-1 text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>{translate('sponsors.websiteUrl')}</span>
            <span className="text-[10px] font-normal text-slate-400">(không bắt buộc)</span>
          </span>
          <input
            type="text"
            value={draft.websiteUrl}
            onChange={(event) => onChange({ websiteUrl: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="https://yonex.com hoặc link Facebook"
          />
        </label>

        {/* Single Visibility Switch */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div>
            <span className="block text-xs font-bold text-slate-800">Hiển thị công khai</span>
            <span className="block text-[11px] font-normal text-slate-500">
              Cho phép hiển thị logo nhà tài trợ này trên trang giải đấu cho mọi người thấy.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.isPublic}
            onClick={() => onChange({ isPublic: !draft.isPublic })}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
              draft.isPublic ? 'bg-amber-600' : 'bg-slate-200'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                draft.isPublic ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-5 border-t border-slate-200 pt-6" aria-labelledby="sponsor-settings-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 id="sponsor-settings-heading" className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Handshake className="h-4 w-4 text-amber-500" />
            {translate('sponsors.title')}
          </h4>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {translate('sponsors.description')}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
          {translate('sponsors.mvpBadge')}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sponsors.map((sponsor) => {
          const draft = drafts[sponsor.id] || toDraft(sponsor);
          const tierStyle = getSponsorTierStyle(sponsor.tier);
          const sponsorInitials = getInitials(sponsor.displayName);

          if (sponsor.status === 'ARCHIVED') {
            return (
              <div
                key={sponsor.id}
                className="rounded-xl border border-slate-200 bg-slate-100 p-3 opacity-75 sm:col-span-2 xl:col-span-3"
                aria-label={translate('sponsors.archived')}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-700">{sponsor.displayName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {translate(`sponsors.tiers.${sponsor.tier}`)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                    {translate('sponsors.archived')}
                  </span>
                </div>
              </div>
            );
          }

          if (expandedId !== sponsor.id) {
            const isPublic = sponsor.status === 'PUBLISHED' && (sponsor.isPublic ?? true);
            return (
              <div key={sponsor.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
                <div className="flex flex-col items-center text-center">
                  <SponsorLogo
                    logoUrl={sponsor.logoUrl}
                    alt={sponsor.displayName}
                    initials={sponsorInitials}
                    className={cn('h-20 w-full max-w-[170px] rounded-lg border p-2', tierStyle.logoFrameClassName)}
                    imageClassName="h-full w-full"
                  />
                  <p className="mt-2.5 w-full truncate text-sm font-black text-slate-800" title={sponsor.displayName}>
                    {sponsor.displayName}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap justify-center">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', tierStyle.badgeClassName)}>
                      {translate(`sponsors.tiers.${sponsor.tier}`)}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border',
                      isPublic ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', isPublic ? 'bg-emerald-500' : 'bg-slate-400')} />
                      {isPublic ? 'Công khai' : 'Bản nháp'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2.5 flex items-center gap-2">
                  {sponsor.websiteUrl && (
                    <a
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      title={sponsor.websiteUrl}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setExpandedId(sponsor.id)}
                    className="h-8 flex-1 text-xs font-bold"
                  >
                    {translate('sponsors.edit')}
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={sponsor.id}
              className="rounded-2xl border border-blue-200 bg-blue-50/20 p-4 sm:col-span-2 xl:col-span-3 shadow-xs"
            >
              <div className="mb-4 flex items-center justify-between border-b border-blue-100 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700">
                  {translate('sponsors.edit')}: {sponsor.displayName}
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  {translate('sponsors.closeEditor')}
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div>{renderEditor(draft, (patch) => updateDraft(sponsor.id, patch), sponsor.id)}</div>
                {renderPreview(draft)}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-blue-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void archiveSponsor(sponsor.id)}
                  disabled={savingId === sponsor.id}
                  className="border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {translate('sponsors.archive')}
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveSponsor(sponsor.id)}
                  disabled={savingId === sponsor.id}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {savingId === sponsor.id ? translate('sponsors.saving') : translate('sponsors.save')}
                </Button>
              </div>
            </div>
          );
        })}

        {sponsors.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs font-medium text-slate-500 sm:col-span-2 xl:col-span-3">
            {translate('sponsors.empty')}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4">
        {!isAddFormOpen ? (
          <Button
            type="button"
            onClick={() => setIsAddFormOpen(true)}
            className="w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {translate('sponsors.addTitle')}
          </Button>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between border-b border-amber-200/60 pb-3">
              <h5 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Plus className="h-4 w-4 text-amber-600" />
                {translate('sponsors.addTitle')}
              </h5>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                {translate('sponsors.cancel')}
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                {renderEditor(
                  newDraft,
                  (patch) => setNewDraft((current) => ({ ...current, ...patch })),
                  'new'
                )}
              </div>
              {renderPreview(newDraft)}
            </div>

            <div className="mt-5 flex justify-end border-t border-amber-200/60 pt-3">
              <Button
                type="button"
                onClick={() => void addSponsor()}
                disabled={isAdding}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {isAdding ? translate('sponsors.adding') : translate('sponsors.add')}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
