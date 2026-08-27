import { test, expect, Page } from '@playwright/test';

test.describe.serial('Join First Tournament (3 Existing Configured Accounts)', () => {
  test.setTimeout(120_000);

  // BASE URL Configuration
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.FRONTEND_URL || 'https://sporto.asia';

  // 3 Pre-configured accounts (editable via env vars or default setup)
  const users = [
    {
      email: process.env.PLAYER_1_EMAIL || 'user7@gmail.com',
      password: process.env.PLAYER_1_PASSWORD || 'Password123!',
      fullName: 'Tài khoản 1',
      gender: 'Nam',
    },
    {
      email: process.env.PLAYER_2_EMAIL || 'user8@gmail.com',
      password: process.env.PLAYER_2_PASSWORD || 'Password123!',
      fullName: 'Tài khoản 2',
      gender: 'Nam',
    },
    {
      email: process.env.PLAYER_3_EMAIL || 'user9@gmail.com',
      password: process.env.PLAYER_3_PASSWORD || 'Password123!',
      fullName: 'Tài khoản 3',
      gender: 'Nam',
    },
  ];

  const sleep = async (page: Page, ms = 600) => page.waitForTimeout(ms);

  const clearSession = async (page: Page) => {
    await page.context().clearCookies();
    await page.goto(`${baseURL}/login`);
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
  };

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    test(`Player #${i + 1} (${user.email}): Login and Join First Tournament`, async ({ page }) => {
      // 1. Clear session to start clean
      await clearSession(page);
      await sleep(page, 400);

      // 2. Navigate to Login page
      await page.goto(`${baseURL}/login`);
      await expect(page).toHaveURL(/\/login/);
      await sleep(page, 400);

      // 3. Fill login credentials
      const loginEmailInput = page.locator('input[name="email"], [data-testid="login-email-input"]').first();
      await expect(loginEmailInput).toBeVisible({ timeout: 15_000 });
      await loginEmailInput.fill(user.email);
      await sleep(page, 200);

      const loginPasswordInput = page.locator('input[name="password"], [data-testid="login-password-input"]').first();
      await loginPasswordInput.fill(user.password);
      await sleep(page, 200);

      // 4. Click Submit Login
      const loginSubmitBtn = page.locator('button[type="submit"], [data-testid="login-submit-btn"]').first();
      await loginSubmitBtn.click();
      await sleep(page, 800);

      // 5. Expect redirection away from /login
      await expect(page).not.toHaveURL(/\/login(?:\/|$|\?)/, { timeout: 20_000 });
      await sleep(page, 500);

      // 6. Navigate to Homepage
      await page.goto(`${baseURL}/`);
      await sleep(page, 800);

      // 7. Locate and click the first tournament on the Featured Tournaments Banner
      const featuredSection = page.locator('section').filter({ hasText: /giải đấu nổi bật|featured tournaments/i });
      const bannerTournamentCard = featuredSection
        .locator('a[href^="/tournaments/"]:not([href="/tournaments"])')
        .first();

      await expect(bannerTournamentCard).toBeVisible({ timeout: 20_000 });
      await bannerTournamentCard.click();
      await sleep(page, 800);

      // 8. Expect navigation to tournament detail page
      await expect(page).toHaveURL(/\/tournaments\/[a-zA-Z0-9_-]+/, { timeout: 20_000 });

      // 9. Click register button or navigate directly to /register
      const registerBtn = page.locator('a[href$="/register"], button:has-text("Đăng ký"), button:has-text("Register")').first();
      if (await registerBtn.count() && await registerBtn.isVisible() && await registerBtn.isEnabled()) {
        await registerBtn.click();
        await sleep(page, 500);
      } else {
        const currentDetailUrl = page.url().split('?')[0].replace(/\/$/, '');
        await page.goto(`${currentDetailUrl}/register`);
        await sleep(page, 500);
      }

      await expect(page).toHaveURL(new RegExp(`/tournaments/.*`), { timeout: 15_000 });

      // 10. Check if already registered
      const alreadyRegisteredMsg = page.getByText(/đã đăng ký|registered|yêu cầu xét duyệt|đã gửi yêu cầu/i).first();
      if (await alreadyRegisteredMsg.count() && await alreadyRegisteredMsg.isVisible()) {
        await expect(alreadyRegisteredMsg).toBeVisible();
      } else {
        // Select division matching the player's gender (Nam -> "nam/male/đôi nam nữ", Nữ -> "nữ/female/đôi nam nữ")
        const isMale = (user.gender || 'Nam').toLowerCase().includes('nam') || (user.gender || 'Nam').toLowerCase().includes('male');
        const genderPattern = isMale
          ? /(?:nam|male|men|đôi\s*nam\s*\/\s*nữ|đôi\s*nam\s*nữ)/i
          : /(?:nữ|nu|female|women|đôi\s*nam\s*\/\s*nữ|đôi\s*nam\s*nữ)/i;

        const matchingDivision = page.locator('button').filter({ hasText: genderPattern }).first();
        if (await matchingDivision.count() && await matchingDivision.isVisible()) {
          await matchingDivision.click();
          await sleep(page, 400);
        } else {
          // Fallback to first division card
          const fallbackDivision = page.locator('button').filter({ hasText: /Đơn|Đôi|Nhánh|Division|VĐV/i }).first();
          if (await fallbackDivision.count() && await fallbackDivision.isVisible()) {
            await fallbackDivision.click();
            await sleep(page, 400);
          }
        }

        // Check ranking consent checkbox if present
        const consentCheckbox = page.locator('input[type="checkbox"]').first();
        if (await consentCheckbox.count() && await consentCheckbox.isVisible() && !await consentCheckbox.isChecked()) {
          await consentCheckbox.check();
          await sleep(page, 200);
        }

        // Submit registration
        const confirmBtn = page.getByRole('button', { name: /xác nhận đăng ký|đăng ký tham gia|đăng ký giải|confirm.*registration|register/i })
          .or(page.locator('button[type="submit"]'))
          .last();

        if (await confirmBtn.count() && await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await sleep(page, 1000);
        }

        // 11. Verify registration completion
        await expect(
          page.locator('body')
        ).toContainText(/đã đăng ký|registered|yêu cầu xét duyệt|thành công|đã gửi yêu cầu|thanh toán|checkout/i, { timeout: 20_000 });
      }

      await sleep(page, 800);

      // 12. Cleanup session
      await clearSession(page);
    });
  }
});
