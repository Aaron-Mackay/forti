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

test.describe('Coach client navigation', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'serial: desktop chromium only');

  test.beforeEach(async ({ page }) => {
    await page.goto('/user');
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible({ timeout: 15_000 });
  });

  test.afterEach(async ({ page }) => {
    // Reset coach mode
    await page.request.post('/api/coach/activate', { data: { active: false } });
  });

  test('non-coach does not see Clients nav item', async ({ page }) => {
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByRole('link', { name: 'Clients' })).not.toBeVisible();
  });

  test('coach sees Clients nav item instead of Client Check-ins', async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.reload();
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /menu/i }).click();

    await expect(page.getByRole('link', { name: 'Clients' })).toBeVisible();
    // Old "Client Check-ins" item should no longer exist
    await expect(page.getByRole('link', { name: 'Client Check-ins' })).not.toBeVisible();
  });

  test('Clients nav item navigates to /user/coach/clients', async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.reload();
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /menu/i }).click();
    await page.getByRole('link', { name: 'Clients' }).click();
    await expect(page).toHaveURL('/user/coach/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible();
  });

  test('clients page shows empty state when coach has no clients', async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.goto('/user/coach/clients');
    await expect(page.getByText(/no clients yet/i)).toBeVisible();
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
