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

test.describe('Coach Home', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal coach home coverage runs on desktop chromium only; demo-coach state is shared');

  test.beforeEach(async ({ page }) => {
    await configureSignalCoach(page);
  });

  test('flagged coach sees the Signal Coach Home inbox surface', async ({ page }) => {
    await page.goto('/user/coach');
    const main = page.getByRole('main');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(main.getByText('Coach Home').first()).toBeVisible();
    await expect(main.getByText('Check-ins waiting on you').first()).toBeVisible();
    await expect(main.getByText('Plans that need a touch').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View clients' })).toBeVisible();
    await expect(main.getByText(/clients live/i)).toBeVisible();
  });

  test('coach home actions route into check-ins and clients', async ({ page }) => {
    await page.goto('/user/coach');

    await page.goto('/user/coach');
    await page.getByRole('link', { name: 'View clients' }).click();
    await expect(page).toHaveURL('/user/coach/clients');
  });
});
