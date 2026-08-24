import { test, expect } from '@playwright/test';
import {
  baseURL,
  login,
  organizerEmail,
  organizerPassword,
  requireEnv,
  tournamentId,
} from './fixtures';

test.describe('P0 organizer operations flow', () => {
  test('organizer can open Ops and reach schedule/score controls', async ({ page }, testInfo) => {
    await requireEnv(testInfo, {
      PLAYWRIGHT_ORGANIZER_EMAIL: organizerEmail,
      PLAYWRIGHT_ORGANIZER_PASSWORD: organizerPassword,
      PLAYWRIGHT_TOURNAMENT_ID: tournamentId,
    });

    await login(page, organizerEmail!, organizerPassword!);
    await page.goto(`${baseURL}/organizer/tournaments/${tournamentId}/ops`);
    await expect(page).toHaveURL(new RegExp(`/organizer/tournaments/${tournamentId}/ops`));

    const operationsTab = page.getByRole('button', { name: /vận hành|operations/i }).first();
    await expect(operationsTab).toBeVisible();
    await operationsTab.click();

    const matchCards = page.locator('[id^="ops-match-card-"]');
    await expect(matchCards.first()).toBeVisible();

    const firstCard = matchCards.first();
    const scheduleButton = firstCard.getByRole('button', { name: /xếp lịch|schedule/i });
    await expect(scheduleButton).toBeVisible();
    await scheduleButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /hủy|cancel/i }).last().click();

    const scoreOrOperationButton = firstCard.getByRole('button', { name: /điểm|score|thao tác đặc biệt|special operation/i }).first();
    if (await scoreOrOperationButton.count()) {
      await expect(scoreOrOperationButton).toBeVisible();
      await scoreOrOperationButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });
});
