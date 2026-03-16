/**
 * Settings page tests (/user/settings).
 *
 * Verifies the settings page renders, shows all dashboard card toggles,
 * and that toggling a card off causes it to disappear from the dashboard.
 *
 * Notes:
 * - Mobile Safari (WebKit) auth is a pre-existing environment issue;
 *   all E2E tests fail for that browser.
 * - State-dependent tests are restricted to chromium only because
 *   fullyParallel: true runs all browser projects concurrently, and
 *   they all share the same DB user — leading to PATCH races.
 */
import { test, expect } from './fixtures';

// Run all tests in this file serially within each browser project
// to prevent concurrent PATCH calls colliding inside a single project.
test.describe.configure({ mode: 'serial' });

const ALL_ON = {
  showNextWorkout: true,
  showTodaysMetrics: true,
  showWeeklyTraining: true,
  showActiveBlock: true,
  showUpcomingEvents: true,
  showMetricsChart: true,
};

// ---------------------------------------------------------------------------
// Basic UI tests — not sensitive to DB state; run on all browsers
// ---------------------------------------------------------------------------
test.describe('Settings page — UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/settings');
  });

  test('renders the Settings app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Settings');
  });

  test('settings link appears in the sidebar between Report Bug and Log Out', async ({ page }) => {
    await page.getByRole('button', { name: /menu/i }).click();
    const drawer = page.getByRole('presentation');
    const reportBugLink = drawer.getByRole('link', { name: 'Report Bug' });
    const settingsLink = drawer.getByRole('link', { name: 'Settings' });
    const logoutButton = drawer.getByRole('button', { name: 'Log Out' });
    await expect(settingsLink).toBeVisible();
    const reportBugBox = await reportBugLink.boundingBox();
    const settingsBox = await settingsLink.boundingBox();
    const logoutBox = await logoutButton.boundingBox();
    expect(settingsBox!.y).toBeGreaterThan(reportBugBox!.y);
    expect(logoutBox!.y).toBeGreaterThan(settingsBox!.y);
  });

  test('shows all dashboard card, workout, and coaching labels', async ({ page }) => {
    await expect(page.getByLabel('Next Workout').first()).toBeVisible();
    const labels = [
      'Next Workout',
      "Today's Metrics",
      'Weekly Training',
      'Active Block',
      'Upcoming Events',
      'Metrics Chart',
      'Stopwatch',
      'Your Coach',
      'Coach Mode',
    ];
    for (const label of labels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('coaching section shows the code input when user has no coach', async ({ page }) => {
    await expect(page.getByLabel('Enter coach code')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// State-dependent tests — chromium only to avoid parallel-run DB conflicts
// ---------------------------------------------------------------------------
test.describe('Settings page — state', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'State-dependent tests run on chromium only; parallel browser projects share a DB user');

  test.beforeEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', { data: { settings: ALL_ON } });
    await page.goto('/user/settings');
    await expect(page.getByLabel('Next Workout').first()).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', { data: { settings: ALL_ON } });
  });

  test('shows 8 toggles; dashboard/workout switches are on, Coach Mode is off by default', async ({ page }) => {
    const switches = page.getByRole('switch');
    await expect(switches.first()).toBeVisible();
    const count = await switches.count();
    expect(count).toBe(8);
    // First 7 are dashboard card + stopwatch toggles (all on by default)
    for (let i = 0; i < 7; i++) {
      await expect(switches.nth(i)).toBeChecked();
    }
    // Coach Mode toggle (8th) is off by default
    await expect(switches.nth(7)).not.toBeChecked();
  });

  test('toggle sends PATCH that saves the updated value', async ({ page }) => {
    const patchResponse = page.waitForResponse(
      r => r.url().includes('/api/user/settings') && r.request().method() === 'PATCH',
    );
    await page.getByLabel('Next Workout').click();
    const response = await patchResponse;
    expect(response.ok()).toBe(true);
    const body = await response.json() as { settings: { showNextWorkout: boolean } };
    expect(body.settings.showNextWorkout).toBe(false);
  });

  test('Next Workout card hidden on dashboard when setting is off', async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: { settings: { ...ALL_ON, showNextWorkout: false } },
    });
    await page.goto('/user');
    await expect(page.getByText('Next Workout')).not.toBeVisible();
  });

  test('Metrics Chart hidden on dashboard when setting is off', async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: { settings: { ...ALL_ON, showMetricsChart: false } },
    });
    await page.goto('/user');
    await expect(page.locator('.apexcharts-canvas')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Coaching section tests — chromium only
// ---------------------------------------------------------------------------
test.describe('Settings page — coaching section', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'State-dependent tests run on chromium only; parallel browser projects share a DB user');

  test.beforeEach(async ({ page }) => {
    // Reset: turn off coach mode, clear any lingering request, unlink any coach
    await page.request.post('/api/coach/activate', { data: { active: false } });
    await page.request.delete('/api/coach/request');
    await page.request.delete('/api/coach/unlink');
    await page.goto('/user/settings');
    await expect(page.getByText('Your Coach')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: false } });
    await page.request.delete('/api/coach/request');
    await page.request.delete('/api/coach/unlink');
  });

  test('code input rejects non-6-digit values', async ({ page }) => {
    const input = page.getByLabel('Enter coach code');
    await input.fill('123');
    const linkBtn = page.getByRole('button', { name: 'Link' });
    await expect(linkBtn).toBeDisabled();
  });

  test('invalid code shows an error', async ({ page }) => {
    const input = page.getByLabel('Enter coach code');
    await input.fill('000000');
    await page.getByRole('button', { name: 'Link' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('activating Coach Mode reveals the invite code', async ({ page }) => {
    const coachModeSwitch = page.getByRole('switch', { name: 'Coach Mode' });
    await expect(coachModeSwitch).not.toBeChecked();
    await coachModeSwitch.click();
    await expect(page.getByText('Share this code with your clients:')).toBeVisible();
    const codeField = page.getByRole('textbox').filter({ hasText: /^\d{6}$/ });
    await expect(codeField.or(page.locator('input[readonly]').filter({ hasText: /\d/ }))).toBeVisible();
  });

  test('deactivating Coach Mode hides the code section', async ({ page }) => {
    // Activate first
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.reload();
    await expect(page.getByText('Share this code with your clients:')).toBeVisible();
    // Deactivate
    const coachModeSwitch = page.getByRole('switch', { name: 'Coach Mode' });
    await coachModeSwitch.click();
    await expect(page.getByText('Share this code with your clients:')).not.toBeVisible();
  });
});
