# User-Flow Suggested Changes — Task Spawn List

Date: 2026-04-01
Source: `docs/user-flow-audit-2026-04-01.md`

## How to use this list
- Each item below is intentionally scoped to a single implementation task.
- You can spawn tasks independently in priority order.
- Suggested default order: P0 (immediate) → P1 (this sprint) → P2 (next sprint) → P3 (later).

---

## P0 — Immediate

### TASK-001 — Add explicit save/error feedback for nutrition day edits
- **Problem:** Daily nutrition edits can fail without clear user-facing status.
- **Change:** Add success + error snackbar/toast for `saveDay`, with retry affordance on failure.
- **Scope:** `src/app/user/nutrition/NutritionClient.tsx`
- **Acceptance criteria:**
  - Success confirmation appears after save.
  - Failure shows error message and does not silently close state.
  - User can retry save.

### TASK-002 — Add explicit save/error feedback for nutrition week-target bulk updates
- **Problem:** Week target updates run in bulk with limited failure visibility.
- **Change:** Add progress + completion + failure messaging; keep dialog open on partial/full failure.
- **Scope:** `src/app/user/nutrition/NutritionClient.tsx`
- **Acceptance criteria:**
  - Success and failure states are explicit.
  - Partial failures indicate which days failed.
  - No silent dismissal on failure.

### TASK-003 — Clarify coach nutrition permissions in UI
- **Problem:** `readOnly` + `canSetTargets` can be misread as contradictory.
- **Change:** Replace ambiguous permission props with explicit capabilities (`canEditActuals`, `canEditTargets`) and clear helper copy in coach mode.
- **Scope:**
  - `src/app/user/nutrition/NutritionClient.tsx`
  - `src/app/user/coach/clients/[clientId]/nutrition/page.tsx`
- **Acceptance criteria:**
  - Permission naming matches behavior.
  - Coach view clearly states editable vs read-only fields.

### TASK-004 — Unify coach nutrition data-loading contract
- **Problem:** Coach nutrition has duplicated data paths (page Prisma query + dedicated API route).
- **Change:** Use one shared service/contract for all coach nutrition reads.
- **Scope:**
  - `src/app/user/coach/clients/[clientId]/nutrition/page.tsx`
  - `src/app/api/coach/clients/[clientId]/nutrition/route.ts`
  - Optional shared helper in `src/lib/`
- **Acceptance criteria:**
  - Single source of truth for permission + query logic.
  - No behavior drift between page and API route.

---

## P1 — This sprint

### TASK-005 — Define canonical metric-entry path and cross-linking
- **Problem:** Users can log overlapping metrics in Calendar and Nutrition without guidance.
- **Change:** Define primary purpose per surface and add in-UI signposting/links.
- **Scope:**
  - `src/app/user/nutrition/*`
  - `src/app/user/calendar/*`
  - `src/app/user/(dashboard)/GettingStartedCard.tsx`
- **Acceptance criteria:**
  - Copy explicitly explains where to log what.
  - Users can navigate between relevant surfaces from each context.

### TASK-006 — Improve onboarding error visibility on finish failures
- **Problem:** Generic catch path gives limited recovery guidance.
- **Change:** Add top-level error alert + retry hint on onboarding completion failure.
- **Scope:** `src/app/user/onboarding/OnboardingWizard.tsx`
- **Acceptance criteria:**
  - Failure state is visible and actionable.
  - User is not left in ambiguous loading/blocked state.

### TASK-007 — Add year to nutrition week label + “today” emphasis
- **Problem:** Temporal orientation is weak (week label ambiguity + no today highlight).
- **Change:** Include year in week label; visually emphasize today row.
- **Scope:** `src/app/user/nutrition/NutritionClient.tsx`
- **Acceptance criteria:**
  - Week label includes year.
  - Current day is clearly identifiable.

### TASK-008 — Improve nutrition input validation messaging
- **Problem:** Numeric fields allow unclear/unrealistic input without guidance.
- **Change:** Add helper/error text and sensible bounds/warnings.
- **Scope:** `src/app/user/nutrition/NutritionClient.tsx`
- **Acceptance criteria:**
  - Invalid values are clearly flagged.
  - User receives corrective guidance before submit.

### TASK-009 — Increase touch-target robustness on dense edit controls
- **Problem:** Small icon controls reduce usability on mobile/touch.
- **Change:** Ensure key controls meet touch-size expectations and keyboard focus visibility.
- **Scope:** Nutrition cards plus other dense card controls as identified during implementation.
- **Acceptance criteria:**
  - Tap targets are comfortably interactive on mobile.
  - Focus states remain visible and consistent.

---

## P2 — Next sprint

### TASK-010 — Move nutrition macro colors to theme tokens
- **Problem:** Hard-coded colors make theming/contrast evolution harder.
- **Change:** Replace static colors with theme tokenized values.
- **Scope:** `src/app/user/nutrition/NutritionClient.tsx`, theme files in `src/lib/theme.ts` (or equivalent token source).
- **Acceptance criteria:**
  - Colors derive from theme tokens.
  - Light/dark theme behavior remains coherent.

### TASK-011 — Normalize check-in history derivation contract
- **Problem:** UI performs derived filtering/counting that can become brittle.
- **Change:** Return separated `current` + `history` payload from API.
- **Scope:**
  - `src/app/api/check-in/route.ts` and/or `src/app/api/check-in/current/route.ts`
  - `src/app/user/check-in/CheckInClient.tsx`
- **Acceptance criteria:**
  - UI no longer relies on fragile client-side offset assumptions.
  - History totals and pagination remain accurate.

### TASK-012 — Standardize “sleep mins” naming across nutrition UI
- **Problem:** Label variations (“sleep”, “sleep mins”) create small but recurring inconsistency.
- **Change:** Normalize labels and units in all nutrition inputs/displays.
- **Scope:** `src/app/user/nutrition/NutritionClient.tsx`
- **Acceptance criteria:**
  - One consistent term and unit appears across all related fields.

---

## P3 — Later / enhancement

### TASK-013 — Add first-week guidance for “where to log what”
- **Problem:** New users must infer feature boundaries between Calendar, Nutrition, Check-in.
- **Change:** Add lightweight onboarding tips/tooltips or contextual help.
- **Scope:** Onboarding/dashboard entry points and relevant destination pages.
- **Acceptance criteria:**
  - First-time users receive explicit, concise guidance.

### TASK-014 — Add instrumentation for first-week behavior across key flows
- **Problem:** Limited telemetry for onboarding-to-habit conversion.
- **Change:** Instrument key events (first metric, first workout, first check-in, first nutrition target).
- **Scope:** Analytics/event capture points in client actions/APIs.
- **Acceptance criteria:**
  - Dashboardable funnel events available for product decisions.

---

## Suggested task-spawn format
Use one issue/task per item above with this template:

- **Title:** `[TASK-XXX] <short action title>`
- **Description:**
  - Context/problem
  - Scope (files/modules)
  - Acceptance criteria
  - Out of scope
- **Priority:** P0/P1/P2/P3
- **Owner:** <team/person>
- **Estimate:** <S/M/L>
- **Links:** audit report section reference
