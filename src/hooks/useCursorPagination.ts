import { useState, useCallback, useRef } from 'react';

interface PaginationMeta {
  nextCursor?: string | null;
  hasMore?: boolean;
}

interface CursorPaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function useCursorPagination<T extends { id?: string }>(
  fetchFn: (cursor: string | null) => Promise<CursorPaginatedResponse<T>>
) {
  const [data, setData] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track the current cursor to prevent duplicate fetches
  const fetchLock = useRef(false);

  const fetchNextPage = useCallback(async (reset = false) => {
    if (fetchLock.current) return;
    if (!reset && !hasMore) return;
    
    const cursorToFetch = reset ? null : nextCursor;

    setIsLoading(true);
    setError(null);
    fetchLock.current = true;

    try {
      const response = await fetchFn(cursorToFetch);
      
      setData((prev) => {
        if (reset) {
          return response.data;
        }
        // Basic deduplication by ID (if items have an id property)
        const newItems = [...prev];
        response.data.forEach((item) => {
          if (!item.id || !newItems.find(existing => existing.id === item.id)) {
            newItems.push(item);
          }
        });
        return newItems;
      });
      
      setNextCursor(response.meta.nextCursor || null);
      setHasMore(response.meta.hasMore || false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
      fetchLock.current = false;
    }
  }, [fetchFn, nextCursor, hasMore]);

  // Initial fetch can be triggered manually or via useEffect depending on use case
  return {
    data,
    setData,
    nextCursor,
    hasMore,
    isLoading,
    error,
    fetchNextPage,
    resetAndFetch: () => fetchNextPage(true)
  };
}
