# Redesign Waves and Regression Coverage Map

## Wave 1 — Navigation Shell
**Scope**
- Global layout shell and nav affordances: `src/app/user/layout.tsx`, `src/components/CustomAppBar.tsx`, `src/components/AppBarTitle.tsx`, `src/app/user/settings/page.tsx`, `src/app/user/notifications/page.tsx`, `src/app/user/feedback/page.tsx`.

**Required E2E regression specs**
- `tests/e2e/AppBar.test.ts` (drawer, nav links, route transitions)
- `tests/e2e/settings.test.ts` (settings surface + navigation ordering)
- `tests/e2e/login.test.ts` (auth redirect into shell)

## Wave 2 — Dashboard
**Scope**
- Dashboard and onboarding experiences: `src/app/user/page.tsx`, `src/app/user/(dashboard)/*`, `src/app/user/onboarding/*`, plus shared chart cards.

**Required E2E regression specs**
- `tests/e2e/dashboard.test.ts`
- `tests/e2e/AppBar.test.ts`
- `tests/e2e/settings.test.ts` (dashboard toggle-driven visibility)

## Wave 3 — Workout & Scheduling
**Scope**
- Workout execution and planning surfaces: `src/app/user/workout/*`, `src/app/user/plan/*`, `src/app/user/calendar/*`.

**Required E2E regression specs**
- `tests/e2e/WorkoutClient.test.ts`
- `tests/e2e/plans.test.ts`
- `tests/e2e/calendar.test.ts`
- `tests/e2e/AppBar.test.ts`

## Wave 4 — Nutrition
**Scope**
- Nutrition and supplement workflows: `src/app/user/nutrition/*`, `src/app/user/supplements/*`, nutrition shared components in `src/components`.

**Required E2E regression specs**
- `tests/e2e/nutrition.test.ts`
- `tests/e2e/supplements.test.ts`
- `tests/e2e/AppBar.test.ts` (drawer access to Nutrition/Supplements links)

## Wave 5 — Weekly Check-in
**Scope**
- Member check-in surfaces: `src/app/user/check-in/*` and check-in shared components in `src/components`.

**Required E2E regression specs**
- `tests/e2e/check-in.test.ts`
- `tests/e2e/coach-review.test.ts` (cross-check with coach consumption of submissions)

## Wave 6 — Coach & Learning Views
**Scope**
- Coach portal and learning plan surfaces: `src/app/user/coach/**/*`, `src/app/user/learning-plans/*`.

**Required E2E regression specs**
- `tests/e2e/coachClients.test.ts`
- `tests/e2e/coach-review.test.ts`
- `tests/e2e/learningPlans.test.ts`
- `tests/e2e/coachLink.test.ts`

## Coverage gaps called out upfront
- No dedicated E2E specs currently target: coach check-in template editor, coach client nutrition/plans/supplements routes, coach learning plan editor route, onboarding route, notifications route.
- These gaps are flagged in `docs/redesign-surface-inventory.csv` and should be scheduled as test additions before or during Wave 6.
