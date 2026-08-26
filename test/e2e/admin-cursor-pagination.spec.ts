import { expect, test } from '@playwright/test';

import { baseURL, login, requireEnv } from './p0/fixtures';

test.describe('Admin user cursor pagination', () => {
  test('replaces Xem thêm with cursor page navigation', async ({ page }, testInfo) => {
    const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
    const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
    await requireEnv(testInfo, {
      PLAYWRIGHT_ADMIN_EMAIL: adminEmail,
      PLAYWRIGHT_ADMIN_PASSWORD: adminPassword,
    });

    const pageOneUser = {
      id: 'admin-pagination-user-1',
      email: 'page-one@sporto.test',
      isEmailVerified: true,
      createdAt: '2026-08-19T00:00:00.000Z',
      roles: ['PLAYER'],
      profile: { fullName: 'Page One User', avatarUrl: undefined, isVerified: false },
    };
    const pageTwoUser = {
      id: 'admin-pagination-user-2',
      email: 'page-two@sporto.test',
      isEmailVerified: true,
      createdAt: '2026-08-18T00:00:00.000Z',
      roles: ['PLAYER'],
      profile: { fullName: 'Page Two User', avatarUrl: undefined, isVerified: false },
    };

    await page.route('**/api/v1/users*', async (route) => {
      const requestUrl = new URL(route.request().url());
      const cursor = requestUrl.searchParams.get('cursor');
      const response = cursor === 'next-page-token'
        ? {
            data: [pageTwoUser],
            meta: { total: 2, page: 1, limit: 20, totalPages: 1, nextCursor: null, hasMore: false },
          }
        : {
            data: [pageOneUser],
            meta: { total: 2, page: 1, limit: 20, totalPages: 1, nextCursor: 'next-page-token', hasMore: true },
          };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    await login(page, adminEmail as string, adminPassword as string);
    await page.goto(`${baseURL}/admin/moderation`);

    await expect(page.getByText('Page One User')).toBeVisible();
    await expect(page.getByRole('button', { name: /Xem thêm người dùng|Load more users/i })).toHaveCount(0);
    const nextPageButton = page.getByRole('button', { name: /Trang sau|Next page/i });
    await expect(nextPageButton).toBeEnabled();

    await nextPageButton.click();
    await expect(page.getByText('Page Two User')).toBeVisible();
    await expect(page.getByText('Page One User')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Trang trước|Previous page/i })).toBeEnabled();
  });
});
