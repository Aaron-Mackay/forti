import { test } from './fixtures';

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
    await page.goto('/user/plan');
    const firstPlanLink = page.getByRole('listitem').first().getByRole('link');
    await firstPlanLink.click();
    await page.waitForURL(/\/user\/plan\/\d+/);
  });
});
