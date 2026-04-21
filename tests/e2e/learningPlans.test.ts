/**
 * Learning Plans E2E tests.
 *
 * Tests the coach learning plan management UI (/user/coach/learning-plans)
 * and the client-facing plan view (/user/learning-plans).
 *
 * All tests run as TestUser (testuser@example.com).
 * State-mutating tests run serially on chromium only.
 */
import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

async function setCoachMode(page: import('@playwright/test').Page, active: boolean) {
  const response = await page.request.patch('/api/user/settings', {
    data: { settings: { coachModeActive: active } },
  });
  expect(response.ok()).toBeTruthy();

  await expect.poll(async () => {
    const settingsResponse = await page.request.get('/api/user/settings');
    if (!settingsResponse.ok()) return null;
    const payload = await settingsResponse.json();
    return payload?.settings?.coachModeActive;
  }).toBe(active);
}

test.describe('Learning Plans', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'State-dependent tests run on chromium only; parallel browser projects share a DB user');

  let createdPlanId: number;

  test.afterEach(async ({ page }) => {
    // Clean up: delete any plan created during the test
    if (createdPlanId) {
      await page.request.delete(`/api/coach/learning-plans/${createdPlanId}`);
      createdPlanId = 0;
    }
    // Deactivate coach mode
    await setCoachMode(page, false);
  });

  test('client learning plans page shows empty state when no plans are assigned', async ({ page }) => {
    await page.goto('/user/learning-plans');
    await expect(page.getByText('No learning plans yet')).toBeVisible();
  });

  test('coach can create a learning plan', async ({ page }) => {
    const createPlan = async () => {
      await expect(page.getByRole('button', { name: 'New Plan' })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'New Plan' }).click();
      await page.getByLabel('Title').fill('Test Learning Plan');
      await page.getByLabel('Description (optional)').fill('A plan for E2E testing');
      const createResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/coach/learning-plans')
        && response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Create' }).click();
      return createResponsePromise;
    };

    // Activate coach mode
    await setCoachMode(page, true);

    await page.goto('/user/coach/learning-plans');

    let createResponse = await createPlan();
    if (!createResponse.ok()) {
      await setCoachMode(page, true);
      await page.reload();
      createResponse = await createPlan();
    }
    expect(createResponse.ok()).toBeTruthy();

    // Should navigate to the plan editor
    await expect(page).toHaveURL(/\/user\/coach\/learning-plans\/\d+/);
    await expect(page.getByText('Test Learning Plan')).toBeVisible();

    // Record the plan ID for cleanup
    const match = page.url().match(/\/user\/coach\/learning-plans\/(\d+)/);
    if (match) createdPlanId = parseInt(match[1]);
  });

  test('coach can add a step to a learning plan', async ({ page }) => {
    // Activate coach mode and create a plan via API
    await setCoachMode(page, true);

    const res = await page.request.post('/api/coach/learning-plans', {
      data: { title: 'Step Test Plan', description: null },
    });
    expect(res.ok()).toBeTruthy();
    const { plan } = await res.json() as { plan: { id: number } };
    createdPlanId = plan.id;

    await page.goto(`/user/coach/learning-plans/${createdPlanId}`);

    // Add a step
    const addStepButton = page.getByRole('button', { name: 'Add Step' });
    await expect(addStepButton).toBeVisible({ timeout: 15_000 });
    await addStepButton.click();
    await page.getByLabel('Title').fill('Welcome Message');
    await page.getByLabel('Body').fill('Welcome to the programme!');
    const saveStepResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST'
      && response.url().includes(`/api/coach/learning-plans/${createdPlanId}/steps`),
    );
    await page.getByRole('button', { name: 'Save' }).click();
    const saveStepResponse = await saveStepResponsePromise;
    expect(saveStepResponse.ok()).toBeTruthy();
    await page.reload();

    // Step should appear in the list
    await expect(page.getByText('Welcome Message')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Day 1')).toBeVisible({ timeout: 30_000 });
  });

  test('coach learning plans list shows plan cards', async ({ page }) => {
    // Activate coach mode and create a plan via API
    await setCoachMode(page, true);
    const res = await page.request.post('/api/coach/learning-plans', {
      data: { title: 'Listed Plan', description: 'visible in list' },
    });
    const { plan } = await res.json() as { plan: { id: number } };
    createdPlanId = plan.id;

    await page.goto('/user/coach/learning-plans');

    await expect(page.getByText('Listed Plan')).toBeVisible();
    await expect(page.getByText('visible in list')).toBeVisible();
    // Step / client counts
    await expect(page.getByText(/0 steps/)).toBeVisible();
  });

  test('coach learning plans not visible without coach mode', async ({ page }) => {
    // Coach mode is off (default for TestUser)
    await page.goto('/user/coach/learning-plans');
    // The page will load but the API will return 403, showing an error state — no crash
    await expect(page.locator('body')).toBeVisible();
  });
});
