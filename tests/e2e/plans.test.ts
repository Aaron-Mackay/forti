/**
 * Training plans tests (/user/plan and /user/plan/[planId]).
 *
 * Covers: plan listing, navigating into a plan, viewing weeks/workouts,
 * toggling edit mode, and AI plan import.
 */
import { test, expect } from './fixtures';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal valid Anthropic API response shape for the tool-use path. */
function makeAnthropicToolUseResponse(planName: string) {
  return {
    id: 'msg_mock',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'tu_mock',
        name: 'create_workout_plan',
        input: {
          name: planName,
          weeks: [
            {
              workouts: [
                {
                  name: 'Push Day',
                  exercises: [
                    { name: 'Bench Press', category: 'Chest', repRange: '8-12', restTime: '90', sets: [{ weight: '80', reps: 8 }] },
                    { name: 'OHP', category: 'Shoulders', repRange: '8-12', restTime: '90', sets: [{ reps: 10 }] },
                  ],
                },
                {
                  name: 'Pull Day',
                  exercises: [
                    { name: 'Barbell Row', category: 'Back', repRange: '8-12', restTime: '90', sets: [{ weight: '60', reps: 8 }] },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
    model: 'claude-opus-4-6',
    stop_reason: 'tool_use',
    usage: { input_tokens: 100, output_tokens: 200 },
  };
}

test.describe('Plans list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan');
  });

  test('renders the Plans app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Plans');
  });

  test("shows the demo user's plans section", async ({ page }) => {
    // Seed creates "Bob's Plans" section header
    await expect(page.getByText(/Bob's Plans/i)).toBeVisible();
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
    await expect(page.getByText(/User: Bob/i)).toBeVisible();
  });

  test('displays at least one week', async ({ page }) => {
    // Seed creates 2-3 weeks per plan; each Week renders a "Week N" heading
    await expect(page.getByText(/Week \d+/i).first()).toBeVisible();
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

// ── AI Plan Import ────────────────────────────────────────────────────────────

test.describe('AI plan import (Create Plan page)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan/create');
  });

  test('shows the "Import with AI" button on the Plan step', async ({ page }) => {
    await expect(page.getByRole('button', { name: /import with ai/i })).toBeVisible();
  });

  test('opens the AI import dialog when the button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /import with ai/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Import Plan with AI');
  });

  test('closes the dialog when Cancel is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /import with ai/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('successful import populates plan and advances to Summary', async ({ page }) => {
    // Intercept the Anthropic API at the Next.js route level
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
                        exercise: { name: 'Bench Press', category: 'Chest' },
                        order: 1,
                        repRange: '8-12',
                        restTime: '90',
                        notes: null,
                        sets: [{ order: 1, weight: '80', reps: 8 }],
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

    await page.getByRole('button', { name: /import with ai/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/workout plan text/i).fill('Bench 3x8, OHP 3x10');
    await dialog.getByRole('button', { name: /^import$/i }).click();

    // Dialog closes and we jump to the Summary step
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(/step 4/i)).toBeVisible();
    await expect(page.getByText('AI Push Pull Plan')).toBeVisible();
    await expect(page.getByText('Bench Press')).toBeVisible();
  });

  test('shows an error message when the AI service is unavailable', async ({ page }) => {
    await page.route('**/api/plan/ai-import', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI service temporarily unavailable, please try again shortly' }),
      });
    });

    await page.getByRole('button', { name: /import with ai/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/workout plan text/i).fill('some workout text');
    await dialog.getByRole('button', { name: /^import$/i }).click();

    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('alert')).toContainText(/unavailable/i);
    // Dialog stays open so the user can retry or cancel
    await expect(dialog).toBeVisible();
  });

  test('Import button is disabled when text area is empty', async ({ page }) => {
    await page.getByRole('button', { name: /import with ai/i }).click();
    await expect(page.getByRole('button', { name: /^import$/i })).toBeDisabled();
  });
});
