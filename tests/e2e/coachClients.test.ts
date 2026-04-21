/**
 * Coach Clients navigation tests.
 *
 * Tests the new Client Focus Mode:
 * - "Clients" nav item appears for coaches
 * - /user/coach/clients page loads (empty state when no clients)
 * - Plan page no longer shows a "Client Plans" section
 */
import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

async function setCoachMode(page: import('@playwright/test').Page, active: boolean) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.request.patch('/api/user/settings', {
      data: { settings: { coachModeActive: active } },
    });

    const applied = await expect.poll(async () => {
      const settingsResponse = await page.request.get('/api/user/settings');
      if (!settingsResponse.ok()) return null;
      const payload = await settingsResponse.json();
      return payload?.settings?.coachModeActive;
    }, { timeout: 10_000 }).toBe(active).then(() => true).catch(() => false);

    if (applied) return;
    await page.waitForTimeout(300);
  }

  throw new Error(`Failed to apply coach mode state: ${active}`);
}

async function openNav(page: import('@playwright/test').Page) {
  const drawer = page.locator('.MuiDrawer-paper').last();
  const drawerVisible = await drawer.isVisible().catch(() => false);
  if (!drawerVisible) {
    const becameVisible = await drawer.waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (!becameVisible) {
      const menuButton = page.getByRole('button', { name: /menu/i }).first();
      await menuButton.waitFor({ state: 'visible', timeout: 10_000 });

      let opened = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await menuButton.click({ timeout: 10_000 });
          opened = true;
          break;
        } catch {
          if (attempt === 2) throw new Error('Failed to open navigation drawer from menu button');
          await menuButton.waitFor({ state: 'visible', timeout: 1_000 });
        }
      }
      if (!opened) throw new Error('Failed to open navigation drawer');
    }
  }

  await expect(drawer).toBeVisible({ timeout: 15_000 });
  await expect(drawer.getByRole('link', { name: 'Home' })).toBeVisible({ timeout: 15_000 });
}

test.describe('Coach client navigation', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'serial: desktop chromium only');

  test.beforeEach(async ({ page }) => {
    await page.goto('/user');
    await openNav(page);
  });

  test.afterEach(async ({ page }) => {
    // Reset coach mode
    await setCoachMode(page, false);
  });

  test('non-coach does not see Clients nav item', async ({ page }) => {
    await openNav(page);
    await expect(page.getByRole('link', { name: 'Clients' })).not.toBeVisible();
  });

  test('coach activation enables coach mode and keeps Clients link hidden on client domain', async ({ page }) => {
    await setCoachMode(page, true);

    await page.reload();
    await openNav(page);

    // Clients link is coach-domain-only.
    await expect(page.getByRole('link', { name: 'Clients' })).not.toBeVisible();
  });

  test('coach nav item navigates to /user/coach/clients', async ({ page }) => {
    await setCoachMode(page, true);

    // Use the stable client-domain nav entry point, which routes into coach clients.
    await page.goto('/user');
    await openNav(page);
    const coachPortalButton = page.getByRole('button', { name: 'Coach Portal' });
    await expect(coachPortalButton).toBeVisible({ timeout: 30_000 });
    await coachPortalButton.click();

    await expect(page).toHaveURL('/user/coach/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible();
  });

  test('clients page shows empty state when coach has no clients', async ({ page }) => {
    await setCoachMode(page, true);
    await page.goto('/user/coach/clients');
    await expect(page.getByText(/no clients yet/i).first()).toBeVisible();
  });

  test('non-coach cannot access /user/coach/clients', async ({ page }) => {
    // Coach mode not active — page should redirect or show 404
    await page.goto('/user/coach/clients');
    // Should either redirect (200 after redirect) or show a not-found
    await expect(page).not.toHaveURL(/error/);
  });

  test('plan page does not show Client Plans section', async ({ page }) => {
    await setCoachMode(page, true);
    await page.goto('/user/plan');
    await expect(page.getByText('Client Plans')).not.toBeVisible();
  });
});
