import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Plan Upload', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal plan upload coverage runs on desktop chromium only; user settings are shared');

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

  test('flagged user sees the Signal plan-import workspace', async ({ page }) => {
    await page.goto('/user/plan/upload');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Plan import').first()).toBeVisible();
    await expect(page.getByText('Turn a spreadsheet into an editable plan')).toBeVisible();
    await expect(page.getByText('Upload or paste').first()).toBeVisible();
    await expect(page.getByText('Review new exercises').first()).toBeVisible();
    await expect(page.getByText('Summary').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload CSV file' })).toBeVisible();
    await expect(page.getByLabel(/paste in your training sheet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /analyse import/i })).toBeDisabled();
  });
});
