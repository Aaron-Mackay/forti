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

    const scrollArea = page.locator('[data-signal-shell-mobile-frame] main');
    const main = scrollArea;

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(main.getByText('Preferences', { exact: true })).toBeVisible();

    const metrics = await scrollArea.evaluate((node) => ({
      viewportHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    }));

    expect(metrics.scrollHeight).toBeGreaterThan(metrics.viewportHeight);

    await scrollArea.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    await expect(main.getByText('Connections and coaching', { exact: true })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Download Check-in History' })).toBeVisible();
  });
});
