import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Calendar Signal', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal calendar coverage runs on desktop chromium only; user settings are shared');

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

  test('flagged user sees the Signal calendar hero and segmented view toggle', async ({ page }) => {
    await page.goto('/user/calendar');

    // Outer planning surface from the page wrapper
    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();

    // Calendar mono label + condensed heading
    await expect(page.getByText('Calendar', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Schedule', { exact: true }).first()).toBeVisible();

    // Signal segmented toggle: Month is pressed by default, Weeks is not
    const monthBtn = page.getByRole('button', { name: 'Calendar view' });
    const weeksBtn = page.getByRole('button', { name: 'Weeks view' });
    await expect(monthBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(weeksBtn).toHaveAttribute('aria-pressed', 'false');

    // Open the Signal drawer shell and confirm the create flow is still reachable.
    await page.getByRole('button', { name: 'add' }).click();
    await expect(page.getByRole('button', { name: 'Event' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Block' }).first()).toBeVisible();
  });
});
