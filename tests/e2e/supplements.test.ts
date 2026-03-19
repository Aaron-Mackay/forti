/**
 * Supplements page tests (/user/supplements).
 *
 * The supplements page is only accessible when the showSupplements setting is on.
 * These tests verify gating, CRUD operations, and active/history categorisation.
 *
 * State-dependent tests are chromium-only to avoid parallel DB conflicts.
 */
import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// Helper: ensure supplements setting is on/off
// ---------------------------------------------------------------------------
async function enableSupplements(page: import('@playwright/test').Page) {
  const res = await page.request.patch('/api/user/settings', {
    data: { settings: { showSupplements: true } },
  });
  if (!res.ok()) throw new Error(`enableSupplements failed: ${res.status()}`);
}

async function disableSupplements(page: import('@playwright/test').Page) {
  const res = await page.request.patch('/api/user/settings', {
    data: { settings: { showSupplements: false } },
  });
  if (!res.ok()) throw new Error(`disableSupplements failed: ${res.status()}`);
}

// ---------------------------------------------------------------------------
// Gating tests — chromium only to avoid racing with CRUD beforeEach across
// browser projects (CRUD enables supplements; concurrent gating tests would
// then see 200 instead of 404).
// ---------------------------------------------------------------------------
test.describe('Supplements — gating', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'Gating test runs on chromium only; other projects race with CRUD beforeEach');

  test.beforeEach(async ({ page }) => {
    // Navigate to the app first so the session cookie is sent as same-origin
    // before we make the settings PATCH request.
    await page.goto('/user');
    await disableSupplements(page);
  });

  test('page is inaccessible when showSupplements is off', async ({ page }) => {
    await page.goto('/user/supplements');
    // loading.tsx wraps all /user/* pages in a Suspense boundary, so Next.js begins
    // streaming the response with HTTP 200 before the server component can call
    // notFound(). Asserting on response.status() always yields 200 in this setup.
    // Instead: wait for the loading spinner to resolve, then verify supplements
    // content is absent (the 404 page has no "Add Supplement" button).
    await expect(page.locator('[aria-label="Loading..."]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add Supplement' })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// CRUD and UI tests — chromium only
// ---------------------------------------------------------------------------
test.describe('Supplements — CRUD', () => {
  test.skip(({ isMobile }) => isMobile,
    'State-dependent tests run on desktop Chromium only; mobile projects share a DB user and create race conditions');

  test.beforeEach(async ({ page }) => {
    await page.goto('/user');
    await enableSupplements(page);
    await page.goto('/user/supplements');
    await expect(page.getByRole('banner')).toContainText('Supplements');
  });

  test.afterEach(async ({ page }) => {
    await disableSupplements(page);
  });

  test('Supplements link appears in sidebar when setting is on', async ({ page }) => {
    await page.getByRole('button', { name: /menu/i }).click();
    const drawer = page.getByRole('presentation');
    await expect(drawer.getByRole('link', { name: 'Supplements' })).toBeVisible();
  });

  test('renders Active and no history section when empty', async ({ page }) => {
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await expect(page.getByText('No active supplements.')).toBeVisible();
  });

  test('can add an ongoing supplement', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Supplement' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Name').fill('Magnesium');
    await page.getByLabel('Dosage').fill('400mg');
    await page.getByLabel('Frequency').fill('Daily');
    await page.getByLabel('Start Date').fill('2026-01-01');

    const saveResponse = page.waitForResponse(
      r => r.url().includes('/api/supplements') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save' }).click();
    const res = await saveResponse;
    expect(res.ok()).toBe(true);

    await expect(page.getByText('Magnesium')).toBeVisible();
    await expect(page.getByText('400mg · Daily')).toBeVisible();

    // Clean up
    const deleteResponse = page.waitForResponse(
      r => r.url().includes('/api/supplements/') && r.request().method() === 'DELETE',
    );
    await page.getByRole('button', { name: 'Delete supplement' }).first().click();
    await page.getByRole('button', { name: 'OK' }).click().catch(() => {/* confirm dialog handled natively */});
    await deleteResponse;
  });

  test('can edit a supplement', async ({ page }) => {
    // Create first
    await page.request.post('/api/supplements', {
      data: {
        name: 'Creatine',
        dosage: '5g',
        frequency: 'Daily',
        startDate: '2026-01-01',
      },
    });
    await page.reload();
    await expect(page.getByText('Creatine')).toBeVisible();

    await page.getByRole('button', { name: 'Edit supplement' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Dosage').clear();
    await page.getByLabel('Dosage').fill('10g');

    const patchResponse = page.waitForResponse(
      r => r.url().includes('/api/supplements/') && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Save' }).click();
    const res = await patchResponse;
    expect(res.ok()).toBe(true);

    await expect(page.getByText('10g · Daily')).toBeVisible();

    // Clean up
    const supplements = await (await page.request.get('/api/supplements')).json() as { id: number }[];
    for (const s of supplements) {
      await page.request.delete(`/api/supplements/${s.id}`);
    }
  });

  test('supplement with past end date appears in History section', async ({ page }) => {
    await page.request.post('/api/supplements', {
      data: {
        name: 'Old Vitamin D',
        dosage: '1000IU',
        frequency: 'Daily',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    });
    await page.reload();

    await expect(page.getByText('History', { exact: false })).toBeVisible();
    await expect(page.getByText('Old Vitamin D')).toBeVisible();
    await expect(page.getByText('No active supplements.')).toBeVisible();

    // Clean up
    const supplements = await (await page.request.get('/api/supplements')).json() as { id: number }[];
    for (const s of supplements) {
      await page.request.delete(`/api/supplements/${s.id}`);
    }
  });

  test('Supplements link absent from sidebar when setting is off', async ({ page }) => {
    await disableSupplements(page);
    await page.goto('/user');
    await page.getByRole('button', { name: /menu/i }).click();
    const drawer = page.getByRole('presentation');
    await expect(drawer.getByRole('link', { name: 'Supplements' })).not.toBeVisible();
  });
});
