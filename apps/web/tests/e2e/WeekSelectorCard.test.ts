import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

type WorkoutData = {
  activePlanId: number | null;
  plans: Array<{
    id: number;
    name: string;
    weeks: Array<{
      id: number;
      workouts: Array<{ id: number; name: string; dateCompleted: string | null }>;
    }>;
  }>;
};

async function setupSignalWeeks(page: import('@playwright/test').Page) {
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

async function signInAsDemoCoach(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Try Demo (Coach)' }).click();
  await expect(page).toHaveURL('/user');
  await page.request.patch('/api/user/settings', {
    data: { settings: { coachModeActive: true, signalUiEnabled: true } },
  });
}

test.describe('WeekSelectorCard Signal user surface', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal week selector coverage runs on desktop chromium only');

  test.beforeEach(async ({ page }) => {
    const data = await setupSignalWeeks(page);
    await page.goto(`/user/plan/${data.plans[0].id}/weeks`);
  });

  test.afterEach(async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    const firstPlanId = data.plans[0]?.id ?? null;
    await page.request.patch('/api/plan/active', { data: { planId: firstPlanId } });
    await page.request.patch('/api/user/settings', {
      data: { settings: { signalUiEnabled: false, coachModeActive: false } },
    });
  });

  test('renders the weeks table for the active plan', async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: data.plans[0].name })).toBeVisible();
    await expect(page.getByText('SESSIONS')).toBeVisible();
    await expect(page.getByText('LAST LOG')).toBeVisible();
  });

  test('Edit plan routes to the editor', async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    await page.getByRole('link', { name: 'Edit plan' }).click();
    await expect(page).toHaveURL(`/user/plan/${data.plans[0].id}`);
  });

  test('Resume routes to workout mode when an unfinished workout exists', async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    const nextWorkout = data.plans[0].weeks.flatMap((week) => week.workouts).find((workout) => !workout.dateCompleted);
    test.skip(!nextWorkout, 'requires an unfinished seeded workout');

    await page.getByRole('link', { name: new RegExp(`Resume ${nextWorkout.name}`, 'i') }).click();
    await expect(page).toHaveURL(`/user/workout?workoutId=${nextWorkout.id}`);
  });

  test('Complete week opens the confirmation modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Complete week' }).click();
    await expect(page.getByRole('dialog', { name: /Complete week/i })).toBeVisible();
    await expect(page.getByText(/sessions logged/i)).toBeVisible();
  });

  test('direct URL to a non-active plan shows Activate this plan', async ({ page }) => {
    const data = await page.request.get('/api/workout-data').then((response) => response.json() as Promise<WorkoutData>);
    test.skip(data.plans.length < 2, 'requires at least two seeded plans');

    await page.goto(`/user/plan/${data.plans[1].id}/weeks`);
    await expect(page.getByRole('button', { name: 'Activate this plan' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Resume/i })).not.toBeVisible();
  });
});

test.describe('WeekSelectorCard Signal coach surface', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal coach week selector coverage runs on desktop chromium only');

  test('coach context shows Edit plan only for week actions', async ({ page }) => {
    await signInAsDemoCoach(page);
    const clientsResponse = await page.request.get('/api/coach/clients');
    expect(clientsResponse.ok()).toBe(true);
    const { clients } = await clientsResponse.json() as { clients: Array<{ id: string }> };
    test.skip(clients.length === 0, 'requires a seeded demo coach client');

    await page.goto(`/user/coach/clients/${clients[0].id}/plans`);
    await page.getByRole('link', { name: 'View weeks' }).first().click();

    await expect(page).toHaveURL(new RegExp(`/user/coach/clients/${clients[0].id}/plans/\\d+/weeks`));
    await expect(page.getByRole('link', { name: 'Edit plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete week' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Resume/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Activate this plan' })).not.toBeVisible();
  });
});
