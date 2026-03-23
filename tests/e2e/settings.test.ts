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
  showE1rmProgress: true,
  showStopwatch: true,
  showSupplements: false,
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
    await expect(page.getByText('Export Data')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Training Plans' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Daily Metrics' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Check-in History' })).toBeVisible();
  });

  test('settings link appears in the sidebar between Feedback and Log Out', async ({ page }) => {
    await page.getByRole('button', { name: /menu/i }).click();
    const drawer = page.getByRole('presentation');
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
      'Coach Mode',
    ];
    for (const label of labels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('shows the E1RM Progress Tracking section with a search field', async ({ page }) => {
    await expect(page.getByText('E1RM Progress Tracking')).toBeVisible();
    await expect(page.getByPlaceholder('Search exercises…')).toBeVisible();
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

  test('shows 10 toggles; dashboard/workout switches are on, Supplements and Coach Mode are off by default', async ({ page }) => {
    const switches = page.getByRole('switch');
    await expect(switches.first()).toBeVisible();
    await expect(switches).toHaveCount(10);
    // First 8 are dashboard card toggles + stopwatch (all on by default)
    for (let i = 0; i < 8; i++) {
      await expect(switches.nth(i)).toBeChecked();
    }
    // Supplements toggle (9th) is off by default
    await expect(switches.nth(8)).not.toBeChecked();
    // Coach Mode toggle (10th) is off by default
    await expect(switches.nth(9)).not.toBeChecked();
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
    await expect(page.getByText('No coach found with that code')).toBeVisible();
  });

  test('activating Coach Mode reveals the invite code', async ({ page }) => {
    const coachModeSwitch = page.getByRole('switch', { name: 'Coach Mode' });
    await expect(coachModeSwitch).not.toBeChecked();
    await coachModeSwitch.click();
    await expect(page.getByText('Share this code with your clients:')).toBeVisible();
    const codeInput = page.locator('input[readonly]').first();
    await expect(codeInput).toBeVisible();
    await expect(codeInput).toHaveValue(/^\d{6}$/);
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

  test('activating Coach Mode reveals the shareable link', async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: true } });
    await page.reload();
    await expect(page.getByText('Or share this link:')).toBeVisible();
    // Find the link input (second readonly input after the code input)
    const readonlyInputs = page.locator('input[readonly]');
    const linkInput = readonlyInputs.nth(1);
    await expect(linkInput).toBeVisible();
    const value = await linkInput.inputValue();
    expect(value).toMatch(/\/coach\/\d{6}$/);
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
