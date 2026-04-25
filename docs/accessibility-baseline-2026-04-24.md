# Accessibility Baseline — Key Flows (2026-04-24)

## Purpose
This document defines the current accessibility baseline for high-traffic Forti flows and records **current known gaps** as explicit redesign success criteria.

## Route Set (Representative)
- Dashboard: `/user`
- Workout: `/user/workout`
- Nutrition: `/user/nutrition`
- Check-in: `/user/check-in`
- Coach check-in: `/user/coach/check-ins`

## Baseline Checks (applies to each route)

1. **Tap-target size**
   - Primary/critical action controls should be at least **44×44 CSS px**.
   - Baseline automation threshold in E2E guardrails: **40×40 CSS px** for key controls to reduce false positives while redesign work is in progress.

2. **Keyboard navigation**
   - Critical navigation and primary form actions must be reachable via keyboard-only flow (Tab / Shift+Tab / Enter / Space).

3. **Focus visibility**
   - Focused interactive controls must show a visible, non-removed focus indicator (outline, ring, shadow, or equivalent state class).

4. **Color contrast**
   - Text and interactive affordances should meet WCAG contrast expectations:
     - Normal text: 4.5:1
     - Large text / UI components: 3:1
   - E2E guardrails validate contrast on selected primary actions where computed foreground/background values are reliably available.

5. **Save/error feedback clarity**
   - Save actions must use explicit labels (e.g., “Save”, “Save Targets”, “Send Review”).
   - Validation/error states must be perceivable and prevent silent failure where possible.

---

## Current Baseline Gaps (to treat as redesign success criteria)

### Dashboard (`/user`)
- Gap: No route-specific a11y regression guard previously existed for keyboard focus on core navigation entry points.
- Success criteria:
  - Keyboard users can reach and activate primary navigation controls.
  - Focus state remains visible for nav controls.

### Workout (`/user/workout`)
- Gap: No explicit minimum hit-area guard on critical progression actions.
- Success criteria:
  - Primary workout progression actions consistently meet minimum hit-area threshold.
  - Keyboard users can trigger key progression controls (plan/week/workout drill-down and complete action).

### Nutrition (`/user/nutrition`)
- Gap: A11y regression checks existed for behavior, but not explicit tap-target/focus/contrast guardrails on target editing actions.
- Success criteria:
  - “Set week targets” and “Save Targets” remain keyboard reachable and visibly focused.
  - Primary target-save controls preserve contrast and minimum hit-area.

### Check-in (`/user/check-in`)
- Gap: Limited automated guardrails for keyboard-first submission and focus behavior around form actions.
- Success criteria:
  - Submission flow remains keyboard operable.
  - Primary submit control has visible focus and minimum hit-area.

### Coach check-in (`/user/coach/check-ins`)
- Gap: Critical review form action (`Send Review`) had no explicit accessibility regression checks.
- Success criteria:
  - Review action remains keyboard reachable, clearly labeled, and stateful (disabled/enabled) with perceivable feedback.
  - Primary review action meets minimum hit-area and visible focus expectations.

---

## Must-Not-Regress E2E Guardrails
Implemented in `tests/e2e/accessibility-guards.test.ts` for critical navigation + form actions on the route set above.

Guardrails currently enforce, where practical:
- keyboard reachability and activation checks,
- visible focus indicator checks,
- minimum hit-area checks for critical actions,
- selected primary-action contrast checks,
- explicit save/review action label and disabled/enabled behavior checks.
