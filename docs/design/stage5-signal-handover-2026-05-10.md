# Stage 5 Signal Handover — 2026-05-10

## Shipped in this pass

### Signal coach check-ins desk

- Commit: `a8aa3b5` `Build Signal coach check-ins desk slice`
- Routes:
  - `/user/coach/check-ins`
  - `/user/coach/clients/[clientId]/check-ins`
- The flagged path now uses the planning surface and a rebuilt desk layout instead of the older utility card shell.
- Legacy rendering remains intact when `signalUiEnabled` is off.

### Signal coach check-in template workspace

- Commit: `738dfcd` `Build Signal coach check-in template slice`
- Route:
  - `/user/coach/check-in-template`
- The flagged path now uses the planning surface and a Signal workspace shell around the existing drag/drop editor.
- The template-builder internals are intentionally preserved in this slice; this is a shell/composition pass, not a ground-up editor rebuild.

### Signal coach learning plans library

- Commit: `18e4e0f` `Build Signal coach learning plans slice`
- Route:
  - `/user/coach/learning-plans`
- The flagged path now uses the planning surface and a rebuilt library/list presentation for coach learning plans.
- The create dialog and navigation into the existing plan editor route are preserved.

### Signal coach learning plan editor workspace

- Intended commit: `Build Signal coach learning plan editor slice`
- Route:
  - `/user/coach/learning-plans/[planId]`
- The flagged path now uses the planning surface and a Signal editor shell around the existing learning plan editor.
- The step and assignment editor behavior is intentionally preserved in this slice; this is a shell/composition pass.

### Signal user progress route

- Commit: `Build Signal progress route slice`
- Route:
  - `/user/progress`
- The app now has a real progress route for both flag states instead of only surfacing progress widgets on `/user`.
- The flagged path uses the planning surface and a dedicated Signal progress composition around the existing chart and tracked-lift primitives.
- The legacy path stays on the existing MUI/dashboard primitives so `/user/progress` works during the side-by-side cutover.

### Signal plan-create entry route

- Commit: `Build Signal plan create entry slice`
- Route:
  - `/user/plan/create`
- The flagged path now uses the planning surface and a rebuilt Stage 5 entry composition for starting plan creation.
- The legacy path stays on the existing MUI card list, and the downstream template, AI, upload, and editor flows remain the current implementation.

### Signal plan-import workspace

- Commit: `Build Signal plan upload slice`
- Route:
  - `/user/plan/upload`
- The flagged path now uses the planning surface and a rebuilt import workspace for the existing spreadsheet-to-editor flow.
- The legacy path stays on the current MUI wizard, and the importer logic remains unchanged.

### Signal workout route list views

- Intended commit: `Build Signal workout slice`
- Route:
  - `/user/workout`
- The workout route already had `SignalSurface(gym)` wrapping and `SignalExerciseSlide` for the exercise logging screen. This slice adds gym-surface Signal rendering to all four upstream navigation views.
- `PlansListView` — gym dark plan rows with chartreuse active-plan indicator and toggle dot.
- `WeeksListView` — gym dark week rows with done/session-count status label.
- `WorkoutsListView` — gym dark workout rows with set count or done label.
- `ExercisesListView` — gym dark exercise rows with set-completion dots, notes toggle, and Mark as complete CTA.
- All existing behavior (set active plan, complete workout, notes, add/remove exercise, date picker, long-press, snackbar dialogs) is preserved; only presentation changes when flagged.

### Signal user plan editor workspace

- Intended commit: `Build Signal plan editor slice`
- Route:
  - `/user/plan/[planId]`
- The flagged path now uses the planning surface and a Signal workspace shell around the existing plan editor.
- The reducer-driven sheet, classic, and multi-week editor internals are intentionally preserved in this slice; this is a shell/composition pass.

## What changed

- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to both check-ins list pages.
- Passed `signalEnabled` into the shared `CoachCheckInsClient` so both routes stay on one behavior path.
- Rebuilt the flagged branch inside `CoachCheckInsClient` with:
  - planning-surface hero
  - queue metrics
  - `Needs review` and `Browse archive` tabs
  - planning-style search/filter block
  - Signal list rows for check-ins
  - preserved configure-template action on the global route only
- Added focused Playwright coverage for the flagged desk route.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to the check-in-template page.
- Passed `signalEnabled` into `CheckInTemplateEditor`.
- Wrapped the flagged editor in a Signal workspace shell with:
  - planning-surface hero
  - card/input/system counts
  - builder framing and action styling
  - preserved editor behaviors and preview/save flow
- Added focused Playwright coverage for the flagged template workspace.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to the learning-plans page.
- Passed `signalEnabled` into `CoachLearningPlansClient`.
- Rebuilt the flagged list branch with:
  - planning-surface hero
  - plan/step/assignment counts
  - Signal plan rows
  - preserved new-plan dialog and FAB behavior
- Added focused Playwright coverage for the flagged learning-plans library.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to the learning-plan editor page.
- Passed `signalEnabled` into `PlanEditorClient`.
- Wrapped the flagged editor in a Signal workspace shell with:
  - planning-surface hero
  - steps/assignments/completed counts
  - editor framing and action styling
  - preserved step, assignment, and asset flows
- Added focused Playwright coverage for the flagged learning-plan editor workspace.
- Added a new `/user/progress` page.
- Reused the existing user metrics, events, active-plan stats, and tracked-e1RM settings data already feeding the dashboard.
- Added a dedicated legacy progress branch with:
  - app-bar title
  - stat cards for latest weight, tracked lifts, weekly training, and current block
  - existing `DashboardChart`
  - existing `E1rmProgressCard`
- Added a dedicated flagged Signal progress branch with:
  - planning-surface hero
  - four progress summary cells
  - dedicated metrics and tracked-lifts panels
  - settings/home actions
- Kept settings reads to a single query on this route and derived `signalEnabled` from the parsed settings object instead of issuing a second flag lookup.
- Added focused Playwright coverage for the flagged progress route.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to `/user/plan/create`.
- Passed `signalEnabled` through `PlanBuilderWithContext` into `PlanBuilder`.
- Rebuilt the flagged `EntryScreen` branch with:
  - planning-surface hero
  - four Stage 5 start-path cards
  - preserved test ids and click targets for template, AI, upload, and scratch
  - desktop two-column grid and mobile single-column stack
- Left template browser, AI form, upload route, import hydration, and editor flow behavior unchanged in this slice.
- Added focused Playwright coverage for the flagged plan-create entry route.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to `/user/plan/upload`.
- Passed `signalEnabled` into `UploadAndEdit`.
- Rebuilt the flagged upload shell with:
  - planning-surface hero
  - custom three-step import rail
  - two-column upload/status composition on desktop
  - Signal-styled review cards for new exercises
  - Signal-styled summary stats and panels before the editor handoff
- Extracted shared render helpers for:
  - upload picker
  - paste field
  - import status panel
- Preserved all importer state and transitions:
  - upload or paste
  - AI parse/chunk/retry flow
  - review new exercises
  - summary before the editor
  - `sessionStorage` handoff back into `/user/plan/create`
- Added focused Playwright coverage for the flagged plan-import route.
- Threaded `signalEnabled` from `/user/plan/[planId]/page.tsx` into `PlanTable`.
- Added a Signal hero above the plan editor with:
  - planning-surface card
  - mono "Plan editor" label
  - condensed plan name
  - weeks / workouts / exercise-slot metric pills
- Centered the editor body inside a max-width planning container when flagged, keeping the existing classic/sheet/multi-week views, view-toggle controls, save bar, and snackbar untouched.
- Added focused Playwright coverage for the flagged plan editor route.

## Preserved behavior

- unread/new queue still comes from `listCoachCheckIns({ unread: true })`
- browse/search still uses the same `listCoachCheckIns()` route and filters
- global route still exposes `Configure template`
- client-locked route still defaults to archive/browse mode
- review links still navigate to the existing review detail routes
- template load/save/delete still use the existing `/api/coach/check-in-template` flow
- drag/drop editor behavior remains the existing implementation
- preview flow remains the existing implementation
- learning-plan creation still uses the existing `/api/coach/learning-plans` POST flow
- list items still navigate into the existing `/user/coach/learning-plans/[planId]` editor route
- editor mutations still use the existing learning-plan, step, and assignment API routes
- step and assignment flows remain the existing implementation
- progress charts still use the existing `DashboardChart` implementation
- tracked-lift rendering still uses the existing `E1rmProgressCard` implementation
- the progress route still relies on `trackedE1rmExercises` in `User.settings`; the Stage 5 `progress.focusExerciseIds` schema addition remains deferred
- plan creation still uses the existing `PlanBuilder` state machine: `entry`, `templates`, `ai`, `editor`
- spreadsheet import still routes through `/user/plan/upload` and hydrates the editor from `sessionStorage`
- coach-for-client plan creation still uses the existing `forUserId` authorization and target-user lookup
- spreadsheet import chunking, clarification prompts, enrichment, and retry behavior are unchanged
- the summary step still uses the existing muscle-volume calculation and editor handoff
- workout navigation still uses the existing `useWorkoutSession` state machine and its plan/week/workout/exercise drill-down
- set active plan still uses the existing `/api/plan/active` PATCH flow
- complete workout still uses the existing `handleCompleteWorkout` with the long-press date picker
- add/remove exercise dialogs (`ExercisePickerDialog`, `AddExerciseConfigDialog`) remain the existing implementation
- plan editing still uses the existing reducer (`useWorkoutEditor` / `WorkoutEditorProvider`) and its sheet/classic/multi-week presentations
- the plan editor's view-mode toggle, arrange mode, zoom controls, rep-range validation, fixed save button, and save snackbar remain the existing implementation

## Verification completed

- `rtk npm run build` in `apps/web`
- `BASE_URL=http://127.0.0.1:3003 npx playwright test tests/e2e/coach-review.test.ts --project=chromium --grep "flagged check-in list shows the Signal planning desk"`
- `BASE_URL=http://127.0.0.1:3004 npx playwright test tests/e2e/redesign-regression.test.ts --project=chromium --grep "flagged coach sees the Signal check-in template workspace"`
- `BASE_URL=http://127.0.0.1:3005 npx playwright test tests/e2e/learningPlans.test.ts --project=chromium --grep "flagged coach sees the Signal learning plans library"`
- `BASE_URL=http://127.0.0.1:3006 npx playwright test tests/e2e/redesign-regression.test.ts --project=chromium --grep "flagged coach sees the Signal learning plan editor workspace"`
- `BASE_URL=http://127.0.0.1:3007 npx playwright test tests/e2e/progress.test.ts --project=chromium --no-deps`
- `BASE_URL=http://127.0.0.1:3008 npx playwright test tests/e2e/planCreate.test.ts --project=chromium --no-deps`
- `BASE_URL=http://127.0.0.1:3009 npx playwright test tests/e2e/planUpload.test.ts --project=chromium --no-deps`
- `BASE_URL=http://localhost:3010 npx playwright test tests/e2e/planEditor.test.ts --project=chromium`
- `BASE_URL=http://localhost:3010 npx playwright test tests/e2e/workoutSignal.test.ts --project=chromium`

## Known residuals

- `tests/e2e/coach-review.test.ts` still contains the older legacy photo-dialog navigation failure documented in the previous handover.
- That failure is unrelated to this new Signal desk slice.
- The Signal progress E2E intentionally accepts either the chart or the route-level empty-state copy because the shared remote DB does not guarantee metric history for the test user.

## Recommended next slice

Next coach-only routes still outside the newer Signal pattern:

- no major coach route from the Stage 5 coach set remains on the old shell

Likely next Stage 5 slice outside the coach routes:

- `/user/workout`
- `/user/check-in`

Most natural next slice now:

- `/user/check-in`

Reason:

- the main coach screens called out in the handover are now covered
- `/user/progress`, `/user/plan/create`, `/user/plan/upload`, `/user/plan/[planId]`, and the full `/user/workout` drill-down (plans → weeks → workouts → exercises → exercise slide) now all use Signal surfaces
- `/user/check-in` is the next major user surface using the calm palette, and it is straightforward to wrap with a shell/composition pass since the existing `CheckInForm` is already identified as reusable in the review doc

## Handover Prompt

Use this as the next-agent handoff prompt:

```text
Continue Stage 5 Signal from the current repo state.

First read:
- docs/design/stage5-signal-handover-2026-05-10.md
- docs/design/stage5-signal-review.md

Current shipped state to preserve:
- Signal remains side-by-side behind User.settings.signalUiEnabled.
- Do not reintroduce cached loadSignalFlag behavior; current live lookup is intentional.
- Preserve route-level SignalSurface usage and avoid duplicate settings reads when a route already needs settings.
- Coach slices already shipped: home, client overview, clients roster, check-in review, check-ins desk, check-in template, learning plans list, learning plan editor.
- User slices already shipped: progress route, plan create entry, plan upload workspace, plan editor workspace, workout route (all four list views + existing exercise slide).

Most natural next slice:
- /user/check-in

Constraints:
- Preserve existing reducer/editor behavior unless the slice explicitly requires otherwise.
- Prefer shell/composition rebuilds first; do not mix schema or business-logic rewrites into a UI slice unless absolutely necessary.
- Add focused Playwright coverage for the flagged route you touch.
- Update docs/design/stage5-signal-handover-2026-05-10.md when done.
- Commit atomically and stop any local servers after verification.

Known repo notes:
- Existing repo-wide lint warnings are tolerated by pre-commit.
- apps/web/playwright/ is an untracked artifact that already exists; do not commit it.
```
