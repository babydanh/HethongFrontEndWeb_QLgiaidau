'use client';

import { useState } from 'react';
import { cn } from '@/utils/cn';

interface SponsorLogoProps {
  logoUrl?: string | null;
  alt: string;
  initials: string;
  className?: string;
  imageClassName?: string;
}

export function SponsorLogo({
  logoUrl,
  alt,
  initials,
  className,
  imageClassName,
}: SponsorLogoProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const normalizedLogoUrl = logoUrl?.trim() || null;
  const shouldShowImage = normalizedLogoUrl !== null && normalizedLogoUrl !== failedLogoUrl;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden text-center text-sm font-black uppercase',
        className,
      )}
      aria-label={alt}
      role="img"
    >
      {shouldShowImage ? (
        // Sponsor logos are API-controlled media URLs and may not match next/image remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={normalizedLogoUrl ?? undefined}
          alt=""
          className={cn('max-h-full max-w-full object-contain', imageClassName)}
          loading="lazy"
          onError={() => setFailedLogoUrl(normalizedLogoUrl)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}

export default SponsorLogo;
