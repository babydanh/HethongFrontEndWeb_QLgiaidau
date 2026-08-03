'use client';

import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Code, Sparkles, Calendar, Layers, Link as LinkIcon, Eye } from 'lucide-react';
import { BannerPreviewCard } from './BannerPreviewCard';
import { DateTimePicker } from '@/components/ui/Input';
import type {
  Advertisement,
  AdPlacementSlot,
  AdBannerType,
  CreateAdvertisementPayload,
  UpdateAdvertisementPayload,
} from '../api';
import toast from 'react-hot-toast';

interface BannerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdvertisementPayload | UpdateAdvertisementPayload) => Promise<void>;
  initialData?: Advertisement | null;
  isSubmitting?: boolean;
}

const PLACEMENT_OPTIONS: Array<{
  value: AdPlacementSlot;
  platform: 'WEB' | 'APP';
  label: string;
  desc: string;
  size: string;
}> = [
  // WEB PLACEMENTS
  {
    value: 'HOMEPAGE_SIDEBAR',
    platform: 'WEB',
    label: 'ðŸŒ [Web] Sidebar Cá»™t Pháº£i Trang Chá»§',
    desc: 'Cá»‘ Ä‘á»‹nh bÃªn pháº£i báº£ng tin vÃ  danh sÃ¡ch tráº­n Ä‘áº¥u trang chá»§ web',
    size: '300 x 250 (Medium Rectangle) / 4:3',
  },
  {
    value: 'TOURNAMENTS_BOTTOM',
    platform: 'WEB',
    label: 'ðŸŒ [Web] ChÃ¢n Trang Danh SÃ¡ch Giáº£i Äáº¥u',
    desc: 'Ngang dÆ°á»›i danh sÃ¡ch giáº£i Ä‘áº¥u vÃ  báº£ng phÃ¢n trang web',
    size: '728 x 90 (Leaderboard) / 970 x 250 (4:1 ~ 5:1)',
  },
  {
    value: 'MATCHES_BOTTOM',
    platform: 'WEB',
    label: 'ðŸŒ [Web] ChÃ¢n Trang Danh SÃ¡ch Tráº­n Äáº¥u',
    desc: 'Ngang dÆ°á»›i danh sÃ¡ch lá»‹ch thi Ä‘áº¥u & káº¿t quáº£ tráº­n Ä‘áº¥u web',
    size: '728 x 90 (Leaderboard) / 970 x 250 (4:1 ~ 5:1)',
  },
  {
    value: 'GLOBAL_HEADER',
    platform: 'WEB',
    label: 'ðŸŒ [Web] Thanh Banner Header ToÃ n Trang',
    desc: 'Thanh thÃ´ng bÃ¡o ná»•i báº­t trÃªn cÃ¹ng cho sá»± kiá»‡n Ä‘áº·c biá»‡t web',
    size: '970 x 90 (Top Bar 8:1)',
  },
  // MOBILE APP PLACEMENTS
  {
    value: 'APP_HOME_FEED',
    platform: 'APP',
    label: 'ðŸ“± [App] Giá»¯a DÃ²ng Tin Trang Chá»§ App',
    desc: 'Xen káº½ giá»¯a danh sÃ¡ch giáº£i Ä‘áº¥u ná»•i báº­t & CLB trÃªn Mobile App',
    size: '16:9 hoáº·c 3:1 (Card Mobile)',
  },
  {
    value: 'APP_MATCHES_BOTTOM',
    platform: 'APP',
    label: 'ðŸ“± [App] ChÃ¢n Danh SÃ¡ch Tab Tráº­n Äáº¥u',
    desc: 'Cá»‘ Ä‘á»‹nh chÃ¢n danh sÃ¡ch tráº­n Ä‘áº¥u trÃªn Mobile App',
    size: '320 x 50 / 320 x 100 (Mobile Banner)',
  },
  {
    value: 'APP_COMMUNITY_FEED',
    platform: 'APP',
    label: 'ðŸ“± [App] DÃ²ng Tin Hoáº¡t Äá»™ng CÃ¢u Láº¡c Bá»™',
    desc: 'Trong dÃ²ng tin hoáº¡t Ä‘á»™ng CLB trÃªn Mobile App',
    size: '16:9 (Card Mobile)',
  },
  {
    value: 'APP_TOURNAMENT_DETAIL',
    platform: 'APP',
    label: 'ðŸ“± [App] Chi Tiáº¿t Giáº£i Äáº¥u App',
    desc: 'DÆ°á»›i sÆ¡ Ä‘á»“ thi Ä‘áº¥u / danh sÃ¡ch VÄV cá»§a giáº£i Ä‘áº¥u trÃªn App',
    size: '3:1 (Full-width Mobile)',
  },
];

export const BannerFormModal: React.FC<BannerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerType, setBannerType] = useState<AdBannerType>('IMAGE_LINK');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [placementSlot, setPlacementSlot] = useState<AdPlacementSlot>('HOMEPAGE_SIDEBAR');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setBannerType(initialData.bannerType || 'IMAGE_LINK');
      setImageUrl(initialData.imageUrl || '');
      setTargetUrl(initialData.targetUrl || '');
      setCtaText(initialData.ctaText || '');
      setCustomHtml(initialData.customHtml || '');
      setPlacementSlot(initialData.placementSlot || 'HOMEPAGE_SIDEBAR');
      setDisplayOrder(initialData.displayOrder ?? 0);
      setIsActive(initialData.isActive ?? true);
      setStartDate(initialData.startDate ? initialData.startDate.slice(0, 16) : '');
      setEndDate(initialData.endDate ? initialData.endDate.slice(0, 16) : '');
    } else {
      setTitle('');
      setDescription('');
      setBannerType('IMAGE_LINK');
      setImageUrl('');
      setTargetUrl('');
      setCtaText('Xem ngay');
      setCustomHtml('');
      setPlacementSlot('HOMEPAGE_SIDEBAR');
      setDisplayOrder(0);
      setIsActive(true);
      setStartDate('');
      setEndDate('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lÃ²ng nháº­p tÃªn/tiÃªu Ä‘á» banner quáº£ng cÃ¡o');
      return;
    }

    if (bannerType === 'IMAGE_LINK') {
      if (!imageUrl.trim()) {
        toast.error('Vui lÃ²ng nháº­p Ä‘Æ°á»ng dáº«n áº£nh banner');
        return;
      }
      if (!targetUrl.trim()) {
        toast.error('Vui lÃ²ng nháº­p liÃªn káº¿t chuyá»ƒn hÆ°á»›ng');
        return;
      }
    } else {
      if (!customHtml.trim()) {
        toast.error('Vui lÃ²ng dÃ¡n mÃ£ HTML/Script quáº£ng cÃ¡o');
        return;
      }
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      toast.error('NgÃ y báº¯t Ä‘áº§u pháº£i trÆ°á»›c ngÃ y káº¿t thÃºc');
      return;
    }

    const payload: CreateAdvertisementPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      bannerType,
      imageUrl: bannerType === 'IMAGE_LINK' ? imageUrl.trim() : undefined,
      targetUrl: bannerType === 'IMAGE_LINK' ? targetUrl.trim() : undefined,
      ctaText: bannerType === 'IMAGE_LINK' ? ctaText.trim() || undefined : undefined,
      customHtml: bannerType === 'CUSTOM_HTML' ? customHtml.trim() : undefined,
      placementSlot,
      displayOrder: Number(displayOrder) || 0,
      isActive,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-7xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isEditing ? 'Chá»‰nh sá»­a banner quáº£ng cÃ¡o' : 'Táº¡o má»›i banner quáº£ng cÃ¡o'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cáº¥u hÃ¬nh vá»‹ trÃ­, kÃ­ch thÆ°á»›c chuáº©n IAB vÃ  tÃ­ch há»£p liÃªn káº¿t ngoÃ i
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:overflow-hidden">
            <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
              <div className="mx-auto max-w-3xl space-y-6">
          {/* 1. Placement Slot Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Vá»‹ trÃ­ hiá»ƒn thá»‹ (Placement Slot - Chuáº©n IAB) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLACEMENT_OPTIONS.map((slot) => {
                const isSelected = placementSlot === slot.value;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setPlacementSlot(slot.value)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-350 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                          {slot.label}
                        </span>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {slot.size.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{slot.desc}</p>
                    </div>
                    <span className="text-[10px] text-blue-600 font-mono font-medium mt-2">
                      ðŸ“ KÃ­ch thÆ°á»›c Ä‘á» xuáº¥t: {slot.size}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Banner Type Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Loáº¡i hÃ¬nh quáº£ng cÃ¡o *
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 max-w-md">
              <button
                type="button"
                onClick={() => setBannerType('IMAGE_LINK')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                  bannerType === 'IMAGE_LINK'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                áº¢nh + LiÃªn káº¿t trá»±c tiáº¿p
              </button>
              <button
                type="button"
                onClick={() => setBannerType('CUSTOM_HTML')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                  bannerType === 'CUSTOM_HTML'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Google AdSense / Custom Script
              </button>
            </div>
          </div>

          {/* 3. Form Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                TÃªn chiáº¿n dá»‹ch / TiÃªu Ä‘á» banner *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VÃ­ dá»¥: Giáº£m giÃ¡ 20% phá»¥ kiá»‡n Pickleball hÃ¨ 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                required
              />
            </div>

            {bannerType === 'IMAGE_LINK' ? (
              <>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ÄÆ°á»ng dáº«n áº£nh banner (Image URL) *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://cdn.sporto.asia/banners/promo-summer.webp"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                      required
                    />
                    <ImageIcon className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Há»— trá»£ áº£nh WebP, PNG, JPG sáº¯c nÃ©t theo Ä‘Ãºng tá»· lá»‡ IAB cá»§a vá»‹ trÃ­ Ä‘Ã£ chá»n.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    LiÃªn káº¿t Ä‘Ã­ch khi click (Target URL) *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://sporto.asia/shop/promo"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                      required
                    />
                    <LinkIcon className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chá»¯ trÃªn nÃºt kÃªu gá»i (CTA Text)
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Xem ngay / ÄÄƒng kÃ½ ngay / Mua ngay"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ná»™i dung mÃ´ táº£ / ThÃ´ng Ä‘iá»‡p khuyáº¿n mÃ£i (TÃ¹y chá»n)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="MÃ´ táº£ quyá»n lá»£i hoáº·c mÃ£ giáº£m giÃ¡ cho thÃ nh viÃªn..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  MÃ£ nhÃºng HTML / Google AdSense Script *
                </label>
                <textarea
                  rows={5}
                  value={customHtml}
                  onChange={(e) => setCustomHtml(e.target.value)}
                  placeholder={'<!-- Google AdSense Unit -->\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-xxxxxxxx"\n     data-ad-slot="xxxxxxxx"\n     data-ad-format="auto"></ins>'}
                  className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  required
                />
              </div>
            )}

            {/* Scheduling & Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NgÃ y báº¯t Ä‘áº§u (Äá»ƒ trá»‘ng = Cháº¡y ngay)
              </label>
              <DateTimePicker
                value={startDate}
                onChange={(val) => setStartDate(val)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NgÃ y káº¿t thÃºc (Äá»ƒ trá»‘ng = VÃ´ thá»i háº¡n)
              </label>
              <DateTimePicker
                value={endDate}
                onChange={(val) => setEndDate(val)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thá»© tá»± Æ°u tiÃªn (Display Order - Sá»‘ nhá» Æ°u tiÃªn trÆ°á»›c)
              </label>
              <input
                type="number"
                min="0"
                max="9999"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <span className="text-xs font-bold text-slate-900 block">KÃ­ch hoáº¡t hiá»ƒn thá»‹</span>
                <span className="text-[11px] text-slate-500">Báº­t/Táº¯t banner ngay láº­p tá»©c</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

              </div>
            </div>
            <aside className="border-t border-slate-100 bg-slate-50/60 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:overflow-y-auto">
              <div className="lg:sticky lg:top-0">
          {/* 4. Live Preview Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Xem trÆ°á»›c thá»±c táº¿ (Live Preview)
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/80">
              <BannerPreviewCard
                bannerType={bannerType}
                placementSlot={placementSlot}
                title={title}
                description={description}
                imageUrl={imageUrl}
                targetUrl={targetUrl}
                ctaText={ctaText}
                customHtml={customHtml}
              />
            </div>
          </div>

              </div>
            </aside>
          </div>

          {/* Footer Buttons */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Há»§y bá»
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Äang lÆ°u...' : isEditing ? 'Cáº­p nháº­t banner' : 'Táº¡o má»›i banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
