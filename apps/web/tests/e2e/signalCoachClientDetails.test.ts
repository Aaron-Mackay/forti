import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

async function signInAsDemoCoach(page: import('@playwright/test').Page) {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json() as { csrfToken: string };

  await page.request.post('/api/auth/callback/demo-coach', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({ csrfToken, redirect: 'false', json: 'true' }).toString(),
  });

  await page.goto('/user');
  await page.waitForURL('/user', { timeout: 15_000 });
  await expect(page).toHaveURL('/user');
}

async function configureSignalCoach(page: import('@playwright/test').Page) {
  await signInAsDemoCoach(page);
  await page.request.patch('/api/user/settings', {
    data: { settings: { coachModeActive: true, signalUiEnabled: true } },
  });
}

async function firstDemoCoachClientId(page: import('@playwright/test').Page) {
  const response = await page.request.get('/api/coach/clients');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json() as { clients: Array<{ id: string }> };
  expect(payload.clients.length).toBeGreaterThan(0);

  return payload.clients[0].id;
}

test.describe('Coach client detail surfaces', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'Signal coach client detail coverage runs on chromium only');

  test.beforeEach(async ({ page }) => {
    await configureSignalCoach(page);
  });

  test('flagged coach sees the Signal nutrition, supplements, and plans surfaces', async ({ page }) => {
    const clientId = await firstDemoCoachClientId(page);

    await page.goto(`/user/coach/clients/${clientId}/nutrition`);
    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Training fuel')).toBeVisible();
    await expect(page.getByText('Daily log', { exact: true })).toBeVisible();

    await page.goto(`/user/coach/clients/${clientId}/supplements`);
    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Protocol tracker')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add supplement/i })).toBeVisible();

    await page.goto(`/user/coach/clients/${clientId}/plans`);
    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Open an existing plan')).toBeVisible();
    await expect(page.getByRole('link', { name: 'New plan' })).toBeVisible();
  });
});
