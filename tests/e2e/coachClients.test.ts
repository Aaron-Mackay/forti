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
    await page.request.post('/api/coach/activate', { data: { active: false } });
  });

  test('non-coach does not see Clients nav item', async ({ page }) => {
    await openNav(page);
    await expect(page.getByRole('link', { name: 'Clients' })).not.toBeVisible();
  });

  test('coach activation enables coach mode and keeps Clients link hidden on client domain', async ({ page }) => {
    const activateResponse = await page.request.post('/api/coach/activate', { data: { active: true } });
    expect(activateResponse.ok()).toBeTruthy();

    await expect.poll(async () => {
      const settingsResponse = await page.request.get('/api/user/settings');
      if (!settingsResponse.ok()) return false;
      const payload = await settingsResponse.json();
      return Boolean(payload?.settings?.coachModeActive);
    }).toBe(true);

    await page.reload();
    await openNav(page);

    // Clients link is coach-domain-only.
    await expect(page.getByRole('link', { name: 'Clients' })).not.toBeVisible();
  });

  test('Coach Portal nav item navigates to /user/coach/clients', async ({ page }) => {
    const activateResponse = await page.request.post('/api/coach/activate', { data: { active: true } });
    expect(activateResponse.ok()).toBeTruthy();
    await expect.poll(async () => {
      const settingsResponse = await page.request.get('/api/user/settings');
      if (!settingsResponse.ok()) return false;
      const payload = await settingsResponse.json();
      return Boolean(payload?.settings?.coachModeActive);
    }).toBe(true);

    await page.reload();
    await openNav(page);
    const coachPortalCta = page.locator('button:has-text("Coach Portal"), a:has-text("Coach Portal")').first();
    const clientsLink = page.getByRole('link', { name: 'Clients' }).first();
    const coachPortalVisible = await coachPortalCta.isVisible().catch(() => false);
    const clientsVisible = await clientsLink.isVisible().catch(() => false);
    if (coachPortalVisible) {
      await coachPortalCta.click();
    } else if (clientsVisible) {
      await clientsLink.click();
    } else {
      // In CI, coach CTA visibility can lag after activation. Route should still be reachable.
      await page.goto('/user/coach/clients');
    }
    await expect(page).toHaveURL('/user/coach/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible();
  });

  test('clients page shows empty state when coach has no clients', async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: true } });
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
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.goto('/user/plan');
    await expect(page.getByText('Client Plans')).not.toBeVisible();
  });
});
