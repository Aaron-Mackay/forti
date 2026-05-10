import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Signal Supplements', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal supplements coverage runs on desktop chromium only; settings are shared');

  test.beforeEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: true,
          showSupplements: true,
        },
      },
    });
  });

  test.afterEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: false,
          showSupplements: false,
        },
      },
    });
  });

  test('flagged user sees the Signal supplements route', async ({ page }) => {
    await page.goto('/user/supplements');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Protocol tracker')).toBeVisible();
    await expect(page.getByText(/Track your active stack/i)).toBeVisible();

    await expect(
      page
        .locator('[data-signal-supplement-card]')
        .first()
        .or(page.locator('[data-signal-supplements-empty]'))
        .or(page.locator('[data-signal-supplements-loading]')),
    ).toBeVisible();
  });
});
