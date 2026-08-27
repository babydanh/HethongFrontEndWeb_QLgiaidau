import { test, expect, Page } from '@playwright/test';

test.describe.serial('Full Player Automation Flow (3 Users: Register -> Login -> Edit Profile -> Join Tournament)', () => {
  test.setTimeout(180_000);

  // BASE URL Configuration
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.FRONTEND_URL || 'https://sporto.asia';

  const users = Array.from({ length: 3 }, (_, index) => {
    const number = index + 24;
    // const gender = (index % 2 === 0) ? 'Nam' : 'Nữ';
    const gender = 'Nữ';
    return {
      fullName: `Vận động viên ${number} (${gender})`,
      email: `user${number}@gmail.com`,
      password: 'Password123!',
      phone: `0987654${String(number).padStart(3, '0')}`,
      dateOfBirth: '20/10/1998',
      gender,
    };
  });

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

    test(`Player #${i + 1} (${user.fullName}): Register -> Login -> Edit Profile -> Join Tournament`, async ({ page }) => {
      // ==========================================
      // STEP 1: CLEAR SESSION & NAVIGATE TO REGISTER
      // ==========================================
      await test.step(`1. Register account for ${user.email}`, async () => {
        await clearSession(page);
        await sleep(page, 400);

        await page.goto(`${baseURL}/register`);
        await expect(page).toHaveURL(/\/register/);
        await sleep(page, 400);

        // Fill registration form
        const fullNameInput = page.locator('input[name="fullName"], [data-testid="register-fullname-input"], input[placeholder*="Nguyễn Văn A"]').first();
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

        // Submit registration
        const submitBtn = page.locator('button[type="submit"], [data-testid="register-submit-btn"]').first();
        await submitBtn.click();
        await sleep(page, 800);

        // Expect redirect to login or home
        await expect(page).toHaveURL(/\/(login|$)/, { timeout: 20_000 });
        await sleep(page, 400);
      });

      // ==========================================
      // STEP 2: LOGIN WITH NEW ACCOUNT
      // ==========================================
      await test.step(`2. Login with ${user.email}`, async () => {
        if (!page.url().includes('/login')) {
          await page.goto(`${baseURL}/login`);
        }
        await expect(page).toHaveURL(/\/login/);
        await sleep(page, 400);

        const loginEmailInput = page.locator('input[name="email"], [data-testid="login-email-input"]').first();
        await expect(loginEmailInput).toBeVisible({ timeout: 15_000 });
        await loginEmailInput.fill(user.email);
        await sleep(page, 200);

        const loginPasswordInput = page.locator('input[name="password"], [data-testid="login-password-input"]').first();
        await loginPasswordInput.fill(user.password);
        await sleep(page, 200);

        const loginSubmitBtn = page.locator('button[type="submit"], [data-testid="login-submit-btn"]').first();
        await loginSubmitBtn.click();
        await sleep(page, 800);

        // Wait for redirection away from /login
        await expect(page).not.toHaveURL(/\/login(?:\/|$|\?)/, { timeout: 20_000 });
        await sleep(page, 500);
      });

      // ==========================================
      // STEP 3: EDIT PROFILE (PHONE, DOB, GENDER)
      // ==========================================
      await test.step(`3. Edit profile for ${user.fullName}`, async () => {
        await page.goto(`${baseURL}/profile/edit`);
        await expect(page).toHaveURL(/\/profile\/edit/, { timeout: 15_000 });
        await sleep(page, 500);

        // Fill phone number
        const phoneInput = page.locator('input[name="phone"], [data-testid="profile-phone-input"], input[type="tel"]').first();
        await expect(phoneInput).toBeVisible({ timeout: 15_000 });
        await phoneInput.fill(user.phone);
        await sleep(page, 300);

        // Fill Date of birth (DD/MM/YYYY)
        const dobInput = page.locator('label', { hasText: /ngày sinh|date of birth/i }).locator('..').locator('input').first()
          .or(page.locator('input[placeholder*="dd/mm/yyyy" i], input[placeholder*="DD/MM/YYYY"]').first());
        if (await dobInput.count() && await dobInput.isVisible()) {
          await dobInput.click();
          await dobInput.fill(user.dateOfBirth);
          await sleep(page, 300);
        }

        // Select Gender
        const genderSelect = page.locator('select[name="gender"], [data-testid="profile-gender-select"]').first();
        if (await genderSelect.count() && await genderSelect.isVisible() && await genderSelect.isEnabled()) {
          await genderSelect.selectOption(user.gender);
          await sleep(page, 300);
        }

        // Save profile changes
        const saveProfileBtn = page.locator('button[type="submit"], [data-testid="save-profile-btn"]').first();
        await expect(saveProfileBtn).toBeVisible({ timeout: 10_000 });
        await saveProfileBtn.click();
        await sleep(page, 1000);

        // Expect redirect to /profile
        await expect(page).toHaveURL(/\/profile(?:\/|$|\?)/, { timeout: 20_000 });
        await sleep(page, 500);
      });

      // ==========================================
      // STEP 4: JOIN FIRST TOURNAMENT (FROM FEATURED BANNER)
      // ==========================================
      await test.step(`4. Join first tournament from featured banner with ${user.fullName}`, async () => {
        // 1. Navigate to Homepage
        await page.goto(`${baseURL}/`);
        await sleep(page, 800);

        // 2. Locate and click the first tournament on the Featured Tournaments Banner
        const featuredSection = page.locator('section').filter({ hasText: /giải đấu nổi bật|featured tournaments/i });
        const bannerTournamentCard = featuredSection
          .locator('a[href^="/tournaments/"]:not([href="/tournaments"])')
          .first();

        await expect(bannerTournamentCard).toBeVisible({ timeout: 20_000 });
        await bannerTournamentCard.click();
        await sleep(page, 800);

        // 3. Expect navigation to tournament detail page
        await expect(page).toHaveURL(/\/tournaments\/[a-zA-Z0-9_-]+/, { timeout: 20_000 });

        // 4. Click register or navigate directly to register page
        const registerLink = page.locator('a[href$="/register"], button:has-text("Đăng ký"), button:has-text("Register")').first();
        if (await registerLink.count() && await registerLink.isVisible() && await registerLink.isEnabled()) {
          await registerLink.click();
          await sleep(page, 500);
        } else {
          const currentDetailUrl = page.url().split('?')[0].replace(/\/$/, '');
          await page.goto(`${currentDetailUrl}/register`);
          await sleep(page, 500);
        }

        await expect(page).toHaveURL(new RegExp(`/tournaments/.*`), { timeout: 15_000 });

        // 5. Check if already registered
        const alreadyRegisteredMsg = page.getByText(/đã đăng ký|registered|yêu cầu xét duyệt|đã gửi yêu cầu/i).first();
        if (await alreadyRegisteredMsg.count() && await alreadyRegisteredMsg.isVisible()) {
          await expect(alreadyRegisteredMsg).toBeVisible();
        } else {
          // Select division matching the player's gender (Nam -> "nam/male/đôi nam nữ", Nữ -> "nữ/female/đôi nam nữ")
          const isMale = user.gender.toLowerCase().includes('nam') || user.gender.toLowerCase().includes('male');
          const genderPattern = isMale
            ? /(?:nam|male|men|đôi\s*nam\s*\/\s*nữ|đôi\s*nam\s*nữ)/i
            : /(?:nữ|nu|female|women|đôi\s*nam\s*\/\s*nữ|đôi\s*nam\s*nữ)/i;

          const matchingDivision = page.locator('button').filter({ hasText: genderPattern }).first();
          if (await matchingDivision.count() && await matchingDivision.isVisible()) {
            await matchingDivision.click();
            await sleep(page, 400);
          } else {
            // Fallback to first division if specific gender card not found
            const fallbackDivision = page.locator('button').filter({ hasText: /Đơn|Đôi|Nhánh|Division|VĐV/i }).first();
            if (await fallbackDivision.count() && await fallbackDivision.isVisible()) {
              await fallbackDivision.click();
              await sleep(page, 400);
            }
          }

          // Consent checkbox if present
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

          // Verify registration completed
          await expect(
            page.locator('body')
          ).toContainText(/đã đăng ký|registered|yêu cầu xét duyệt|thành công|đã gửi yêu cầu|thanh toán|checkout/i, { timeout: 20_000 });
        }

        await sleep(page, 800);
      });

      // Cleanup session before next user
      await clearSession(page);
    });
  }
});
