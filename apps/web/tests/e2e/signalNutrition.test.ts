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

    const scrollArea = page.locator('[data-signal-shell-mobile-frame] main');
    const main = scrollArea;

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(main.getByText('Training fuel', { exact: true })).toBeVisible();
    await expect(main.getByText('Daily log', { exact: true })).toBeVisible();

    const metrics = await scrollArea.evaluate((node) => ({
      viewportHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    }));

    expect(metrics.scrollHeight).toBeGreaterThan(metrics.viewportHeight);

    await scrollArea.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    await expect(page.getByRole('button', { name: 'Next week' })).toBeVisible();
  });
});
