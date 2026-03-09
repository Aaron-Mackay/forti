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

  test("shows the demo user's plans section", async ({ page }) => {
    // Seed creates "Bob's Plans" section header
    await expect(page.getByText(/Bob's Plans/i).first()).toBeVisible();
  });

  test('lists at least one plan for the demo user', async ({ page }) => {
    // Seed creates two plans per user; each is a list item button
    await expect(page.getByRole('link', { name: 'Bob\'s Plan 1' })).toBeVisible();
  });

  test('navigates to a plan detail page when a plan is clicked', async ({ page }) => {
    const firstPlan = page.getByRole('listitem').first();
    const planLink = firstPlan.getByRole('link');
    await planLink.click();
    // Should land on /user/plan/<id>
    await expect(page).toHaveURL(/\/user\/plan\/\d+/);
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

  test('renders the Plan app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Plan');
  });

  test("shows the demo user's name in the plan heading", async ({ page }) => {
    await expect(page.getByText(/User: Bob/i).first()).toBeVisible();
  });

  test('displays at least one week', async ({ page }) => {
    // Seed creates 2-3 weeks per plan.
    // Desktop: Week component renders an <h2> heading per week ("Week N")
    // Mobile: MobilePlanView renders Tab buttons with "Wk N" labels
    const weekHeading = page.getByRole('heading', { name: /Week \d+/i });
    const weekTab = page.getByRole('tab', { name: /Wk \d+/i });
    await expect(weekHeading.or(weekTab).first()).toBeVisible();
  });

  test('displays workouts inside a week', async ({ page }) => {
    await expect(page.getByText(/Workout/i).first()).toBeVisible();
  });

  test('shows the Edit toggle button in view mode', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible();
  });

  test('clicking Edit enables edit mode and reveals Save button', async ({ page }) => {
    await page.getByRole('button', { name: /Edit/i }).click();
    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
  });

  // todo skipping until plan edit mode works on mobile
  test.skip('edit mode reveals Add Week button', async ({ page }) => {
    await page.getByRole('button', { name: /Edit/i }).click();
    await expect(page.getByRole('button', { name: /Add Week/i })).toBeVisible();
  });
});

// ── Create Plan entry screen ──────────────────────────────────────────────────

test.describe('Create Plan entry screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
  });

  test('shows the "How do you want to start?" heading', async ({ page }) => {
    await expect(page.getByText(/how do you want to start/i)).toBeVisible();
  });

  test('shows the "From a template" option', async ({ page }) => {
    await expect(page.getByText(/from a template/i)).toBeVisible();
  });

  test('shows the "Build with AI" option', async ({ page }) => {
    await expect(page.getByText(/build with ai/i)).toBeVisible();
  });

  test('shows the "Start from scratch" option', async ({ page }) => {
    await expect(page.getByText(/start from scratch/i)).toBeVisible();
  });

  test('clicking "Start from scratch" shows the plan editor', async ({ page }) => {
    await page.getByText(/start from scratch/i).click();
    await expect(page.getByLabel(/plan name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save plan/i })).toBeVisible();
  });

  test('clicking "Build with AI" shows the AI form', async ({ page }) => {
    await page.getByText(/build with ai/i).click();
    await expect(page.getByText(/how many days per week/i)).toBeVisible();
    await expect(page.getByText(/main goal/i)).toBeVisible();
    await expect(page.getByText(/experience level/i)).toBeVisible();
  });

  test('back arrow on AI form returns to entry screen', async ({ page }) => {
    await page.getByText(/build with ai/i).click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText(/how do you want to start/i)).toBeVisible();
  });

  test('clicking "From a template" shows the template browser', async ({ page }) => {
    await page.getByText(/from a template/i).click();
    await expect(page.getByText(/push \/ pull \/ legs/i)).toBeVisible();
  });

  test('back arrow on template browser returns to entry screen', async ({ page }) => {
    await page.getByText(/from a template/i).click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText(/how do you want to start/i)).toBeVisible();
  });

  test('back arrow on plan editor returns to entry screen', async ({ page }) => {
    await page.getByText(/start from scratch/i).click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText(/how do you want to start/i)).toBeVisible();
  });
});

// ── Template browser ──────────────────────────────────────────────────────────

test.describe('Template browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
    await page.getByText(/from a template/i).click();
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
    await page.getByText(/build with ai/i).click();
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
    await expect(page.getByDisplayValue('AI Push Pull Plan')).toBeVisible();
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

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/unavailable/i);
    // AI form remains visible so the user can retry
    await expect(page.getByRole('button', { name: /generate my plan/i })).toBeVisible();
  });
});

// ── Plan editor (scratch) ─────────────────────────────────────────────────────

test.describe('Plan editor (scratch)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
    await page.getByText(/start from scratch/i).click();
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

  test('Save Plan button enables after typing a plan name', async ({ page }) => {
    await page.getByLabel(/plan name/i).fill('My Test Plan');
    await expect(page.getByRole('button', { name: /save plan/i })).not.toBeDisabled();
  });

  test('clicking Add workout day adds a new workout card', async ({ page }) => {
    const initialCards = await page.getByLabel(/workout name/i).count();
    await page.getByRole('button', { name: /add workout day/i }).click();
    await expect(page.getByLabel(/workout name/i)).toHaveCount(initialCards + 1);
  });
});
