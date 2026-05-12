import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });
test.use({ storageState: { cookies: [], origins: [] } });

async function signInAsDemoCoach(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Try Demo (Coach)' }).click();
  await expect(page).toHaveURL('/user');
}

async function configureSignalCoach(page: Page) {
  await signInAsDemoCoach(page);
  await page.request.patch('/api/user/settings', {
    data: { settings: { coachModeActive: true, signalUiEnabled: true } },
  });
  await expect.poll(async () => {
    const response = await page.request.get('/api/user/settings');
    const payload = await response.json() as { settings?: { coachModeActive?: boolean; signalUiEnabled?: boolean } };
    return payload.settings?.coachModeActive && payload.settings?.signalUiEnabled;
  }, { timeout: 10_000 }).toBe(true);
}

async function firstCoachClientId(page: Page) {
  const response = await page.request.get('/api/coach/clients');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json() as { clients: Array<{ id: string }> };
  expect(payload.clients.length).toBeGreaterThan(0);

  return payload.clients[0].id;
}

test.describe('Coach Client Overview', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal coach overview coverage runs on desktop chromium only; demo-coach state is shared');

  test.beforeEach(async ({ page }) => {
    await configureSignalCoach(page);
  });

  test('flagged coach sees the Signal client overview surface', async ({ page }) => {
    const clientId = await firstCoachClientId(page);

    await page.goto(`/user/coach/clients/${clientId}`);

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Check-ins' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Plans' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nutrition' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Supplements' })).toBeVisible();
    await expect(page.getByText('Latest metrics').first()).toBeVisible();
    await expect(page.getByText('This week')).toBeVisible();
  });

  test('client overview tabs route into the coach client surfaces', async ({ page }) => {
    const clientId = await firstCoachClientId(page);

    await page.goto(`/user/coach/clients/${clientId}`);
    await page.getByRole('link', { name: 'Plans' }).click();
    await expect(page).toHaveURL(`/user/coach/clients/${clientId}/plans`);

    await page.goto(`/user/coach/clients/${clientId}`);
    await page.getByRole('link', { name: 'Check-ins' }).click();
    await expect(page).toHaveURL(`/user/coach/clients/${clientId}/check-ins`);
  });

  test('coach notes panel is visible and editable on the client overview', async ({ page }) => {
    const clientId = await firstCoachClientId(page);
    await page.goto(`/user/coach/clients/${clientId}`);

    // Notes section label is rendered
    await expect(page.getByText('Coach notes').first()).toBeVisible();

    // Read state: either "No notes yet" or existing notes + Edit button
    await expect(
      page.getByText('No notes yet.').first()
        .or(page.getByRole('button', { name: 'Edit' }).first()),
    ).toBeVisible();

    // Open edit mode — button text is "Edit" or "Add notes" depending on state
    const editBtn = page.getByRole('button', { name: /^(Edit|Add notes)$/ }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Textarea appears
    await expect(page.getByRole('textbox')).toBeVisible();

    // Cancel returns to read state without saving
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('textbox')).not.toBeVisible();
  });
});
