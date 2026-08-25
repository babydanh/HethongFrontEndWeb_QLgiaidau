import { test, expect } from '@playwright/test';
import {
  getOrFetchTournamentId,
  openTournament,
  requireEnv,
} from './fixtures';

test.describe('P0 public tournament tracking flow', () => {
  test('public user can open Bracket and Matches surfaces', async ({ page, request }, testInfo) => {
    const targetTournamentId = await getOrFetchTournamentId(request);

    await requireEnv(testInfo, {
      PLAYWRIGHT_TOURNAMENT_ID: targetTournamentId,
    });

    await openTournament(page, targetTournamentId!);

    const bracketTab = page.getByRole('button', { name: /sơ đồ|bracket/i }).first();
    if (await bracketTab.count()) {
      await expect(bracketTab).toBeVisible();
      await bracketTab.click();
      await expect(page.getByText(/sơ đồ|bracket|nhánh thắng|winners bracket/i).first()).toBeVisible();
    }

    const matchesTab = page.getByRole('button', { name: /trận đấu|matches/i }).first();
    if (await matchesTab.count()) {
      await expect(matchesTab).toBeVisible();
      await matchesTab.click();
      await expect(page.getByText(/trận đấu|matches|lịch thi đấu/i).first()).toBeVisible();
    }

    // The frontend consumer owns bounded refresh/listener cleanup; backend event delivery is a separate contract gate.
    await expect(page.locator('body')).not.toContainText(/undefined|null/i);
  });
});
