/**
 * Restyle regression smoke coverage for surfaces called out in
 * docs/redesign-waves.md as coverage gaps.
 *
 * These tests avoid visual assertions. They verify that the route loads,
 * the app shell title is wired, and the primary workflow controls remain
 * reachable before restyle work starts.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

async function signInWithCredentialsProvider(page: Page, provider: 'demo-coach') {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json() as { csrfToken: string };

  await page.request.post(`/api/auth/callback/${provider}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({ csrfToken, redirect: 'false', json: 'true' }).toString(),
  });

  await page.goto('/user');
  await expect(page).toHaveURL('/user');
}

async function enableCoachMode(page: Page) {
  await page.request.patch('/api/user/settings', {
    data: { settings: { coachModeActive: true } },
  });
}

async function signInAsDemoCoach(page: Page) {
  await signInWithCredentialsProvider(page, 'demo-coach');
  await enableCoachMode(page);
}

async function configureSignalCoach(page: Page) {
  await signInWithCredentialsProvider(page, 'demo-coach');
  await page.request.patch('/api/user/settings', {
    data: { settings: { coachModeActive: true, signalUiEnabled: true } },
  });
}

async function firstDemoCoachClientId(page: Page) {
  const response = await page.request.get('/api/coach/clients');
  expect(response.ok()).toBeTruthy();

  const payload = await response.json() as { clients: Array<{ id: string; name: string | null }> };
  expect(payload.clients.length).toBeGreaterThan(0);

  return payload.clients[0].id;
}

test.describe('Restyle regression gap coverage', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'Focused smoke coverage runs on chromium only to avoid shared demo-user session races');

  test('onboarding wizard exposes each setup step without completing registration', async ({ page }) => {
    await page.goto('/user/onboarding');

    await expect(page.getByRole('heading', { name: 'Welcome to Forti!' })).toBeVisible();
    await expect(page.getByLabel('Your name')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Your stats' })).toBeVisible();
    await expect(page.getByText('Weekly check-in day')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Coach setup' })).toBeVisible();
    await expect(page.getByLabel('Coach invite code')).toBeVisible();
    await expect(page.getByText('Enable coach mode')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: "You're all set!" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  });

  test('notifications route renders the shell title and an empty or populated state', async ({ page }) => {
    await page.goto('/user/notifications');

    await expect(page.getByRole('banner')).toContainText('Notifications');
    await expect(
      page.getByText('No notifications yet').or(page.locator('.MuiListItem-root').first()),
    ).toBeVisible();
  });

  test('coach check-in template editor exposes default, preview, and save controls', async ({ page }) => {
    await signInAsDemoCoach(page);
    await page.goto('/user/coach/check-in-template');

    await expect(page.getByRole('banner')).toContainText('Check-in Template');
    await expect(page.getByRole('button', { name: 'Start from default check-in' })).toBeVisible();

    await page.getByRole('button', { name: 'Start from default check-in' }).click();
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Template' })).toBeVisible();
  });

  test('flagged coach sees the Signal check-in template workspace', async ({ page }) => {
    await configureSignalCoach(page);
    await page.goto('/user/coach/check-in-template');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Coach Check-in Template')).toBeVisible();
    await expect(page.getByText('Template workspace')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start from default check-in' })).toBeVisible();
  });

  test('coach client plans, nutrition, and supplements routes load for a linked demo client', async ({ page }) => {
    await signInAsDemoCoach(page);
    const clientId = await firstDemoCoachClientId(page);

    await page.goto(`/user/coach/clients/${clientId}/plans`);
    await expect(page.getByRole('banner')).toContainText('Plans');
    await expect(page.getByText(/'s Plans/).first()).toBeVisible();

    await page.goto(`/user/coach/clients/${clientId}/nutrition`);
    await expect(page.getByRole('banner')).toContainText('Nutrition');
    await expect(page.getByText(/Daily|Targets|Macros|Calories/).first()).toBeVisible();

    await page.goto(`/user/coach/clients/${clientId}/supplements`);
    await expect(page.getByRole('banner')).toContainText('Supplements');
    await expect(page.getByRole('button', { name: /Add Supplement/i })).toBeVisible();
  });

  test('coach learning plan editor route exposes step and assignment controls', async ({ page }) => {
    await signInAsDemoCoach(page);

    const createResponse = await page.request.post('/api/coach/learning-plans', {
      data: { title: 'Restyle Smoke Learning Plan', description: 'Temporary E2E coverage plan' },
    });
    expect(createResponse.ok()).toBeTruthy();

    const { plan } = await createResponse.json() as { plan: { id: number } };

    try {
      await page.goto(`/user/coach/learning-plans/${plan.id}`);

      await expect(page.getByText('Restyle Smoke Learning Plan')).toBeVisible();
      await expect(page.getByText('Steps')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Step' })).toBeVisible();
      await expect(page.getByText('Assigned Clients')).toBeVisible();
    } finally {
      await page.request.delete(`/api/coach/learning-plans/${plan.id}`);
    }
  });
});
