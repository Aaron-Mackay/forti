# User Flow Audit — Forti

Date: 2026-04-01
Scope: End-to-end product user flows with extra depth on Nutrition.
Method: Static code review of navigation, page components, and API route logic (no UI edits, no flow fixes in this pass).

## Skills Used
- `audit` (primary): systematic quality and UX flow audit.
- `frontend-design` (supporting): anti-pattern checks and consistency heuristics.

## Anti-Patterns Verdict
**Verdict: Pass with caution (not obvious “AI slop”).**

The product avoids several common template tells (e.g., gratuitous gradient text, glassmorphism-heavy cards, meaningless hero metrics). Navigation and card patterns are generally practical and coherent. Main risks are not visual gimmicks; they are **flow coherence and feedback gaps** (especially around error handling and cross-feature entry points).

## Executive Summary

### Issue count by severity
- Critical: 0
- High: 4
- Medium: 9
- Low: 8

### Top issues (highest impact)
1. **Nutrition save flows can fail silently in daily edit + week target bulk actions.**
2. **Coach Nutrition page bypasses its dedicated API contract and directly queries DB in page loader, diverging from intended architecture.**
3. **Cross-feature metric logging entry points are split (Calendar vs Nutrition) without clear positioning, causing discoverability and expectation mismatch.**
4. **Read-only coach nutrition still exposes target-setting in a way that can be misread as fully read-only.**

### Overall quality score
**7.1 / 10**

- Strong: broad feature coverage, sensible default onboarding path, coherent left-nav IA, and mostly consistent data model.
- Weak: inconsistent feedback loops, some role-state ambiguity (coach/client/read-only), and duplicate pathways without strong wayfinding.

### Recommended next steps
1. Add explicit save/error feedback in nutrition editing (day + week targets) and align read-only semantics.
2. Consolidate nutrition data loading path for coach views to one service/API pattern.
3. Add clear “why/when” signposting between Calendar metrics entry vs Nutrition metrics entry.
4. Tighten accessibility + responsive details on dense card/edit interactions.

---

## Flow Review (Whole App)

## 1) Entry & Authentication
- Protected routes are consistently gated by session checks in `ProtectedLayout`.
- Onboarding gate is clear: incomplete registration redirects to `/user/onboarding`; completed users go to dashboard.
- Navigation model is understandable:
  - User domain nav (Home/Calendar/Training/Check-in/Nutrition/etc.)
  - Coach domain nav
  - Client focus mode nav under coach context.

**Assessment:** Logical and mostly consistent.

## 2) Onboarding → First Value
- Wizard captures identity, units/check-in day, and optional coach setup.
- Completion marks `registrationComplete`, writes preferences, optionally seeds initial body weight, optionally sends coach request.
- Dashboard immediately available after completion.

**Assessment:** Strong baseline. Minor risk: failed finish path swallows generic errors (no explicit surfaced message on catch-all branch).

## 3) Dashboard as Hub
- Dashboard cards provide actionable launch points (next workout, metrics, block status, events).
- “Getting Started” card drives early activation with explicit checklist and deep links.

**Assessment:** Good structure, but one onboarding step sends users to Calendar for “Log today’s metrics” even though Nutrition exists as a dedicated feature, creating conceptual overlap.

## 4) Workout Flow
- Hierarchical drill-down is coherent: Plans → Weeks → Workouts → Exercises → Exercise detail.
- Supports substitutions/add-ons and completion modal.
- Query-param deep-link (`?workoutId=`) improves continuity from dashboard.

**Assessment:** Logical and user-friendly for progressive detail.

## 5) Check-in Flow
- Weekly shell auto-created server-side.
- Current-week status + history separation is clear.
- Coach notifications on submission are well integrated.

**Assessment:** Strong, with good lifecycle handling.

## 6) Coach Flows
- Coach mode activation and request lifecycle are well modeled.
- Client focus mode provides task-oriented quick navigation (overview/check-ins/plans/nutrition/supplements).

**Assessment:** Good end-to-end role model. Main concerns are consistency and clarity in what “read-only” means per page.

---

## Nutrition Deep Dive

### What works
- Weekly context + daily card breakdown is easy to parse.
- Macro actual/target framing is practical and directly useful.
- Inline editing reduces navigation friction.
- Coach can review client nutrition in context using the same UI component.

### Main friction points
1. **Save feedback and resilience are weak**
   - Daily save and weekly target save have no user-facing success/error state.
   - In failures, users can lose confidence about whether data persisted.

2. **Role semantics are mixed**
   - `readOnly` disables per-day edit controls, but `canSetTargets` still enables “Set week targets.”
   - If intent is “coach can set targets but not actuals,” this needs explicit labeling to avoid mismatch.

3. **Pathway overlap with Calendar metrics**
   - Users can input overlapping health metrics from Calendar and Nutrition surfaces.
   - Mental model (“where should I log what?”) is not taught in-product.

4. **Architecture drift**
   - Coach nutrition page loads directly via Prisma while a dedicated coach nutrition API exists.
   - This increases divergence risk over time (authorization/business rules can drift).

5. **Temporal and contextual orientation gaps**
   - Week label omits year.
   - No immediate emphasis on “today” row.
   - Future-week target setting has minimal guardrails/explanation.

---

## Detailed Findings by Severity

## High Severity

### H1 — Silent failure risk in nutrition save flows
- **Location:** `src/app/user/nutrition/NutritionClient.tsx`
- **Category:** UX Reliability / Feedback
- **Description:** `saveDay` and `saveWeekTargets` do not expose explicit error UI. Failures are only implicit via state rollback/ending spinner.
- **Impact:** Users may assume nutrition data persisted when it did not, undermining trust.
- **Standard:** UX feedback principle (Nielsen: visibility of system status).
- **Recommendation:** Add success/error snackbars and keep dialog open on failure with actionable message.
- **Suggested command:** `/harden`

### H2 — Coach nutrition data path inconsistency
- **Location:** `src/app/user/coach/clients/[clientId]/nutrition/page.tsx` and `src/app/api/coach/clients/[clientId]/nutrition/route.ts`
- **Category:** System Consistency / Maintainability
- **Description:** Page directly queries Prisma while dedicated API route exists for same data.
- **Impact:** Permission/business rule changes can be applied in one path and missed in the other.
- **Standard:** Single source of truth / DRY architecture principle.
- **Recommendation:** Route all coach nutrition reads through one contract (prefer shared service or single API path).
- **Suggested command:** `/normalize`

### H3 — Competing metric-entry flows without strong wayfinding
- **Location:** `src/app/user/nutrition/*`, `src/app/user/calendar/*`, `src/app/user/(dashboard)/GettingStartedCard.tsx`
- **Category:** Information Architecture / Flow Coherence
- **Description:** Both Calendar and Nutrition can serve daily metrics capture, but guidance is implicit.
- **Impact:** Users split behavior unpredictably, increasing confusion and support burden.
- **Standard:** UX consistency and mental model alignment.
- **Recommendation:** Define canonical primary entry (e.g., Nutrition for macros, Calendar for quick daily check), then signpost both contexts.
- **Suggested command:** `/clarify`

### H4 — Read-only semantics ambiguity in coach nutrition
- **Location:** `src/app/user/coach/clients/[clientId]/nutrition/page.tsx`, `src/app/user/nutrition/NutritionClient.tsx`
- **Category:** Permissions UX
- **Description:** View is declared `readOnly`, but week targets remain editable via `canSetTargets`.
- **Impact:** Coaches may misunderstand permitted actions; future contributors may misinterpret policy.
- **Standard:** Principle of least surprise.
- **Recommendation:** Rename state to explicit capability flags (e.g., `canEditActuals`, `canEditTargets`) and show UI copy clarifying mode.
- **Suggested command:** `/clarify`

## Medium Severity

### M1 — Missing explicit success confirmation on nutrition edits
- **Location:** `src/app/user/nutrition/NutritionClient.tsx`
- **Category:** Interaction Feedback
- **Impact:** Increases repeated edits / duplicate submissions.
- **Recommendation:** Inline “Saved” status per day row or global snackbar.
- **Suggested command:** `/polish`

### M2 — Week label lacks year context
- **Location:** `src/app/user/nutrition/NutritionClient.tsx`
- **Category:** Temporal clarity
- **Impact:** Ambiguous navigation around year transitions.
- **Recommendation:** Include year in week label (e.g., `Jan 2026 · Week 2`).
- **Suggested command:** `/clarify`

### M3 — Dense numeric editor lacks stronger input validation messaging
- **Location:** `src/app/user/nutrition/NutritionClient.tsx`
- **Category:** Data quality
- **Impact:** Invalid/implausible entries can slip in unnoticed.
- **Recommendation:** Add field-level constraints and helper/error text for outlier values.
- **Suggested command:** `/harden`

### M4 — Small icon-only controls in dense cards may reduce mobile usability
- **Location:** Nutrition daily cards and multiple list card actions
- **Category:** Accessibility / Touch targets
- **Impact:** Harder interaction for users with motor constraints or on smaller screens.
- **Recommendation:** Ensure 44x44 equivalent targets and stronger focus/hover states.
- **Suggested command:** `/adapt`

### M5 — Onboarding finish catch block is non-specific
- **Location:** `src/app/user/onboarding/OnboardingWizard.tsx`
- **Category:** Error handling
- **Impact:** Users can stall without actionable guidance when unknown failure occurs.
- **Recommendation:** Surface a generic but visible retry message.
- **Suggested command:** `/harden`

### M6 — Getting Started metric step links to Calendar only
- **Location:** `src/app/user/(dashboard)/GettingStartedCard.tsx`
- **Category:** Journey cohesion
- **Impact:** Nutrition feature discoverability reduced for new users.
- **Recommendation:** Either route to Nutrition or clarify Calendar as “quick metrics.”
- **Suggested command:** `/onboard`

### M7 — Coach/client dual-domain switching has hidden environment behavior
- **Location:** `src/components/CustomAppBar.tsx`
- **Category:** Flow predictability
- **Impact:** Dev/prod switching behavior differs (cookie fallback vs host switch), can confuse QA and onboarding docs.
- **Recommendation:** Add in-app helper text/tooltips for mode switch context.
- **Suggested command:** `/clarify`

### M8 — Nutrition color tokens are hard-coded
- **Location:** `src/app/user/nutrition/NutritionClient.tsx`
- **Category:** Theming consistency
- **Impact:** Harder theme evolution and potential contrast mismatch.
- **Recommendation:** Move macro colors to theme tokens.
- **Suggested command:** `/normalize`

### M9 — History/count derivation in check-ins is brittle to edge conditions
- **Location:** `src/app/user/check-in/CheckInClient.tsx`
- **Category:** Data presentation integrity
- **Impact:** Potential off-by-one mismatch when current-week record assumptions change.
- **Recommendation:** Return already-separated current/history from API.
- **Suggested command:** `/harden`

## Low Severity

### L1 — No “today” highlight in nutrition daily list
- **Recommendation:** Visual affordance for current day row.

### L2 — Future-week editing lacks explanatory cue
- **Recommendation:** Small helper text when editing non-current week.

### L3 — Weekly summary is macro-only (steps/sleep omitted)
- **Recommendation:** Add optional secondary summary or clarify nutritional scope.

### L4 — Card microcopy consistency varies across modules
- **Recommendation:** Copy pass for verbs and tone alignment.

### L5 — Some empty states are functional but low-guidance
- **Recommendation:** Add “next best action” CTA in all empty states.

### L6 — “Set week targets” dialog field naming mixes “sleep mins” and “sleep”
- **Recommendation:** Standardize labels.

### L7 — Some key flows rely on implicit icon meanings
- **Recommendation:** Add tooltips/aria labels where missing.

### L8 — Activity chronology assumptions may not match user expectations
- **Recommendation:** Explicitly communicate ordering strategy in workouts/plans lists.

---

## Patterns & Systemic Issues
1. **Feedback gaps on async actions** (save/update flows often lack explicit success/error UX).
2. **Capability semantics encoded as prop combinations rather than explicit policy terms** (e.g., read-only + canSetTargets).
3. **Duplicate pathway surfaces for similar jobs-to-be-done** without teaching users a primary path.
4. **Some architecture duplication between server page loaders and API route contracts.**

## Positive Findings
- Clear top-level IA with role-aware navigation and client-focus mode.
- Strong onboarding gating that prevents half-configured states from leaking into core app.
- Workout and check-in flows are generally robust and logically staged.
- Coach-client relationship model is thoughtfully integrated into both settings and navigation.
- Feature breadth is substantial without collapsing into one monolithic screen.

## Recommendations by Priority

### Immediate (now)
1. Add visible save/error UX for nutrition day/weekly target actions.
2. Clarify coach nutrition permissions in UI copy and prop naming semantics.
3. Unify coach nutrition data retrieval path.

### Short-term (this sprint)
1. Define canonical metrics entry flow and cross-link copy (Calendar vs Nutrition).
2. Improve onboarding/checkpoint messaging for failed submissions.
3. Increase touch-target/accessibility resilience in dense interactive cards.

### Medium-term (next sprint)
1. Standardize theme tokens in nutrition and related metric visuals.
2. Normalize temporal labels and contextual cues (year/week/today emphasis).
3. Tighten API contracts so presentation layers avoid fragile derivations.

### Long-term
1. Add lightweight guided tour explaining where to log what (training vs health vs check-ins).
2. Instrument funnel analytics for first-week retention through onboarding milestones.

## Suggested Commands for Follow-up Fixes
- `/harden`: save/error states, validation resilience, API contract hardening.
- `/clarify`: flow copy, permission semantics, pathway signposting.
- `/normalize`: theming tokens + architectural consistency.
- `/onboard`: first-week experience and education.
- `/adapt`: touch targets and responsive interaction polish.
- `/polish`: microcopy and small interaction refinements.
