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

### Signal user check-in route

- Commit: `Build Signal check-in slice`
- Route:
  - `/user/check-in`
- The flagged path now uses the calm surface and a rebuilt calm-palette composition around the existing `CheckInForm`, completion view, and history.
- Calm hero: mono "Check-in" label, condensed "Weekly check-in" heading, current week date in mono.
- Current-week section: four states (template form, editing submitted, completed view, legacy form) each wrapped in a calm-surface card; `CheckInForm` and `CheckInDetails` + `MetricsSystemCard` internals are preserved unchanged.
- History section: `SignalHistoryRow` — calm expandable rows with week label, submitted date, and a chevron toggle; expands to show `CheckInDetails` with photo viewer.
- Push-notification prompt and error alerts are preserved in both flag states.
- The legacy path stays on the existing MUI Paper + `CheckInHistoryCard` accordion layout.

### Signal user home command centre

- Intended commit: `Wrap Signal user home in SignalSurface(gym) and add E2E coverage`
- Route:
  - `/user`
- The home command centre (`SignalHome`) was originally shipped in commit `eda7d53` ("Slice 6: My Training command-centre Home"). This slice formalises it under the standard SignalSurface pattern and adds focused Playwright coverage.
- The flagged path now wraps `SignalHome` in `SignalSurface(gym)` so the route exposes a `[data-signal-surface="gym"]` attribute alongside the gym ThemeProvider, matching every other Signal slice.
- `SignalHome` internals (hero / week strip / today's metrics tiles / block progress rule) are preserved unchanged.
- The legacy path keeps `AppBarTitle` + the existing `DashboardCards` / `DashboardChart` / `E1rmProgressCard` composition.

### Signal shell — close notifications + bell-link gaps

- Intended commit: `Wire Signal shell notifications and add focused E2E coverage`
- Routes affected: every flagged route (the shell wraps the entire flagged tree from `protected-layout.tsx`).
- The Signal shell stack (`SignalAppShell` / `SignalSidebar` / `SignalBottomNav` / `SignalTopBar` / `SignalModeSwitch`) was already built and wired into `protected-layout.tsx` via `SignalShellSwitch`. This slice closes three concrete gaps:
  - The `hasUnreadNotifications` prop on `SignalAppShell` was always undefined in production because `SignalShellSwitch` didn't read it. The badge dot never showed. Now `SignalShellSwitch` reads `useNotifications()` and threads `unreadCount > 0` through.
  - The bell in `SignalTopBar` was a `<button>` with no click handler — dead. The bell didn't exist at all in `SignalSidebar`, so the desktop chrome had no path to `/user/notifications`. New shared `SignalNotificationsBell` component renders a `<Link href="/user/notifications">` with the chartreuse dot when there's unread mail; it's used by both `SignalTopBar` (mobile) and the new `SignalSidebar` header (desktop).
- The `/dev/signal-shell` harness already passed `hasUnreadNotifications` directly so it's unaffected.
- `SignalShellSwitch` now depends on `useNotifications()` — that's safe because `protected-layout.tsx` already wraps the switch in `NotificationsProvider`.

### Signal user calendar route

- Intended commit: `Build Signal calendar slice`
- Route:
  - `/user/calendar`
- The flagged path now uses the planning surface and a Signal hero + segmented view toggle around the existing FullCalendar widget and a rebuilt planning-surface `WeekListView`.
- Planning hero: mono "Calendar" label + condensed "Schedule" heading.
- View toggle: when flagged, renders as a planning-palette segmented pill with "Month" / "Weeks" buttons that mirror the `SignalModeSwitch` styling (ink-on-surface for active, mono mid-ink for inactive). The legacy MUI `ToggleButtonGroup` stays when the flag is off.
- `WeekListView` Signal branch: planning-surface week cards with mono `W{n}` labels, condensed heading-style date ranges, chartreuse `THIS WEEK` mono pill on the current week, and a chartreuse left border replacing the legacy MUI `borderLeft: 4px ${blockColor}` indicator.
- The FullCalendar grid itself is intentionally not deeply restyled in this slice — it's a 3rd-party widget with its own CSS and would be a multi-day rebuild. It still picks up the planning ThemeProvider (so `Today`, `prev/next` toolbar buttons render with the planning palette's primary color) and sits inside the planning hero/toggle chrome.
- The bottom drawer (event details, event creation, day metric form), right drawer (events / blocks list), and FAB buttons are unchanged in this slice — they continue to use MUI components and pick up the planning ThemeProvider for their colors.

### Signal user notifications route

- Intended commit: `Build Signal notifications slice`
- Route:
  - `/user/notifications`
- The flagged path now uses the calm surface and a rebuilt inbox composition for the existing notifications provider instead of the older plain MUI list.
- The legacy path stays on the current MUI list, and the notification fetch / mark-read / mark-all-read behavior is preserved unchanged.

### Signal user settings route

- Intended commit: `Build Signal settings slice`
- Route:
  - `/user/settings`
- The flagged path now uses the planning surface and a rebuilt settings composition for the main user settings route instead of the older single-column MUI paper stack.
- The legacy path remains intact, and the coach-domain settings route intentionally stays on the current coaching-settings presentation in this slice.

### Signal user learning plans route

- Intended commit: `Build Signal user learning plans slice`
- Route:
  - `/user/learning-plans`
- The flagged path now uses the planning surface and a rebuilt assigned-learning-plans composition instead of the older plain accordion/card list.
- The legacy path remains intact, and the client assignment fetch / step completion behavior is preserved unchanged.

### Signal user supplements route

- Intended commit: `Build Signal supplements slice`
- Route:
  - `/user/supplements`
- The flagged path now uses the planning surface and a rebuilt protocol-tracker composition instead of the older plain active/history list.
- The legacy path remains intact, and the supplements gate plus CRUD/version-history behavior are preserved unchanged.

### Signal user feedback route

- Intended commit: `Build Signal feedback slice`
- Route:
  - `/user/feedback`
- The flagged path now uses the calm surface and a rebuilt feedback form composition instead of the older plain centered MUI form.
- The legacy path remains intact, and the submit + upload behavior is preserved unchanged.

### Signal user nutrition route

- Intended commit: `Build Signal nutrition slice`
- Route:
  - `/user/nutrition`
- The flagged path now uses the planning surface and a rebuilt nutrition composition around the existing weekly summary, week targets, and daily log flows.
- The legacy path remains intact, and the metrics fetch / template fetch / day edit / week target save behavior is preserved unchanged.
- Mobile scrollability is intentional in the Signal shell; the flagged page keeps the content in the main document flow so the week navigator and daily log remain reachable on smaller screens.

## What changed

- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to both check-ins list pages.
- Passed `signalEnabled` into the shared `CoachCheckInsClient` so both routes stay on one behavior path.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to `/user/nutrition`.
- Split the route into a server wrapper plus `NutritionClient` so the Signal flag is resolved at the route level while the legacy branch keeps the existing nutrition app-bar wiring.
- Kept the nutrition metrics, week template, and daily editor behavior intact while rebuilding the flagged presentation as a Signal planning surface that stays scrollable on mobile.
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
- Added route-level `loadSignalFlag()` + `SignalSurface(calm)` to `/user/check-in`.
- Passed `signalEnabled` into `CheckInClient`.
- Added `SignalHistoryRow` as a module-level client component in `CheckInClient.tsx` with:
  - calm-surface card container
  - week label + submitted date
  - expand/collapse toggle with chevron animation
  - `CheckInDetails` and `PhotoViewerDialog` preserved inside expanded state
- Rebuilt the flagged branch inside `CheckInClient` with:
  - calm-palette hero (mono label + condensed heading + week date)
  - all four current-week states (loading, template form, editing, completed, legacy form) in calm-surface cards
  - Signal history rows replacing the MUI Accordion history list
  - Load more as a plain calm-styled button
- Added focused Playwright coverage for the flagged check-in route.
- Wrapped the `/user` page's flagged branch in `SignalSurface(gym)` and lifted the `signalUiEnabled` check up to the always-wrap pattern used by every other Signal route.
- Left the `SignalHome` component itself unchanged — its internal gym-palette container, `signalFontVariablesClassName`, hero / week strip / metric tiles / block progress rule are preserved as shipped in `eda7d53`.
- Added focused Playwright coverage for the flagged user home route.
- Added `SignalNotificationsBell` — a shared gym-palette `<Link>` to `/user/notifications` with an optional chartreuse dot, used by both `SignalTopBar` (mobile) and `SignalSidebar` (desktop header).
- `SignalTopBar` now uses `SignalNotificationsBell` in place of the dead `<button>`. `SignalSidebar` accepts `hasUnreadNotifications` and renders the bell next to the wordmark in a flex row.
- `SignalAppShell` forwards `hasUnreadNotifications` into `SignalSidebar` (it already forwarded it to `SignalTopBar`).
- `SignalShellSwitch` now reads `useNotifications()` and passes `hasUnreadNotifications: unreadCount > 0` into `SignalAppShell`.
- Added focused Playwright coverage for the Signal shell verifying sidebar, mode pill, and bell click navigation.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to `/user/calendar`.
- Threaded `signalEnabled` from `page.tsx` into `Calendar` and from there into `WeekListView`.
- Added a planning-surface hero (mono "Calendar" + condensed "Schedule") and a planning-palette segmented "Month / Weeks" pill in `Calendar.tsx`.
- Added a Signal branch to `WeekListView.tsx` that renders planning-palette week cards with mono `W{n}` labels, chartreuse `THIS WEEK` indicator, and event names in inkMid.
- Adjusted FullCalendar / WeekListView grid height calc to subtract `SIGNAL_HERO_HEIGHT` when flagged.
- Loosened `currentWeekRef` to `useRef<HTMLElement>(null)` so it can attach to the Signal `<button>` row or the legacy `<Box>` row without a hack cast.
- Added focused Playwright coverage for the flagged calendar route.
- Added route-level `loadSignalFlag()` + `SignalSurface(calm)` to `/user/notifications`.
- Split the route into a server wrapper plus `NotificationsClient` so the Signal flag is resolved at the route level while the legacy branch keeps the existing app-bar wiring.
- Rebuilt the flagged branch with:
  - calm hero (mono "Notifications" label + condensed "Your inbox" heading)
  - summary cells for unread / history / total counts
  - unread and read sections rendered as calm Signal cards
  - accessible clickable notification rows with type labels, mono timestamps, and unread pill + chartreuse dot treatment
- Preserved the existing provider-driven behavior:
  - live notifications fetch
  - mark one read on open
  - mark all read
  - route navigation via each notification URL
- Added `LearningPlanStepDelivered` handling to the notification icon mapping so that seeded and live learning-plan notifications render correctly in both flag states.
- Added focused Playwright coverage for the flagged notifications route.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to the normal `/user/settings` route while leaving the coach-domain settings route on the legacy path for now.
- Passed `signalEnabled` into `SettingsClient`.
- Rebuilt the flagged branch inside `SettingsClient` with:
  - planning-surface hero (mono "Settings" label + condensed "Preferences" heading)
  - summary cells for profile, training toggles, and coach-mode status
  - dedicated planning cards for dashboard, workout, features, custom metrics, tracked lifts, check-in timing, units, onboarding reset, Signal opt-in, export links, and coaching settings
  - preserved MUI controls and existing provider/update flows inside the new shell
- Preserved existing behavior:
  - name save flow via `/api/user/profile`
  - settings mutations via `SettingsProvider`
  - custom metrics and tracked-lift editor behavior
  - export links and coaching settings actions
- Kept the flagged route mobile-scrollable inside the Signal shell by avoiding fixed inner heights and leaving the page content to scroll within the shell `<main>` container.
- Added focused Playwright coverage for the flagged settings route that verifies the mobile route can scroll to lower settings content.
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to `/user/learning-plans`.
- Passed `signalEnabled` into `LearningPlansClient`.
- Rebuilt the flagged branch with:
  - planning-surface hero (mono "Learning plans" label + condensed "Assigned coaching" heading)
  - summary cells for assigned plans, completed steps, and locked steps
  - planning-style assignment cards with built-in progress rails and expandable step lists
  - preserved locked-step copy, release dates, completion checkboxes, and asset links inside the new shell
- Preserved existing behavior:
  - `/api/learning-plan-assignments` fetch
  - `/api/learning-plan-assignments/[assignmentId]/steps/[stepId]/complete` PATCH flow
  - per-assignment expand/collapse state
  - empty-state behavior when no assignments exist
- Added focused Playwright coverage for the flagged user learning-plans route.
- Added route-level `SignalSurface(planning)` to `/user/supplements` while preserving the existing `showSupplements` gate derived from the already-loaded settings object.
- Passed `signalEnabled` into `SupplementsClient`.
- Rebuilt the flagged branch with:
  - planning-surface hero (mono "Supplements" label + condensed "Protocol tracker" heading)
  - summary cells for active count, history count, and overall status
  - planning-style supplement cards for active and historical entries
  - preserved change-history expansion, dialog-based add/edit flow, and delete actions inside the new shell
  - a proper loading panel and a clearer Signal add-supplement CTA
- Preserved existing behavior:
  - supplements visibility gate via `showSupplements`
  - `/api/supplements` fetch
  - create / edit / delete flows
  - active vs history categorisation
  - version history timeline and diffs
- Added focused Playwright coverage for the flagged supplements route.
- Added route-level `loadSignalFlag()` + `SignalSurface(calm)` to `/user/feedback`.
- Split the route into a server wrapper plus `FeedbackClient` so the Signal flag is resolved at the route level while the legacy branch keeps the existing app-bar form.
- Rebuilt the flagged branch with:
  - calm hero (mono "Feedback" label + condensed "Tell us what broke" heading)
  - section cards for feedback type, description, screenshot upload, and submit action
  - preserved submit/reset behavior with the same `/api/feedback` POST flow
  - clearer feedback copy and a calmer success/error presentation
- Preserved existing behavior:
  - upload handling
  - form reset after success
  - error handling on failed submit
- Added focused Playwright coverage for the flagged feedback route.

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
- check-in form submission, autosave, photo capture, and custom template flows remain the existing `CheckInForm` / `useCheckInAutosave` / `useCheckInPhotos` implementations
- check-in history expansion and photo viewer remain available via `CheckInDetails` + `PhotoViewerDialog` inside `SignalHistoryRow`
- push-notification subscription flow (`usePushSubscription`) remains unchanged in both flag states
- `/user` server-side data loading (`getUserMetrics`, `getUserEvents`, `getActivePlanWithStats`, settings read) is unchanged and feeds both branches
- `SignalHome`'s server-resolved focus workout (resume vs. start) and four-state hero (no-plan / all-done / resume / start) remain the existing implementation
- legacy dashboard composition (`DashboardCards`, `DashboardChart`, `E1rmProgressCard`) is preserved exactly when the flag is off
- `SignalAppShell`, `SignalSidebar`, `SignalBottomNav`, `SignalTopBar`, `SignalModeSwitch`, `SignalIcons`, `ForftiWordmark`, the `/dev/signal-shell` harness, and the cross-domain navigation (`useCrossDomainUrl`, `modeSwitchActions`) all remain the existing implementation
- legacy `CustomAppBar` + `AppBarProvider` + `useAppBar` continue to render unchanged when the flag is off (selected by `SignalShellSwitch`)
- `NotificationsProvider`'s 60s polling and `unreadCount` API are unchanged; the Signal shell only consumes them
- calendar event creation, editing, and detail flows (`CalendarBottomDrawer`, `EventCreationForm`, `EventDetails`, `BlockOverlapConfirmationDialog`) remain the existing implementation
- calendar drawers (`CalendarBottomDrawer` bottom, `CalendarRightDrawer` right) and the Add / Events / Blocks FABs remain MUI; they pick up the planning ThemeProvider's primary color when flagged
- `useCalendarController` state machine, offline cache (`useOfflineCache`), `online` reconnect refresh, and `parsedEvents` are unchanged
- FullCalendar's date-click, drag-select, today/prev/next toolbar, multimonth view, and rrule recurrence handling remain the existing implementation
- legacy `WeekListView` rendering (MUI Box rows with elevation + borderLeft block color) is preserved when the flag is off

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
- `BASE_URL=http://localhost:3011 npx playwright test tests/e2e/checkInSignal.test.ts --project=chromium`
- `BASE_URL=http://localhost:3012 npx playwright test tests/e2e/userHomeSignal.test.ts --project=chromium`
- `BASE_URL=http://localhost:3013 npx playwright test tests/e2e/signalShell.test.ts --project=chromium`
- `BASE_URL=http://localhost:3014 npx playwright test tests/e2e/calendarSignal.test.ts --project=chromium`

## Known residuals

- `tests/e2e/coach-review.test.ts` still contains the older legacy photo-dialog navigation failure documented in the previous handover.
- That failure is unrelated to this new Signal desk slice.
- The Signal progress E2E intentionally accepts either the chart or the route-level empty-state copy because the shared remote DB does not guarantee metric history for the test user.
- The Signal calendar shell wraps FullCalendar but does not restyle FullCalendar's grid internals — that's a 3rd-party widget with its own CSS and would be a multi-day rebuild. The grid keeps its existing `.calendar.css` look. If/when product wants a fully-Signal calendar grid, it's a dedicated slice or a swap to a different calendar primitive.

## Recommended next slice

All major user and coach route surfaces, plus the shell chrome, are now on Signal palettes:

- coach: home, client overview, clients roster, check-in review, check-ins desk, check-in template, learning plans list, learning plan editor
- user: home command centre, progress, plan create entry, plan upload workspace, plan editor, workout drill-down (4 list views + exercise slide), check-in
- shell: SignalAppShell + SignalSidebar / SignalBottomNav / SignalTopBar / SignalModeSwitch / SignalNotificationsBell

Remaining Stage 5 work:

- subdomain collapse — review doc clarification 1: "Subdomain split — collapse." The mode pill currently still cross-navs via `coach.*` host on production. Collapsing the split needs middleware, cookie scoping, and `protected-layout` changes; this is more an infra slice than a UI slice.
- `Plan` `clientCanEdit` flag — review doc clarification 5: schema/API addition to back the "Allow plan editing" toggle on the plan editor.
- secondary surfaces still on MUI inside the Signal shell: `/user/calendar`, `/user/notifications`, `/user/nutrition`, `/user/supplements`, `/user/learning-plans`, `/user/feedback`, `/user/settings`, `/user/coach/clients/[clientId]/{nutrition,supplements,plans}`, `/user/coach/clients/[clientId]/check-ins/[id]`. These render inside SignalAppShell (so they get the gym/planning chrome) but their own page content is still MUI.
- the four-item BottomNav and the four-item Sidebar nav route to `home / plan / progress / more` (user) and `home / clients / library / more` (coach). `more` currently points at `/user/settings`. There's no in-shell affordance for Calendar / Check-in / Nutrition / Supplements / Education in user mode — these are reached via the home command centre or direct URL only. If product wants a richer "more" sheet, that's a future slice.

Most natural next slice now:

- `/user/notifications` — the bell now points there, so it's the most-clicked currently-MUI surface. Planning or calm palette, normal shell/composition pass.

Alternate slices, in roughly decreasing return:

- `/user/settings` — the "More" nav target. Planning palette.
- `/user/nutrition`, `/user/supplements`, `/user/learning-plans`, `/user/feedback` — straightforward shell/composition passes once notifications + settings are done.
- subdomain collapse — only do this when product is ready to commit to the in-app mode pill end-to-end; touches auth, middleware, and cookies.
- FullCalendar grid reskin — multi-day rebuild or swap to a Signal-native calendar primitive. Separate from the shell pass.

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
- User slices already shipped: home command centre, progress route, plan create entry, plan upload workspace, plan editor workspace, workout route (all four list views + existing exercise slide), check-in route, calendar route.
- Shell: SignalAppShell + SignalSidebar / SignalBottomNav / SignalTopBar / SignalModeSwitch / SignalNotificationsBell are all wired in via `protected-layout.tsx` → `SignalShellSwitch`. The bell links to `/user/notifications` and renders a chartreuse dot when `useNotifications().unreadCount > 0`.
- Subdomain split is NOT yet collapsed. The mode pill cross-navigates via the `coach.*` host on production. Do not attempt the collapse without explicit go-ahead from product — it touches auth, middleware, and cookie scoping.

Most natural next slice:
- /user/notifications — the bell now points here, so it's the most-clicked still-MUI surface. Planning or calm palette, normal shell/composition pass.

Alternate next slices:
- /user/settings — the "More" nav target.
- /user/nutrition, /user/supplements, /user/learning-plans, /user/feedback — straightforward shell/composition passes.
- FullCalendar grid reskin — separate, multi-day, or swap primitive.
- subdomain collapse — only when product commits; infra-leaning, not a UI slice.

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
