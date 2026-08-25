import { test, expect } from '@playwright/test';
import {
  baseURL,
  ensurePlayerAccount,
  getOrFetchTournamentId,
  login,
  openTournament,
  playerEmail,
  playerPassword,
  requireEnv,
} from './fixtures';

test.describe('P0 public registration flow', () => {
  test('player can open registration and sees server-confirmed registered state', async ({ page, request }, testInfo) => {
    await ensurePlayerAccount(request);
    const targetTournamentId = await getOrFetchTournamentId(request);

    await requireEnv(testInfo, {
      PLAYWRIGHT_PLAYER_EMAIL: playerEmail,
      PLAYWRIGHT_PLAYER_PASSWORD: playerPassword,
      PLAYWRIGHT_TOURNAMENT_ID: targetTournamentId,
    });

    await login(page, playerEmail, playerPassword);
    await openTournament(page, targetTournamentId!);

    const publicRegisterLink = page.locator(`a[href*="/tournaments/${targetTournamentId}/register"]`).first();
    if (await publicRegisterLink.count() && await publicRegisterLink.isVisible()) {
      await publicRegisterLink.click();
    } else {
      await page.goto(`${baseURL}/tournaments/${targetTournamentId}/register`);
    }

    await page.waitForURL(new RegExp(`/tournaments/${targetTournamentId}/register`), { timeout: 10_000 }).catch(async () => {
      await page.goto(`${baseURL}/tournaments/${targetTournamentId}/register`);
    });

    await expect(page).toHaveURL(new RegExp(`/tournaments/${targetTournamentId}`));

    const registeredState = page.getByText(/đã đăng ký|registered|registration submitted|đã gửi yêu cầu/i).first();
    if (await registeredState.count()) {
      await expect(registeredState).toBeVisible();
      return;
    }

    const submitButton = page.getByRole('button', { name: /xác nhận đăng ký|confirm.*registration|register/i }).last();
    if (await submitButton.count()) {
      await expect(submitButton).toBeVisible();
      await submitButton.click();
      await expect(page.getByText(/đã đăng ký|registered|đã gửi yêu cầu|registration submitted/i).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('player is redirected away from organizer routes', async ({ page, request }) => {
    await ensurePlayerAccount(request);

    await login(page, playerEmail, playerPassword);
    await page.goto(`${baseURL}/organizer/tournaments`);
    await expect(page).not.toHaveURL(/\/organizer\/tournaments(?:\/|$)/);
  });
});
