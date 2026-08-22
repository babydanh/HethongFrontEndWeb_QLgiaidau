'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Settings, ImageIcon, Gift, Users, Trash2, Plus, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Tournament } from '@/types/tournament';
import { Category } from '@/features/categories/api';
import toast from 'react-hot-toast';
import { uploadApi } from '@/features/upload/api';
import { tournamentsApi, Division } from '@/features/tournaments/api';
import { getErrorMessage } from '@/utils/error';
import { isTournamentDraft } from '@/utils/tournament-status';
import SponsorSettingsPanel from './SponsorSettingsPanel';

interface BasicInfoTabProps {
  validationField?: string | null;
  id: string;
  tournament: Tournament;
  categories: Category[];
  basicSubTab: 'general' | 'branding' | 'prizes' | 'contact';
  setBasicSubTab: (val: 'general' | 'branding' | 'prizes' | 'contact') => void;
  name: string;
  setName: (val: string) => void;
  categoryId: string;
  setCategoryId: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  bannerUrl: string;
  setBannerUrl: (val: string) => void;
  hideFeaturedCardText: boolean;
  setHideFeaturedCardText: (val: boolean) => void;
  newGalleryUrl: string;
  setNewGalleryUrl: (val: string) => void;
  isAddingImage: boolean;
  setIsAddingImage: (val: boolean) => void;
  prizeDescription: string;
  setPrizeDescription: (val: string) => void;
  contactInfo: Record<string, string | undefined>;
  setContactInfo: (val: Record<string, string | undefined>) => void;
  isSavingConfig: boolean;
  isDeleting: boolean;
  handleDeleteTournament: () => void;
  handleSaveBasicInfo: () => void;
  fetchTournamentData: () => void;
  divisions: Division[];
  selectedDivisionId: string;
  isLimitEnabled: boolean;
  setIsLimitEnabled: (val: boolean) => void;
  maxParticipants: number;
  setMaxParticipants: (val: number) => void;
  matchType: string;
  setMatchType: (val: string) => void;
  setsToWin: number;
  setSetsToWin: (val: number) => void;
  pointsPerSet: number;
  setPointsPerSet: (val: number) => void;
  winByTwo: boolean;
  setWinByTwo: (val: boolean) => void;
}

export function BasicInfoTab({
  id,
  tournament,
  categories,
  basicSubTab,
  setBasicSubTab,
  name,
  setName,
  categoryId,
  setCategoryId,
  description,
  setDescription,
  logoUrl,
  setLogoUrl,
  bannerUrl,
  setBannerUrl,
  hideFeaturedCardText,
  setHideFeaturedCardText,
  newGalleryUrl,
  setNewGalleryUrl,
  isAddingImage,
  setIsAddingImage,
  prizeDescription,
  setPrizeDescription,
  contactInfo,
  setContactInfo,
  isSavingConfig,
  isDeleting,
  handleDeleteTournament,
  handleSaveBasicInfo,
  fetchTournamentData,
  divisions,
  selectedDivisionId,
  isLimitEnabled,
  setIsLimitEnabled,
  maxParticipants,
  setMaxParticipants,
  matchType,
  setMatchType,
  setsToWin,
  setSetsToWin,
  pointsPerSet,
  setPointsPerSet,
  winByTwo,
  setWinByTwo,
}: BasicInfoTabProps) {
  const translate = useTranslations('OrganizerBasicInfo');
  const [newContactType, setNewContactType] = React.useState('facebook');
  const [newContactLabel, setNewContactLabel] = React.useState('');
  const [newContactValue, setNewContactValue] = React.useState('');

  const handleAddContactLink = () => {
    if (!newContactValue.trim()) {
      toast.error(translate('contactValueRequired'));
      return;
    }
    const finalKey = newContactType === 'custom' ? newContactLabel.trim() : newContactType;
    if (!finalKey) {
      toast.error(translate('contactLabelRequired'));
      return;
    }
    if (finalKey.toLowerCase() === 'phone' || finalKey.toLowerCase() === 'email') {
      toast.error(translate('contactDuplicatePhoneEmail'));
      return;
    }
    setContactInfo({
      ...contactInfo,
      [finalKey]: newContactValue.trim()
    });
    setNewContactValue('');
    setNewContactLabel('');
    toast.success(translate('contactAdded'));
  };

  const handleRemoveContactLink = (key: string) => {
    const next = { ...contactInfo };
    delete next[key];
    setContactInfo(next);
    toast.success(translate('contactRemoved'));
  };
  
  const handleAddGalleryImage = async () => {
    if (!newGalleryUrl.trim()) return;
    try {
      setIsAddingImage(true);
      await tournamentsApi.addTournamentGalleryImage(id, newGalleryUrl.trim());
      toast.success(translate('galleryImageAdded'));
      setNewGalleryUrl('');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleRemoveGalleryImage = async (index: number) => {
    if (!confirm(translate('removeGalleryConfirm'))) return;
    try {
      await tournamentsApi.removeTournamentGalleryImage(id, index);
      toast.success(translate('galleryImageRemoved'));
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-slate-900">{translate('title')}</h2>
        <p className="text-xs text-slate-450 mt-1 font-semibold">{translate('description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* LEFT SIDEBAR: Table of Contents */}
        <div className="flex flex-row md:flex-col gap-1 md:gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4">
          <button
            type="button"
            onClick={() => setBasicSubTab('general')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap md:w-full ${
              basicSubTab === 'general'
                ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{translate('tabs.general')}</span>
          </button>
          <button
            type="button"
            onClick={() => setBasicSubTab('branding')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap md:w-full ${
              basicSubTab === 'branding'
                ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>{translate('tabs.branding')}</span>
          </button>
          <button
            type="button"
            onClick={() => setBasicSubTab('prizes')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap md:w-full ${
              basicSubTab === 'prizes'
                ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>{translate('tabs.prizes')}</span>
          </button>
          <button
            type="button"
            onClick={() => setBasicSubTab('contact')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap md:w-full ${
              basicSubTab === 'contact'
                ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{translate('tabs.contact')}</span>
          </button>
        </div>

        {/* RIGHT CONTENT PANE */}
        <div className="md:col-span-3 space-y-6 min-h-[300px]">
          {basicSubTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-bold text-slate-850 text-base">{translate('generalTitle')}</h3>
                <p className="text-xs text-slate-450 mt-0.5 font-semibold">{translate('generalDescription')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label={translate('tournamentName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">{translate('sport')}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-11"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t pt-5">
                <RichTextEditor
                  label={translate('tournamentDescription')}
                  value={description}
                  onChange={setDescription}
                  placeholder={translate('descriptionPlaceholder')}
                />
              </div>


            </div>
          )}

          {basicSubTab === 'branding' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-bold text-slate-850 text-base">{translate('brandingTitle')}</h3>
                <p className="text-xs text-slate-450 mt-0.5 font-semibold">{translate('brandingDescription')}</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Logo */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{translate('tournamentLogo')}</label>
                  <div className="flex gap-2">
                    <input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder={translate('logoPlaceholder')}
                      className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors duration-200"
                    />
                    <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            toast.loading(translate('uploadingLogo'), { id: 'logo-upload' });
                            const res = await uploadApi.uploadImage(file);
                            if (res && res.url) {
                              setLogoUrl(res.url);
                              await tournamentsApi.updateTournament(id, { logoUrl: res.url });
                              if (tournament.parentId) {
                                await tournamentsApi.updateParentTournament(tournament.parentId, { logoUrl: res.url });
                              }
                              toast.success(translate('logoUploaded'), { id: 'logo-upload' });
                              fetchTournamentData();
                            }
                          } catch (err) {
                            toast.error(getErrorMessage(err), { id: 'logo-upload' });
                          }
                        }}
                      />
                      {translate('chooseFile')}
                    </label>
                  </div>
                  {logoUrl ? (
                    <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white flex items-center justify-center p-2 mt-2">
                      <img src={logoUrl} alt={translate('logoPreview')} className="max-w-full max-h-full object-contain" />
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                        Logo
                      </div>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-lg border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 mt-2 text-[10px] font-bold">
                      <span>{translate('noLogo')}</span>
                    </div>
                  )}
                </div>

                {/* Banner */}
                <div className="flex flex-col gap-2 border-t pt-5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{translate('tournamentBanner')}</label>
                  <div className="flex gap-2">
                    <input
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder={translate('bannerPlaceholder')}
                      className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors duration-200"
                    />
                    <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            toast.loading(translate('uploadingBanner'), { id: 'banner-upload' });
                            const res = await uploadApi.uploadImage(file);
                            if (res && res.url) {
                              setBannerUrl(res.url);
                              await tournamentsApi.updateTournament(id, { bannerUrl: res.url });
                              await tournamentsApi.addTournamentGalleryImage(id, res.url);
                              toast.success(translate('bannerUploaded'), { id: 'banner-upload' });
                              fetchTournamentData();
                            }
                          } catch (err) {
                            toast.error(getErrorMessage(err), { id: 'banner-upload' });
                          }
                        }}
                      />
                      {translate('chooseFile')}
                    </label>
                  </div>
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                    {translate('bannerGuidance')}
                  </p>
                  {bannerUrl ? (
                    <div className="relative aspect-[21/9] w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white mt-2">
                      <img src={bannerUrl} alt={translate('bannerPreview')} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                        {translate('bannerPreview')}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[21/9] w-full rounded-lg border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 mt-2 text-[10px] font-bold">
                      <span>{translate('noBanner')}</span>
                    </div>
                  )}
                </div>

                {/* Album ảnh */}
                <label className="mt-1 flex cursor-pointer items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-4 transition-colors hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={hideFeaturedCardText}
                    onChange={(e) => setHideFeaturedCardText(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-bold text-slate-850">
                      {translate('hideBannerText')}
                    </span>
                    <span className="block text-xs font-semibold leading-relaxed text-slate-500">
                      {translate('hideBannerTextDescription')}
                    </span>
                  </span>
                </label>

                <div className="space-y-4 border-t pt-5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-semibold">{translate('galleryTitle')}</label>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder={translate('galleryPlaceholder')}
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      className="flex-grow text-slate-800"
                    />
                    <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm mt-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setIsAddingImage(true);
                            toast.loading(translate('uploadingToCloudinary'), { id: 'gallery-upload' });
                            const res = await uploadApi.uploadImage(file);
                            if (res && res.url) {
                              await tournamentsApi.addTournamentGalleryImage(id, res.url);
                              toast.success(translate('galleryUploaded'), { id: 'gallery-upload' });
                              fetchTournamentData();
                            }
                          } catch (err) {
                            toast.error(getErrorMessage(err), { id: 'gallery-upload' });
                          } finally {
                            setIsAddingImage(false);
                          }
                        }}
                        disabled={isAddingImage}
                      />
                      {translate('chooseFile')}
                    </label>
                    <Button
                      onClick={handleAddGalleryImage}
                      disabled={isAddingImage || !newGalleryUrl.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs shrink-0 shadow-sm mt-1 h-11"
                    >
                      {isAddingImage ? translate('adding') : translate('addGalleryUrl')}
                    </Button>
                  </div>

                  {tournament.galleryImages && tournament.galleryImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[260px] p-2 bg-white border rounded-lg">
                      {tournament.galleryImages.map((imgUrl, index) => (
                        <div key={`${imgUrl}-${index}`} className="relative group border rounded-lg overflow-hidden aspect-video bg-slate-50">
                          <img src={imgUrl} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(index)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                          >
                            <span className="bg-rose-600 hover:bg-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                              {translate('removeImage')}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-8 text-center text-slate-400 bg-white">
                      <p className="text-xs font-semibold italic">{translate('noGallery')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {basicSubTab === 'prizes' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-bold text-slate-850 text-base">{translate('prizesTitle')}</h3>
                <p className="text-xs text-slate-450 mt-0.5 font-semibold">{translate('prizesDescription')}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <RichTextEditor
                  label={translate('prizeDescription')}
                  value={prizeDescription}
                  onChange={setPrizeDescription}
                  placeholder={translate('prizePlaceholder')}
                />
              </div>
            </div>
          )}

          {basicSubTab === 'contact' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-bold text-slate-850 text-base">{translate('contactTitle')}</h3>
                <p className="text-xs text-slate-455 mt-0.5 font-semibold">{translate('contactDescription')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label={translate('phone')}
                  value={contactInfo.phone || ''}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  placeholder="0987654321"
                />
                <Input
                  label={translate('email')}
                  value={contactInfo.email || ''}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  placeholder="btc@vndcsport.vn"
                />
              </div>

              {/* Custom Contact Links Section */}
              <div className="border-t pt-5 mt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{translate('socialLinks')}</h4>
                
                {/* Current list */}
                <div className="space-y-2">
                  {Object.entries(contactInfo)
                    .filter(([key]) => key !== 'phone' && key !== 'email')
                    .map(([key, val]) => {
                      const displayLabel = key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <div key={key} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-xs font-bold text-slate-600 min-w-[100px]">{displayLabel}:</span>
                          <span className="text-sm text-slate-800 flex-grow truncate">{val}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveContactLink(key)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                            title={translate('remove')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  {Object.keys(contactInfo).filter(([key]) => key !== 'phone' && key !== 'email').length === 0 && (
                    <p className="text-xs text-slate-400 italic">{translate('noSocialLinks')}</p>
                  )}
                </div>

                {/* Add Form */}
                <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{translate('contactType')}</label>
                    <select
                      value={newContactType}
                      onChange={(e) => {
                        setNewContactType(e.target.value);
                        if (e.target.value !== 'custom') {
                          setNewContactLabel('');
                        }
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-750 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11"
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="zalo">Zalo</option>
                      <option value="tiktok">Tiktok</option>
                      <option value="website">Website</option>
                      <option value="custom">{translate('customContactType')}</option>
                    </select>
                  </div>

                  {newContactType === 'custom' && (
                    <div className="flex-1 w-full space-y-1 animate-in fade-in slide-in-from-left-2 duration-150">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{translate('customLabel')}</label>
                      <input
                        type="text"
                        placeholder={translate('customLabelPlaceholder')}
                        value={newContactLabel}
                        onChange={(e) => setNewContactLabel(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-755 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11"
                      />
                    </div>
                  )}

                  <div className="flex-[2] w-full space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{translate('contactValue')}</label>
                    <input
                      type="text"
                      placeholder={translate('contactValuePlaceholder')}
                      value={newContactValue}
                      onChange={(e) => setNewContactValue(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-755 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddContactLink}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-5 w-full sm:w-auto text-xs shrink-0 rounded-lg"
                  >
                    {translate('add')}
                  </Button>
                </div>
              </div>

              <SponsorSettingsPanel tournamentId={id} />
            </div>
          )}
        </div>
      </div>

      {/* Global Actions in Tab */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          {isTournamentDraft(tournament.status) && (
            <Button
              onClick={handleDeleteTournament}
              disabled={isDeleting}
              variant="outline"
              className="border-rose-250 hover:bg-rose-50 text-rose-600 font-bold px-6"
            >
              {isDeleting ? translate('deleting') : translate('deleteDraft')}
            </Button>
          )}
        </div>
        <Button
          onClick={handleSaveBasicInfo}
          disabled={isSavingConfig}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-500/10"
        >
          {isSavingConfig ? translate('saving') : translate('saveInfo')}
        </Button>
      </div>
    </div>
  );
}
