import { test, expect,  } from './fixtures';
import {Locator, Page} from "@playwright/test";

async function contrastRatio(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    const parse = (input: string) => {
      const match = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (!match) return null;
      return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
    };
    const toLinear = (value: number) => {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (rgb: { r: number; g: number; b: number }) => (
      (0.2126 * toLinear(rgb.r)) + (0.7152 * toLinear(rgb.g)) + (0.0722 * toLinear(rgb.b))
    );

    const style = window.getComputedStyle(el);
    const fg = parse(style.color);
    if (!fg) return 0;

    let bgEl: HTMLElement | null = el as HTMLElement;
    let bg: { r: number; g: number; b: number } | null = null;

    while (bgEl) {
      const bgColor = window.getComputedStyle(bgEl).backgroundColor;
      if (!bgColor.includes('rgba(0, 0, 0, 0)') && bgColor !== 'transparent') {
        bg = parse(bgColor);
        if (bg) break;
      }
      bgEl = bgEl.parentElement;
    }

    if (!bg) bg = { r: 255, g: 255, b: 255 };

    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  });
}

async function expectMinTarget(locator: Locator, minPx = 40): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'Expected element to have a bounding box').not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(minPx);
  expect(box!.height).toBeGreaterThanOrEqual(minPx);
}

async function expectFocusVisible(locator: Locator): Promise<void> {
  const focusState = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const className = (el as HTMLElement).className;
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      className,
    };
  });

  const hasOutline = focusState.outlineStyle !== 'none' && focusState.outlineWidth !== '0px';
  const hasShadow = focusState.boxShadow !== 'none';
  const hasFocusClass = typeof focusState.className === 'string' && focusState.className.includes('focusVisible');

  expect(hasOutline || hasShadow || hasFocusClass).toBeTruthy();
}

async function openWorkoutDetail(page: Page): Promise<void> {
  await page.goto('/user/workout');

  for (let i = 0; i < 4; i += 1) {
    const markAsComplete = page.getByRole('button', { name: 'Mark as Complete' });
    const completedButton = page.getByRole('button', { name: /^Completed/ });
    if (await markAsComplete.isVisible() || await completedButton.isVisible()) {
      return;
    }

    const firstItemButton = page.getByRole('listitem').first().getByRole('button').first();
    if (await firstItemButton.isVisible()) {
      await firstItemButton.click();
      continue;
    }

    const firstItemLink = page.getByRole('listitem').first().getByRole('link').first();
    if (await firstItemLink.isVisible()) {
      await firstItemLink.click();
      continue;
    }

    break;
  }
}

test.describe('Accessibility must-not-regress guardrails', () => {
  test.describe.configure({ mode: 'serial' });

  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'desktop chromium only for stable focus-style assertions');

  test('dashboard nav entry remains keyboard reachable with visible focus and minimum hit area', async ({ page }) => {
    await page.goto('/user');
    // Ensure page content has loaded to avoid hydration flip-flops.
    const welcomeHeading = page.locator('h1:visible, h2:visible, h3:visible, h4:visible')
      .filter({ hasText: /Welcome/i })
      .first();
    await expect(welcomeHeading).toBeVisible();

    const menuButton = page.getByRole('button', { name: /menu/i }).first();
    const fallbackNav = page.getByRole('link', { name: /Home|Training|Calendar/i }).first();

    if (await menuButton.isVisible()) {
      await menuButton.focus();
      await expectFocusVisible(menuButton);
      await expectMinTarget(menuButton);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
      return;
    }

    await expect(fallbackNav).toBeVisible();
    await fallbackNav.focus();
    await expectFocusVisible(fallbackNav);
    await expectMinTarget(fallbackNav);
  });

  test('workout completion action keeps minimum hit area and contrast', async ({ page }) => {
    await openWorkoutDetail(page);

    const markAsComplete = page.getByRole('button', { name: 'Mark as Complete' });
    const completedButton = page.getByRole('button', { name: /^Completed/ });

    // If already completed (from a previous serial test), uncomplete it first
    if (!(await markAsComplete.isVisible())) {
      await completedButton.click();
      await expect(markAsComplete).toBeVisible();
    }

    await markAsComplete.focus();
    await expectFocusVisible(markAsComplete);
    await expectMinTarget(markAsComplete, 36);

    // Small delay to ensure any focus transitions/animations are settled
    await page.waitForTimeout(100);
    const ratio = await contrastRatio(markAsComplete);
    console.log(`Workout completion button contrast ratio: ${ratio}`);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  test('nutrition target save action remains keyboard operable and clearly visible', async ({ page }) => {
    await page.goto('/user/nutrition');
    await page.getByRole('button', { name: 'Set week targets' }).click();

    const saveTargets = page.getByRole('button', { name: 'Save Targets' });
    await expect(saveTargets).toBeVisible();

    await saveTargets.focus();
    await expectFocusVisible(saveTargets);
    await expectMinTarget(saveTargets);
    expect(await contrastRatio(saveTargets)).toBeGreaterThanOrEqual(3);
  });

  test('check-in submit action remains keyboard reachable with explicit save label', async ({ page }) => {
    await page.route(/\/api\/check-in\/current(?:\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checkIn: {
            id: 1,
            userId: 'test',
            weekStartDate: new Date().toISOString(),
            completedAt: null,
            energyLevel: null,
            moodRating: null,
            stressLevel: null,
            sleepQuality: null,
            recoveryRating: null,
            adherenceRating: null,
            completedWorkouts: null,
            plannedWorkouts: null,
            weekReview: null,
            coachMessage: null,
            goalsNextWeek: null,
            coachNotes: null,
            coachReviewedAt: null,
          },
          currentWeek: [],
          weekPrior: [],
          previousPhotos: null,
          weekTargets: null,
          completedWorkoutsCount: 0,
          plannedWorkoutsCount: 0,
          activePlanId: null,
          template: null,
        }),
      }),
    );

    await page.goto('/user/check-in');
    const submit = page.getByRole('button', { name: /Submit Check-in/i });
    await expect(submit).toBeVisible();

    await submit.focus();
    await expectFocusVisible(submit);
    await expectMinTarget(submit);
  });

  test('coach review action preserves explicit stateful save feedback', async ({ page }) => {
    await page.route(/\/api\/coach\/check-ins\/10(?:\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checkIn: {
            id: 10,
            userId: 'client-1',
            weekStartDate: '2026-03-09T00:00:00.000Z',
            completedAt: '2026-03-14T10:00:00.000Z',
            energyLevel: 4,
            moodRating: 3,
            stressLevel: 2,
            sleepQuality: 4,
            recoveryRating: 3,
            adherenceRating: 5,
            completedWorkouts: 3,
            plannedWorkouts: 4,
            weekReview: 'Good week overall',
            coachMessage: 'How did my technique look?',
            goalsNextWeek: 'More sleep',
            coachNotes: null,
            coachResponseUrl: null,
            coachReviewedAt: null,
            user: { id: 'client-1', name: 'Alice Smith' },
          },
          currentWeek: [],
          weekPrior: [],
          weekTargets: null,
          activeTemplate: null,
          customMetricDefs: [],
          weekWorkouts: [],
        }),
      }),
    );

    await page.route(/\/api\/coach\/check-ins\/10\/notes(?:\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ coachNotes: 'Looks strong', coachReviewedAt: new Date().toISOString() }),
      }),
    );

    await page.goto('/user/coach/check-ins/10');

    const sendReview = page.getByRole('button', { name: /Send Review/i });
    await expect(sendReview).toBeDisabled();

    await page.getByPlaceholder(/Leave feedback for your client/i).fill('Looks strong');
    await expect(sendReview).toBeEnabled();

    await sendReview.focus();
    await expectFocusVisible(sendReview);
    await expectMinTarget(sendReview);
  });
});
