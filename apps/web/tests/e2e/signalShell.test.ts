import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Signal Shell', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal shell coverage runs on desktop chromium only; user settings are shared');

  test.beforeEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: true,
          coachModeActive: true,
        },
      },
    });
    await expect.poll(async () => {
      const response = await page.request.get('/api/user/settings');
      const payload = await response.json() as { settings?: { coachModeActive?: boolean; signalUiEnabled?: boolean } };
      return payload.settings?.coachModeActive && payload.settings?.signalUiEnabled;
    }, { timeout: 10_000 }).toBe(true);
  });

  test.afterEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: false,
          coachModeActive: false,
        },
      },
    });
  });

  test('mode pill navigates to coach portal on same domain', async ({ page }) => {
    await page.goto('/user');
    const sidebar = page.locator('[data-signal-shell-sidebar]').first();

    // My Training is pressed by default
    await expect(sidebar.getByRole('button', { name: 'My Training' })).toHaveAttribute('aria-pressed', 'true');
    await expect(sidebar.getByRole('button', { name: 'Coach' })).toHaveAttribute('aria-pressed', 'false');

    // Click Coach — should navigate within the same domain
    await sidebar.getByRole('button', { name: 'Coach' }).click();
    await expect(page).toHaveURL('/user/coach');

    // Coach pill is now pressed
    await expect(sidebar.getByRole('button', { name: 'Coach' })).toHaveAttribute('aria-pressed', 'true');
    await expect(sidebar.getByRole('button', { name: 'My Training' })).toHaveAttribute('aria-pressed', 'false');

    // Click My Training — navigate back
    await sidebar.getByRole('button', { name: 'My Training' }).click();
    await expect(page).toHaveURL('/user');
    await expect(sidebar.getByRole('button', { name: 'My Training' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('flagged user sees the Signal sidebar with mode pill and a working notifications bell', async ({ page }) => {
    await page.goto('/user');

    // SignalAppShell root carries the mode + outer surface
    await expect(page.locator('[data-signal-mode="user"]').first()).toBeVisible();

    // Sidebar is visible on desktop
    const sidebar = page.locator('[data-signal-shell-sidebar]').first();
    await expect(sidebar).toBeVisible();

    // Mode pill — both labels rendered, "My Training" pressed
    await expect(sidebar.getByRole('button', { name: 'My Training' })).toHaveAttribute('aria-pressed', 'true');
    await expect(sidebar.getByRole('button', { name: 'Coach' })).toHaveAttribute('aria-pressed', 'false');

    // Bell links to /user/notifications
    const bell = sidebar.getByRole('link', { name: /Notifications/ });
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute('href', '/user/notifications');

    // Click navigates
    await bell.click();
    await expect(page).toHaveURL(/\/user\/notifications$/);
  });
});
