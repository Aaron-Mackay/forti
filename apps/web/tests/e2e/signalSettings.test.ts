import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Signal Settings', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || !isMobile,
    'Signal settings coverage runs on mobile chromium only to verify scroll behavior; user settings are shared');

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

  test('flagged user can scroll the settings route on mobile', async ({ page }) => {
    await page.goto('/user/settings');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Preferences', { exact: true })).toBeVisible();

    const metrics = await page.evaluate(() => ({
      viewportHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }));

    expect(metrics.scrollHeight).toBeGreaterThan(metrics.viewportHeight);

    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });

    await expect(page.getByText('Connections and coaching')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Check-in History' })).toBeVisible();
  });
});
