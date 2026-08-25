import { expect, type Page, type APIRequestContext, type TestInfo } from '@playwright/test';

export const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
export const apiBaseURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000/api/v1';

export const organizerEmail = process.env.PLAYWRIGHT_ORGANIZER_EMAIL ?? 'tester1@gmail.com';
export const organizerPassword = process.env.PLAYWRIGHT_ORGANIZER_PASSWORD ?? '123456';

export const playerEmail = process.env.PLAYWRIGHT_PLAYER_EMAIL ?? 'player_test@sporto.vn';
export const playerPassword = process.env.PLAYWRIGHT_PLAYER_PASSWORD ?? '123456';

export const tournamentId = process.env.PLAYWRIGHT_TOURNAMENT_ID;

/**
 * Ensures that a pure PLAYER account exists in the database.
 * Registers via the public auth API if not yet registered.
 */
export async function ensurePlayerAccount(request: APIRequestContext) {
  try {
    await request.post(`${apiBaseURL}/auth/register`, {
      data: {
        email: playerEmail,
        password: playerPassword,
        fullName: 'Test Player',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (_e) {
    // 409 Conflict or network error is expected if user already exists
  }
}

/**
 * Finds or provides an existing tournament ID.
 * Falls back to querying the backend public API if PLAYWRIGHT_TOURNAMENT_ID is not configured.
 */
export async function getOrFetchTournamentId(request: APIRequestContext): Promise<string | undefined> {
  if (process.env.PLAYWRIGHT_TOURNAMENT_ID) {
    return process.env.PLAYWRIGHT_TOURNAMENT_ID;
  }

  try {
    const res = await request.get(`${apiBaseURL}/tournaments/public?limit=5`);
    if (res.ok()) {
      const body = await res.json();
      const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
      if (list.length > 0 && list[0].id) {
        return list[0].id;
      }
    }
  } catch (_e) {}

  try {
    const res = await request.get(`${apiBaseURL}/tournaments?limit=5`);
    if (res.ok()) {
      const body = await res.json();
      const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
      if (list.length > 0 && list[0].id) {
        return list[0].id;
      }
    }
  } catch (_e) {}

  return undefined;
}

export async function requireEnv(testInfo: TestInfo, values: Record<string, string | undefined>) {
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
  testInfo.annotations.push({ type: 'environment', description: missing.length ? `Missing: ${missing.join(', ')}` : 'Configured' });
  if (missing.length) testInfo.skip(true, `Provide local Playwright env: ${missing.join(', ')}`);
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(`${baseURL}/login`);
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
  // Wait for login redirection away from /login
  await expect(page).not.toHaveURL(/\/login(?:\/|$|\?)/, { timeout: 15_000 });
}

export async function openTournament(page: Page, id: string) {
  await page.goto(`${baseURL}/tournaments/${id}`);
  await expect(page).toHaveURL(new RegExp(`/tournaments/${id}`));
}
