import { expect, test } from '@playwright/test';
import {
  unwrapClubMatchData,
  unwrapClubMatchPage,
} from '@/features/club-match-sessions/api';
import type { ApiResponse } from '@/types/api';

test('club match consumer unwraps detail and cursor envelopes', () => {
  const detail = unwrapClubMatchData({
    statusCode: 200,
    message: 'Success',
    data: { id: 'session-1', resolvedName: 'Friday club session' },
  } as ApiResponse<{ id: string; resolvedName: string }>);

  const page = unwrapClubMatchPage({
    statusCode: 200,
    message: 'Success',
    data: [{ id: 'match-1' }],
    meta: { total: 1, page: 1, limit: 30, totalPages: 1, hasMore: true, nextCursor: 'cursor-2' },
  });

  expect(detail.id).toBe('session-1');
  expect(page).toEqual({
    data: [{ id: 'match-1' }],
    meta: { hasMore: true, nextCursor: 'cursor-2' },
  });
});
