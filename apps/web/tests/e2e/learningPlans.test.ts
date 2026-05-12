/**
 * Learning Plans E2E tests.
 *
 * Tests the coach learning plan management UI (/user/coach/learning-plans).
 *
 * All tests run as TestUser (testuser@example.com).
 * State-mutating tests run serially on chromium only.
 */
import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

async function setCoachMode(page: import('@playwright/test').Page, active: boolean) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.request.patch('/api/user/settings', {
      data: { settings: { coachModeActive: active } },
    });

    const applied = await expect.poll(async () => {
      const settingsResponse = await page.request.get('/api/user/settings');
      if (!settingsResponse.ok()) return null;
      const payload = await settingsResponse.json();
      return payload?.settings?.coachModeActive;
    }, { timeout: 10_000 }).toBe(active).then(() => true).catch(() => false);

    if (applied) return;
    await page.waitForTimeout(300);
  }

  throw new Error(`Failed to apply coach mode state: ${active}`);
}

async function setSignalCoachMode(page: import('@playwright/test').Page, active: boolean) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.request.patch('/api/user/settings', {
      data: { settings: { coachModeActive: active, signalUiEnabled: active } },
    });

    const applied = await expect.poll(async () => {
      const settingsResponse = await page.request.get('/api/user/settings');
      if (!settingsResponse.ok()) return null;
      const payload = await settingsResponse.json();
      return {
        coachModeActive: payload?.settings?.coachModeActive,
        signalUiEnabled: payload?.settings?.signalUiEnabled,
      };
    }, { timeout: 10_000 }).toEqual({
      coachModeActive: active,
      signalUiEnabled: active,
    }).then(() => true).catch(() => false);

    if (applied) return;
    await page.waitForTimeout(300);
  }

  throw new Error(`Failed to apply signal coach mode state: ${active}`);
}

async function waitForCoachLearningPlansAccess(page: import('@playwright/test').Page) {
  await expect.poll(async () => {
    const response = await page.request.get('/api/coach/learning-plans');
    return response.status();
  }, { timeout: 15_000 }).toBe(200);
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
    // Deactivate coach mode and reset Signal flag
    await page.request.patch('/api/user/settings', {
      data: { settings: { coachModeActive: false, signalUiEnabled: false } },
    });
  });

  test('coach can create a learning plan', async ({ page }) => {
    const createPlan = async () => {
      const newPlanButton = page
        .getByRole('button', { name: /^New Plan$/i })
        .or(page.getByLabel(/^new plan$/i))
        .first();
      await expect(newPlanButton).toBeVisible({ timeout: 15_000 });
      await newPlanButton.click();
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
    await waitForCoachLearningPlansAccess(page);

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
    const match = page.url().match(/\/user\/coach\/learning-plans\/(\d+)/);
    if (match) createdPlanId = parseInt(match[1]);
    await expect(page.getByRole('heading', { name: 'Test Learning Plan' })).toBeVisible();
  });

  test('coach learning plans list shows plan cards', async ({ page }) => {
    // Activate coach mode and create a plan via API
    await setCoachMode(page, true);
    await waitForCoachLearningPlansAccess(page);
    const res = await page.request.post('/api/coach/learning-plans', {
      data: { title: 'Listed Plan', description: 'visible in list' },
    });
    const { plan } = await res.json() as { plan: { id: number } };
    createdPlanId = plan.id;

    await page.goto('/user/coach/learning-plans');

    const planCard = page.getByRole('button', { name: /Listed Plan visible in list 0 steps/i }).first();
    await expect(planCard).toBeVisible();
  });

  test('flagged coach sees the Signal learning plans library', async ({ page }) => {
    await setSignalCoachMode(page, true);
    await waitForCoachLearningPlansAccess(page);

    const res = await page.request.post('/api/coach/learning-plans', {
      data: { title: 'Signal Listed Plan', description: 'visible in Signal list' },
    });
    expect(res.ok()).toBeTruthy();
    const { plan } = await res.json() as { plan: { id: number } };
    createdPlanId = plan.id;

    await page.goto('/user/coach/learning-plans');
    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Coach Learning Plans').first()).toBeVisible();
    await expect(page.getByText('Coach curriculum').first()).toBeVisible();
    await expect(page.getByText('Signal Listed Plan').first()).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: /^New plan$/i })
        .or(page.getByLabel(/^new plan$/i))
        .first(),
    ).toBeVisible();
  });
});
