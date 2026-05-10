import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Plan Create', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal plan create coverage runs on desktop chromium only; user settings are shared');

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

  test('flagged user sees the Signal plan-create entry surface', async ({ page }) => {
    await page.goto('/user/plan/create');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Plan create').first()).toBeVisible();
    await expect(page.getByText('Build a new training plan')).toBeVisible();
    await expect(page.getByText('From a template')).toBeVisible();
    await expect(page.getByText('Build with AI')).toBeVisible();
    await expect(page.getByText('Import from spreadsheet')).toBeVisible();
    await expect(page.getByText('Start from scratch')).toBeVisible();

    await page.getByTestId('entry-ai').click();
    await expect(page.getByText(/how many days per week/i)).toBeVisible();
    await expect(page.getByText(/main goal/i)).toBeVisible();
  });
});
