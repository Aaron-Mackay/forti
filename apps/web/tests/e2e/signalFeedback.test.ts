import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Signal Feedback', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'Signal feedback coverage runs on chromium only; user settings are shared');

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

  test('flagged user sees the Signal feedback form', async ({ page }) => {
    await page.goto('/user/feedback');

    await expect(page.locator('[data-signal-surface="calm"]').first()).toBeVisible();
    await expect(page.getByText('Tell us what broke')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit feedback' })).toBeVisible();
  });
});
