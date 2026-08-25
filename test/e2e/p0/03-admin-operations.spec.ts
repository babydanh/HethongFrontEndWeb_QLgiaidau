import { test, expect } from '@playwright/test';
import {
  baseURL,
  getOrFetchTournamentId,
  login,
  organizerEmail,
  organizerPassword,
  requireEnv,
} from './fixtures';

test.describe('P0 organizer operations flow', () => {
  test('organizer can open Ops and reach schedule/score controls', async ({ page, request }, testInfo) => {
    const targetTournamentId = await getOrFetchTournamentId(request);

    await requireEnv(testInfo, {
      PLAYWRIGHT_ORGANIZER_EMAIL: organizerEmail,
      PLAYWRIGHT_ORGANIZER_PASSWORD: organizerPassword,
      PLAYWRIGHT_TOURNAMENT_ID: targetTournamentId,
    });

    await login(page, organizerEmail, organizerPassword);
    await page.goto(`${baseURL}/organizer/tournaments/${targetTournamentId}/ops`);
    await expect(page).toHaveURL(new RegExp(`/organizer/tournaments/${targetTournamentId}/ops`));

    const operationsTab = page.getByRole('button', { name: /vận hành|operations/i }).first();
    if (await operationsTab.count()) {
      await expect(operationsTab).toBeVisible();
      await operationsTab.click();
    }

    const matchCards = page.locator('[id^="ops-match-card-"]');
    if (await matchCards.count()) {
      await expect(matchCards.first()).toBeVisible();

      const firstCard = matchCards.first();
      const scheduleButton = firstCard.getByRole('button', { name: /xếp lịch|schedule/i });
      if (await scheduleButton.count()) {
        await expect(scheduleButton).toBeVisible();
        await scheduleButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: /hủy|cancel/i }).last().click();
      }

      const scoreOrOperationButton = firstCard.getByRole('button', { name: /điểm|score|thao tác đặc biệt|special operation/i }).first();
      if (await scoreOrOperationButton.count()) {
        await expect(scoreOrOperationButton).toBeVisible();
        await scoreOrOperationButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    }
  });
});
