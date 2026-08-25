import { test, expect } from '@playwright/test';

test.describe.serial('Quick Tournament Creation and Edit Flow', () => {
  test.setTimeout(120_000);

  const userEmail = 'admin1@gmail.com';
  const userPassword = '123456';
  const tournamentName = `Test Quick Tournament ${Date.now()}`;
  const editedTournamentName = `Edited Quick Tournament ${Date.now()}`;

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

  test('Create a quick tournament', async ({ page }) => {
    const sleep = async () => page.waitForTimeout(500);

    // Navigate to quick create page and clean any old draft
    await page.goto('http://localhost:3001/organizer/tournaments/create');
    await page.evaluate(() => localStorage.clear());
    await sleep();

    // Fill in the basic info using data-testid attributes
    await page.getByTestId('tournament-name-input').fill(tournamentName);
    await page.getByTestId('sport-select').selectOption({ label: 'Cầu lông' });
    await page.getByTestId('venue-name-input').fill('Sân Cầu Lông Kỳ Hòa');
    await page.getByTestId('location-address-input').fill('123 Đường Example, Hà Nội');
    await sleep();

    // Select Tỉnh/Thành phố
    await page.getByTestId('province-select-input').click();
    await page.getByTestId('province-select-input').fill('Hà Nội');
    await page.locator('button[data-testid^="region-option-"]').first().click();
    await sleep();

    // Pick a date (today + 7 days) using the datetime picker
    const startDateInput = page.locator('input[name="startDate"]');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(9, 0, 0, 0);
    const iso = futureDate.toISOString().slice(0, 16);
    await startDateInput.fill(iso);
    await sleep();

    // Select Nội dung thi đấu (e.g. MALE_DOUBLES)
    await page.getByTestId('format-option-MALE_SINGLES').click();
    await sleep();

    // Submit the form
    await page.getByTestId('submit-quick-create-btn').click();
    await sleep();

    // Expect to be redirected to the manage page of the new tournament
    await expect(page).toHaveURL(/\/organizer\/tournaments\/.*\/manage/, { timeout: 20000 });
    await sleep();
    // Verify the tournament title contains the name we entered
    await expect(page.getByTestId('tournament-title')).toHaveText(tournamentName);
    await sleep();
  });

  test('Edit tournament and configure tabs from manage page', async ({ page }) => {
    const sleep = async () => page.waitForTimeout(1000);

    // 1. Truy cập vào /dashboard
    await page.goto('http://localhost:3001/dashboard');
    await sleep();

    // 2. Click vào tab/link 'Quản lý giải đấu'
    const manageTournamentsBtn = page.locator('a[href="/organizer/tournaments"]').first();
    await manageTournamentsBtn.click();
    await sleep();

    // Hệ thống Navigate đến /organizer/tournaments
    await expect(page).toHaveURL(/\/organizer\/tournaments/);
    await sleep();

    // Click vào button 'Quản lý' của giải đấu vừa được tạo ở bước test create
    const tournamentCard = page.locator('div.bg-white', { hasText: tournamentName }).first();
    await tournamentCard.getByRole('link', { name: /Quản lý/i }).click();
    await sleep();

    // 3. Sau khi click giải đấu đã chọn, hệ thống navigate đến /organizer/tournaments/{id}/manage
    await expect(page).toHaveURL(/\/organizer\/tournaments\/.*\/manage/, { timeout: 20000 });
    await sleep();

    // 4. Thêm các bước test (chỉnh sửa thông tin) cho các tab

    // --- TAB 1: THÔNG TIN (Basic Info) ---
    await page.getByTestId('tab-basic').click();
    await sleep();

    // Sub-tab 1.1: Thông tin chung (General)
    await page.getByTestId('tab-basic-general').click();
    await sleep();
    await page.getByTestId('manage-tournament-name-input').fill(editedTournamentName);
    await sleep();
    await page.getByTestId('save-basic-info-btn').click();
    await sleep();
    await expect(page.getByTestId('tournament-title')).toHaveText(editedTournamentName);
    await sleep();

    // Sub-tab 1.2: Liên hệ & Mã mời (Contact)
    await page.getByTestId('tab-basic-contact').click();
    await sleep();
    await page.locator('input[placeholder="0987654321"]').fill('0912345678');
    await page.locator('input[placeholder="btc@vndcsport.vn"]').fill('contact@sporto.test');
    await sleep();
    await page.getByTestId('save-basic-info-btn').click();
    await sleep();

    // --- TAB 2: LỊCH & ĐỊA ĐIỂM (Schedule) ---
    await page.getByTestId('tab-schedule').click();
    await sleep();
    await page.getByPlaceholder('Ví dụ: Sân Cầu Lông Sunrise').fill('Sân Cầu Lông Hồ Tây Mới');
    await page.getByPlaceholder('Số 12, Đường hoa mai...').fill('456 Đường Lạc Long Quân, Hà Nội');
    await sleep();
    await page.getByRole('button', { name: 'Lưu lịch trình' }).click();
    await sleep();

    // --- TAB 3: ĐĂNG KÝ (Registration) ---
    await page.getByTestId('tab-registration').click();
    await sleep();
    // Đổi Chế độ nhận đăng ký thành Xét duyệt (APPROVAL)
    const modeSelect = page.locator('select').filter({ has: page.locator('option[value="APPROVAL"]') });
    if (await modeSelect.count() > 0) {
      await modeSelect.first().selectOption('APPROVAL');
      await sleep();
    }

    // Điền danh sách VĐV ảo (ô Textarea nhận danh sách nhiều dòng)
    await page.getByPlaceholder(/Mỗi dòng là 1 tên VĐV/i)
      .fill('Vận động viên 1\nVận động viên 2\nVận động viên 3\nVận động viên 4\nVận động viên 5\nVận động viên 6\nVận động viên 7');
    await sleep();

    // Click vào nút "Sinh VĐV ảo"
    await page.getByRole('button', { name: /Sinh VĐV ảo/i }).click();
    await sleep();

    await page.getByRole('button', { name: /Lưu thông tin đăng ký/i }).click();
    await sleep();

    // --- TAB 4: SƠ ĐỒ (Bracket) ---
    await page.getByTestId('tab-bracket').click();
    await sleep();
    await expect(page.getByTestId('tab-bracket')).toHaveClass(/bg-blue-600/);
    await sleep();

    // --- TAB 5: CAMERA (Livestream) ---
    await page.getByTestId('tab-livestream').click();
    await sleep();
    await page.getByPlaceholder('Ví dụ: Camera sân 1').fill('Camera Sân 1 - HD');
    await sleep();
    await page.getByRole('button', { name: /Tạo camera/i }).click();
    await sleep();

    // --- TAB 6: TÀI CHÍNH (Finance) ---
    await page.getByTestId('tab-finance').click();
    await sleep();
    const entryFeeInput = page.locator('label').filter({ hasText: /Lệ phí|Entry fee/i }).locator('..').locator('input');
    if (await entryFeeInput.isVisible() && !await entryFeeInput.isDisabled()) {
      await entryFeeInput.fill('100000');
      await sleep();
      await page.getByRole('button', { name: /Lưu cài đặt tài chính/i }).click();
      await sleep();
    }

    // --- TAB 7: PHÂN QUYỀN (Permissions) ---
    await page.getByTestId('tab-permissions').click();
    await sleep();
    await expect(page.getByTestId('tab-permissions')).toHaveClass(/bg-blue-600/);
    await sleep();
  });
});
