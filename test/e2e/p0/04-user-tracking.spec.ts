import { test, expect } from '@playwright/test';
import {
  openTournament,
  requireEnv,
  tournamentId,
} from './fixtures';

test.describe('P0 public tournament tracking flow', () => {
  test('public user can open Bracket and Matches surfaces', async ({ page }, testInfo) => {
    await requireEnv(testInfo, {
      PLAYWRIGHT_TOURNAMENT_ID: tournamentId,
    });

    await openTournament(page, tournamentId!);

    const bracketTab = page.getByRole('button', { name: /sơ đồ|bracket/i }).first();
    await expect(bracketTab).toBeVisible();
    await bracketTab.click();
    await expect(page.getByText(/sơ đồ|bracket|nhánh thắng|winners bracket/i).first()).toBeVisible();

    const matchesTab = page.getByRole('button', { name: /trận đấu|matches/i }).first();
    await expect(matchesTab).toBeVisible();
    await matchesTab.click();
    await expect(page.getByText(/trận đấu|matches|lịch thi đấu/i).first()).toBeVisible();

    // The frontend consumer owns bounded refresh/listener cleanup; backend event delivery is a separate contract gate.
    await expect(page.locator('body')).not.toContainText(/undefined|null/i);
  });
});
