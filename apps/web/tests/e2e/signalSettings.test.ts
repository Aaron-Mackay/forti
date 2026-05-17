import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Signal Settings', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || !isMobile,
    'Signal settings coverage runs on mobile chromium only to verify hub + sub-screen flow; user settings are shared');

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

  test('flagged user lands on the hub and can drill into a sub-screen', async ({ page }) => {
    await page.goto('/user/settings');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();

    const main = page.locator('[data-signal-shell-mobile-frame] main');
    await expect(main.getByRole('heading', { level: 1, name: 'Everything' })).toBeVisible();

    // Group titles render in expected order
    await expect(main.getByText('ACCOUNT', { exact: true })).toBeVisible();
    await expect(main.getByText('TRAINING', { exact: true })).toBeVisible();
    await expect(main.getByText('COACHING', { exact: true })).toBeVisible();
    await expect(main.getByText('DATA', { exact: true })).toBeVisible();

    // Drill into Dashboard cards sub-screen
    await main.getByRole('link', { name: /Dashboard cards/ }).click();
    await expect(page).toHaveURL(/\/user\/settings\/dashboard$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Dashboard cards' })).toBeVisible();

    // Back chevron returns to hub
    await main.getByRole('link', { name: 'Back to Settings hub' }).click();
    await expect(page).toHaveURL(/\/user\/settings$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Everything' })).toBeVisible();
  });

  test('deep link to a sub-screen renders that section directly', async ({ page }) => {
    await page.goto('/user/settings/checkin');

    const main = page.locator('[data-signal-shell-mobile-frame] main');
    await expect(main.getByRole('heading', { level: 1, name: 'Weekly timing' })).toBeVisible();
    await expect(main.getByRole('radiogroup', { name: 'Check-in day' })).toBeVisible();
  });

  test('unknown sub-screen slug renders not-found instead of a Settings section', async ({ page }) => {
    await page.goto('/user/settings/nonexistent-slug');
    const main = page.locator('[data-signal-shell-mobile-frame] main');
    await expect(main.getByRole('heading', { level: 1, name: 'Everything' })).toBeHidden();
    await expect(page.getByText(/This page could not be found/i)).toBeVisible();
  });
});
