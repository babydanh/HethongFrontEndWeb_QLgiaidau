import { test, expect, Page } from '@playwright/test';

test.describe('Edit Profile Flow', () => {
  test.setTimeout(60_000);

  // LOCAL
  // const baseURL = process.env.FRONTEND_URL || 'http://localhost:3001';
  // PRODUCTION
  const baseURL = 'https://sporto.asia';

  const profileData = {
    phone: '0987654321',
    dateOfBirth: '20/10/1998', // DD/MM/YYYY
    gender: 'Nam', // 'Nam' | 'Nữ' | 'Khác'
  };

  const sleep = async (page: Page, ms = 500) => page.waitForTimeout(ms);
  const userEmail = 'user8@gmail.com';
  const userPassword = 'Password123!';

  test.beforeEach(async ({ page }) => {
    const sleep = async () => page.waitForTimeout(500);
    // Login
    await page.goto('http://localhost:3001/login');
    await sleep();

    await page.getByTestId('login-email-input').fill(userEmail);
    await sleep();
    await page.getByTestId('login-password-input').fill(userPassword);
    await sleep();
    await page.getByTestId('login-submit-btn').click();
    await sleep();
    // Wait for navigation to home
    await expect(page).toHaveURL(/\/$/);
    await sleep();
  });

  test('Edit Profile - Fill phone, date of birth, gender and save changes', async ({ page }) => {
    // 1. Truy cập link: http://localhost:3001/profile/edit
    await page.goto(`${baseURL}/profile/edit`);
    await expect(page).toHaveURL(/\/profile\/edit/, { timeout: 15_000 });
    await sleep(page, 500);

    // 2. Điền Số điện thoại
    const phoneInput = page.locator('input[name="phone"], [data-testid="profile-phone-input"], input[type="tel"]').first();
    await expect(phoneInput).toBeVisible({ timeout: 15_000 });
    await phoneInput.fill(profileData.phone);
    await sleep(page, 300);

    // 3. Điền Ngày sinh (DD/MM/YYYY)
    const dobInput = page.locator('label', { hasText: /ngày sinh|date of birth/i }).locator('..').locator('input').first();
    await expect(dobInput).toBeVisible({ timeout: 10_000 });
    await dobInput.click();
    await dobInput.fill(profileData.dateOfBirth);
    await sleep(page, 300);

    // 4. Chọn Giới tính
    const genderSelect = page.locator('select[name="gender"], [data-testid="profile-gender-select"]').first();
    await expect(genderSelect).toBeVisible({ timeout: 10_000 });
    if (await genderSelect.isEnabled()) {
      await genderSelect.selectOption(profileData.gender);
      await sleep(page, 300);
    }

    // 5. Lưu thay đổi
    const saveBtn = page.locator('button[type="submit"], [data-testid="save-profile-btn"]').first();
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
    await saveBtn.click();
    await sleep(page, 500);

    // 6. Kiểm tra kết quả sau khi lưu (Chuyển hướng về /profile hoặc thông báo thành công)
    await expect(page).toHaveURL(/\/profile(?:\/|$|\?)/, { timeout: 20_000 });
  });
});
