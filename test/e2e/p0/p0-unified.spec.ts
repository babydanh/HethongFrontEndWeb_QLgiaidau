import { test, expect } from '@playwright/test';
import {
  baseURL,
  ensurePlayerAccount,
  getOrFetchTournamentId,
  login,
  logout,
  openTournament,
  organizerEmail,
  organizerPassword,
  playerEmail,
  playerPassword,
  requireEnv,
} from './fixtures';

test.describe('P0 End-to-End Unified Flow', () => {
  test.setTimeout(120_000);

  test('Single-process P0 flow: player registration, route guard, organizer ops, and public tracking', async ({ page, request }, testInfo) => {
    const sleep = async (ms = 500) => page.waitForTimeout(ms);

    let targetTournamentId: string | undefined;

    // --- STEP 1: PREPARATION & PREREQUISITES ---
    await test.step('Prerequisites: Ensure player account and fetch target tournament', async () => {
      await ensurePlayerAccount(request);
      targetTournamentId = await getOrFetchTournamentId(request);

      await requireEnv(testInfo, {
        PLAYWRIGHT_PLAYER_EMAIL: playerEmail,
        PLAYWRIGHT_PLAYER_PASSWORD: playerPassword,
        PLAYWRIGHT_ORGANIZER_EMAIL: organizerEmail,
        PLAYWRIGHT_ORGANIZER_PASSWORD: organizerPassword,
        PLAYWRIGHT_TOURNAMENT_ID: targetTournamentId,
      });
    });

    // --- STEP 2: PLAYER REGISTRATION FLOW ---
    await test.step('Player registration flow', async () => {
      await login(page, playerEmail, playerPassword);
      await sleep();
      await openTournament(page, targetTournamentId!);
      await sleep();

      const publicRegisterLink = page.locator(`a[href*="/tournaments/${targetTournamentId}/register"]`).first();
      if (await publicRegisterLink.count() && await publicRegisterLink.isVisible()) {
        await publicRegisterLink.click();
        await sleep();
      } else {
        await page.goto(`${baseURL}/tournaments/${targetTournamentId}/register`);
        await sleep();
      }

      await page.waitForURL(new RegExp(`/tournaments/${targetTournamentId}/register`), { timeout: 10_000 }).catch(async () => {
        await page.goto(`${baseURL}/tournaments/${targetTournamentId}/register`);
        await sleep();
      });

      await expect(page).toHaveURL(new RegExp(`/tournaments/${targetTournamentId}`));
      await sleep();

      const registeredState = page.getByText(/đã đăng ký|registered|registration submitted|đã gửi yêu cầu/i).first();
      if (await registeredState.count()) {
        await expect(registeredState).toBeVisible();
        await sleep();
      } else {
        const submitButton = page.getByRole('button', { name: /xác nhận đăng ký|confirm.*registration|register/i }).last();
        if (await submitButton.count()) {
          await expect(submitButton).toBeVisible();
          await sleep();
          await submitButton.click();
          await sleep();
          await expect(page.getByText(/đã đăng ký|registered|đã gửi yêu cầu|registration submitted/i).first()).toBeVisible({ timeout: 15_000 });
          await sleep();
        }
      }
    });

    // --- STEP 3: PLAYER ROUTE GUARD REDIRECT ---
    await test.step('Player route guard check: redirect away from organizer routes', async () => {
      await page.goto(`${baseURL}/organizer/tournaments`);
      await sleep();
      await expect(page).not.toHaveURL(/\/organizer\/tournaments(?:\/|$)/);
      await sleep();
    });

    // --- STEP 4: ORGANIZER OPERATIONS FLOW ---
    await test.step('Organizer operations flow: schedule and score controls', async () => {
      await login(page, organizerEmail, organizerPassword);
      await sleep();
      await page.goto(`${baseURL}/organizer/tournaments/${targetTournamentId}/ops`);
      await sleep();
      await expect(page).toHaveURL(new RegExp(`/organizer/tournaments/${targetTournamentId}/ops`));
      await sleep();

      const operationsTab = page.getByRole('button', { name: /vận hành|operations/i }).first();
      if (await operationsTab.count()) {
        await expect(operationsTab).toBeVisible();
        await sleep();
        await operationsTab.click();
        await sleep();
      }

      const matchCards = page.locator('[id^="ops-match-card-"]');
      if (await matchCards.count()) {
        await expect(matchCards.first()).toBeVisible();
        await sleep();

        const firstCard = matchCards.first();
        const scheduleButton = firstCard.getByRole('button', { name: /xếp lịch|schedule/i });
        if (await scheduleButton.count()) {
          await expect(scheduleButton).toBeVisible();
          await sleep();
          await scheduleButton.click();
          await sleep();
          await expect(page.getByRole('dialog')).toBeVisible();
          await sleep();
          await page.getByRole('button', { name: /hủy|cancel/i }).last().click();
          await sleep();
        }

        const scoreOrOperationButton = firstCard.getByRole('button', { name: /điểm|score|thao tác đặc biệt|special operation/i }).first();
        if (await scoreOrOperationButton.count()) {
          await expect(scoreOrOperationButton).toBeVisible();
          await sleep();
          await scoreOrOperationButton.click();
          await sleep();
          await expect(page.getByRole('dialog')).toBeVisible();
          await sleep();
        }
      }
    });

    // --- STEP 5: PUBLIC TOURNAMENT TRACKING FLOW ---
    await test.step('Public tournament tracking flow: Bracket and Matches tabs', async () => {
      await logout(page);
      await sleep();
      await openTournament(page, targetTournamentId!);
      await sleep();

      const bracketTab = page.getByRole('button', { name: /sơ đồ|bracket/i }).first();
      if (await bracketTab.count()) {
        await expect(bracketTab).toBeVisible();
        await sleep();
        await bracketTab.click();
        await sleep();
        await expect(page.getByText(/sơ đồ|bracket|nhánh thắng|winners bracket/i).first()).toBeVisible();
        await sleep();
      }

      const matchesTab = page.getByRole('button', { name: /trận đấu|matches/i }).first();
      if (await matchesTab.count()) {
        await expect(matchesTab).toBeVisible();
        await sleep();
        await matchesTab.click();
        await sleep();
        await expect(page.getByText(/trận đấu|matches|lịch thi đấu/i).first()).toBeVisible();
        await sleep();
      }

      // The frontend consumer owns bounded refresh/listener cleanup; backend event delivery is a separate contract gate.
      await expect(page.locator('body')).not.toContainText(/undefined|null/i);
      await sleep();
    });
  });
});
