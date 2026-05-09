# Stage 5 "Signal" — design review against current Forti repo

Source: `Forti - Stage 5 Signal` handoff bundle (Direction B refined). Review only — no code changes.

## What the design is

A complete restyle (not just a paint job): three surface palettes (dark gym / bone planning / warm-bone calm), three fonts (Inter Tight / Archivo Narrow / JetBrains Mono), one chartreuse "signal" used ≤2x per screen, sentence-case everywhere, hairline borders, no zebra, no all-caps. Nine key screens specified — Home, Workout logging, Finish, Progress, Plan create entry, Plan editor, Coach Home, Client Overview, Check-in review — plus alternate states for each.

## Implementation risks

1. **Tri-palette + per-route surface switching.** Current `colorTokens` (`apps/web/src/lib/theme.ts`) is a single blue-primary MUI theme. Signal mandates dark gym, bone planning, warm-bone calm — different per route family. MUI v7's `ThemeProvider` can do nested themes, but every `Chip` / `Button` / `Paper` default needs overrides (esp. `text-transform: uppercase` on `Chip` / `Button` defaults, which the spec explicitly forbids in production CSS).
2. **Home is a behaviour change, not a reskin.** `apps/web/src/app/user/page.tsx` is a stat/chart dashboard (`DashboardChart`, `DashboardCards`, `E1rmProgressCard`); Signal makes it a command centre with one primary CTA and no charts. This is deletion + replacement, not styling.
3. **Mode switcher conflicts with subdomain routing.** `CustomAppBar` uses `isCoachDomain` + `crossDomainUrl` to swap modes across hosts. Signal pictures an in-app pill in the sidebar/top bar. Either we collapse the subdomain split (architectural change) or the pill is purely cosmetic and still cross-navs externally — needs decision before building.
4. **Coach Home doesn't exist.** Routes under `apps/web/src/app/user/coach/` are `clients/`, `check-ins/`, `learning-plans/`, `check-in-template/` — no landing page. The "task inbox" (Submitted check-ins + Plan maintenance) is a new page with a new aggregation query; "Plan maintenance" semantics ("block ends in N days", etc.) need a definition before we query.
5. **Single-CTA workout logging.** Spec collapses Log Set + Up Next + Next into one primary "Next exercise → X". `useWorkoutSession.ts` (~20 KB) and `ExerciseSlide.tsx` (~16 KB) own this flow — semantic change to advance / skip-with-no-log (long-press), not just visual. Grouped exercises and dropsets need verification.
6. **Active-set glow on reps cell only.** Requires the editor to know which set/cell is "active" globally, not per-input — currently focus is implicit.
7. **Nutrition removed from primary nav.** The design itself flags this as a deviation from Forti rules; CLAUDE.md confirms Nutrition is a top-level surface. Don't ship without re-adding — treat as a known gap, not guidance to follow.
8. **Custom fonts** (Inter Tight, Archivo Narrow, JetBrains Mono) require `next/font` integration with `font-display: swap` and a CLS budget; mono tabular-nums must be enforced via `font-variant-numeric` everywhere a number is logged or compared.

## Missing data / schema / API support

- **Focus exercises (≤5 per user)** for Progress tab — no field in `User` / `Exercise` / `WorkoutExercise`. Either add to `User.settings` JSON (precedent: `parseDashboardSettings`) or a new join table. Decide before building Progress.
- **"Allow plan editing" toggle + lock banner** — verify whether `Plan` already has a coach-lock flag (CLAUDE.md mentions coach-locked workouts, but the field name and current usage need confirming).
- **Check-in "read at" / "read 14h ago" timestamp on coach reply** — `WeeklyCheckIn` likely doesn't have a feedback-read timestamp; the design's "Sent · read 14h ago" cue requires a new column or tracked event.
- **"New PRs" count on finish summary** — derivable from `ExerciseSet` history but not currently surfaced; needs a query.
- **"Block ends Friday" / "Plan next block" cue on Client Overview** — derivable from `Event` (`BlockEvent`) + plan dates; needs aggregation.
- **Coach Home inbox feed** — new endpoint that aggregates `WeeklyCheckIn` (status=submitted) + plan-maintenance triggers.
- **Mobile last-3-sessions panel** — likely already supported by the e1rm/exercise history endpoints (`E1rmHistoryPoint`, `getTodayBestE1rm`); confirm shape covers `date · top set · volume`.

## Reusable as-is (or with small style swaps)

- `useWorkoutEditor` reducer + `WorkoutEditorProvider` (state machine intact)
- `useWorkoutSession.ts` core, with surgical changes for the merged CTA
- `E1rmSparkline.tsx`, `E1rmHistorySection.tsx`, `exerciseHistoryUtils.ts` — sparkline matches Signal's chart language with minor restyle
- `WeightInput`, `Stopwatch` / `StopwatchContext`, `PlateCalculatorSheet`, `WorkoutCompletionModal`
- `CheckInForm`, `PhotoCaptureModal`, `useCheckInAutosave`, `useCheckInPayload`
- `PlanTable`, `PlanSheetView`, `PlanMultiWeekTable` — keep reducer, swap presentation
- `NotificationsProvider`, existing `/user/notifications` page (design notes notifications are spec'd-but-not-yet-designed)
- All API contracts / endpoints — design is overwhelmingly UI-side

## Needs replacement / heavy rewrite

- `CustomAppBar` (MUI AppBar + Drawer) → SignalSidebar (220px desktop) + SignalBottomNav (4-item mobile) + mode-switch pill
- `colorTokens`, theme defaults, font stack
- `/user/page.tsx` (Dashboard → command centre)
- `DashboardChart`, `DashboardCards`, `E1rmProgressCard` (likely retired)
- New: Coach Home inbox, Plan creation entry (4-card grid), Client Overview tab landing if it doesn't already render this layout, focus-exercise picker

## Safest implementation slices (in order)

1. **Foundation, no behaviour change** — add Signal theme + fonts + token module behind a per-route opt-in (e.g. dark surface only on `/user/workout/**`). Lets us ship token wiring and font loading without touching screens.
2. **Workout logging reskin** — 38px cells, active-cell glow, previous-3-sessions panel, tappable exercise title. CTA merge is the only behavioural change; gate it behind a flag so old behaviour stays available.
3. **Check-in review "calm" surface** — coach-only, lowest blast radius, all data already exists.
4. **Plan editor reskin** — keep reducer, swap presentation; "Allow plan editing" toggle wired to existing field if present, otherwise new field.
5. **Coach Home inbox** — new page + aggregation endpoint; uses data we already have.
6. **Home command centre** — replaces dashboard. Defer until 1–5 prove the system. Decide policy on retiring vs. keeping the dashboard.
7. **Progress focus exercises** — depends on schema decision (settings JSON vs. new table).
8. **Mode-switch pill / nav restructure** — last, depends on subdomain decision.

## Test coverage to plan for

- **E2E (Playwright fixtures):** workout flow on Signal — single-CTA advance, long-press skip, active-set glow, finish-clean vs. finish-with-unlogged-sets sheet; check-in submit + coach review + adjustments applied; plan editor edit + lock toggle; coach Home counts move correctly; Progress focus pick / unpick; cross-mode notification → mode switch.
- **Unit:** `useWorkoutSession` advance after CTA merge (incl. grouped exercises, dropsets); focus-exercise persistence; tabular-num enforcement on numeric cells; theme/token snapshot.
- **A11y:** contrast assertions (the spec gives concrete ratios — bake them in as tests against tokens); keyboard focus outline present on every interactive; status never colour-only (assert dot + label).
- **Visual regression:** at minimum the 9 key screens at mobile + desktop breakpoints.

## Clarifications to resolve before coding

1. Subdomain split for coach mode — keep, or collapse so the in-app pill becomes real?
2. Nutrition: design drops it from primary nav with a self-flagged caveat. Confirm we keep it as a top-level item (per Forti rules) for the actual implementation.
3. Is this replacing the current MUI design wholesale, or running side-by-side behind a flag during the cutover?
4. "Focus exercises" storage: `User.settings` JSON or new table?
5. `Plan` already has a coach-edit lock field, or does it need adding?
6. Read receipts on coach replies — add `feedbackReadAt` to `WeeklyCheckIn`, or drop the "read 14h ago" cue?
7. Does the Home "Resume Workout" state need building (in-progress card variant) for v1, or is "Start next planned" enough?

## Decisions (answers to the clarifications above)

1. **Subdomain split — collapse.** The in-app mode pill becomes real; coach and user surfaces share a host. Plan a migration for `isCoachDomain` / `crossDomainUrl` in `CustomAppBar` and any auth/cookie scoping that depends on the split.
2. **Nutrition — keep top-level for now.** Re-add to primary nav before ship; ignore the design's "removed" framing.
3. **Cutover — side-by-side behind a flag.** Old MUI surfaces stay live during build-out; route to Signal screens via a feature flag so we can ship slices without committing to a big-bang switch.
4. **Focus exercises — `User.settings` JSON for v1.** Field: `progress.focusExerciseIds: number[]`. Enforce max 5 in the contract and validate that referenced exercises are visible to the user.
5. **Plan coach-edit lock — does not exist; treat as a required schema/API addition.** Likely shape: a `clientCanEdit: boolean` on `Plan` (or an equivalent permission model). Do **not** block visual work on the Plan editor while this lands — design with the toggle stubbed.
6. **Coach reply read receipts — drop for v1.** Use `coachReviewedAt` (or equivalent "Feedback sent" timestamp) instead of "read 14h ago".
7. **Home Resume Workout — required in v1.** It is a core product rule, not optional. Build both states (Resume in-progress and Start next planned) on first pass.
8. **Messages removed from Coach Home.** No chat surface; do not add a Messages tab or affordance anywhere in coach navigation.
