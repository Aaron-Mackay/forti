# Signal UI QA Checklist

This checklist is for validating Forti's web Signal UI across the main product routes, role states, and data states.

Scope:

- Web app only: `apps/web`.
- Primary focus: routes rendered through the protected app shell and Signal surfaces.
- Secondary focus: login, onboarding, public entry, and invite flows that bracket the protected app.
- Check both `signalUiEnabled = false` and `signalUiEnabled = true` where the route has a Signal branch.

## Suggested QA data approach

Use multiple deterministic seed scenarios. Do not try to cover every visual and data edge case with one huge seed.

Recommended split:

1. `base` seed
   - Global exercises.
   - Core demo users.
   - Minimal required settings.
   - No scenario-specific clutter.

2. `full-demo` seed
   - Coach account.
   - Multiple clients.
   - Plans, workouts, progress history, nutrition, check-ins, supplements, learning plans, notifications, and audit activity.
   - This is the main manual walkthrough dataset.

3. `empty-user` seed
   - Completed registration but no plans, metrics, check-ins, notifications, supplements, or assignments.
   - Used to check first-run and empty states.

4. `sparse-user` seed
   - Partial data: one plan, missing metrics, incomplete check-in history, few notifications.
   - Used to catch assumptions that require a fully-populated account.

5. `coach-review` seed
   - Coach with clients in different review states: unread check-in, reviewed check-in, no check-ins, archived check-ins.
   - Used for coach desk, client detail, and notification bell checks.

6. `error-ish` or mocked state layer
   - Prefer API mocking/test fixtures for network errors rather than database seeds.
   - Use this for loading, failed save, failed upload, failed parse, failed notification update, and failed target save.

Good practice rules:

- Seeds should be deterministic.
- Seeds should be idempotent unless intentionally destructive and clearly named.
- Keep destructive reset seeds local/dev-only.
- Keep demo refresh seeds safe to run without truncating unrelated data.
- Keep scenario seeds composable: `base + full-demo`, `base + empty-user`, etc.
- Avoid random dates unless normalised relative to `today`.
- Avoid one seed that tries to cover every edge case; it becomes impossible to reason about.

## Optimum manual walkthrough path

Use this order to reduce repeated navigation and catch shell-level problems early.

1. Public/auth boundary
   - `/`
   - `/login`
   - protected-route redirect
   - demo user login
   - demo coach login

2. Signal shell smoke test
   - `/dev/signal-shell`
   - `/user`
   - switch user/coach mode
   - notification bell
   - mobile and desktop chrome

3. Normal user happy path
   - `/user`
   - `/user/workout`
   - `/user/progress`
   - `/user/calendar`
   - `/user/check-in`
   - `/user/nutrition`

4. Normal user management paths
   - `/user/plan/create`
   - `/user/plan/upload`
   - `/user/plan/[planId]`
   - `/user/learning-plans`
   - `/user/supplements`
   - `/user/notifications`
   - `/user/settings`
   - `/user/feedback`

5. Coach overview and review path
   - `/user/coach`
   - `/user/coach/clients`
   - `/user/coach/check-ins`
   - `/user/coach/check-ins/[id]`
   - `/user/coach/check-in-template`

6. Coach client detail path
   - `/user/coach/clients/[clientId]`
   - `/user/coach/clients/[clientId]/check-ins`
   - `/user/coach/clients/[clientId]/check-ins/[id]`
   - `/user/coach/clients/[clientId]/plans`
   - `/user/coach/clients/[clientId]/nutrition`
   - `/user/coach/clients/[clientId]/supplements`

7. Coach learning/library path
   - `/user/coach/learning-plans`
   - `/user/coach/learning-plans/[planId]`
   - `/library`
   - `/exercises`

8. Empty/sparse account rerun
   - Repeat only the routes with major empty states: home, workout, progress, calendar, check-in, nutrition, learning plans, supplements, notifications, coach clients, coach check-ins.

9. Mobile pass
   - Repeat high-risk routes only: shell, workout, calendar, check-in, nutrition, plan editor, coach check-ins, settings.

## Global checks

### Auth and routing shell

- [ ] `/` signed out: public landing page with login CTA.
- [ ] `/` signed in: redirects to `/user`.
- [ ] `/login` desktop layout: brand panel and sign-in card.
- [ ] `/login` mobile layout: compact card layout.
- [ ] Google sign-in idle state.
- [ ] Google sign-in loading state.
- [ ] Demo sign-in idle/loading.
- [ ] Demo coach sign-in idle/loading.
- [ ] Safe internal `callbackUrl` respected.
- [ ] Login/auth callback loops normalise to `/user`.
- [ ] External `callbackUrl` rejected or normalised safely.
- [ ] Signed-out protected route redirects to `/login`.
- [ ] Coach route with coach mode inactive redirects to `/user/settings`.
- [ ] Signal flag off: legacy shell renders.
- [ ] Signal flag on: Signal shell renders.
- [ ] Desktop Signal sidebar visible.
- [ ] Mobile Signal top bar and bottom nav visible.
- [ ] Notification bell with zero unread.
- [ ] Notification bell with unread dot.
- [ ] Bell click navigates to `/user/notifications`.
- [ ] User-to-coach mode switch.
- [ ] Coach-to-user mode switch.
- [ ] Active nav state works on nested routes.
- [ ] Long pages scroll correctly inside shell.
- [ ] Short pages do not leave awkward dead space.
- [ ] Dialogs and drawers render above shell chrome.
- [ ] Focus rings are visible.
- [ ] Keyboard navigation works.
- [ ] Touch targets are usable on mobile.

## Public and onboarding screens

### `/user/onboarding`

- [ ] New account starts wizard.
- [ ] Existing auth profile pre-fills where available.
- [ ] Empty profile fields render correctly.
- [ ] Units preference step.
- [ ] Check-in day preference step.
- [ ] Optional initial body-weight step.
- [ ] Optional coach setup path.
- [ ] Coach request success.
- [ ] Coach request failure.
- [ ] Finish success redirects into app.
- [ ] Finish failure shows recoverable error.
- [ ] Back/forward between wizard steps.
- [ ] Mobile keyboard does not hide primary action.
- [ ] Refresh mid-wizard does not break layout.

### `/coach/[code]`

- [ ] Signed-out invite path routes through login.
- [ ] Signed-in invite path shows confirmation.
- [ ] Valid code.
- [ ] Invalid or expired code.
- [ ] Already-linked user.
- [ ] Accept/link success.
- [ ] Accept/link failure.
- [ ] Mobile layout.

## Main user screens

### `/user` — Home

- [ ] Signal flag off: legacy dashboard cards/chart/e1RM card.
- [ ] Signal flag on: gym Signal home surface.
- [ ] No active plan.
- [ ] Active plan with no workout today.
- [ ] Workout available to start.
- [ ] Workout partially completed/resumable.
- [ ] All workouts done.
- [ ] Dashboard metrics missing.
- [ ] Dashboard metrics populated.
- [ ] Weight metric present.
- [ ] Calendar/event metrics present.
- [ ] E1RM tracked lifts empty.
- [ ] E1RM tracked lifts populated.
- [ ] Getting-started state for newer user.
- [ ] Long plan/week names.
- [ ] Mobile one-column layout.
- [ ] Desktop wide layout.

### `/user/progress`

- [ ] Signal flag off: legacy progress route.
- [ ] Signal flag on: planning Signal progress route.
- [ ] No metric history.
- [ ] Weight history only.
- [ ] Training events only.
- [ ] Tracked lifts empty.
- [ ] One tracked lift.
- [ ] Multiple tracked lifts.
- [ ] Chart loading/fallback.
- [ ] Sparse chart data.
- [ ] Dense chart data.
- [ ] Settings action works.
- [ ] Home/back action works.
- [ ] Mobile chart does not overflow horizontally.

### `/user/calendar`

- [ ] Signal flag off: legacy calendar.
- [ ] Signal flag on: planning Signal calendar.
- [ ] Month view selected.
- [ ] Weeks/list view selected.
- [ ] Toggle Month ↔ Weeks.
- [ ] Empty calendar.
- [ ] Calendar with workout events.
- [ ] Calendar with metric events.
- [ ] Calendar with recurring events.
- [ ] Today indicator.
- [ ] Previous/next month controls.
- [ ] Date click opens creation flow.
- [ ] Drag/select range opens creation flow.
- [ ] Event click opens detail drawer.
- [ ] Bottom drawer closed/open.
- [ ] Right drawer closed/open.
- [ ] Add event flow.
- [ ] Edit event flow.
- [ ] Delete event flow.
- [ ] Block overlap confirmation.
- [ ] Export flow.
- [ ] Offline/cache state.
- [ ] Reconnect refresh.
- [ ] Mobile month grid usable.
- [ ] Mobile drawer does not cover required actions.

### `/user/workout`

- [ ] No plans.
- [ ] Plans list.
- [ ] Active plan indicator.
- [ ] Set active plan.
- [ ] Inactive plan.
- [ ] Plan with no weeks.
- [ ] Weeks list.
- [ ] Current week.
- [ ] Completed week.
- [ ] Week with no workouts.
- [ ] Workouts list.
- [ ] Workout not started.
- [ ] Workout partially complete.
- [ ] Workout complete.
- [ ] Exercises list.
- [ ] Exercise with zero sets complete.
- [ ] Exercise partially complete.
- [ ] Exercise complete.
- [ ] Exercise notes collapsed.
- [ ] Exercise notes expanded.
- [ ] Add exercise dialog.
- [ ] Exercise picker empty/search no results.
- [ ] Exercise picker populated/search results.
- [ ] Add exercise config dialog.
- [ ] Remove exercise flow.
- [ ] Exercise detail logging screen.
- [ ] Set row empty.
- [ ] Set row partially filled.
- [ ] Set row complete.
- [ ] Set row validation error.
- [ ] Previous performance/reference data present.
- [ ] Previous performance missing.
- [ ] Rest timer/advance CTA state.
- [ ] Mark workout complete.
- [ ] Long-press/date picker completion flow.
- [ ] Offline banner hidden/visible.
- [ ] Queued sync state.
- [ ] Sync success.
- [ ] Sync failure.
- [ ] Snackbar/dialog states.
- [ ] Mobile exercise slide swipe/scroll behaviour.
- [ ] Desktop layout.

### `/user/plan`

- [ ] Plan landing/list route renders.
- [ ] No plans empty state.
- [ ] Plans populated.
- [ ] Active plan.
- [ ] Draft/imported plan.
- [ ] Plan card actions.
- [ ] Long plan names.
- [ ] Mobile list.

### `/user/plan/create`

- [ ] Signal flag off: legacy entry.
- [ ] Signal flag on: planning Signal entry.
- [ ] Start from template card.
- [ ] Start from AI card.
- [ ] Start from spreadsheet/upload card.
- [ ] Start from scratch card.
- [ ] Coach creating for client.
- [ ] Normal user creating own plan.
- [ ] Invalid/missing target user.
- [ ] Desktop two-column card grid.
- [ ] Mobile single-column stack.
- [ ] Existing click targets/test ids still work.

### `/user/plan/upload`

- [ ] Signal flag off: legacy upload wizard.
- [ ] Signal flag on: Signal import workspace.
- [ ] Initial upload/paste step.
- [ ] File selected.
- [ ] Paste field populated.
- [ ] Empty submit validation.
- [ ] AI parse loading.
- [ ] Chunking/progress state.
- [ ] Clarification prompt state.
- [ ] Retry state.
- [ ] Parse failure.
- [ ] New exercises review.
- [ ] No new exercises review.
- [ ] Summary step.
- [ ] Muscle-volume summary.
- [ ] Handoff to editor via `sessionStorage`.
- [ ] Back/cancel flow.
- [ ] Mobile import rail readable.

### `/user/plan/[planId]`

- [ ] Signal flag off: legacy editor.
- [ ] Signal flag on: planning Signal editor shell.
- [ ] Plan found.
- [ ] Plan not found.
- [ ] User-owned editable plan.
- [ ] Client plan editable by coach.
- [ ] Client plan locked/read-only.
- [ ] Lock banner visible for client when editing disabled.
- [ ] Coach allow/lock switch.
- [ ] Sheet editor view.
- [ ] Classic editor view.
- [ ] Multi-week editor view.
- [ ] Arrange mode on/off.
- [ ] Zoom controls.
- [ ] Add week.
- [ ] Add workout.
- [ ] Add exercise.
- [ ] Edit exercise metadata.
- [ ] Rep range validation error.
- [ ] Save bar idle.
- [ ] Save loading.
- [ ] Save success snackbar.
- [ ] Save failure snackbar.
- [ ] Unsaved changes.
- [ ] Mobile horizontal overflow checked.

### `/user/check-in`

- [ ] Signal flag off: legacy check-in.
- [ ] Signal flag on: planning-surface Signal check-in.
- [ ] Current week loading.
- [ ] Template-based form.
- [ ] Legacy/default form.
- [ ] Draft/autosaved form.
- [ ] Editing already-submitted check-in.
- [ ] Completed submitted view.
- [ ] Submission success.
- [ ] Submission error.
- [ ] Autosave success.
- [ ] Autosave failure.
- [ ] Photo capture modal.
- [ ] Photo upload/loading.
- [ ] Photo upload failure.
- [ ] Photo viewer dialog.
- [ ] Metrics system card.
- [ ] Custom template fields.
- [ ] No history.
- [ ] History rows collapsed.
- [ ] History row expanded.
- [ ] Load more hidden.
- [ ] Load more visible.
- [ ] Push notification prompt.
- [ ] Push notification denied.
- [ ] Push notification subscribed.
- [ ] Mobile form fields and photo actions usable.

### `/user/nutrition`

- [ ] Signal flag off: legacy nutrition.
- [ ] Signal flag on: planning Signal nutrition.
- [ ] Metrics loading.
- [ ] Template loading.
- [ ] Empty week/no logs.
- [ ] Current week with logs.
- [ ] Previous week.
- [ ] Future week.
- [ ] Week navigation.
- [ ] Today row/card.
- [ ] Daily edit closed.
- [ ] Daily edit open.
- [ ] Day save loading.
- [ ] Day save success.
- [ ] Day save failure.
- [ ] Week targets dialog closed/open.
- [ ] Week target save loading.
- [ ] Week target save success.
- [ ] Week target save failure.
- [ ] Invalid numeric input.
- [ ] Macro targets missing.
- [ ] Macro actuals missing.
- [ ] Calories/macros over target.
- [ ] Calories/macros under target.
- [ ] Sleep/steps/bodyweight optional fields missing.
- [ ] Read-only view.
- [ ] Coach can set targets but not actuals.
- [ ] Mobile scroll reaches daily log.
- [ ] Mobile numeric keyboard/input does not break layout.

### `/user/supplements`

- [ ] Signal flag off: legacy supplements.
- [ ] Signal flag on: planning Signal protocol tracker.
- [ ] Supplements feature disabled by settings.
- [ ] Supplements feature enabled.
- [ ] Loading state.
- [ ] No active supplements.
- [ ] Active supplements populated.
- [ ] No historical supplements.
- [ ] Historical supplements populated.
- [ ] Add supplement dialog.
- [ ] Edit supplement dialog.
- [ ] Delete supplement confirmation.
- [ ] Version/change history collapsed.
- [ ] Version/change history expanded.
- [ ] Create loading/success/failure.
- [ ] Edit loading/success/failure.
- [ ] Delete loading/success/failure.
- [ ] Long supplement names/doses.
- [ ] Mobile cards/actions.

### `/user/learning-plans`

- [ ] Signal flag off: legacy assigned learning plans.
- [ ] Signal flag on: planning Signal assigned coaching.
- [ ] Loading.
- [ ] No assigned plans.
- [ ] One assigned plan.
- [ ] Multiple assigned plans.
- [ ] Assignment collapsed.
- [ ] Assignment expanded.
- [ ] No steps.
- [ ] Locked step.
- [ ] Released step.
- [ ] Completed step.
- [ ] Step completion loading.
- [ ] Step completion success.
- [ ] Step completion failure.
- [ ] Asset link present.
- [ ] Asset link missing.
- [ ] Release date in future.
- [ ] Mobile accordion/card layout.

### `/user/notifications`

- [ ] Signal flag off: legacy notifications.
- [ ] Signal flag on: planning-surface Signal inbox.
- [ ] Loading.
- [ ] No notifications.
- [ ] Unread notifications only.
- [ ] Read notifications only.
- [ ] Mixed unread/read.
- [ ] Mark one read by opening.
- [ ] Mark all read.
- [ ] Notification with URL navigates correctly.
- [ ] Notification without/invalid URL handled safely.
- [ ] Learning-plan notification type icon.
- [ ] Check-in notification type icon.
- [ ] Generic notification type icon.
- [ ] Long notification text.
- [ ] Mobile list and tap targets.

### `/user/settings`

- [ ] Signal flag off: legacy settings.
- [ ] Signal flag on: planning Signal settings.
- [ ] Profile/name field.
- [ ] Name save loading.
- [ ] Name save success.
- [ ] Name save failure.
- [ ] Dashboard settings.
- [ ] Workout settings.
- [ ] Feature toggles.
- [ ] Custom metrics editor.
- [ ] Tracked lifts editor.
- [ ] Check-in timing settings.
- [ ] Units settings.
- [ ] Signal opt-in toggle.
- [ ] Coaching settings section.
- [ ] Coach mode inactive.
- [ ] Coach mode active.
- [ ] Export links.
- [ ] Reset onboarding action.
- [ ] Lower settings content reachable on mobile scroll.

### `/user/feedback`

- [ ] Signal flag off: legacy feedback form.
- [ ] Signal flag on: planning-surface Signal feedback form.
- [ ] Feedback type empty.
- [ ] Feedback type selected.
- [ ] Description empty validation.
- [ ] Description populated.
- [ ] Screenshot absent.
- [ ] Screenshot attached.
- [ ] Screenshot remove/change.
- [ ] Submit idle.
- [ ] Submit loading.
- [ ] Submit success/reset.
- [ ] Submit failure.
- [ ] Mobile upload control.

## Coach screens

### `/user/coach`

- [ ] Coach mode inactive redirect/blocked path.
- [ ] Coach mode active dashboard.
- [ ] No clients.
- [ ] Clients present.
- [ ] Pending client requests.
- [ ] Recent check-ins/tasks.
- [ ] Quick navigation into clients/check-ins/library.
- [ ] Signal shell coach nav active.
- [ ] Mobile coach home.

### `/user/coach/clients`

- [ ] No clients empty state.
- [ ] Clients list.
- [ ] Search/filter empty result.
- [ ] Search/filter populated result.
- [ ] Client with unread check-in.
- [ ] Client without unread check-in.
- [ ] Client focus navigation.
- [ ] Mobile list.

### `/user/coach/clients/[clientId]`

- [ ] Client found.
- [ ] Client not found/unauthorised.
- [ ] Overview populated.
- [ ] Overview sparse/missing data.
- [ ] Client nav tabs visible.
- [ ] Active tab highlighting.
- [ ] Mobile client nav.

### `/user/coach/check-ins`

- [ ] Signal flag off: legacy coach check-ins.
- [ ] Signal flag on: planning Signal desk.
- [ ] Loading.
- [ ] No check-ins.
- [ ] Needs review tab.
- [ ] Browse archive tab.
- [ ] Unread/new queue populated.
- [ ] Archive populated.
- [ ] Search empty result.
- [ ] Search populated result.
- [ ] Filter states.
- [ ] Configure template action visible on global route.
- [ ] Review link opens detail.
- [ ] Mobile tabs/search/list.

### `/user/coach/clients/[clientId]/check-ins`

- [ ] Signal flag off: legacy client check-ins.
- [ ] Signal flag on: planning Signal client check-ins.
- [ ] Client found.
- [ ] Client not found/unauthorised.
- [ ] No check-ins.
- [ ] Needs review.
- [ ] Archive.
- [ ] Search/filter.
- [ ] Configure template action hidden/not global.
- [ ] Review link opens client-specific detail.
- [ ] Mobile layout.

### `/user/coach/check-ins/[id]`

- [ ] Check-in found.
- [ ] Check-in not found.
- [ ] Unread check-in.
- [ ] Already-read check-in.
- [ ] Photos absent.
- [ ] Photos present.
- [ ] Metrics present.
- [ ] Metrics sparse.
- [ ] Mark/read state.
- [ ] Navigate back to global check-ins.
- [ ] Mobile detail layout.

### `/user/coach/clients/[clientId]/check-ins/[id]`

- [ ] Client check-in found.
- [ ] Client/check-in mismatch.
- [ ] Not authorised.
- [ ] Calm Signal detail wrapper.
- [ ] Completed check-in body.
- [ ] Photo viewer.
- [ ] Metrics.
- [ ] Back to client check-ins.
- [ ] Mobile detail layout.

### `/user/coach/check-in-template`

- [ ] Signal flag off: legacy template editor.
- [ ] Signal flag on: planning Signal workspace.
- [ ] Loading template.
- [ ] No template/new template.
- [ ] Existing template.
- [ ] Add card.
- [ ] Edit card.
- [ ] Delete card.
- [ ] Reorder via drag/drop.
- [ ] Preview.
- [ ] Save idle/loading/success/failure.
- [ ] Delete template.
- [ ] Validation errors.
- [ ] Mobile drag/drop/edit controls.

### `/user/coach/learning-plans`

- [ ] Signal flag off: legacy coach learning plans.
- [ ] Signal flag on: planning Signal library.
- [ ] Loading.
- [ ] No plans.
- [ ] Plans populated.
- [ ] Plan with zero steps.
- [ ] Plan with steps.
- [ ] Plan with assignments.
- [ ] New-plan dialog closed/open.
- [ ] Create loading/success/failure.
- [ ] FAB/action button.
- [ ] Open existing plan editor.
- [ ] Mobile list.

### `/user/coach/learning-plans/[planId]`

- [ ] Signal flag off: legacy editor.
- [ ] Signal flag on: planning Signal editor shell.
- [ ] Plan found.
- [ ] Plan not found.
- [ ] No steps.
- [ ] Steps present.
- [ ] Add/edit/delete step.
- [ ] Step asset flows.
- [ ] No assignments.
- [ ] Assignments present.
- [ ] Add/remove assignment.
- [ ] Completed-step counts.
- [ ] Save success/failure.
- [ ] Mobile editor.

### `/user/coach/clients/[clientId]/plans`

- [ ] Signal flag off: legacy client plans.
- [ ] Signal flag on: planning Signal client plans.
- [ ] Client found.
- [ ] Client not found/unauthorised.
- [ ] No plans.
- [ ] Plans populated.
- [ ] Active plan.
- [ ] Set active plan.
- [ ] Open plan editor.
- [ ] Client edit lock state.
- [ ] Mobile list/actions.

### `/user/coach/clients/[clientId]/nutrition`

- [ ] Signal flag off: legacy coach nutrition.
- [ ] Signal flag on: planning Signal client nutrition.
- [ ] Client found.
- [ ] Client not found/unauthorised.
- [ ] No logs.
- [ ] Logs populated.
- [ ] Read-only actuals.
- [ ] Coach target-setting enabled.
- [ ] Target save success/failure.
- [ ] Week navigation.
- [ ] Permission copy clearly explains target-setting vs actual editing.
- [ ] Mobile layout.

### `/user/coach/clients/[clientId]/supplements`

- [ ] Signal flag off: legacy client supplements.
- [ ] Signal flag on: planning Signal client supplements.
- [ ] Client found.
- [ ] Client not found/unauthorised.
- [ ] Feature disabled.
- [ ] No active supplements.
- [ ] Active supplements.
- [ ] History.
- [ ] Add/edit/delete if permitted.
- [ ] Read-only/review-only behaviour if applicable.
- [ ] Mobile layout.

## Shared library and exercise screens

### `/library`

- [ ] Library loads.
- [ ] Empty library.
- [ ] Populated library.
- [ ] Search empty result.
- [ ] Search populated result.
- [ ] Import links dialog closed/open.
- [ ] Import success.
- [ ] Import failure.
- [ ] Coach nav Library path active.
- [ ] Mobile grid/list.

### `/exercises`

- [ ] Exercises list loading.
- [ ] Exercises empty.
- [ ] Exercises populated.
- [ ] Search empty result.
- [ ] Search populated result.
- [ ] Filter states.
- [ ] Exercise detail drawer closed/open.
- [ ] Exercise detail with history.
- [ ] Exercise detail without history.
- [ ] E1RM sparkline/history available.
- [ ] E1RM sparkline/history empty.
- [ ] Mobile drawer.

## Dev / QA harness

### `/dev/signal-shell`

- [ ] Shell harness renders.
- [ ] User mode.
- [ ] Coach mode.
- [ ] Unread notifications off.
- [ ] Unread notifications on.
- [ ] Desktop sidebar.
- [ ] Mobile bottom nav/top bar.
- [ ] Mode switch action.
- [ ] Signal surface/token regressions visible.

## Cross-cutting state matrix

Run these checks across the major screens rather than only once.

- [ ] `signalUiEnabled = false`.
- [ ] `signalUiEnabled = true`.
- [ ] Normal user.
- [ ] Coached user.
- [ ] Coach user.
- [ ] Coach mode active.
- [ ] Coach mode inactive.
- [ ] No-data / first-run account.
- [ ] Full demo account.
- [ ] Sparse partially-configured account.
- [ ] Long names/titles/notes.
- [ ] API loading.
- [ ] API error.
- [ ] API empty response.
- [ ] Mutation loading.
- [ ] Mutation success.
- [ ] Mutation failure.
- [ ] Offline.
- [ ] Reconnected.
- [ ] Mobile narrow viewport.
- [ ] Tablet viewport.
- [ ] Desktop wide viewport.
- [ ] Keyboard-only navigation.
- [ ] Visible focus rings.
- [ ] Touch targets usable.
- [ ] Text contrast acceptable.
- [ ] Page scroll reaches bottom actions.
- [ ] Dialogs/sheets are not hidden behind shell chrome.
- [ ] Back navigation returns to expected parent route.
- [ ] Refresh on nested route does not lose critical state.
- [ ] Deep links into nested routes work.

## Highest-risk routes

Prioritise these if time is limited:

1. `/user/workout`
2. `/user/nutrition`
3. `/user/calendar`
4. `/user/check-in`
5. `/user/plan/[planId]`
6. `/user/settings`
7. `/user/coach/check-ins`
8. `/user/coach/clients/[clientId]/nutrition`
9. `/user/coach/clients/[clientId]/plans`
10. `/user/notifications`
