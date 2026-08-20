import { useEffect, useState, useCallback, useRef } from 'react';

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
  const fetchedCursorsRef = useRef<Set<string>>(new Set());
  const fetchFnRef = useRef(fetchFn);
  const nextCursorRef = useRef(nextCursor);
  const hasMoreRef = useRef(hasMore);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);
  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchNextPage = useCallback(async (reset = false) => {
    if (fetchLock.current) return;
    if (!reset && !hasMoreRef.current) return;
    
    const cursorToFetch = reset ? null : nextCursorRef.current;
    const cursorKey = cursorToFetch ?? '__initial__';
    if (!reset && fetchedCursorsRef.current.has(cursorKey)) return;

    setIsLoading(true);
    setError(null);
    fetchLock.current = true;
    if (reset) fetchedCursorsRef.current.clear();
    fetchedCursorsRef.current.add(cursorKey);

    try {
      const response = await fetchFnRef.current(cursorToFetch);
      const responseCursor = response.meta.nextCursor || null;
      const cursorAdvanced = responseCursor !== null && responseCursor !== cursorToFetch;
      const responseHasMore = response.meta.hasMore === true && cursorAdvanced;
      
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
      
      setNextCursor(responseHasMore ? responseCursor : null);
      setHasMore(responseHasMore);
      nextCursorRef.current = responseHasMore ? responseCursor : null;
      hasMoreRef.current = responseHasMore;
    } catch (err) {
      // Stop the sentinel after an error (especially HTTP 429) so it cannot
      // immediately retry the same cursor in a tight loop.
      setHasMore(false);
      hasMoreRef.current = false;
      setNextCursor(null);
      nextCursorRef.current = null;
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
      fetchLock.current = false;
    }
  }, []);

  const resetAndFetch = useCallback(() => {
    fetchedCursorsRef.current.clear();
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    setNextCursor(null);
    setHasMore(true);
    return fetchNextPage(true);
  }, [fetchNextPage]);

  // Initial fetch can be triggered manually or via useEffect depending on use case
  return {
    data,
    setData,
    nextCursor,
    hasMore,
    isLoading,
    error,
    fetchNextPage,
    resetAndFetch
  };
}

