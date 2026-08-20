import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  className?: string;
}

export function InfiniteScrollTrigger({
  onLoadMore,
  hasMore,
  isLoading,
  className = ''
}: InfiniteScrollTriggerProps) {
  const translate = useTranslations('Common');
  const triggerRef = useRef<HTMLDivElement>(null);
  const triggerLockedRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      triggerLockedRef.current = false;
      return;
    }
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !triggerLockedRef.current) {
          triggerLockedRef.current = true;
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className={`flex justify-center p-4 w-full ${className}`}>
      {isLoading && (
        <div className="flex items-center gap-2 text-primary-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">{translate('loadingMore')}</span>
        </div>
      )}
    </div>
  );
}

