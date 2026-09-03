'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Settings, ImageIcon, Gift, Users, Handshake, Trash2, Plus, Phone, Mail, Globe, Crop } from 'lucide-react';
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
import CircularImageCropModal from '@/components/common/CircularImageCropModal';

interface BasicInfoTabProps {
  validationField?: string | null;
  id: string;
  tournament: Tournament;
  categories: Category[];
  basicSubTab: 'general' | 'branding' | 'prizes' | 'contact' | 'sponsors';
  setBasicSubTab: (val: 'general' | 'branding' | 'prizes' | 'contact' | 'sponsors') => void;
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
  newGalleryUrl,
  setNewGalleryUrl,
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
}: BasicInfoTabProps) {
  const translate = useTranslations('OrganizerBasicInfo');
  const [newContactType, setNewContactType] = React.useState('facebook');
  const [newContactLabel, setNewContactLabel] = React.useState('');
  const [newContactValue, setNewContactValue] = React.useState('');

  // Logo Crop Modal States
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [pendingLogoSrc, setPendingLogoSrc] = React.useState('');

  const handleSelectLogoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingLogoSrc(reader.result);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    try {
      toast.loading(translate('uploadingLogo'), { id: 'logo-upload' });
      const file = new File([croppedBlob], 'tournament_logo.png', { type: 'image/png' });
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
  };

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
      [finalKey]: newContactValue.trim(),
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

  const [isAddingGalleryImage, setIsAddingGalleryImage] = React.useState(false);

  const handleAddGalleryImage = async () => {
    if (!newGalleryUrl.trim()) return;
    try {
      setIsAddingGalleryImage(true);
      await tournamentsApi.addTournamentGalleryImage(id, newGalleryUrl.trim());
      toast.success(translate('galleryUploaded'));
      setNewGalleryUrl('');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAddingGalleryImage(false);
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
            data-testid="tab-basic-general"
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
            data-testid="tab-basic-branding"
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
            data-testid="tab-basic-prizes"
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
            data-testid="tab-basic-contact"
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
          <button
            type="button"
            onClick={() => setBasicSubTab('sponsors')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap md:w-full ${
              basicSubTab === 'sponsors'
                ? 'bg-amber-50 text-amber-700 shadow-sm border-l-4 border-amber-500'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Handshake className="w-4 h-4" />
            <span>{translate('tabs.sponsors')}</span>
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
                  data-testid="manage-tournament-name-input"
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
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div id="manage-basic-description-input" className="flex flex-col gap-1.5 border-t pt-5 transition-all rounded-lg p-2">
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
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          handleSelectLogoFile(file);
                          e.target.value = ''; // Reset file input
                        }}
                      />
                      {translate('chooseFile')}
                    </label>
                  </div>
                  {logoUrl ? (
                    <div className="flex items-center gap-4 mt-2">
                      {/* Circular preview */}
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm bg-white flex items-center justify-center shrink-0">
                        <img src={logoUrl} alt={translate('logoPreview')} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="text-xs font-bold text-slate-800">{translate('logoPreview')}</div>
                        <p className="text-[11px] text-slate-400 font-medium">Hiển thị chuẩn tròn trên toàn hệ thống</p>
                        {/* Recrop button */}
                        <button
                          type="button"
                          onClick={() => {
                            setPendingLogoSrc(logoUrl);
                            setCropModalOpen(true);
                          }}
                          className="w-max px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <Crop className="w-3.5 h-3.5 text-blue-600" />
                          <span>Căn chỉnh lại vị trí</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 mt-2 text-[10px] font-bold">
                      <span>{translate('noLogo')}</span>
                    </div>
                  )}

                  {/* Circular Image Crop Modal */}
                  <CircularImageCropModal
                    isOpen={cropModalOpen}
                    imageSrc={pendingLogoSrc}
                    onClose={() => setCropModalOpen(false)}
                    onConfirm={handleCropConfirm}
                  />
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
                              if (tournament.parentId) {
                                await tournamentsApi.updateParentTournament(tournament.parentId, { bannerUrl: res.url });
                              }
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
                  <p className="text-[11px] text-slate-500 font-medium">{translate('bannerGuidance')}</p>
                  {bannerUrl ? (
                    <div className="relative w-full max-w-xl h-44 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center mt-2">
                      <img src={bannerUrl} alt={translate('bannerPreview')} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                        Banner
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-xl h-36 rounded-lg border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 mt-2 text-xs font-medium">
                      <span>{translate('noBanner')}</span>
                    </div>
                  )}
                </div>

                {/* Gallery */}
                <div className="flex flex-col gap-2 border-t pt-5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{translate('galleryTitle')}</label>
                  <div className="flex gap-2">
                    <input
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      placeholder={translate('galleryPlaceholder')}
                      className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors duration-200"
                    />
                    {newGalleryUrl.trim() ? (
                      <button
                        type="button"
                        onClick={handleAddGalleryImage}
                        disabled={isAddingGalleryImage}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs shrink-0 h-11 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isAddingGalleryImage ? translate('adding') : translate('addGalleryUrl')}
                      </button>
                    ) : (
                      <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              toast.loading(translate('uploadingToCloudinary'), { id: 'gallery-upload' });
                              const res = await uploadApi.uploadImage(file);
                              if (res && res.url) {
                                await tournamentsApi.addTournamentGalleryImage(id, res.url);
                                toast.success(translate('galleryUploaded'), { id: 'gallery-upload' });
                                fetchTournamentData();
                              }
                            } catch (err) {
                              toast.error(getErrorMessage(err), { id: 'gallery-upload' });
                            }
                          }}
                        />
                        {translate('chooseFile')}
                      </label>
                    )}
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
            <div id="manage-contact-info-section" className="space-y-6 animate-in fade-in duration-200 rounded-lg p-2 transition-all">
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

            </div>
          )}

          {basicSubTab === 'sponsors' && (
            <div className="animate-in fade-in duration-200">
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
        <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
          <span>✨ Các thay đổi thông tin giải đấu được tự động lưu</span>
        </div>
      </div>
    </div>
  );
}
