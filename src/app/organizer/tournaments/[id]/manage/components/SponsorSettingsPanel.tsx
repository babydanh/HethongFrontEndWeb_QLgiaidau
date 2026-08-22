'use client';

import React from 'react';
import { ExternalLink, Handshake, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/utils/error';
import { uploadApi } from '@/features/upload/api';
import {
  SPONSOR_TIERS,
  type SponsorPayload,
  type SponsorTier,
  type TournamentSponsor,
  tournamentsApi,
} from '@/features/tournaments/api';

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
  startAt: '',
  endAt: '',
});

const toDraft = (sponsor: TournamentSponsor): SponsorDraft => ({
  displayName: sponsor.displayName,
  tier: sponsor.tier,
  logoUrl: sponsor.logoUrl,
  websiteUrl: sponsor.websiteUrl || '',
  shortDescription: sponsor.shortDescription || '',
  displayOrder: sponsor.displayOrder,
  status: sponsor.status === 'ARCHIVED' ? 'HIDDEN' : sponsor.status || 'DRAFT',
  isPublic: sponsor.isPublic ?? true,
  startAt: sponsor.startAt ? sponsor.startAt.slice(0, 16) : '',
  endAt: sponsor.endAt ? sponsor.endAt.slice(0, 16) : '',
});

export default function SponsorSettingsPanel({ tournamentId }: SponsorSettingsPanelProps) {
  const translate = useTranslations('OrganizerBasicInfo');
  const [sponsors, setSponsors] = React.useState<TournamentSponsor[]>([]);
  const [drafts, setDrafts] = React.useState<Record<string, SponsorDraft>>({});
  const [newDraft, setNewDraft] = React.useState<SponsorDraft>(emptyDraft);
  const [isAdding, setIsAdding] = React.useState(false);
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
    void loadSponsors();
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
    if (draft.startAt && draft.endAt && new Date(draft.startAt) > new Date(draft.endAt)) {
      toast.error(translate('sponsors.invalidDateRange'));
      return false;
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
    startAt: draft.startAt ? new Date(draft.startAt).toISOString() : null,
    endAt: draft.endAt ? new Date(draft.endAt).toISOString() : null,
  });

  const saveSponsor = async (sponsorId: string) => {
    const draft = drafts[sponsorId];
    if (!draft || !validateDraft(draft)) return;
    setSavingId(sponsorId);
    try {
      await tournamentsApi.updateSponsor(tournamentId, sponsorId, toPayload(draft));
      toast.success(translate('sponsors.saved'));
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
      <label className="space-y-1 text-xs font-bold text-slate-600">
        <span>{translate('sponsors.startAt')}</span>
        <input type="datetime-local" value={draft.startAt} onChange={(event) => onChange({ startAt: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" />
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-600">
        <span>{translate('sponsors.endAt')}</span>
        <input type="datetime-local" value={draft.endAt} onChange={(event) => onChange({ endAt: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" />
      </label>
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

      <div className="space-y-4">
        {sponsors.map((sponsor) => {
          const draft = drafts[sponsor.id] || toDraft(sponsor);
          return (
            <div key={sponsor.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              {renderEditor(draft, (patch) => updateDraft(sponsor.id, patch), sponsor.id)}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {sponsor.websiteUrl && <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500"><ExternalLink className="h-3.5 w-3.5" />{translate('sponsors.preview')}</a>}
                <Button type="button" variant="outline" onClick={() => void archiveSponsor(sponsor.id)} disabled={savingId === sponsor.id} className="border-rose-200 text-rose-600"><Trash2 className="mr-1.5 h-4 w-4" />{translate('sponsors.archive')}</Button>
                <Button type="button" onClick={() => void saveSponsor(sponsor.id)} disabled={savingId === sponsor.id} className="bg-blue-600 text-white"><Save className="mr-1.5 h-4 w-4" />{savingId === sponsor.id ? translate('sponsors.saving') : translate('sponsors.save')}</Button>
              </div>
            </div>
          );
        })}
        {sponsors.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs font-medium text-slate-500">{translate('sponsors.empty')}</p>}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
        <h5 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800"><Plus className="h-4 w-4 text-amber-600" />{translate('sponsors.addTitle')}</h5>
        {renderEditor(newDraft, (patch) => setNewDraft((current) => ({ ...current, ...patch })), 'new')}
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={() => void addSponsor()} disabled={isAdding} className="bg-amber-600 text-white hover:bg-amber-700"><Plus className="mr-1.5 h-4 w-4" />{isAdding ? translate('sponsors.adding') : translate('sponsors.add')}</Button>
        </div>
      </div>
    </section>
  );
}
