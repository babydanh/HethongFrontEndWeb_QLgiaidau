'use client';

import React from 'react';
import { ExternalLink, Handshake, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
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
  shortDescription: string;
  displayOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  isPublic: boolean;
  advancedScheduling: boolean;
  startAt: string;
  endAt: string;
};

const emptyDraft = (): SponsorDraft => ({
  displayName: '',
  tier: 'GOLD',
  logoUrl: '',
  websiteUrl: '',
  shortDescription: '',
  displayOrder: 0,
  status: 'DRAFT',
  isPublic: true,
  advancedScheduling: false,
  startAt: '',
  endAt: '',
});

const formatDateTimeInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeInput = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year, hours, minutes] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), 0, 0);
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hours) ||
    date.getMinutes() !== Number(minutes)
  ) return null;
  return date;
};

const toDraft = (sponsor: TournamentSponsor): SponsorDraft => ({
  displayName: sponsor.displayName,
  tier: sponsor.tier,
  logoUrl: sponsor.logoUrl,
  websiteUrl: sponsor.websiteUrl || '',
  shortDescription: sponsor.shortDescription || '',
  displayOrder: sponsor.displayOrder,
  status: sponsor.status === 'ARCHIVED' ? 'HIDDEN' : sponsor.status || 'DRAFT',
  isPublic: sponsor.isPublic ?? true,
  advancedScheduling: Boolean(sponsor.startAt || sponsor.endAt),
  startAt: formatDateTimeInput(sponsor.startAt),
  endAt: formatDateTimeInput(sponsor.endAt),
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
    if (draft.websiteUrl && !/^https?:\/\//i.test(draft.websiteUrl.trim())) {
      toast.error(translate('sponsors.invalidUrl'));
      return false;
    }
    if (draft.advancedScheduling) {
      const startAt = draft.startAt ? parseDateTimeInput(draft.startAt) : null;
      const endAt = draft.endAt ? parseDateTimeInput(draft.endAt) : null;
      if ((draft.startAt && !startAt) || (draft.endAt && !endAt)) {
        toast.error(translate('sponsors.invalidDateTime'));
        return false;
      }
      if (startAt && endAt && startAt > endAt) {
        toast.error(translate('sponsors.invalidDateRange'));
        return false;
      }
    }
    return true;
  };

  const toPayload = (draft: SponsorDraft): SponsorPayload => ({
    displayName: draft.displayName.trim(),
    tier: draft.tier,
    logoUrl: draft.logoUrl.trim(),
    websiteUrl: draft.websiteUrl.trim() || null,
    shortDescription: draft.shortDescription.trim() || null,
    displayOrder: Math.max(0, Number(draft.displayOrder) || 0),
    status: draft.status,
    isPublic: draft.isPublic,
    startAt: draft.advancedScheduling && draft.startAt ? parseDateTimeInput(draft.startAt)?.toISOString() ?? null : null,
    endAt: draft.advancedScheduling && draft.endAt ? parseDateTimeInput(draft.endAt)?.toISOString() ?? null : null,
  });

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

  const getInitials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SP';

  const renderPreview = (draft: SponsorDraft) => {
    const isPubliclyReady = draft.status === 'PUBLISHED' && draft.isPublic;
    const tierStyle = getSponsorTierStyle(draft.tier);
    const tierLabel = translate(`sponsors.tiers.${draft.tier}`);
    const displayName = draft.displayName.trim() || translate('sponsors.previewPlaceholder');

    return (
      <aside
        className={cn('rounded-2xl border p-2.5', tierStyle.surfaceClassName)}
        aria-label={translate('sponsors.previewTitle')}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={cn('truncate text-[10px] font-black uppercase tracking-[0.12em]', tierStyle.accentClassName)}>
              {translate('sponsors.previewTitle')}
            </p>
            <p className="mt-0.5 truncate text-[9px] font-medium text-slate-500">
              {translate('sponsors.previewDescription')}
            </p>
          </div>
          <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', tierStyle.badgeClassName)}>
            {tierLabel}
          </span>
        </div>

        <div className={cn('rounded-xl border border-t-2 bg-white p-2.5 shadow-sm', tierStyle.accentBorderClassName)}>
          <div className="flex flex-col items-center text-center">
            <SponsorLogo
              logoUrl={draft.logoUrl}
              alt={displayName}
              initials={getInitials(displayName)}
              className={cn('h-16 w-full max-w-[170px] rounded-lg border p-2', tierStyle.logoFrameClassName)}
              imageClassName="h-full w-full"
            />
            <p className="mt-2 w-full truncate text-xs font-black text-slate-900">{displayName}</p>
            <span className={cn('mt-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide', tierStyle.badgeClassName)}>
              {tierLabel}
            </span>
          </div>

          {draft.shortDescription.trim() ? (
            <p className="mt-2 line-clamp-2 text-center text-[10px] font-medium leading-4 text-slate-500">
              {draft.shortDescription.trim()}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[9px] font-bold">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isPubliclyReady ? 'bg-emerald-500' : 'bg-slate-300')} />
            <span className={isPubliclyReady ? 'truncate text-emerald-600' : 'truncate text-slate-400'}>
              {isPubliclyReady
                ? draft.advancedScheduling
                  ? translate('sponsors.previewScheduled')
                  : translate('sponsors.previewAlwaysVisible')
                : translate('sponsors.previewNotPublic')}
            </span>
          </div>
        </div>
      </aside>
    );
  };

  const renderEditor = (draft: SponsorDraft, onChange: (patch: Partial<SponsorDraft>) => void, target: 'new' | string) => (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1 text-xs font-bold text-slate-600">
        <span>{translate('sponsors.name')}</span>
        <input value={draft.displayName} onChange={(event) => onChange({ displayName: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" maxLength={160} />
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-600">
        <span>{translate('sponsors.tier')}</span>
        <select value={draft.tier} onChange={(event) => onChange({ tier: event.target.value as SponsorTier })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
          {SPONSOR_TIERS.map((tier) => <option key={tier} value={tier}>{translate(`sponsors.tiers.${tier}`)}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-600 md:col-span-2">
        <span>{translate('sponsors.logoUrl')}</span>
        <div className="flex gap-2">
          <input value={draft.logoUrl} onChange={(event) => onChange({ logoUrl: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" placeholder="https://..." />
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            {uploadingId === target ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span>{translate('sponsors.uploadLogo')}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(event) => { void uploadLogo(target, event.target.files?.[0]); event.currentTarget.value = ''; }} />
          </label>
        </div>
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-600">
        <span>{translate('sponsors.websiteUrl')}</span>
        <input value={draft.websiteUrl} onChange={(event) => onChange({ websiteUrl: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" placeholder="https://..." />
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-600">
        <span>{translate('sponsors.displayOrder')}</span>
        <input type="number" min={0} value={draft.displayOrder} onChange={(event) => onChange({ displayOrder: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" />
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-600 md:col-span-2">
        <span>{translate('sponsors.descriptionLabel')}</span>
        <textarea value={draft.shortDescription} onChange={(event) => onChange({ shortDescription: event.target.value })} className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" maxLength={500} />
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-600">
        <span>{translate('sponsors.status')}</span>
        <select value={draft.status} onChange={(event) => onChange({ status: event.target.value as SponsorDraft['status'] })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
          <option value="DRAFT">{translate('sponsors.statuses.DRAFT')}</option>
          <option value="PUBLISHED">{translate('sponsors.statuses.PUBLISHED')}</option>
          <option value="HIDDEN">{translate('sponsors.statuses.HIDDEN')}</option>
        </select>
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold text-slate-600">
        <input type="checkbox" checked={draft.isPublic} onChange={(event) => onChange({ isPublic: event.target.checked })} />
        {translate('sponsors.publicToggle')}
      </label>
      <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 md:col-span-2">
        <input
          type="checkbox"
          checked={draft.advancedScheduling}
          onChange={(event) => onChange({ advancedScheduling: event.target.checked, ...(event.target.checked ? {} : { startAt: '', endAt: '' }) })}
          className="mt-0.5"
        />
        <span>
          <span className="block">{translate('sponsors.advancedScheduling')}</span>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{translate('sponsors.advancedSchedulingDescription')}</span>
        </span>
      </label>
      {draft.advancedScheduling && (
        <>
          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>{translate('sponsors.startAt')}</span>
            <input type="text" inputMode="numeric" value={draft.startAt} onChange={(event) => onChange({ startAt: event.target.value })} placeholder={translate('sponsors.dateTimePlaceholder')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>{translate('sponsors.endAt')}</span>
            <input type="text" inputMode="numeric" value={draft.endAt} onChange={(event) => onChange({ endAt: event.target.value })} placeholder={translate('sponsors.dateTimePlaceholder')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" />
          </label>
        </>
      )}
    </div>
  );

  return (
    <section className="space-y-5 border-t border-slate-200 pt-6" aria-labelledby="sponsor-settings-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 id="sponsor-settings-heading" className="flex items-center gap-2 text-sm font-black text-slate-800"><Handshake className="h-4 w-4 text-amber-500" />{translate('sponsors.title')}</h4>
          <p className="mt-1 text-xs font-medium text-slate-500">{translate('sponsors.description')}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">{translate('sponsors.mvpBadge')}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sponsors.map((sponsor) => {
          const draft = drafts[sponsor.id] || toDraft(sponsor);
          const tierStyle = getSponsorTierStyle(sponsor.tier);
          const sponsorInitials = getInitials(sponsor.displayName);
          if (sponsor.status === 'ARCHIVED') {
            return (
              <div key={sponsor.id} className="rounded-xl border border-slate-200 bg-slate-100 p-3 opacity-75 sm:col-span-2 xl:col-span-3" aria-label={translate('sponsors.archived')}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-700">{sponsor.displayName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{translate(`sponsors.tiers.${sponsor.tier}`)}</p>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">{translate('sponsors.archived')}</span>
                </div>
              </div>
            );
          }
          if (expandedId !== sponsor.id) {
            return (
              <div key={sponsor.id} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <SponsorLogo
                    logoUrl={sponsor.logoUrl}
                    alt={sponsor.displayName}
                    initials={sponsorInitials}
                    className={cn('h-20 w-full max-w-[170px] rounded-lg border p-2', tierStyle.logoFrameClassName)}
                    imageClassName="h-full w-full"
                  />
                  <p className="mt-2 w-full truncate text-sm font-black text-slate-800" title={sponsor.displayName}>{sponsor.displayName}</p>
                  <span className={cn('mt-1 max-w-full truncate rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', tierStyle.badgeClassName)}>{translate(`sponsors.tiers.${sponsor.tier}`)}</span>
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">{translate(`sponsors.statuses.${sponsor.status}`)}</span>
                  <Button type="button" variant="outline" onClick={() => setExpandedId(sponsor.id)} className="mt-2 w-full text-[11px] font-bold">{translate('sponsors.edit')}</Button>
                </div>
              </div>
            );
          }
          return (
              <div key={sponsor.id} className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:col-span-2 xl:col-span-3">
              <div className="mb-3 flex justify-end">
                <button type="button" onClick={() => setExpandedId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-800">{translate('sponsors.closeEditor')}</button>
              </div>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>{renderEditor(draft, (patch) => updateDraft(sponsor.id, patch), sponsor.id)}</div>
                {renderPreview(draft)}
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {sponsor.websiteUrl && <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500"><ExternalLink className="h-3.5 w-3.5" />{translate('sponsors.preview')}</a>}
                <Button type="button" variant="outline" onClick={() => void archiveSponsor(sponsor.id)} disabled={savingId === sponsor.id} className="border-rose-200 text-rose-600"><Trash2 className="mr-1.5 h-4 w-4" />{translate('sponsors.archive')}</Button>
                <Button type="button" onClick={() => void saveSponsor(sponsor.id)} disabled={savingId === sponsor.id} className="bg-blue-600 text-white"><Save className="mr-1.5 h-4 w-4" />{savingId === sponsor.id ? translate('sponsors.saving') : translate('sponsors.save')}</Button>
              </div>
            </div>
          );
        })}
        {sponsors.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs font-medium text-slate-500 sm:col-span-2 xl:col-span-3">{translate('sponsors.empty')}</p>}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
        {!isAddFormOpen ? (
          <Button type="button" onClick={() => setIsAddFormOpen(true)} className="w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto">
            <Plus className="mr-1.5 h-4 w-4" />{translate('sponsors.addTitle')}
          </Button>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h5 className="flex items-center gap-2 text-sm font-black text-slate-800"><Plus className="h-4 w-4 text-amber-600" />{translate('sponsors.addTitle')}</h5>
              <button type="button" onClick={() => setIsAddFormOpen(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">{translate('sponsors.cancel')}</button>
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>{renderEditor(newDraft, (patch) => setNewDraft((current) => ({ ...current, ...patch })), 'new')}</div>
              {renderPreview(newDraft)}
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={() => void addSponsor()} disabled={isAdding} className="bg-amber-600 text-white hover:bg-amber-700"><Plus className="mr-1.5 h-4 w-4" />{isAdding ? translate('sponsors.adding') : translate('sponsors.add')}</Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
