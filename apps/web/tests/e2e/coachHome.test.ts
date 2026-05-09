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
}

test.describe('Coach Home', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal coach home coverage runs on desktop chromium only; demo-coach state is shared');

  test.beforeEach(async ({ page }) => {
    await configureSignalCoach(page);
  });

  test('flagged coach sees the Signal Coach Home inbox surface', async ({ page }) => {
    await page.goto('/user/coach');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Coach Home').first()).toBeVisible();
    await expect(page.getByText('Check-ins waiting on you')).toBeVisible();
    await expect(page.getByText('Plans that need a touch')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open check-ins' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View clients' })).toBeVisible();
    await expect(page.getByText(/clients live/i)).toBeVisible();
  });

  test('coach home actions route into check-ins and clients', async ({ page }) => {
    await page.goto('/user/coach');

    await page.getByRole('link', { name: 'Open check-ins' }).click();
    await expect(page).toHaveURL('/user/coach/check-ins');

    await page.goto('/user/coach');
    await page.getByRole('link', { name: 'View clients' }).click();
    await expect(page).toHaveURL('/user/coach/clients');
  });
});
