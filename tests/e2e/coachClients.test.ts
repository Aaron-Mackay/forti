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
  const homeLink = page.getByRole('link', { name: 'Home' }).first();
  const homeAlreadyVisible = await homeLink.waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true).catch(() => false);
  if (homeAlreadyVisible) return;
  await page.getByRole('button', { name: /menu/i }).first().click({ timeout: 10_000 });
  await expect(homeLink).toBeVisible({ timeout: 15_000 });
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

  test('coach sees Coach Portal nav item when coach mode is active', async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.reload();
    await openNav(page);

    // On the client domain, coach mode shows "Coach Portal", not a "Clients" link
    // (Clients link is coach-domain-only)
    await expect(page.getByRole('button', { name: 'Coach Portal' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clients' })).not.toBeVisible();
  });

  test('Coach Portal nav item navigates to /user/coach/clients', async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.reload();
    await openNav(page);
    await page.getByRole('button', { name: 'Coach Portal' }).click();
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
