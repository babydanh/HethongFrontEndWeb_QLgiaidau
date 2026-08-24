import { expect, type Page, type TestInfo } from '@playwright/test';

export const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
export const playerEmail = process.env.PLAYWRIGHT_PLAYER_EMAIL ?? process.env.PLAYWRIGHT_USER_EMAIL;
export const playerPassword = process.env.PLAYWRIGHT_PLAYER_PASSWORD ?? process.env.PLAYWRIGHT_USER_PASSWORD;
export const organizerEmail = process.env.PLAYWRIGHT_ORGANIZER_EMAIL ?? process.env.PLAYWRIGHT_USER_EMAIL;
export const organizerPassword = process.env.PLAYWRIGHT_ORGANIZER_PASSWORD ?? process.env.PLAYWRIGHT_USER_PASSWORD;
export const tournamentId = process.env.PLAYWRIGHT_TOURNAMENT_ID;

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
  await expect(page).toHaveURL(/\/$/);
}

export async function openTournament(page: Page, id: string) {
  await page.goto(`${baseURL}/tournaments/${id}`);
  await expect(page).toHaveURL(new RegExp(`/tournaments/${id}`));
}
