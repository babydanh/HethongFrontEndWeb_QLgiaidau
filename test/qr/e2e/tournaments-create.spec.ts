import { test, expect } from '@playwright/test';

test.describe('Tournament Create Flow', () => {
  test.beforeEach(async ({ page }) => {
    const sleep = () => page.waitForTimeout(2000);

    // Login trước khi test
    await page.goto('/auth/login');
    await sleep();
    await page.fill('input[name="email"]', 'test@example.com');
    await sleep();
    await page.fill('input[name="password"]', 'password123');
    await sleep();
    await page.click('button[type="submit"]');
    await sleep();
    await page.waitForURL(/organizer|dashboard/);
    await sleep();
  });

  test('Quick Create - happy path', async ({ page }) => {
    const sleep = () => page.waitForTimeout(2000);

    await page.goto('/organizer/tournaments/create');
    await sleep();

    // Nhập tên giải
    await page.fill('input[name="name"]', 'Playwright Test Tournament');
    await sleep();
    // Chọn môn thể thao
    await page.click('[data-testid="category-select"]');
    await sleep();
    await page.click('[data-testid="category-option-badminton"]');
    await sleep();

    // Submit
    await page.click('[data-testid="create-tournament-btn"]');
    await sleep();
    // Verify redirect tới manage page
    await expect(page).toHaveURL(/\/organizer\/tournaments\/.*\/manage/);
    await sleep();

    // Verify thông tin
    await expect(page.locator('[data-testid="tournament-name"]'))
      .toContainText('Playwright Test Tournament');
      await sleep();
  });

  test('Quick Create - validation errors', async ({ page }) => {
    const sleep = () => page.waitForTimeout(2000);
    await page.goto('/organizer/tournaments/create');
    await sleep();
    // Submit form trống
    await page.click('[data-testid="create-tournament-btn"]');
    await sleep();
    // Kiểm tra lỗi validation
    await expect(page.locator('.error-message')).toBeVisible();
    await sleep();
  });
});

test.describe('Tournament Edit Flow', () => {
  test('Edit tournament basic info', async ({ page }) => {
    const sleep = () => page.waitForTimeout(2000);
    // Navigate tới manage page của giải đã tạo
    await page.goto('/organizer/tournaments/<test-id>/manage');
    await sleep();
    // Click tab BasicInfo
    await page.click('[data-testid="tab-basic-info"]');
    await sleep();

    // Đổi tên
    await page.fill('input[name="name"]', 'Updated Tournament Name');
    await sleep();

    // Save
    await page.click('[data-testid="save-btn"]');
    await sleep();
    // Verify toast thành công
    await expect(page.locator('.toast-success')).toBeVisible();
    await sleep();
  });
});