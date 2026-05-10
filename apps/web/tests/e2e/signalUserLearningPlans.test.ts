import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Signal User Learning Plans', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'Signal user learning plans coverage runs on chromium only; user settings are shared');

  test.beforeEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: true,
          coachModeActive: false,
        },
      },
    });
  });

  test.afterEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: false,
        },
      },
    });
  });

  test('flagged user sees the Signal learning plans route', async ({ page }) => {
    await page.goto('/user/learning-plans');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Assigned coaching')).toBeVisible();
    await expect(page.getByText(/Work through the lessons your coach assigns/i)).toBeVisible();

    await expect(
      page
        .locator('[data-signal-learning-plan-card]')
        .first()
        .or(page.locator('[data-signal-learning-plans-empty]'))
        .or(page.locator('[data-signal-learning-plans-loading]')),
    ).toBeVisible();
  });
});
