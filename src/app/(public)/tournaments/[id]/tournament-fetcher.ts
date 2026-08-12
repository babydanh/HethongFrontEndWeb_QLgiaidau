import { cookies } from 'next/headers';
import { cache } from 'react';

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

export const getTournament = cache(async (id: string) => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';

  try {
    const response = await fetchTournamentWithRetry(`${baseUrl}/tournaments/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    if (!response.ok) return null;
    const res = await response.json();
    return res.data ?? null;
  } catch (error) {
    console.error('Failed to fetch tournament:', error);
    return null;
  }
});
