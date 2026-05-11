# Forti Redesign — Stage 1 Decision Register

Purpose: this document records the product and UX decisions made during Stage 1 of the Forti redesign. Claude, Codex, or any implementation agent should compare implementation work against this register.

This is a product decision source of truth. Current code may differ. If current implementation conflicts with this register, treat the conflict as a migration/design issue, not automatic proof that this register is wrong.

---

## 1. Product identity

### Decision
Forti is a fitness tracking and coaching system for intermediate lifters and coaches.

### Rationale
The product is not a beginner onboarding app, generic habit tracker, nutrition database, AI coach, or SaaS business dashboard. Its value is structured training, logging, progress review, coach-client workflow, and check-ins.

### Implication
Design should optimise for serious training workflows, coach review, mobile gym logging, and progress tracking.

### Status
Locked.

---

## 2. Target users

### Decision
Primary users are:
- intermediate gym users following structured training
- coached clients
- coaches managing clients
- coaches who may also be athletes themselves

### Rationale
The app must support self-managed and coach-managed training. Coaches may also have their own coach.

### Implication
The app should support role-aware behaviour, not separate identities or duplicated portals.

### Status
Locked.

---

## 3. App modes

### Decision
The app has two explicit modes:
- My Training
- Coach

### Rationale
Personal training and coach/client management have different priorities and should not pollute each other.

### Implication
My Training is about the user's own training. Coach mode is about clients, reviews, plans, check-ins, and support content.

### Status
Locked.

---

## 4. Mode switching and notifications

### Decision
Notifications are global across modes. If a user opens a client notification while in My Training, the app should switch into Coach mode and open the relevant client/check-in context.

### Rationale
Users should not miss coach/client work because they are in their own training mode.

### Implication
Notification URLs/routing must support cross-mode navigation.

### Status
Locked.

---

## 5. Coach subdomain vs in-app mode

### Decision
Long-term product direction favours one app with explicit modes. During implementation, keeping the current coach subdomain temporarily is acceptable to reduce blast radius.

### Rationale
Subdomain collapse is an architecture migration. It should not be mixed into the first redesign slice unless explicitly prioritised.

### Implication
A Signal mode switch may initially navigate using existing cross-domain behaviour.

### Status
Implementation decision, not fully locked long-term.

---

## 6. My Training navigation

### Decision
Uncoached user navigation:
- Home
- Plan
- Progress
- More

Coached client navigation:
- Home
- Plan
- Progress
- Check-in
- More

### Rationale
Check-in is a first-level workflow only for coached clients. Metrics and nutrition should not fragment the primary nav.

### Implication
Do not keep Nutrition as a primary nav item in the target redesign just because current implementation has it.

### Status
Locked.

---

## 7. More menu contents

### Decision
More should include:
- Settings
- Exports
- Account
- Coach link / coaching relationship settings
- Exercise library

### Rationale
These are lower-frequency surfaces.

### Implication
Do not overburden primary navigation.

### Status
Locked.

---

## 8. Home purpose

### Decision
My Training Home is a command centre, not a generic analytics dashboard.

### Rationale
The user's most important question is: "What should I do now?"

### Implication
Home should prioritise workout action over charts/cards.

### Status
Locked.

---

## 9. Home primary action

### Decision
If an active workout exists, primary CTA is Resume Workout.  
If no active workout exists, primary CTA is Start Next Planned Workout.

### Rationale
Workout logging is the highest-priority user action.

### Implication
Resume state must exist in the Home design and implementation.

### Status
Locked.

---

## 10. Choose another workout

### Decision
Users can choose another workout, but it is secondary.

### Rationale
Users may need to adapt due to injury, equipment availability, or preference.

### Implication
Choosing another workout should not automatically mutate planned order.

### Status
Locked.

---

## 11. Workout recommendation behaviour

### Decision
The app keeps suggesting the next planned workout until it is completed or until the week is manually completed.

### Rationale
The app should preserve programme intent without forcing stale workouts across weeks.

### Implication
If Chest is next and the user does Legs instead, Chest remains next.

### Status
Locked.

---

## 12. Week progression

### Decision
Weeks do not automatically advance by calendar time. User manually marks a week complete.

### Rationale
Calendar-based progression punishes holidays, illness, travel, and inconsistent schedules.

### Implication
There should be an active week concept or equivalent convention.

### Status
Locked product rule; implementation gap likely.

---

## 13. All workouts complete

### Decision
When all workouts in a week are complete, show a prominent Complete Week / Start Next Week action, but require confirmation.

### Rationale
Auto-advancing can be surprising. Manual completion keeps control with the user.

### Implication
Week completion is assisted but not automatic.

### Status
Locked.

---

## 14. Incomplete week completion

### Decision
When user manually completes a week, unfinished workouts become missed/skipped. The next week starts fresh.

### Rationale
The app should not drag stale missed workouts forward forever.

### Implication
Previous incomplete workouts remain part of history but not active obligations.

### Status
Locked.

---

## 15. Workout completion

### Decision
Workout completion is explicit. User taps Finish Workout.

### Rationale
Actual workouts are messy. Completion should not require every planned set to be logged.

### Implication
Date completed can exist even with unlogged planned sets.

### Status
Locked.

---

## 16. Unlogged sets warning

### Decision
If the user taps Finish Workout with empty planned sets, show a simple warning:
"3 sets were unlogged. Complete anyway?"

### Rationale
Do not force the user to classify every missing set.

### Implication
Empty sets remain unlogged/missed if user completes anyway.

### Status
Locked.

---

## 17. Active workout persistence

### Decision
If the user returns on the same day, resume active workout.  
If the user returns later, ask whether to continue logging or mark complete. Discard/delete exists but is not the primary assumption.

### Rationale
Most stale workouts are likely "forgot to finish," not true abandonment.

### Implication
Stale active workout state must be represented.

### Status
Locked.

---

## 18. Set logging model

### Decision
Planned sets are shown upfront as empty rows. User fills them in.

### Rationale
This is faster than manually adding each set and keeps the workout shape visible.

### Implication
Adding sets mid-workout is not v1 priority, though workout-instance exercise changes are allowed.

### Status
Locked.

---

## 19. Target suggestions

### Decision
No automatic load/reps suggestions for now.

### Rationale
The app should not pretend to know fatigue, sleep, equipment, injury, or context.

### Implication
Previous performance history should inform the user, not prescribe.

### Status
Locked.

---

## 20. During-workout changes

### Decision
Users can always substitute exercises, skip exercises, add exercises, leave sets unlogged, and log reality during a workout.

### Rationale
Users must be able to accurately record what happened.

### Implication
Execution freedom must never be blocked by plan authority rules.

### Status
Locked.

---

## 21. Plan mutation during workout

### Decision
Changes made during workout execution never mutate the underlying plan automatically.

### Rationale
One messy session should not corrupt the programme.

### Implication
Workout instance data and plan prescription must remain conceptually separate.

### Status
Locked.

---

## 22. Substitutions and exercise history

### Decision
Substituted exercises track against themselves, not the originally planned exercise.

### Rationale
Different exercises and machines are not always comparable.

### Implication
Machine Chest Press substituted for Incline DB Press contributes to Machine Chest Press history only.

### Status
Locked.

---

## 23. Progression exclusion

### Decision
User can mark a logged exercise instance as excluded from progression.

Excluded entries:
- remain in raw workout log
- count toward workout completion
- count toward training volume
- do not affect E1RM/progression graphs
- do not appear in previous-workout panels
- do not affect progression comparisons

### Rationale
Different machines, injury-limited sets, or odd sessions should not poison progression data.

### Implication
Needs instance-level flag/filtering.

### Status
Locked product rule; implementation gap.

---

## 24. Previous performance panel

### Decision
During logging, each exercise should show the last 3 valid previous sessions for that exact exercise, with set-level weights and reps.

### Rationale
One last session can be a fluke. Set-level history helps load selection.

### Implication
Exclude entries marked ignored from progression.

### Status
Locked.

---

## 25. Bodyweight tracking

### Decision
Bodyweight supports deeper progress review, but Home only shows a simple status signal:
- current weight
- recent change
- goal progress

### Rationale
Home should not become a data landfill.

### Implication
Detailed weight trends live in Progress.

### Status
Locked.

---

## 26. Metrics

### Decision
Daily metrics store actuals:
- weight
- steps
- sleep
- calories
- macros
- custom metrics

Targets are separate and versioned.

### Rationale
Actuals and targets have different lifecycles.

### Implication
Do not treat missing metric data as zero.

### Status
Locked.

---

## 27. Nutrition scope

### Decision
Nutrition is targets + manual daily totals only.

Out of scope:
- food database
- meal logging
- barcode scanning
- MacroFactor/MyFitnessPal clone

### Rationale
Without a food database, full nutrition tracking would be a weak duplicate of existing apps.

### Implication
Nutrition should not dominate Home or primary nav.

### Status
Locked.

---

## 28. Missing nutrition/metric data

### Decision
Days with no manual calorie/macro entry are missing data, not zero.

### Rationale
Zero would corrupt trends and adherence.

### Implication
Charts and summaries must handle missing data explicitly.

### Status
Locked.

---

## 29. Progress area

### Decision
Progress should be split into clear areas:
- exercise strength progress
- bodyweight/metrics progress
- training adherence
- programme/block review

### Rationale
One giant dashboard becomes chart landfill.

### Implication
Progress needs hierarchy and filtering.

### Status
Locked.

---

## 30. Focus exercises

### Decision
User can select up to 5 focus exercises for prominent progress tracking.

### Rationale
Showing every logged exercise equally makes progress unreadable.

### Implication
Other exercises remain searchable/viewable.

### Status
Locked product rule; storage implementation needed.

### Implementation note
Current implementation uses `settings.trackedE1rmExercises` (array of `{ id, name }`) as the focus exercise list. The spec anticipated a separate `progress.focusExerciseIds: number[]` field. Skipped migration — `trackedE1rmExercises` is functionally equivalent for now. Revisit if focus exercises need to diverge from e1rm tracking (e.g. coach visibility, different cardinality, cross-platform promotion).

---

## 31. Focus exercise ownership

### Decision
User controls their own focus exercise list. Coaches can view it but do not control it for now.

### Rationale
Progress focus is personal.

### Implication
Coach-controlled focus lists can be considered later.

### Status
Locked.

---

## 32. Exercise library

### Decision
The app supports:
- shared global exercise library
- user-created private exercises
- coach exercise notes visible only to coach and clients

### Rationale
Exercise definitions can be shared, while notes/context are relationship-specific.

### Implication
Do not make all exercises globally visible if user-created/private.

### Status
Locked.

---

## 33. Plan creation entry

### Decision
Preserve four equal plan creation paths:
- From a template
- Build with AI
- Import from spreadsheet
- Start from scratch

### Rationale
All four paths are legitimate. AI should not dominate.

### Implication
Plan creation entry should not over-prioritise AI or bury manual creation.

### Status
Locked.

---

## 34. Plan creation funnel

### Decision
All plan creation paths funnel into a shared editable plan editor before save.

### Rationale
Generated/imported/template plans must be reviewable.

### Implication
AI/import outputs must never be blindly saved.

### Status
Locked.

---

## 35. AI role

### Decision
AI is a utility tool for generation, spreadsheet import, exercise enrichment, and structured parsing.

### Rationale
The product is not an AI-coach chatbot.

### Implication
No persistent AI assistant/chat layer in core UI for now.

### Status
Locked.

---

## 36. Plan editor responsive behaviour

### Decision
Desktop planning supports dense sheet-style editing. Mobile planning supports simpler classic/card-style editing.

### Rationale
Planning and coaching benefit from density on desktop. Mobile should avoid spreadsheet complexity.

### Implication
Do not force one layout philosophy across all devices.

### Status
Locked.

---

## 37. Coaching model

### Decision
Coaches can fully manage clients: plans, reviews, check-ins, notes, targets, feedback, learning/support content.

Clients and non-coached users can self-manage their own training where applicable.

### Rationale
The app must support self-managed and coach-managed users.

### Implication
Permissions must distinguish self-owned plans from coach-created plans.

### Status
Locked.

---

## 38. Coach-created plan authority

### Decision
Coach-created plans are locked by default. Client cannot materially edit them unless coach enables plan editing.

### Rationale
A coach needs programme authority, but clients must still log reality.

### Implication
Needs permission/lock model.

### Status
Locked product rule; implementation gap likely.

---

## 39. Workout-instance freedom for coached clients

### Decision
Even when a coach-created plan is locked, the client can still substitute, skip, add exercises, leave sets unlogged, and log actual performance during a workout.

### Rationale
Logging reality is not the same as editing the programme.

### Implication
Do not block workout-instance edits under coach lock.

### Status
Locked.

---

## 40. Coach mode home

### Decision
Coach Home is a task inbox, not a dashboard.

Primary:
- submitted check-ins needing review

Secondary:
- plan maintenance tasks

### Rationale
Coach needs to know what needs attention.

### Implication
Do not lead with business/admin metrics.

### Status
Locked.

---

## 41. Coach task inbox v1

### Decision
V1 coach task inbox includes:
- submitted check-ins
- clients without active plans
- plans ending soon
- clients blocked because no next week/workout exists

Not v1:
- broad behavioural alerts
- missed workout alerts
- low adherence alerts
- media review unless tied to check-ins/required plan items

### Rationale
Avoid noisy alert landfill.

### Implication
Coach Home requires aggregation logic.

### Status
Locked.

---

## 42. Global coach check-ins page

### Decision
No separate global Coach Check-ins page for now.

### Rationale
Coach Home shows check-ins needing review. Historical check-ins live under each client.

### Implication
Do not add global Check-ins nav unless later volume requires it.

### Status
Locked.

---

## 43. Coach mode navigation

### Decision
Coach mode primary nav:
- Home
- Clients
- Library
- More

### Rationale
Check-ins are handled through Home and client workspace, not a separate global top-level page.

### Implication
Current implementation may have more coach nav items than target IA.

### Status
Locked.

---

## 44. Client workspace

### Decision
Client workspace sections:
- Overview
- Check-ins
- Plan
- Training
- Progress
- Targets
- Supplements
- Notes

### Rationale
A coach needs scoped navigation once focused on a client.

### Implication
Coach global nav and client scoped nav are different layers.

### Status
Locked.

---

## 45. Client workspace default

### Decision
If a client has a pending submitted check-in, opening their profile should take the coach directly to check-in review. Otherwise open Client Overview.

### Rationale
Pending work should not be hidden behind overview.

### Implication
Client route logic needs pending-check-in awareness.

### Status
Locked.

---

## 46. Client overview

### Decision
Client Overview summarises:
- active plan/current week
- recent training
- bodyweight/metric trend
- latest check-in status
- targets
- supplements
- coach notes/context

### Rationale
Coach needs quick situational awareness.

### Implication
Overview is a summary surface, not a full data page.

### Status
Locked.

---

## 47. Check-in purpose

### Decision
Check-ins are a weekly review workflow:
- client submits
- coach reviews
- coach comments
- coach adjusts targets
- coach sends feedback

### Rationale
Check-ins are not just forms.

### Implication
Check-in review screens need context: training, metrics, photos/custom responses, comments, targets.

### Status
Locked.

---

## 48. Self-managed check-ins

### Decision
Self-managed check-ins are deferred for now.

### Rationale
Solo users should not feel like they are submitting reports to nobody.

### Implication
Check-in nav appears only for coached clients.

### Status
Locked.

---

## 49. Check-in submission day

### Decision
Check-in submission day is configurable in client settings and can be edited by the coach.

### Rationale
Coaching workflows vary.

### Implication
Check-in schedule UI/settings need to support coach edits.

### Status
Locked.

---

## 50. Coach feedback read receipts

### Decision
Read receipts are not required for v1.

### Rationale
Current check-in model supports coachReviewedAt, not feedbackReadAt.

### Implication
Use "Feedback sent" / "Reviewed" rather than "read 14h ago" unless a read-tracking model is added.

### Status
Locked for v1.

---

## 51. Visual direction

### Decision
Base visual direction is Signal:
- matte black performance-product feel
- chartreuse signal/action accent
- large readable numerals
- dark gym logging
- lighter dense planning/coach surfaces

### Rationale
Signal best fits serious gym logging and gives Forti a distinctive product identity.

### Implication
Use Signal as brand spine.

### Status
Locked.

---

## 52. Visual modifications to Signal

### Decision
Modify Signal:
- reduce excessive uppercase/letter-spacing
- use chartreuse sparingly
- make Home action-first, less stat-dashboard-first
- remove Nutrition from primary nav
- remove Messages from Coach Home
- borrow calmer check-in/client feedback tone from Quiet Tool
- borrow table/grid discipline from Workshop

### Rationale
Pure Signal risks becoming shouty or too status-dashboard-like.

### Implication
Final design is Signal-led hybrid.

### Status
Locked.

---

## 53. Visual density model

### Decision
Use hybrid density:
- gym logging: utility-first, fast, large targets, high contrast
- planning/coach review: denser, efficient, table/sheet-friendly
- client feedback/check-ins: calmer, premium, readable
- progress: data-rich but focused

### Rationale
One density level cannot serve all workflows.

### Implication
Design system should support density modes/patterns.

### Status
Locked.

---

## 54. Responsive direction

### Decision
Shared tokens/components across app. Desktop-first for planning/coaching/dense analytics. Mobile-first for workout logging/check-ins/quick entry/dashboard actions.

### Rationale
Different tasks have different device assumptions.

### Implication
Do not force desktop layouts onto gym mobile flows.

### Status
Locked.

---

## 55. Design system theming

### Decision
Optional future themes should only vary visual tokens, not IA or flows.

### Rationale
Multiple complete designs would multiply maintenance.

### Implication
One product structure, possibly multiple visual presets later.

### Status
Locked.

---

## 56. Out of scope

### Decision
Out of scope for current redesign:
- billing
- payments
- coach revenue
- subscriptions
- full client-coach chat
- food database
- meal logging
- barcode scanning
- persistent AI assistant/chat

### Rationale
Avoid scope explosion.

### Implication
Implementation agents should reject designs/features that add these.

### Status
Locked.

---

## 57. Do not break current core capabilities

### Decision
The redesign must preserve:
- plan data model and editor capability
- coach/client check-in workflow
- AI/import/template/scratch plan creation paths
- metrics, targets, check-in review concepts

### Rationale
Redesign presentation and IA, not product capability removal.

### Implication
If a redesigned screen omits access to a core capability, it must be surfaced elsewhere.

### Status
Locked.

---

## 58. Current implementation is not the source of truth

### Decision
Current UI/navigation may conflict with target IA. Target decisions in this register should guide redesign unless explicitly revised.

### Rationale
The redesign is intentionally changing current structure.

### Implication
Do not preserve current top-level Nutrition, Calendar, Training, etc. merely because they exist.

### Status
Locked.

---

# Known implementation gaps

These are product decisions that may require schema/API/state work.

## Gap 1. Progression exclusion

Need instance-level flag on logged exercise/set/workout-exercise to exclude from progression while retaining raw log and volume.

## Gap 2. Manual active week progression

Need explicit active-week state or robust convention for manual week completion.

## Gap 3. Focus exercises

Need storage for up to 5 user-selected focus exercises. V1 likely uses `User.settings.progress.focusExerciseIds`.

## Gap 4. Coach plan edit permission

Need permission model for coach-created plans being locked by default and optionally editable by clients.

## Gap 5. Coach Home aggregation

Need aggregation for submitted check-ins and plan maintenance tasks.

## Gap 6. Cross-mode notification routing

Need robust behaviour for notifications that open into the other mode/domain/context.

## Gap 7. Stale active workout handling

Need reliable active workout/session state to detect same-day vs later return.

---

# Implementation audit checklist

Use this checklist to compare implementation against Stage 1 decisions.

## Home
- [ ] Resume Workout is primary if active workout exists.
- [ ] Start Next Planned Workout is primary if no active workout exists.
- [ ] Choose another workout is secondary.
- [ ] Home is not a generic dashboard.
- [ ] Charts do not dominate Home.
- [ ] Coached check-in prompt appears only when relevant.
- [ ] Quick metric entry is compact.

## Workout logging
- [ ] Mobile-first and one-handed usable.
- [ ] Planned sets shown upfront.
- [ ] User manually fills sets.
- [ ] Last 3 previous valid sessions shown or accessible.
- [ ] No automatic target load/reps suggestions.
- [ ] Finish Workout is explicit.
- [ ] Unlogged sets warning appears.
- [ ] Substitutions affect instance only.
- [ ] Added/skipped exercises affect instance only.
- [ ] Locked coach plan does not block logging reality.

## Week/plan progression
- [ ] Week does not auto-advance by calendar time.
- [ ] User can manually complete week.
- [ ] Complete Week / Start Next Week appears when all workouts complete.
- [ ] Missed workouts do not drag forward after week completion.

## Progress
- [ ] Progress is split into clear sections.
- [ ] Focus exercises are prominent.
- [ ] Non-focus exercises remain accessible.
- [ ] Missing data is not treated as zero.
- [ ] Excluded progression entries are filtered from E1RM/previous comparisons.
- [ ] Progress does not become chart landfill.

## Nutrition/metrics
- [ ] Nutrition is not a primary nav item.
- [ ] Manual totals/targets are supported.
- [ ] No meal/food/barcode system is introduced.
- [ ] Metrics trends live under Progress.
- [ ] Quick entry can live on Home.

## Plan creation
- [ ] Four entry paths remain equal.
- [ ] AI is not visually dominant.
- [ ] Scratch/manual is not buried.
- [ ] All paths funnel into editor before save.
- [ ] AI/import outputs are reviewable before save.
- [ ] New exercises can be reviewed/enriched.

## Coach mode
- [ ] Coach Home is task inbox.
- [ ] Submitted check-ins are prominent.
- [ ] Plan maintenance tasks exist if implemented.
- [ ] No business dashboard creep.
- [ ] No global Check-ins page unless explicitly re-decided.
- [ ] Coach nav is Home / Clients / Library / More.

## Client workspace
- [ ] Pending check-in opens review directly.
- [ ] Otherwise opens Client Overview.
- [ ] Scoped nav exists.
- [ ] Overview summarises plan, training, metrics, latest check-in, targets, supplements, notes.

## Check-ins
- [ ] Coached-client workflow preserved.
- [ ] Self-managed check-ins not exposed as primary feature.
- [ ] Coach can review, comment, adjust targets, send feedback.
- [ ] Check-in due/submitted/reviewed states exist.

## Navigation/modes
- [ ] My Training uncoached nav is Home / Plan / Progress / More.
- [ ] My Training coached nav is Home / Plan / Progress / Check-in / More.
- [ ] Coach nav is Home / Clients / Library / More.
- [ ] Notifications are global.
- [ ] Cross-mode notification opens correct context.

## Visual/design system
- [ ] Signal visual direction is used.
- [ ] Chartreuse is used sparingly.
- [ ] Uppercase/letter-spacing is not excessive.
- [ ] Gym logging is high-contrast and touch-friendly.
- [ ] Coach/planning surfaces support density.
- [ ] Check-in/client feedback surfaces are calmer.
- [ ] Status is not colour-only.
- [ ] Contrast and focus states are accessible.

---

# Red flags for implementation review

Treat these as warnings:

- Home becomes a chart/card dashboard again.
- Workout logging gets slower or more decorative.
- AI is promoted as the main product identity.
- Nutrition returns as a primary nav item.
- Coach Home becomes business/admin dashboard.
- Client check-ins are hidden under generic Progress.
- Current routes/nav are preserved without checking target IA.
- Three visual themes become three different UX structures.
- Plan editing and workout-instance logging are conflated.
- Missing metric data is displayed as zero.
- Chartreuse is used everywhere.
- Uppercase labels make dense screens harder to read.
