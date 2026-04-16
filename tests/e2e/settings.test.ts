/**
 * Settings page tests (/user/settings).
 *
 * Verifies the settings page renders, shows all dashboard card toggles,
 * and that toggling a card off causes it to disappear from the dashboard.
 *
 * Notes:
 * - State-dependent tests are restricted to chromium only because
 *   fullyParallel: true runs all browser projects concurrently, and
 *   they all share the same DB user — leading to PATCH races.
 */
import { test, expect } from './fixtures';

async function openNav(page: import('@playwright/test').Page) {
  const homeLink = page.getByRole('link', { name: 'Home' }).first();
  const homeAlreadyVisible = await homeLink.waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true).catch(() => false);
  if (!homeAlreadyVisible) {
    await page.getByRole('button', { name: /menu/i }).first().click({ timeout: 10_000 });
    await expect(homeLink).toBeVisible({ timeout: 15_000 });
  }
  return page.locator('.MuiDrawer-paper:visible').last();
}

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
  showE1rmProgress: true,
  showStopwatch: true,
  showSupplements: true,
  trackedE1rmExercises: [],
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

  test('shows the Export Data section with three download links', async ({ page }) => {
    await expect(page.getByText('Export Data').first()).toBeVisible(); // SSR hydration can briefly yield 2 copies
    await expect(page.getByRole('link', { name: 'Download Training Plans' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Daily Metrics' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Check-in History' })).toBeVisible();
  });

  test('settings link appears in the sidebar between Feedback and Log Out', async ({ page }) => {
    const drawer = await openNav(page);
    const feedbackLink = drawer.getByRole('link', { name: 'Feedback' });
    const settingsLink = drawer.getByRole('link', { name: 'Settings' });
    const logoutButton = drawer.getByRole('button', { name: 'Log Out' });
    await expect(settingsLink).toBeVisible();
    const feedbackBox = await feedbackLink.boundingBox();
    const settingsBox = await settingsLink.boundingBox();
    const logoutBox = await logoutButton.boundingBox();
    expect(settingsBox!.y).toBeGreaterThan(feedbackBox!.y);
    expect(logoutBox!.y).toBeGreaterThan(settingsBox!.y);
  });

  test('shows all dashboard card, workout, features, and coaching labels', async ({ page }) => {
    await expect(page.getByLabel('Next Workout').first()).toBeVisible();
    const labels = [
      'Next Workout',
      "Today's Metrics",
      'Weekly Training',
      'Active Block',
      'Upcoming Events',
      'Metrics Chart',
      'E1RM Progress',
      'Stopwatch',
      'Supplements',
      'Your Coach',
      'Enable coach features',
    ];
    for (const label of labels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('shows the E1RM Progress Tracking section with a search field', async ({ page }) => {
    await expect(page.getByText('E1RM Progress Tracking').first()).toBeVisible();
    await expect(page.getByPlaceholder('Search exercises…').first()).toBeVisible(); // MUI Autocomplete renders 2 matching inputs
  });

  test('coaching section shows the code input when user has no coach', async ({ page }) => {
    await expect(page.getByLabel('Enter coach code')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// State-dependent tests — chromium only to avoid parallel-run DB conflicts
// ---------------------------------------------------------------------------
test.describe('Settings page — state', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'State-dependent tests run on desktop chromium only; parallel browser projects share a DB user');

  test.beforeEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', { data: { settings: ALL_ON } });
    await page.goto('/user/settings');
    await expect(page.getByLabel('Next Workout').first()).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', { data: { settings: ALL_ON } });
  });

  test('shows 12 toggles; dashboard/workout switches are on and Enable coach features is off by default', async ({ page }) => {
    const switches = page.getByRole('switch');
    await expect(switches.first()).toBeVisible();
    await expect(switches).toHaveCount(12);
    // Dashboard card toggles and stopwatch are all on
    await expect(page.getByRole('switch', { name: 'Next Workout' })).toBeChecked();
    await expect(page.getByRole('switch', { name: "Today's Metrics" })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Weekly Training' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Active Block' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Upcoming Events' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Metrics Chart' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'E1RM Progress' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Stopwatch' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Warmup Suggestions' })).not.toBeChecked();
    await expect(page.getByRole('switch', { name: 'Plate Calculator' })).not.toBeChecked();
    // Enable coach features toggle is off by default
    await expect(page.getByRole('switch', { name: 'Enable coach features' })).not.toBeChecked();
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
// Coaching section tests — desktop chromium only
// ---------------------------------------------------------------------------
test.describe('Settings page — coaching section', () => {
  // Skip all non-chromium browsers AND Mobile Chrome (Pixel 5 emulation):
  // both share the same TestUser DB row as desktop Chrome, so running them
  // in parallel causes PATCH races. Mobile Chrome has browserName === 'chromium',
  // so the browserName check alone is not sufficient.
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'State-dependent tests run on desktop chromium only; parallel browser projects share a DB user');

  test.beforeEach(async ({ page }) => {
    // Reset: turn off coach mode, clear any lingering request, unlink any coach
    await page.request.post('/api/coach/activate', { data: { active: false } });
    await page.request.delete('/api/coach/request');
    await page.request.delete('/api/coach/unlink');
    await page.goto('/user/settings');
    await expect(page.getByText('Your Coach').first()).toBeVisible(); // SSR hydration can briefly yield 2 copies
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
    await expect(page.getByText('No coach found with that code')).toBeVisible();
  });

  test('activating Enable coach features keeps invite tools out of Forti settings', async ({ page }) => {
    const coachModeSwitch = page.getByRole('switch', { name: 'Enable coach features' });
    await expect(coachModeSwitch).not.toBeChecked();
    await coachModeSwitch.click();
    await expect(page.getByText('Share this code with your clients:')).not.toBeVisible();
  });

  test('coach invite tools are not shown in Forti settings even when coach mode is already active', async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.reload();
    await expect(page.getByText('Share this code with your clients:')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Export API tests — chromium only; verify endpoints return valid CSV
// ---------------------------------------------------------------------------
test.describe('Settings page — export API', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'API tests run on chromium only to avoid parallel DB conflicts');

  test('GET /api/export/training-data returns CSV with correct headers', async ({ page }) => {
    const res = await page.request.get('/api/export/training-data');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('text/csv');
    expect(res.headers()['content-disposition']).toContain('forti-training-plans.csv');
    const text = await res.text();
    // Strip BOM and check header row
    const firstLine = text.replace(/^\uFEFF/, '').split('\r\n')[0];
    expect(firstLine).toBe(
      'plan_name,plan_description,week_number,workout_name,workout_notes,' +
      'workout_date_completed,exercise_name,exercise_category,rep_range,' +
      'rest_time,exercise_notes,set_number,reps,weight_kg,e1rm,is_drop_set'
    );
    // Seeded data has plans — there should be data rows
    const lines = text.replace(/^\uFEFF/, '').split('\r\n').filter(l => l.length > 0);
    expect(lines.length).toBeGreaterThan(1);
  });

  test('GET /api/export/metrics returns CSV with correct headers', async ({ page }) => {
    const res = await page.request.get('/api/export/metrics');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('text/csv');
    expect(res.headers()['content-disposition']).toContain('forti-daily-metrics.csv');
    const text = await res.text();
    const firstLine = text.replace(/^\uFEFF/, '').split('\r\n')[0];
    expect(firstLine).toContain('date');
    expect(firstLine).toContain('weight_kg');
    expect(firstLine).toContain('steps');
    expect(firstLine).toContain('sleep_mins');
    // Seeded data has 60 days of metrics — there should be data rows
    const lines = text.replace(/^\uFEFF/, '').split('\r\n').filter(l => l.length > 0);
    expect(lines.length).toBeGreaterThan(1);
  });

  test('GET /api/export/check-ins returns CSV with correct headers', async ({ page }) => {
    const res = await page.request.get('/api/export/check-ins');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('text/csv');
    expect(res.headers()['content-disposition']).toContain('forti-check-ins.csv');
    const text = await res.text();
    const firstLine = text.replace(/^\uFEFF/, '').split('\r\n')[0];
    expect(firstLine).toBe(
      'week_start_date,completed_at,energy_level,mood_rating,stress_level,' +
      'sleep_quality,recovery_rating,adherence_rating,completed_workouts,' +
      'planned_workouts,week_review,coach_message,goals_next_week,' +
      'coach_notes,coach_reviewed_at'
    );
    // Seeded data has 6 check-ins — there should be data rows
    const lines = text.replace(/^\uFEFF/, '').split('\r\n').filter(l => l.length > 0);
    expect(lines.length).toBeGreaterThan(1);
  });
});
