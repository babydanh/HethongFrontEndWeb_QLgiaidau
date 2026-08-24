import { test, expect } from '@playwright/test';
import {
  login,
  openTournament,
  playerEmail,
  playerPassword,
  requireEnv,
  tournamentId,
} from './fixtures';

test.describe('P0 public registration flow', () => {
  test('player can open registration and sees server-confirmed registered state', async ({ page }, testInfo) => {
    await requireEnv(testInfo, {
      PLAYWRIGHT_PLAYER_EMAIL: playerEmail,
      PLAYWRIGHT_PLAYER_PASSWORD: playerPassword,
      PLAYWRIGHT_TOURNAMENT_ID: tournamentId,
    });

    await login(page, playerEmail!, playerPassword!);
    await openTournament(page, tournamentId!);

    const publicRegisterLink = page.getByRole('link', { name: /đăng ký|register/i }).first();
    if (await publicRegisterLink.count()) await publicRegisterLink.click();
    else await page.goto(`${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'}/tournaments/${tournamentId}/register`);

    await expect(page).toHaveURL(/\/tournaments\/[^/]+\/register/);

    const registeredState = page.getByText(/đã đăng ký|registered|registration submitted|đã gửi yêu cầu/i).first();
    if (await registeredState.count()) {
      await expect(registeredState).toBeVisible();
      return;
    }

    const submitButton = page.getByRole('button', { name: /xác nhận đăng ký|confirm.*registration|register/i }).last();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    await expect(page.getByText(/đã đăng ký|registered|đã gửi yêu cầu|registration submitted/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('player is redirected away from organizer routes', async ({ page }, testInfo) => {
    await requireEnv(testInfo, {
      PLAYWRIGHT_PLAYER_EMAIL: playerEmail,
      PLAYWRIGHT_PLAYER_PASSWORD: playerPassword,
    });

    await login(page, playerEmail!, playerPassword!);
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'}/organizer/tournaments`);
    await expect(page).not.toHaveURL(/\/organizer\/tournaments(?:\/|$)/);
  });
});
