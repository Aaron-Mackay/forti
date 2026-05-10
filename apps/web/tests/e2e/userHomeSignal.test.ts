import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('User Home Signal', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal user home coverage runs on desktop chromium only; user settings are shared');

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

  test('flagged user sees the Signal command centre on the home route', async ({ page }) => {
    await page.goto('/user');

    await expect(page.locator('[data-signal-surface="gym"]').first()).toBeVisible();

    // Today's metrics row is always rendered with the four canonical labels
    await expect(page.getByText("Today's metrics").first()).toBeVisible();
    await expect(page.getByText('Weight', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Sleep', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Steps', { exact: true }).first()).toBeVisible();

    // Hero state varies with plan data; accept any of the four canonical states
    const heroCopy = page.getByText(
      /Build your first plan|Resume workout|Start workout|Nothing left to log this week/,
    );
    await expect(heroCopy.first()).toBeVisible();
  });
});
