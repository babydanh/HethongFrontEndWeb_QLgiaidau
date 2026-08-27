'use client';

import { useState, useCallback } from 'react';
import { Tournament } from '@/features/tournaments/api';
import { useTranslations } from 'next-intl';
import ImageLightboxModal from '@/components/common/ImageLightboxModal';

interface Props {
  tournament: Tournament;
}

export default function OverviewTab({ tournament }: Props) {
  const translate = useTranslations('TournamentDetail');
  const description = tournament.description || tournament.parent?.description;
  const rawPrizeDescription =
    tournament.prizeDescription ||
    (tournament.parent as { prizeDescription?: string } | undefined)?.prizeDescription;
  const hasPrizeDescription = Boolean(
    rawPrizeDescription &&
    (rawPrizeDescription.replace(/<[^>]*>/g, '').trim().length > 0 || rawPrizeDescription.includes('<img'))
  );

  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      const src = img.getAttribute('src');
      if (src) {
        const container = e.currentTarget;
        const allImgs = Array.from(container.querySelectorAll('img'))
          .map((i) => i.getAttribute('src') || i.src)
          .filter(Boolean);
        const clickedIdx = allImgs.indexOf(src);
        setLightboxImages(allImgs.length > 0 ? allImgs : [src]);
        setLightboxIndex(clickedIdx >= 0 ? clickedIdx : 0);
      }
    }
  }, []);

  return (
    <div className="space-y-5 sm:space-y-8">
      <section
        className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-base leading-relaxed editorjs-content-view"
        onClick={handleContentClick}
      >
        {description ? (
          <div dangerouslySetInnerHTML={{ __html: description }} />
        ) : (
          <p className="italic text-slate-400 text-center text-xs sm:text-sm">
            {translate("overviewDescriptionFallback")}
          </p>
        )}
      </section>

      {hasPrizeDescription && (
        <section className="border-t border-slate-100 pt-4 sm:pt-6">
          <h3 className="mb-2.5 sm:mb-3 text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-900">
            {translate("prizeTitle")}
          </h3>
          <div
            className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-base leading-relaxed editorjs-content-view"
            onClick={handleContentClick}
          >
            <div dangerouslySetInnerHTML={{ __html: rawPrizeDescription! }} />
          </div>
        </section>
      )}

      {/* Image Lightbox Preview */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <ImageLightboxModal
          images={lightboxImages}
          initialIndex={lightboxIndex}
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
