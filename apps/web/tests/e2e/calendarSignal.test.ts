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

  test('flagged month grid has Signal class and planning-palette toolbar', async ({ page }) => {
    await page.goto('/user/calendar');

    // Ensure month view is active (default)
    await page.getByRole('button', { name: 'Calendar view' }).click();

    // FullCalendar wrapper receives the signal-calendar class in Signal mode
    await expect(page.locator('.signal-calendar').first()).toBeVisible();

    // FullCalendar renders with the grid present
    await expect(page.locator('.signal-calendar .fc').first()).toBeVisible();

    // Today cell is rendered (always present in multimonth year view)
    await expect(page.locator('.signal-calendar .fc-day-today').first()).toBeVisible();

    // Toolbar Today button is visible inside the signal wrapper
    const todayBtn = page.locator('.signal-calendar').getByRole('button', { name: 'Today' });
    await expect(todayBtn).toBeVisible();

    // Weeks toggle switches view; the signal-calendar div becomes hidden (display:none)
    await page.getByRole('button', { name: 'Weeks view' }).click();
    await expect(page.locator('.signal-calendar').first()).not.toBeVisible();

    // Switching back to month restores the Signal-styled grid
    await page.getByRole('button', { name: 'Calendar view' }).click();
    await expect(page.locator('.signal-calendar').first()).toBeVisible();
    await expect(page.locator('.signal-calendar .fc-day-today').first()).toBeVisible();
  });
});
