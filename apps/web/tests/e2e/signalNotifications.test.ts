import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Signal Notifications', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'Signal notifications coverage runs on chromium only; user settings are shared');

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

  test('flagged user sees the Signal notifications inbox', async ({ page }) => {
    await page.goto('/user/notifications');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Your inbox')).toBeVisible();
    await expect(page.getByText(/Coach feedback, check-in alerts/i)).toBeVisible();

    await expect(
      page
        .locator('[data-signal-notification-row]')
        .first()
        .or(page.locator('[data-signal-notifications-empty]'))
        .or(page.locator('[data-signal-notifications-loading]')),
    ).toBeVisible();
  });
});
