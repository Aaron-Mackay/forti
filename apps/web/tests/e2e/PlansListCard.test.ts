import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

type WorkoutData = {
  activePlanId: number | null;
  plans: Array<{ id: number; name: string }>;
};

async function setupSignalPlans(page: import('@playwright/test').Page) {
  await page.request.patch('/api/user/settings', {
    data: { settings: { signalUiEnabled: true, coachModeActive: false } },
  });
  const response = await page.request.get('/api/workout-data');
  expect(response.ok()).toBe(true);
  const data = await response.json() as WorkoutData;
  const firstPlanId = data.plans[0]?.id;
  expect(firstPlanId).toBeTruthy();
  const patch = await page.request.patch('/api/plan/active', { data: { planId: firstPlanId } });
  expect(patch.ok()).toBe(true);
  return { ...data, activePlanId: firstPlanId };
}

test.describe('PlansListCard Signal surface', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal plan selector coverage runs on desktop chromium only');

  test.beforeEach(async ({ page }) => {
    await setupSignalPlans(page);
    await page.goto('/user/plan');
  });

  test.afterEach(async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    const firstPlanId = data.plans[0]?.id ?? null;
    await page.request.patch('/api/plan/active', { data: { planId: firstPlanId } });
    await page.request.patch('/api/user/settings', {
      data: { settings: { signalUiEnabled: false, coachModeActive: false } },
    });
  });

  test('renders the new planning table surface', async ({ page }) => {
    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Plans', level: 1 })).toBeVisible();
    await expect(page.getByText('SCHEDULE')).toBeVisible();
    await expect(page.getByText('STATUS')).toBeVisible();
    await expect(page.getByRole('link', { name: /\+ New plan/i })).toHaveAttribute('href', '/user/plan/create');
  });

  test('tapping a plan opens the editor', async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    await page.getByRole('link', { name: new RegExp(data.plans[0].name, 'i') }).first().click();
    await expect(page).toHaveURL(new RegExp(`/user/plan/${data.plans[0].id}$`));
  });

  test('filter chips narrow the table to the active plan', async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    test.skip(data.plans.length < 2, 'requires at least two seeded plans');

    await page.getByRole('button', { name: /^ACTIVE ·/ }).click();
    await expect(page.getByText(data.plans[0].name).first()).toBeVisible();
    await expect(page.getByText(data.plans[1].name).first()).not.toBeVisible();
  });

  test('activating an inactive plan shows an undo snackbar', async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    test.skip(data.plans.length < 2, 'requires at least two seeded plans');

    await page.getByRole('button', { name: 'Activate' }).first().click();
    await expect(page.getByText(/Switched to/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  });

  test('delete opens the confirmation modal without immediately removing the row', async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    await page.route('**/api/plan/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return;
      }
      await route.continue();
    });

    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('dialog', { name: /Delete .*\\?/ })).toBeVisible();
    await expect(page.getByText('All logged workouts under this plan will be lost.')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText(data.plans[0].name).first()).toBeVisible();
  });
});
