import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Plan Editor', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal plan editor coverage runs on desktop chromium only; user settings are shared');

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

  test('flagged user sees the Signal plan editor workspace', async ({ page }) => {
    await page.goto('/user/plan');
    const firstPlanLink = page.getByRole('listitem').first().getByRole('link');
    await firstPlanLink.click();
    await page.waitForURL(/\/user\/plan\/\d+/);

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Plan editor').first()).toBeVisible();
    await expect(page.getByText('Weeks').first()).toBeVisible();
    await expect(page.getByText('Workouts').first()).toBeVisible();
    await expect(page.getByText('Exercise slots').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
  });
});
