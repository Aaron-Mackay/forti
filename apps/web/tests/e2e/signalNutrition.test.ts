import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Signal Nutrition', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || !isMobile,
    'Signal nutrition coverage runs on mobile chromium only to verify scroll behavior; user settings are shared');

  test.beforeEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: true,
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

  test('flagged user can scroll the nutrition route on mobile', async ({ page }) => {
    await page.goto('/user/nutrition');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Training fuel')).toBeVisible();
    await expect(page.getByText('Daily log')).toBeVisible();

    const metrics = await page.evaluate(() => ({
      viewportHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }));

    expect(metrics.scrollHeight).toBeGreaterThan(metrics.viewportHeight);

    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });

    await expect(page.getByRole('button', { name: 'Next week' })).toBeVisible();
  });
});
