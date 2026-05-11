# Signal UI — Implementation Audit

Tracks each Stage 1 decision against the current implementation.
Updated as items are fixed. Use this as the working punch list.

**Legend:** ✅ pass · ⚠️ partial · ❌ missing

---

## Home

| # | Item | Status | Notes |
|---|------|--------|-------|
| H-1 | Resume Workout is primary if active workout exists | ✅ | Hero `resume` state |
| H-2 | Start Next Planned Workout is primary if no active workout | ✅ | Hero `start` state |
| H-3 | Choose another workout is secondary | ✅ | Text link below hero card |
| H-4 | Home is not a generic dashboard | ✅ | SignalHome is workout/metrics focused |
| H-5 | Charts do not dominate Home | ✅ | No charts on SignalHome |
| H-6 | Coached check-in prompt appears only when relevant | ✅ | CheckInPrompt card shown above hero when `coachModeActive && !completedAt` for current week |
| H-7 | Quick metric entry is compact | ✅ | 4-column MetricTile grid |

---

## Workout logging

| # | Item | Status | Notes |
|---|------|--------|-------|
| W-1 | Mobile-first and one-handed usable | ✅ | Full-screen Signal slides, touch targets |
| W-2 | Planned sets shown upfront | ✅ | SignalSetSection pre-populates plan sets |
| W-3 | User manually fills sets | ✅ | No auto-fill |
| W-4 | Last 3 previous valid sessions shown or accessible | ✅ | API enforces `limit: 3`; SignalExerciseDetailSheet renders all returned |
| W-5 | No automatic target load/reps suggestions | ✅ | History is display-only |
| W-6 | Finish Workout is explicit | ✅ | SignalAdvanceCta "Finish workout" on last slide |
| W-7 | Unlogged sets warning appears | ✅ | Warning dialog on complete attempt |
| W-8 | Substitutions affect instance only | ✅ | PATCH `/api/workoutExercise/{id}` only |
| W-9 | Added/skipped exercises affect instance only | ✅ | `isAdded` flag; no plan template mutation |
| W-10 | Locked coach plan does not block logging | ✅ | No lock check in logging flow; `clientCanEdit` is plan-edit only |

---

## Week / plan progression

| # | Item | Status | Notes |
|---|------|--------|-------|
| P-1 | Week does not auto-advance by calendar time | ✅ | Active week derived from workout completion state |
| P-2 | User can manually complete week | ✅ | CompleteWeekButton on all-done hero |
| P-3 | Complete Week / Start Next Week appears when all workouts complete | ✅ | `hero.kind === 'all-done'` renders CTA |
| P-4 | Missed workouts do not drag forward after week completion | ✅ | `POST /api/plan/active/complete-week` stamps `dateCompleted` on remaining |

---

## Progress

| # | Item | Status | Notes |
|---|------|--------|-------|
| PR-1 | Progress is split into clear sections | ✅ | Metrics and "Focus exercises" panels clearly labelled; each dismissable |
| PR-2 | Focus exercises are prominent | ✅ | Strength panel titled "Focus exercises"; inline "Edit in Settings →" link |
| PR-3 | Non-focus exercises remain accessible | ❌ | No browse path for non-tracked exercises; only link is to Settings to change tracked list |
| PR-4 | Missing data is not treated as zero | ✅ | DashboardChart filters nulls out; E1rmProgressCard shows "No data yet" |
| PR-5 | Excluded progression entries filtered from E1RM/previous | ❌ | No `excluded`/`isExcluded` field on ExerciseSet; concept not implemented |
| PR-6 | Progress does not become chart landfill | ✅ | Each panel has a "hide" button; hidden panels show "Re-enable in Settings →" notice |

---

## Nutrition / metrics

| # | Item | Status | Notes |
|---|------|--------|-------|
| N-1 | Nutrition is not a primary nav item | ✅ | Absent from all Signal nav variants |
| N-2 | Manual totals/targets are supported | ✅ | NutritionClient supports manual calorie/macro/weight entry per day; no food tracking |
| N-3 | No meal/food/barcode system introduced | ✅ | None exists |
| N-4 | Metrics trends live under Progress | ✅ | DashboardChart in SignalProgress |
| N-5 | Quick entry can live on Home | ✅ | MetricTile grid on SignalHome |

---

## Plan creation

| # | Item | Status | Notes |
|---|------|--------|-------|
| C-1 | Four entry paths remain equal | ✅ | All 4 in equal grid; all icons use neutral `palette.inkMid` accent |
| C-2 | AI is not visually dominant | ✅ | All four cards now visually equal; chartreuse removed from AI card |
| C-3 | Scratch/manual is not buried | ✅ | All 4 paths in equal grid layout |
| C-4 | All paths funnel into editor before save | ✅ | All paths navigate to plan editor before save |
| C-5 | AI/import outputs reviewable before save | ✅ | AI output dispatched to plan editor; user reviews/edits before saving |
| C-6 | New exercises can be reviewed/enriched | ✅ | Mandatory enrichment dialog (name, category, muscles) before editor opens |

---

## Coach mode

| # | Item | Status | Notes |
|---|------|--------|-------|
| CM-1 | Coach Home is task inbox | ✅ | SignalCoachHome shows pending check-ins + maintenance tasks |
| CM-2 | Submitted check-ins are prominent | ✅ | First panel in SignalCoachHome |
| CM-3 | Plan maintenance tasks exist | ✅ | Second panel in SignalCoachHome |
| CM-4 | No business dashboard creep | ✅ | No revenue/engagement metrics |
| CM-5 | No global Check-ins page | ✅ | Suppressed; check-in links use client-scoped URLs |
| CM-6 | Coach nav is Home / Clients / Library / More | ✅ | `coachNav` in navItems.ts |

---

## Client workspace

| # | Item | Status | Notes |
|---|------|--------|-------|
| CW-1 | Pending check-in opens review directly | ✅ | "Check-ins" button routes to `/check-ins/{id}` when `pendingCheckInId` present; list otherwise |
| CW-2 | Otherwise opens Client Overview | ✅ | "Open overview" button navigates to `/user/coach/clients/[id]` |
| CW-3 | Scoped nav exists within client workspace | ✅ | SignalClientNav tab strip on overview, check-ins, plans, nutrition pages |
| CW-4 | Overview shows plan, training, metrics, check-in, targets, supplements, notes | ⚠️ | Added: targets summary panel. Still missing: supplements, coach notes |

---

## Check-ins

| # | Item | Status | Notes |
|---|------|--------|-------|
| CI-1 | Coached-client workflow preserved | ✅ | States and review flow exist |
| CI-2 | Self-managed check-ins not exposed as primary feature | ✅ | Coached nav includes Check-in item; non-coached nav does not; not promoted on Home |
| CI-3 | Coach can review, comment, adjust targets, send feedback | ✅ | All four wired: read, coach response text, CoachWeekTargetsCard, "Send review" button |
| CI-4 | Check-in due/submitted/reviewed states exist | ✅ | `completedAt` + `coachReviewedAt` on WeeklyCheckIn |

---

## Navigation / modes

| # | Item | Status | Notes |
|---|------|--------|-------|
| NM-1 | My Training uncoached nav: Home / Plan / Progress / More | ✅ | `userNav` in navItems.ts |
| NM-2 | My Training coached nav: Home / Plan / Progress / Check-in / More | ✅ | `coachedUserNav` in navItems.ts |
| NM-3 | Notification routing updates mode cookie | ✅ | Middleware syncs `preferred_mode` on every page nav |

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Pass | 41 |
| ⚠️ Partial | 1 |
| ❌ Missing | 2 |

### Confirmed gaps to fix

| ID | Item |
|----|------|
| PR-3 | No way to browse non-focus exercises from Progress |
| PR-5 | Excluded set entries concept not implemented |

### Partial — need a decision on scope

| ID | Item | Issue |
|----|------|-------|
| CW-4 | Client overview completeness | Targets summary added. Still missing: supplements tab, coach notes field |
