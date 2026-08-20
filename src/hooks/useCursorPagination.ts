import { useCallback, useEffect, useRef, useState } from 'react';

interface PaginationMeta {
  nextCursor?: string | null;
  hasMore?: boolean;
}

interface CursorPaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

interface CursorPageState {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
}

export function useCursorPagination<T extends { id?: string }>(
  fetchFn: (cursor: string | null) => Promise<CursorPaginatedResponse<T>>,
) {
  const [data, setData] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [canGoPrevious, setCanGoPrevious] = useState(false);

  const fetchLock = useRef(false);
  const fetchFnRef = useRef(fetchFn);
  const currentPageRef = useRef<CursorPageState>({
    cursor: null,
    nextCursor: null,
    hasMore: true,
  });
  const pageCursorsRef = useRef<Array<string | null>>([null]);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const loadPage = useCallback(async (cursor: string | null, targetPage: number) => {
    if (fetchLock.current) return;

    fetchLock.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchFnRef.current(cursor);
      const responseCursor = response.meta.nextCursor ?? null;
      const cursorAdvanced = responseCursor !== null && responseCursor !== cursor;
      const responseHasMore = response.meta.hasMore === true && cursorAdvanced;
      const nextPageState: CursorPageState = {
        cursor,
        nextCursor: responseHasMore ? responseCursor : null,
        hasMore: responseHasMore,
      };

      setData(response.data);
      setPage(targetPage);
      setNextCursor(nextPageState.nextCursor);
      setHasMore(nextPageState.hasMore);
      setCanGoPrevious(targetPage > 1);
      currentPageRef.current = nextPageState;
      pageCursorsRef.current[targetPage - 1] = cursor;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unable to load matches'));
    } finally {
      setIsLoading(false);
      fetchLock.current = false;
    }
  }, []);

  const fetchNextPage = useCallback(async () => {
    if (!currentPageRef.current.hasMore || !currentPageRef.current.nextCursor) return;
    const targetPage = page + 1;
    const cursor = currentPageRef.current.nextCursor;
    pageCursorsRef.current[targetPage - 1] = cursor;
    await loadPage(cursor, targetPage);
  }, [loadPage, page]);

  const fetchPreviousPage = useCallback(async () => {
    if (page <= 1) return;
    const targetPage = page - 1;
    const cursor = pageCursorsRef.current[targetPage - 1] ?? null;
    await loadPage(cursor, targetPage);
  }, [loadPage, page]);

  const resetAndFetch = useCallback(() => {
    pageCursorsRef.current = [null];
    currentPageRef.current = { cursor: null, nextCursor: null, hasMore: true };
    setData([]);
    setPage(1);
    setNextCursor(null);
    setHasMore(true);
    setCanGoPrevious(false);
    return loadPage(null, 1);
  }, [loadPage]);

  return {
    data,
    setData,
    nextCursor,
    hasMore,
    isLoading,
    error,
    page,
    canGoPrevious,
    fetchNextPage,
    fetchPreviousPage,
    resetAndFetch,
  };
}
