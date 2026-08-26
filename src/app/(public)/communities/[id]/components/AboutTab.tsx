'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTournamentLocationLabel } from '@/utils/tournament-location';
import { Community } from '@/features/communities/api';
import { formatDate } from '@/utils/format';
import { MapPin, Info, FileText, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImage {
  id: string;
  imageUrl: string;
}

export default function AboutTab({ 
  community, 
  galleryImages = [] 
}: { 
  community: Community; 
  galleryImages?: GalleryImage[]; 
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const translate = useTranslations('Common');

  // Limit to maximum 50 images in the sidebar
  const visibleImages = galleryImages.slice(0, 50);
  const previewImages = visibleImages.slice(0, 4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: General Information (8/12) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 md:p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b pb-3">
            <Info className="w-5 h-5 text-blue-600" />
            {translate('aboutClub')}
          </h3>
          
          {community.description ? (
            <div 
              className="text-slate-650 leading-relaxed mb-6 text-sm prose max-w-none"
              dangerouslySetInnerHTML={{ __html: community.description }}
            />
          ) : (
            <p className="text-slate-400 italic mb-6">{translate('noClubDescription')}</p>
          )}
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> {translate('information')}
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-semibold">{translate('location')}:</span>
                    <span className="col-span-2 text-slate-800">
                      {getTournamentLocationLabel({ locationAddress: community.locationAddress }) || translate('notUpdated')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-semibold">{translate('visibility')}:</span>
                    <span className="col-span-2 text-slate-800">
                      {community.visibility === 'PUBLIC' ? translate('public') : community.visibility === 'PRIVATE' ? translate('private') : translate('restricted')}
                      {' · '}
                      {community.joinMode === 'OPEN' ? translate('openJoin') : community.joinMode === 'APPROVAL' ? translate('approval') : translate('inviteOnly')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-semibold">{translate('createdAt')}:</span>
                    <span className="col-span-2 text-slate-800">
                      {community.createdAt ? formatDate(community.createdAt) : 'N/A'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-semibold">{translate('sport')}:</span>
                    <span className="col-span-2 text-slate-800 flex flex-wrap gap-1">
                      {community.categories && community.categories.length > 0 ? (
                        community.categories.map((cat) => (
                          <span key={cat.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            {cat.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">{translate('notUpdated')}</span>
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-semibold">{translate('contact')}:</span>
                    <span className="col-span-2 text-slate-800">
                      {community.socialLinks && Object.values(community.socialLinks).some(v => v) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(community.socialLinks).map(([key, val]) => {
                            if (!val) return null;
                            const isUrl = val.startsWith('http://') || val.startsWith('https://');
                            const label = key === 'phone' ? translate('phoneLabel') : key === 'facebook' ? 'FB' : key.toUpperCase();
                            return (
                              <span key={key} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                <span className="font-bold text-[10px] text-slate-500">{label}:</span>
                                {isUrl ? (
                                  <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline max-w-[120px] truncate font-semibold">
                                    Link
                                  </a>
                                ) : (
                                  <span className="text-slate-700 font-semibold max-w-[120px] truncate">{val}</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">{translate('notUpdated')}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
 
            <div className="space-y-4">
              {community.rules && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> {translate('rules')}
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {community.rules}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Right: Images collage Sidebar (4/12) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2.5">
            <ImageIcon className="w-4.5 h-4.5 text-blue-600" />
            {translate('galleryCount', { count: galleryImages.length })}
          </h3>

          {galleryImages.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-450 font-bold uppercase tracking-wider animate-pulse">{translate('noImages')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {previewImages.map((img, idx) => {
                const isLast = idx === 3;
                const remainingCount = visibleImages.length - 3;
                
                return (
                  <div 
                    key={img.id}
                    onClick={() => setLightboxIndex(idx)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group hover:opacity-95 transition-opacity"
                  >
                    <img 
                      src={img.imageUrl} 
                      alt="Activity preview" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {isLast && remainingCount > 0 && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center text-white text-base font-bold tracking-wider transition-colors group-hover:bg-slate-950/75">
                        +{remainingCount}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Fullscreen Slide Modal */}
      {lightboxIndex !== null && visibleImages.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center select-none animate-in fade-in duration-200">
          {/* Close button */}
          <button 
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md transition-all z-[10000] active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Arrow */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(prev => (prev === 0 ? visibleImages.length - 1 : prev! - 1));
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all z-[10000] active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Arrow */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(prev => (prev === visibleImages.length - 1 ? 0 : prev! + 1));
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all z-[10000] active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Image slide */}
          <div className="relative w-full max-w-5xl h-[80vh] px-4 flex items-center justify-center">
            <img 
              src={visibleImages[lightboxIndex].imageUrl} 
              alt={`Gallery detail ${lightboxIndex}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
            />
          </div>

          {/* Bottom Index indicator */}
          <div className="text-white/60 text-xs font-bold mt-4 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full backdrop-blur-sm">
            {translate('imagePosition', { current: lightboxIndex + 1, total: visibleImages.length })}
          </div>
        </div>
      )}
    </div>
  );
}
