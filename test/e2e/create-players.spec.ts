import { test, expect, Page } from '@playwright/test';

test.describe.serial('Register 3 user accounts automation flow', () => {
  test.setTimeout(120_000);

  const baseURL = process.env.FRONTEND_URL || 'http://localhost:3001';
  const timestamp = Date.now();

  const users = [
    {
      fullName: 'Vận Động Viên 1',
      email: `user_player1_${timestamp}@sporto.vn`,
      password: 'Password123!',
    },
    {
      fullName: 'Vận Động Viên 2',
      email: `user_player2_${timestamp}@sporto.vn`,
      password: 'Password123!',
    },
    {
      fullName: 'Vận Động Viên 3',
      email: `user_player3_${timestamp}@sporto.vn`,
      password: 'Password123!',
    },
  ];

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

  const sleep = async (page: Page, ms = 500) => page.waitForTimeout(ms);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    test(`Register and verify user account #${i + 1} (${user.fullName})`, async ({ page }) => {
      // 1. Clear session to start in an unauthenticated state
      await clearSession(page);
      await sleep(page, 300);

      // 2. Navigate to Register page
      await page.goto(`${baseURL}/register`);
      await expect(page).toHaveURL(/\/register/);
      await sleep(page, 300);

      // 3. Fill registration form using resilient selectors
      const fullNameInput = page.locator('input[name="fullName"], [data-testid="register-fullname-input"], input[placeholder="Nguyễn Văn A"]').first();
      await expect(fullNameInput).toBeVisible({ timeout: 15_000 });
      await fullNameInput.fill(user.fullName);
      await sleep(page, 200);

      const emailInput = page.locator('input[name="email"], [data-testid="register-email-input"]').first();
      await emailInput.fill(user.email);
      await sleep(page, 200);

      const passwordInput = page.locator('input[name="password"], [data-testid="register-password-input"]').first();
      await passwordInput.fill(user.password);
      await sleep(page, 200);

      const confirmPasswordInput = page.locator('input[name="confirmPassword"], [data-testid="register-confirm-password-input"]').first();
      await confirmPasswordInput.fill(user.password);
      await sleep(page, 300);

      // 4. Click Submit button
      const submitBtn = page.locator('button[type="submit"], [data-testid="register-submit-btn"]').first();
      await submitBtn.click();
      await sleep(page, 500);

      // 5. Expect redirection to /login upon successful registration
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
      await sleep(page, 500);

      // 6. Verify logging in with newly registered account
      const loginEmailInput = page.locator('input[name="email"], [data-testid="login-email-input"]').first();
      await loginEmailInput.fill(user.email);
      await sleep(page, 200);

      const loginPasswordInput = page.locator('input[name="password"], [data-testid="login-password-input"]').first();
      await loginPasswordInput.fill(user.password);
      await sleep(page, 200);

      const loginSubmitBtn = page.locator('button[type="submit"], [data-testid="login-submit-btn"]').first();
      await loginSubmitBtn.click();
      await sleep(page, 500);

      // 7. Expect redirect to Home page after login
      await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
      await sleep(page, 500);

      // 8. Clean up session after test
      await clearSession(page);
    });
  }
});