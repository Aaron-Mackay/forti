import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Plan Editor', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal plan editor coverage runs on desktop chromium only; user settings are shared');

  test.beforeEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: true,
          coachModeActive: false,
        },
      },
    });
  });

  test.afterEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: false,
        },
      },
    });
  });

  test('opens the plan editor route from the plans list', async ({ page }) => {
    const response = await page.request.get('/api/workout-data');
    expect(response.ok()).toBe(true);
    const data = await response.json() as { plans: Array<{ id: number; name: string }> };
    expect(data.plans.length).toBeGreaterThan(0);
    const firstPlan = data.plans[0];

    await page.goto('/user/plan');
    await page.getByRole('link', { name: new RegExp(firstPlan.name, 'i') }).first().click();
    await page.waitForURL(/\/user\/plan\/\d+/);
  });
});
