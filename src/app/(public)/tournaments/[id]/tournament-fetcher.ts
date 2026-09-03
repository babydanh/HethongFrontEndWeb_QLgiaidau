import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Division, Tournament, TournamentResult } from '@/features/tournaments/api';

const REVALIDATE_SECONDS = 60;

export async function fetchTournamentWithRetry(url: string, init?: RequestInit) {
  const delays = [0, 350, 1000];
  let lastError: unknown;

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
    try {
      const response = await fetch(url, { ...init, next: init?.next ?? { revalidate: REVALIDATE_SECONDS } });
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }
      lastError = new Error(`Tournament request failed with ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Tournament request failed');
}

export const getTournamentResults = cache(async (id: string, divisionId?: string): Promise<TournamentResult | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const baseUrl = process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';
  const appApiKey = process.env.NEXT_PUBLIC_APP_KEY || process.env.APP_KEY || '';
  const query = divisionId ? `?divisionId=${encodeURIComponent(divisionId)}` : '';

  try {
    const response = await fetchTournamentWithRetry(`${baseUrl}/tournaments/${id}/results${query}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(appApiKey ? { 'x-app-key': appApiKey } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      next: { revalidate: 15 },
    });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: TournamentResult | null };
    return payload.data ?? null;
  } catch {
    return null;
  }
});

export const getTournament = cache(async (id: string): Promise<Tournament | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const baseUrl = process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';
  const appApiKey = process.env.NEXT_PUBLIC_APP_KEY || process.env.APP_KEY || '';

  try {
    const response = await fetchTournamentWithRetry(`${baseUrl}/tournaments/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(appApiKey ? { 'x-app-key': appApiKey } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    if (!response.ok) {
      if (response.status === 403) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        const err = new Error(payload?.message || 'FORBIDDEN_CLUB_INTERNAL');
        (err as any).statusCode = 403;
        throw err;
      }
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return null;
      }
      throw new Error(`Tournament detail request failed with ${response.status}`);
    }
    const res = await response.json();
    return res.data ?? null;
  } catch (error) {
    if ((error as any)?.statusCode === 403) {
      throw error;
    }
    console.error('Failed to fetch tournament:', error);
    throw error;
  }
});

export const getTournamentDivisions = cache(async (id: string): Promise<Division[]> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const baseUrl = process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';
  const appApiKey = process.env.NEXT_PUBLIC_APP_KEY || process.env.APP_KEY || '';

  try {
    const response = await fetchTournamentWithRetry(`${baseUrl}/tournaments/${id}/divisions`, {
      headers: {
        'Content-Type': 'application/json',
        ...(appApiKey ? { 'x-app-key': appApiKey } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      next: { revalidate: 30 },
    });
    if (!response.ok) return [];
    const res = await response.json() as { data?: Division[] | null };
    return res.data ?? [];
  } catch {
    return [];
  }
});
