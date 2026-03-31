/**
 * Training plans tests (/user/plan and /user/plan/[planId]).
 *
 * Covers: plan listing, navigating into a plan, viewing weeks/workouts,
 * toggling edit mode, and plan creation via the new entry screen.
 */
import { test, expect } from './fixtures';


test.describe('Plans list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan');
  });

  test('renders the Plans app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Plans');
  });

  test('shows the plans section header', async ({ page }) => {
    await expect(page.getByText(/^Plans$/i).first()).toBeVisible();
  });

  test('lists at least one plan for the demo user', async ({ page }) => {
    // Seed creates two plans per user; each is a list item button
    await expect(page.getByRole('link', { name: "TestUser's Plan 1" })).toBeVisible();
  });

  test('navigates to a plan detail page when a plan is clicked', async ({ page }) => {
    const firstPlan = page.getByRole('listitem').first();
    const planLink = firstPlan.getByRole('link');
    await planLink.click();
    // Should land on /user/plan/<id>
    await expect(page).toHaveURL(/\/user\/plan\/\d+/);
  });

  test('shows an Add plan button that links to /user/plan/create', async ({ page }) => {
    const addButton = page.getByRole('link', { name: /add plan/i });
    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveAttribute('href', '/user/plan/create');
  });
});

test.describe('Plan detail page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate via the plans listing to ensure we land on a real plan id
    await page.goto('/user/plan');
    const firstPlanLink = page.getByRole('listitem').first().getByRole('link');
    await firstPlanLink.click();
    await page.waitForURL(/\/user\/plan\/\d+/);
  });

  test('renders the plan name in the app bar', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText(/Plan/i);
  });

  test('shows a Save button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
  });

  test('shows workout selector chips', async ({ page }) => {
    // Desktop: PlanMultiWeekTable renders one chip per workout slot
    await expect(page.getByRole('button', { name: /Workout/i }).first()).toBeVisible();
  });

  test('shows week column headers (Wk N)', async ({ page }) => {
    // Desktop: PlanMultiWeekTable renders week column headers
    await expect(page.getByText(/Wk \d+/i).first()).toBeVisible();
  });

  test('shows editable weight inputs for exercises', async ({ page }) => {
    await expect(page.locator('input[placeholder="kg"]').first()).toBeVisible();
  });

  test('shows editable reps inputs for exercises', async ({ page }) => {
    await expect(page.locator('input[placeholder="reps"]').first()).toBeVisible();
  });

  test('editing a weight input updates the displayed value', async ({ page }) => {
    const weightInput = page.locator('input[placeholder="kg"]').first();
    await weightInput.click({ clickCount: 3 }); // select-all before typing (WebKit number input workaround)
    await weightInput.pressSequentially('99');
    await expect(weightInput).toHaveValue('99');
  });

  test('clicking a different workout chip switches the active selection', async ({ page }) => {
    const chips = page.getByRole('button', { name: /Workout/i });
    const count = await chips.count();
    if (count < 2) return; // only one workout slot — skip
    const second = chips.nth(1);
    await second.click();
    await expect(second).toHaveClass(/MuiChip-filled/);
  });
});

// ── Create Plan entry screen ──────────────────────────────────────────────────

test.describe('Create Plan entry screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
  });

  test('shows the "How do you want to start?" heading', async ({ page }) => {
    await expect(page.getByText(/how do you want to start/i).first()).toBeVisible();
  });

  test('shows the "From a template" option', async ({ page }) => {
    await expect(page.getByText(/from a template/i).first()).toBeVisible();
  });

  test('shows the "Build with AI" option', async ({ page }) => {
    await expect(page.getByText(/build with ai/i).first()).toBeVisible();
  });

  test('shows the "Start from scratch" option', async ({ page }) => {
    await expect(page.getByText(/start from scratch/i).first()).toBeVisible();
  });

  test('clicking "Start from scratch" shows the plan editor', async ({ page }) => {
    await page.getByTestId('entry-scratch').click();
    await expect(page.getByLabel(/plan name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save plan/i })).toBeVisible();
  });

  test('clicking "Build with AI" shows the AI form', async ({ page }) => {
    await page.getByTestId('entry-ai').click();
    await expect(page.getByText(/how many days per week/i)).toBeVisible();
    await expect(page.getByText(/main goal/i)).toBeVisible();
    await expect(page.getByText(/experience level/i)).toBeVisible();
  });

  test('back arrow on AI form returns to entry screen', async ({ page }) => {
    await page.getByTestId('entry-ai').click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText(/how do you want to start/i).first()).toBeVisible();
  });

  test('clicking "From a template" shows the template browser', async ({ page }) => {
    await page.getByTestId('entry-templates').click();
    await expect(page.getByText(/push \/ pull \/ legs/i)).toBeVisible();
  });

  test('back arrow on template browser returns to entry screen', async ({ page }) => {
    await page.getByTestId('entry-templates').click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText(/how do you want to start/i).first()).toBeVisible();
  });

  test('back arrow on plan editor returns to entry screen', async ({ page }) => {
    await page.getByTestId('entry-scratch').click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText(/how do you want to start/i).first()).toBeVisible();
  });
});

// ── Template browser ──────────────────────────────────────────────────────────

test.describe('Template browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
    await page.getByTestId('entry-templates').click();
  });

  test('shows all templates by default', async ({ page }) => {
    await expect(page.getByText(/push \/ pull \/ legs/i)).toBeVisible();
    await expect(page.getByText(/full body 3/i)).toBeVisible();
    await expect(page.getByText(/upper \/ lower/i)).toBeVisible();
  });

  test('filter chips filter templates by category', async ({ page }) => {
    await page.getByRole('button', { name: /^hypertrophy$/i }).click();
    await expect(page.getByText(/push \/ pull \/ legs/i)).toBeVisible();
    // Non-hypertrophy templates should not be visible
    await expect(page.getByText(/5\/3\/1/i)).not.toBeVisible();
  });

  test('"All" chip restores full list', async ({ page }) => {
    await page.getByRole('button', { name: /^hypertrophy$/i }).click();
    await page.getByRole('button', { name: /^all$/i }).click();
    await expect(page.getByText(/5\/3\/1/i)).toBeVisible();
  });

  test('clicking Preview opens a bottom sheet with template details', async ({ page }) => {
    await page.getByRole('button', { name: /preview/i }).first().click();
    await expect(page.getByRole('button', { name: /use this template/i })).toBeVisible();
  });

  test('"Use this template" loads the template into the plan editor', async ({ page }) => {
    await page.getByRole('button', { name: /preview/i }).first().click();
    await page.getByRole('button', { name: /use this template/i }).click();
    // Should navigate to the plan editor with the template name pre-filled
    await expect(page.getByLabel(/plan name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save plan/i })).toBeVisible();
    // Template name should be in the plan name field
    const planNameValue = await page.getByLabel(/plan name/i).inputValue();
    expect(planNameValue.length).toBeGreaterThan(0);
  });

  test('Cancel button in preview closes the bottom sheet', async ({ page }) => {
    await page.getByRole('button', { name: /preview/i }).first().click();
    await expect(page.getByRole('button', { name: /use this template/i })).toBeVisible();
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByRole('button', { name: /use this template/i })).not.toBeVisible();
  });
});

// ── AI plan creation ──────────────────────────────────────────────────────────

test.describe('AI plan creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
    await page.getByTestId('entry-ai').click();
  });

  test('Generate button is disabled until all chips are selected', async ({ page }) => {
    await expect(page.getByRole('button', { name: /generate my plan/i })).toBeDisabled();
  });

  test('Generate button enables after selecting days, goal, and level', async ({ page }) => {
    await page.getByRole('button', { name: /4 days/i }).click();
    await page.getByRole('button', { name: /muscle/i }).click();
    await page.getByRole('button', { name: /intermediate/i }).click();
    await expect(page.getByRole('button', { name: /generate my plan/i })).not.toBeDisabled();
  });

  test('successful generation navigates to the plan editor', async ({ page }) => {
    await page.route('**/api/plan/ai-import', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: {
            name: 'AI Push Pull Plan',
            description: null,
            order: 1,
            weeks: [
              {
                order: 1,
                workouts: [
                  {
                    name: 'Push Day',
                    notes: null,
                    order: 1,
                    dateCompleted: null,
                    exercises: [
                      {
                        exercise: { name: 'Bench Press', category: 'resistance' },
                        order: 1,
                        repRange: '8-12',
                        restTime: '90',
                        notes: null,
                        sets: [{ order: 1, weight: null, reps: 8 }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      });
    });

    await page.getByRole('button', { name: /4 days/i }).click();
    await page.getByRole('button', { name: /muscle/i }).click();
    await page.getByRole('button', { name: /intermediate/i }).click();
    await page.getByRole('button', { name: /generate my plan/i }).click();

    // Should land on the plan editor with the generated plan name pre-filled
    await expect(page.getByRole('textbox', { name: /plan name/i })).toHaveValue('AI Push Pull Plan');
    await expect(page.getByRole('button', { name: /save plan/i })).toBeVisible();
  });

  test('"Prefer to describe your own plan?" link switches to freeform mode', async ({ page }) => {
    await page.getByRole('button', { name: /prefer to describe your own plan/i }).click();
    await expect(page.getByLabel(/plan description/i)).toBeVisible();
    await expect(page.getByText(/describe your plan/i)).toBeVisible();
  });

  test('freeform Generate button enables after typing a description', async ({ page }) => {
    await page.getByRole('button', { name: /prefer to describe your own plan/i }).click();
    await expect(page.getByRole('button', { name: /generate my plan/i })).toBeDisabled();
    await page.getByLabel(/plan description/i).fill('3 day push pull legs');
    await expect(page.getByRole('button', { name: /generate my plan/i })).not.toBeDisabled();
  });

  test('shows an error when the AI service is unavailable', async ({ page }) => {
    await page.route('**/api/plan/ai-import', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI service temporarily unavailable, please try again shortly' }),
      });
    });

    await page.getByRole('button', { name: /4 days/i }).click();
    await page.getByRole('button', { name: /muscle/i }).click();
    await page.getByRole('button', { name: /intermediate/i }).click();
    await page.getByRole('button', { name: /generate my plan/i }).click();

    // Use filter to exclude the Next.js route announcer which also has role="alert"
    const errorAlert = page.getByRole('alert').filter({ hasText: /unavailable/i });
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/unavailable/i);
    // AI form remains visible so the user can retry
    await expect(page.getByRole('button', { name: /generate my plan/i })).toBeVisible();
  });
});

// ── Plan editor (scratch) ─────────────────────────────────────────────────────

test.describe('Plan editor (scratch)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
    await page.getByTestId('entry-scratch').click();
  });

  test('shows the plan name field', async ({ page }) => {
    await expect(page.getByLabel(/plan name/i)).toBeVisible();
  });

  test('shows the duration field', async ({ page }) => {
    await expect(page.getByLabel(/duration/i)).toBeVisible();
  });

  test('shows an Add workout day button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add workout day/i })).toBeVisible();
  });

  test('Save Plan button is disabled when plan name is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save plan/i })).toBeDisabled();
  });

  test('Save Plan button enables after typing a plan name and exercise name', async ({ page }) => {
    await page.getByLabel(/plan name/i).fill('My Test Plan');
    await page.getByLabel(/exercise/i).first().fill('Squat');
    await expect(page.getByRole('button', { name: /save plan/i })).not.toBeDisabled();
  });

  test('shows create option when exercise name has no match', async ({ page }) => {
    await page.getByLabel(/exercise/i).first().fill('Nonexistent Exercise XYZ');
    await expect(page.getByRole('option', { name: /Create "Nonexistent Exercise XYZ"/ })).toBeVisible();
  });

  test('does not show create option when exercise field is empty', async ({ page }) => {
    await expect(page.getByRole('option', { name: /Create "/ })).not.toBeVisible();
  });

  test('does not show create option when exercise name matches an existing exercise', async ({ page }) => {
    // Seed data contains 'Squat' — typing it should not show create option
    await page.getByLabel(/exercise/i).first().fill('Squat');
    await expect(page.getByRole('option', { name: /Create "/ })).not.toBeVisible();
  });

  test('clicking create option opens Add New Exercise dialog with name pre-filled', async ({ page }) => {
    await page.getByLabel(/exercise/i).first().fill('Nordic Curl');
    await page.getByRole('option', { name: /Create "Nordic Curl"/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Add New Exercise' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Exercise Name')).toHaveValue('Nordic Curl');
  });

  test('clicking Add workout day adds a new workout card', async ({ page }) => {
    const initialCards = await page.getByLabel(/workout name/i).count();
    await page.getByRole('button', { name: /add workout day/i }).click();
    await expect(page.getByLabel(/workout name/i)).toHaveCount(initialCards + 1);
  });
});

// ── BFR preset toggle ─────────────────────────────────────────────────────────
// TODO: BFR toggle was previously in ExerciseRow (Week.tsx desktop table).
// The new PlanMultiWeekTable does not yet expose per-exercise BFR controls.
// These tests will be re-added once BFR is supported in the new plan view.


// ── Sheet view ────────────────────────────────────────────────────────────────

test.describe('Sheet view', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await page.goto('/user/plan');
    const firstPlanLink = page.getByRole('listitem').first().getByRole('link');
    await firstPlanLink.click();
    await page.waitForURL(/\/user\/plan\/\d+/);
    await page.getByRole('button', { name: /sheet view/i }).click();
  });

  test('view toggle shows Classic and Sheet buttons', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.getByRole('button', { name: /classic view/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sheet view/i })).toBeVisible();
  });

  test('sheet view shows weight and reps inputs', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.locator('input[placeholder="kg"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder="reps"]').first()).toBeVisible();
  });

  test('sheet view shows the ~e1RM column header', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.getByText('~e1RM').first()).toBeVisible();
  });

  test('sheet view shows add-exercise ghost box', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.locator('[aria-label="Add exercise"]').first()).toBeVisible();
  });

  test('sheet view shows add-workout ghost column', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.locator('[aria-label="Add workout"]').first()).toBeVisible();
  });

  test('sheet view shows add-week ghost box', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.locator('[aria-label="Add week"]')).toBeVisible();
  });

  test('arrange mode toggle is visible', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.getByRole('button', { name: /arrange mode/i })).toBeVisible();
  });

  test('toggling arrange mode hides delete and add controls', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.getByRole('button', { name: /delete week/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /arrange mode/i }).click();
    await expect(page.getByRole('button', { name: /delete week/i })).not.toBeVisible();
    await expect(page.locator('[aria-label="Add exercise"]')).not.toBeVisible();
  });

  test('exiting arrange mode restores delete and add controls', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await page.getByRole('button', { name: /arrange mode/i }).click();
    await page.getByRole('button', { name: /exit arrange mode/i }).click();
    await expect(page.getByRole('button', { name: /delete week/i }).first()).toBeVisible();
    await expect(page.locator('[aria-label="Add exercise"]').first()).toBeVisible();
  });

  test('switching back to classic view hides arrange controls', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await page.getByRole('button', { name: /classic view/i }).click();
    await expect(page.getByRole('button', { name: /arrange mode/i })).not.toBeVisible();
  });
});

test.describe('Plan creation — sheet view', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
    await page.getByRole('button', { name: /start from scratch/i }).click();
  });

  test('view toggle appears in the plan editor', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await expect(page.getByRole('button', { name: /sheet view/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /classic view/i })).toBeVisible();
  });

  test('view toggle is visible on mobile', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || !isMobile, 'mobile chromium only');
    await expect(page.getByRole('button', { name: /sheet view/i })).toBeVisible();
  });

  test('switching to sheet view renders the sheet', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await page.getByRole('button', { name: /sheet view/i }).click();
    await expect(page.locator('[aria-label="Add exercise"]').first()).toBeVisible();
  });

  test('sheet view in editor does not show add-week ghost box', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await page.getByRole('button', { name: /sheet view/i }).click();
    await expect(page.locator('[aria-label="Add week"]')).not.toBeVisible();
  });

  test('switching back to classic view restores the card editor', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
    await page.getByRole('button', { name: /sheet view/i }).click();
    await page.getByRole('button', { name: /classic view/i }).click();
    await expect(page.getByRole('button', { name: /add workout day/i })).toBeVisible();
  });
});
