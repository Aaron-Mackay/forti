# Forti · Signal — Plans selector + Week selector

**Audience:** engineering agent implementing the plan-list and week-list surfaces.
**Source of truth:** the design canvas (`stage5/signal-plans.jsx`, section "5b · Plan selector & Week selector"). This doc is the engineering-ready distillation, **post-grilling**. Any conflict with the canvas resolves in favour of this doc.

Both surfaces share the **light planning surface** (the same tokens that drive the Plan Editor). The dark gym surface (`signalTokens.surface.gym`) is reserved for the workout-logging screens.

---

## Scope guardrail

Out of scope this PR (deferred to follow-ups):

- "Block" / phase grouping (`Block 1 of 3`) — no schema field, no UI to set it.
- Deload weeks — no schema field, no UI to set it.
- Top-set Δ column — no defined comparison rule.
- Archive — no `archived` flag on Plan; no archive-list view.
- Kebab overflow menu items beyond Delete: Duplicate, Rename, etc.
- The 8-cell block-progress strip on WeekSelectorCard.

In scope:

- Visual redesign of both surfaces using existing data + derivable fields.
- `daysPerWeek` derived = `weeks[0]?.workouts.length ?? 0` (use week 1 since week shape is usually uniform; show `?` only when weeks empty).
- Per-week `lastLog` derived = `max(workouts.dateCompleted)` across the week.

---

## 1 · Tokens

Existing tokens in `apps/web/src/lib/signal/tokens.ts`:

| Token | Hex | Purpose |
| --- | --- | --- |
| `surface.planning.bg` | `#f2f0e8` | Page background |
| `surface.planning.bgAlt` | `#ece8de` | Quiet row stripe |
| `surface.planning.surface` | `#fcfbf7` | Card / row background |
| `surface.planning.surfaceAlt` | `#f7f3ea` | Table-head band, active row fill |
| `surface.planning.ink` | `#15140f` | Primary text |
| `surface.planning.inkMid` | `#5d594f` | Secondary text |
| `surface.planning.inkLight` | `#8a8578` | Mono labels, eyebrows |
| `surface.planning.inkGhost` | `#c6c0b2` | Disabled glyphs |
| `surface.planning.border` | `#d7d0c0` | Hairline dividers |
| `surface.planning.borderStrong` | `#2a2823` | Table frames, active-row border |
| `signal.base` | `#d4f24a` | Primary CTA fill |
| `signal.deep` | `#9bc41a` | Active rail, active row left bar |
| `signal.dim` | `rgba(212,242,74,0.18)` | Active row fill |
| `status.ok` | `#5a8c4f` | Reserved |

**Token addition required:** add `radii.pill: 2` to `tokens.ts`. Existing `radii` are `cell: 3`, `card: 4`, `cardLarge: 6`.

**Breakpoint:** use `tokens.space.desktopBreakpointPx` (1024). Components switch from mobile to desktop layout at ≥1024px. (Spec canvas used 960px; we standardise on the token.)

Fonts (already loaded): `Inter Tight` (body), `Archivo Narrow` (display), `JetBrains Mono` (labels, numerals).

---

## 2 · Routes & file layout

```
/user/plan                                       → PlansListCard
/user/plan/[planId]                              → PlanSheetView (editor — untouched)
/user/plan/[planId]/weeks                        → WeekSelectorCard       (NEW route)
/user/coach/clients/[clientId]/plans             → PlansListCard (coach mode)
/user/coach/clients/[clientId]/plans/[planId]    → coach PlanSheetView (untouched)
/user/coach/clients/[clientId]/plans/[planId]/weeks → WeekSelectorCard    (NEW route, coach mode)

/user/workout                                    → router (see §8.5)
/user/workout?weekId=X                           → WorkoutsListView SPA   (existing)
/user/workout?workoutId=Y                        → ExercisesListView SPA  (existing)
```

Component files:

- `apps/web/src/app/user/plan/PlansListCard.tsx` — exists; rewrite the `signalEnabled` branch.
- `apps/web/src/app/user/plan/WeekSelectorCard.tsx` — **new**, exported component (signal + MUI variants).
- `apps/web/src/app/user/plan/[planId]/weeks/page.tsx` — **new** route page (user).
- `apps/web/src/app/user/coach/clients/[clientId]/plans/[planId]/weeks/page.tsx` — **new** route page (coach).
- `apps/web/src/app/user/workout/page.tsx` — rewrite to a redirect router (see §8.5).
- `apps/web/src/app/user/workout/NoActivePlanEmptyState.tsx` — already exists; **keep** (rendered when activePlan is null and no params).
- `apps/web/src/app/user/workout/WeeksListView.tsx` — **delete after migration** (no longer used inside `WorkoutClient`'s SPA; its MUI markup moves into the MUI variant of `WeekSelectorCard`).

Note: `PlansListView.tsx` was already deleted in a previous PR — no inline plan picker remains inside `WorkoutClient`.

---

## 3 · PlansListCard — desktop (≥1024px)

```
┌──────┬────────────────────────────────────────────────────────────────────────┐
│ side │ MY TRAINING · PLANS                                                    │
│ bar  │ Plans                                                       [+ New plan]
│      │ One active at a time · pick another to switch.                         │
│      ├────────────────────────────────────────────────────────────────────────┤
│      │ ALL · 4   ACTIVE · 1   INACTIVE · 1   COMPLETED · 2  SORT: LAST ACT  ↓ │
│      ├────────────────────────────────────────────────────────────────────────┤
│      │ ┌──── 1.5px borderStrong ────────────────────────────────────────────┐ │
│      │ │     PLAN              SCHEDULE  WEEKS   NEXT      LAST    STATUS   │ │
│      │ ├────────────────────────────────────────────────────────────────────┤ │
│      │ │ ●  Upper/Lower Hyp    4 days/wk 5 of 8  Lower B   16 May  [ACTIVE] │ │ ← signalDeep 3px left bar
│      │ │                                                                    │ │ ← (no Activate, just Delete)
│      │ ├────────────────────────────────────────────────────────────────────┤ │
│      │ │ ◇  Push/Pull/Legs     6 days/wk 0 of 12 —         12 May  [INACTIVE] [Activate] [Del] │
│      │ ├────────────────────────────────────────────────────────────────────┤ │
│      │ │ ○  Foundation Hyp     3 days/wk 8 of 8  —         29 Mar  [COMPLETED] [Activate] [Del] │
│      │ └────────────────────────────────────────────────────────────────────┘ │
│      │                                                                        │
│      │ ┌──── Resume rail (active plan only) ─────────────────────────────────┐│
│      │ │ ▌ UPPER/LOWER HYPERTROPHY · WEEK 3       [View weeks] [Resume Lower B →]│
│      │ └────────────────────────────────────────────────────────────────────┘ │
│      │                                                                        │
│      │ Switching plans does not delete progress — past weeks stay logged.    │
└──────┴────────────────────────────────────────────────────────────────────────┘
```

### Outer shell

- Wrap in `<SignalSurface surface="planning">`; reuse the existing left sidebar.
- Content max-width `1080px`, padding `24px 32px 28px`.

### Header

- Eyebrow: mono 10 / 0.14em / `inkLight`. Text: `MY TRAINING · PLANS` for self; `CLIENTS · {NAME} · PLANS` for coach.
- Title: `Archivo Narrow 30 / 1.0 / -0.015em / ink`. Default `Plans`; coach uses `{name}'s plans`.
- Subtitle: `Inter Tight 12 / 1.5 / inkMid` — `One active at a time · pick another to switch.` (Coach copy: `Manage {first-name}'s plans.`)
- Header right: primary `+ New plan` button (`ink` fill, font 12/600, padding `8px 14px`, radius `card`). Coach copy: `+ Plan for {first-name}`.

### Filter + sort rail

- Single mono line, padding `10px 0`, `1px solid border` top & bottom.
- Counts derived client-side: `plans.filter(predicate).length`. No extra fetch.
- Left: `ALL · {n}` `ACTIVE · {n}` `INACTIVE · {n}` `COMPLETED · {n}`. Active filter chip: `ink / 600`; others `inkLight`. Chips are buttons (keyboard-operable).
- Right: `SORT: {label}` + caret. Options: `Last activity` (default, desc), `Plan name` (asc), `Weeks done` (desc).
- Persistence (both filter and sort) in `localStorage`:
  - User: `signal.plans.sort`, `signal.plans.filter`
  - Coach: `signal.plans.coach.sort`, `signal.plans.coach.filter`
- Filter `all` is the default for both contexts.

### Table

- Frame: `1.5px solid borderStrong`, radius `cardLarge`, background `surface`.
- Grid columns: `20px 2.2fr 1fr 0.9fr 1.2fr 1fr 110px 140px` (status dot · plan · schedule · weeks · next · last activity · status pill · actions).
- Head row: `surfaceAlt` bg, padding `9px 16px`, mono 9 / 600 / `inkMid`, letter-spacing `0.16em`.
- Body row: padding `14px 16px`, `border-bottom: 1px solid border` (none on last). Active row has a `3px` absolute left bar in `signalDeep` and `background: surface`.
- Numbers use `JetBrains Mono` with `font-variant-numeric: tabular-nums`.
- **Plan column:** plan name only (14/600/ink). No block crumb sub-line (deferred).
- **Schedule column:** `{daysPerWeek} days/wk` (derived). Empty if zero weeks.
- **Weeks column:** `{weeksDone} of {weeksTotal}` where `weeksDone = plan.weeks.filter(w => getWeekStatus(w) === 'completed').length`.
- **Next column:**
  - Active plan: `{nextUnfinishedWorkout.name}` (just the workout name; no day reference until calendar-scheduling exists).
  - Else: em-dash `—`.
- **Last activity column:** existing `formatLastActivity(plan.lastActivityDate)` — Date or `—`.
- **Status column:** pill — §7.
- **Actions column (last):** `Activate` button + `Delete` button, side by side. Active rows get only `Delete`. See behaviour in §8.

### Resume rail (desktop only, user only, active plan only)

- `1.5px solid borderStrong`, radius `cardLarge`, padding `14px 18px`, `surface` bg.
- Left block: 6px-wide `signalDeep` slab (height 36) + eyebrow (mono 10: `{PLAN NAME UPPERCASE} · WEEK {n}`) + Archivo Narrow 20 title `Open active plan`.
- Right block: two buttons — `View weeks` (ghost) and `Resume {workout} →` (`signal.base` fill, `ink` text, font 12/700).
- `Resume` pushes to `/user/workout?workoutId={nextUnfinishedWorkoutInActiveWeek.id}`. Hidden if no unfinished workout (collapses to single `View weeks` button labelled `Open active plan →`).
- **Coach view:** rail renders with `View weeks` only (no Resume). Eyebrow becomes `{CLIENT FIRST NAME} · {PLAN NAME UPPERCASE} · WEEK {n}`. This is how coach reaches the weeks route.
- Rail is **hidden** when `activePlanId === null`.

### Footnote

Mono 11 / `inkLight`, single line: `Switching plans does not delete progress — past weeks stay logged under each plan.`

---

## 4 · PlansListCard — mobile (<1024px)

```
┌───────────────────────────────────────────┐
│ [F] Forti                          [🔔]   │  top bar (existing SignalAppShell)
├───────────────────────────────────────────┤
│ MY TRAINING · PLANS                       │  eyebrow mono 10
│ Plans                              [ + ]  │  title Archivo Narrow 28 + outlined 32×32 add
├───────────────────────────────────────────┤
│ ALL · 4   ACTIVE · 1   INACTIVE · 1   …   │  filter rail mono 10 (sort moves to a small icon menu)
├───────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐│
│ │ ▌ Upper/Lower Hypertrophy   [ACTIVE]   ││  active card: borderStrong, 3px deep rail
│ │   4 days/wk · 5 of 8 weeks             ││
│ │   ─────────────────────────────────    ││  dashed top divider
│ │   Last · 16 May                  🗑️     ││  delete icon only on active (no Activate)
│ └────────────────────────────────────────┘│
│ ┌────────────────────────────────────────┐│
│ │   Push/Pull/Legs           [INACTIVE]  ││
│ │   6 days/wk · 0 of 12 weeks            ││
│ │   ─────────────────────────────────    ││
│ │   Edited 12 May          [Activate]🗑️ ││
│ └────────────────────────────────────────┘│
│ …                                          │
└───────────────────────────────────────────┘
```

### Per-card anatomy

- Container: `1.5px solid border` (or `borderStrong` if `isActive`), radius `cardLarge`, `surface` bg, padding `14px`, `position: relative`, `margin-bottom: 10px`.
- If active: `3px signalDeep` rail pinned to left edge (absolute, top/bottom 0).
- Stack:
  1. Row: plan name (15/600/ink, `letter-spacing: -0.005em`) + status pill (right).
  2. Mono 11 / `inkMid` meta: `{daysPerWeek} days/wk · {weeksDone} of {weeksTotal} weeks`.
  3. Dashed-top divider (`1px dashed border`, padding-top 8).
  4. Row: mono 10 / `inkLight` last activity (left) + `Activate` button (inactive/completed) + small `🗑️` trash icon (always; 32×32 hit target, ghost border).
- Tap on card body → editor (`/user/plan/[id]` or coach equivalent).
- Tap on `Activate` button → `setActivePlan(id)` with optimistic update + Snackbar `Switched to "{plan.name}". Undo`.
- Tap on trash icon → confirm modal (§8 Delete).
- **No Resume hero or rail on mobile.** Cross-surface entry to training is via the bottom nav Training tab.

### Filter rail

- Padding `10px 18px`, gap 14, mono 10 / `inkLight` / `0.1em`. Active filter: `ink / 700`.
- Horizontally scrollable if it overflows; no wrap.
- Sort control collapses to a small chevron/icon button at the right end (opens a sheet with sort options).

### Header

- Eyebrow + title as desktop.
- Right: `32×32` outlined add button (`1.5px borderStrong`, radius `cell`, `+` 14px stroke 2).

---

## 5 · WeekSelectorCard — desktop (≥1024px)

```
┌──────┬────────────────────────────────────────────────────────────────────────┐
│ side │ MY TRAINING · PLANS · UPPER/LOWER HYPERTROPHY                          │
│ bar  │ Upper/Lower Hypertrophy                                                │
│      │ 5 of 8 weeks done · 4 days/wk · ● Active                              │
│      │                          [Edit plan]  [Complete week]  [Resume Lower B →]
│      ├────────────────────────────────────────────────────────────────────────┤
│      │ ┌──── 1.5px borderStrong ────────────────────────────────────────────┐ │
│      │ │   #   WEEK         SESSIONS  LAST LOG    STATUS                    │ │
│      │ ├────────────────────────────────────────────────────────────────────┤ │
│      │ │  01   Week 1         3 / 3   29 Apr      [COMPLETED]  VIEW LOGS    │ │
│      │ │  03   Week 3         2 / 3   Today       [ACTIVE]     Open →       │ │ ← signalDeep 3px left bar
│      │ │  04   Week 4         — / 3   —           [INACTIVE]   PREVIEW      │ │
│      │ │  08   Week 8         — / 3   —           [INACTIVE]   PREVIEW      │ │
│      │ └────────────────────────────────────────────────────────────────────┘ │
│      │ Weeks don't auto-advance — Complete week confirms what's done.         │
└──────┴────────────────────────────────────────────────────────────────────────┘
```

### Header

- Eyebrow (mono 10 / 0.14em): `MY TRAINING · PLANS · {PLAN NAME UPPERCASE}`. Truncate plan name at ~26 chars with ellipsis. Coach eyebrow: `CLIENTS · {NAME} · PLANS · {PLAN NAME UPPERCASE}`.
- Title (Archivo Narrow 30 / 1.0 / -0.015em / ink): the plan name.
- Subtitle (12 / `inkMid`): dot-separated:
  - `{weeksDone} of {weeksTotal} weeks done`
  - `{daysPerWeek} days/wk`
  - inline active status: `6×6 signalDeep dot` + `Active` (if plan is the user's active plan); `inkLight dot` + `Inactive` otherwise.
- Actions (right, in order):
  1. **Edit plan** (ghost) — pushes to `/user/plan/[planId]` (or coach editor). Hidden when `clientCanEdit === false` and the viewer is the client (not the coach).
  2. **Complete week** (ghost) — opens the confirm modal (§8 Complete-week). Visible only when **user** context AND URL `planId === activePlanId` AND the active week has any incomplete workouts.
  3. **Resume {workout} →** (primary, `signal.base` fill + `ink` text, font 12/700) — pushes to `/user/workout?workoutId={nextUnfinishedWorkoutInActiveWeek.id}`. Visible only when **user** context AND URL `planId === activePlanId`. Hidden if no unfinished workout exists in the active week.
- If URL `planId !== activePlanId` (or `activePlanId === null`) in user context: **Complete week and Resume are hidden**. Replace with a single `Activate this plan` button (ghost-to-primary; calls `setActivePlan(planId)` then `router.refresh()`).
- Coach context: only `Edit plan` button is shown. Never Complete / Resume / Activate. (Coach can activate a plan for client via `Activate` on the plans list.)

### Weeks table

- Grid columns: `36px 1.4fr 1fr 1fr 110px 100px` (# · week · sessions · last log · status pill · row action).
- Head row: `surfaceAlt` bg, padding `9px 16px`, mono 9 / 600 / 0.16em / `inkMid`.
- Body row: padding `12px 16px`, `border-bottom: 1px solid border`. Active row gets `3px` `signalDeep` left bar + `signal.dim` background.
- **# column:** mono 12 / 600 / tabular — `01`, `02`, … (zero-padded).
- **Week column:** `Week {order}` (14/600/ink for active & completed, `inkMid` for inactive).
- **Sessions column:** mono 12 tabular — `{done} / {total}` where `done = workouts.filter(w => getWorkoutStatus(w) === 'completed').length`. Show `— / {total}` when done is zero.
- **Last log column:** derived `max(workouts.dateCompleted)`. Format via existing `formatLastActivity` (or `—`).
- **Status column:** pill — §7.
- **Row action (right column):** `Open →` for active row (13/600/ink), `VIEW LOGS` for completed (mono 11 / 0.06em / `inkLight`), `PREVIEW` for inactive (mono 11 / 0.06em / `inkLight`).
- Tap on any row → `router.push('/user/workout?weekId={week.id}')` (user) or `router.push('/user/coach/clients/[id]/plans/[planId]')` (coach — straight to editor, per Q5/A1).

### Footnote

Mono 11 / `inkLight`: `Weeks don't auto-advance — Complete week confirms what's done and lets you choose the next.`

---

## 6 · WeekSelectorCard — mobile (<1024px)

```
┌───────────────────────────────────────────┐
│ ‹ PLANS · UPPER/LOWER HYPERTROPHY         │  top bar 44px, mono 10 crumb (signal app shell)
├───────────────────────────────────────────┤
│ Upper/Lower Hypertrophy                   │  Archivo Narrow 24 / 1.05
│ 5 OF 8 WEEKS · 4 DAYS/WK · ● ACTIVE       │  mono 11 / tabular / 0.04em
├───────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐ │
│ │ WEEK 3 · NEXT WORKOUT                 │ │  signal.base fill hero (active+user only)
│ │ Lower B                          →    │ │  Archivo Narrow 19, ink text
│ └───────────────────────────────────────┘ │
├───────────────────────────────────────────┤
│ ┌─── COMPLETE WEEK ────────────────────┐  │  (user only, active plan only)
│ │ Mark unfinished workouts as complete │  │
│ └─────────────────────────────────────┘   │
├───────────────────────────────────────────┤
│ W1  Week 1  3 / 3   29 Apr  [COMPLETED]  │  week rows
│ W3  Week 3  2 / 3   Today   [ACTIVE]     │  active solid + 3px deep rail
│ W4  Week 4  — / 3   —       [INACTIVE]   │
│ W5  Week 5  — / 3   —       [INACTIVE]   │
│ …                                         │
└───────────────────────────────────────────┘
```

### Title block

- Title Archivo Narrow 24/1.05/-0.015em.
- Meta: mono 11 / `inkMid` / `tabular-nums` / `0.04em`. Format: `{done} OF {total} WEEKS · {days}/WK · {STATUS}`.
- No 8-cell block-progress strip (out of scope).

### Resume hero (user only, active plan only, when unfinished workout exists)

- Background `signal.base`, color `ink`, padding `12px 14px`, radius `card`.
- Eyebrow (mono 10 / 0.12em / 600 / `opacity 0.7`): `WEEK {n} · NEXT WORKOUT`.
- Title (Archivo Narrow 19 / -0.005em / 700): `{nextUnfinishedWorkoutInActiveWeek.name}`.
- Right side: `→` 18px / stroke 2.2.
- Tap → `/user/workout?workoutId={nextUnfinishedWorkoutInActiveWeek.id}`.
- Hidden when no unfinished workout in active week.

### Complete week strip (user only, active plan only, when unfinished workouts exist)

- A ghost button below the hero, full width.
- Tap → confirm modal (§8 Complete-week).
- Hidden in coach context, when viewing inactive plan, or when active week has zero incomplete workouts.

### Activate-this-plan button

- Renders **in place of** the hero + complete strip when the user is viewing an inactive plan's weeks (URL `planId !== activePlanId` or `activePlanId === null`).
- Primary button, full-width, label `Activate this plan` → calls `setActivePlan(planId)` then `router.refresh()`.

### Week rows

- Grid: `28px 1fr auto`, gap 12, padding `12px`.
- Container border: `1px dashed border` (inactive) / `1px solid border` (completed) / `1px solid borderStrong + 3px signalDeep rail + signal.dim background` (active). Radius `card`.
- Left cell: mono 12 / 600 / `tabular-nums` — `W{order}`. `ink` for active+completed, `inkLight` for inactive.
- Middle: title `Week {order}` (14/600/ink-or-inkMid) + mono 11 sessions `{done} / {total}` + mono 10 `inkLight` last-log.
- Right cell: status pill.
- Tap → `router.push('/user/workout?weekId={week.id}')` (user); coach: → `/user/coach/clients/[id]/plans/[planId]` (editor).

---

## 7 · Status taxonomy — `ACTIVE` / `INACTIVE` / `COMPLETED`

Derive once:

```ts
type PlanStatusKind = 'active' | 'inactive' | 'completed';

function getPlanKind(plan: PlanListItem, activePlanId: number | null): PlanStatusKind {
  if (plan.id === activePlanId) return 'active';
  if (plan.weeks.length > 0 && plan.weeks.every(w => getWeekStatus(w) === 'completed')) return 'completed';
  return 'inactive';
}

type WeekStatusKind = 'active' | 'inactive' | 'completed';

function getWeekKind(week: WeekPrisma, plan: PlanPrisma, isActivePlan: boolean): WeekStatusKind {
  if (getWeekStatus(week) === 'completed') return 'completed';
  if (!isActivePlan) return 'inactive';
  // Within the active plan: the active week is the first non-completed week.
  const firstNonCompleted = [...plan.weeks].sort((a, b) => a.order - b.order)
    .find(w => getWeekStatus(w) !== 'completed');
  return firstNonCompleted?.id === week.id ? 'active' : 'inactive';
}
```

### Status dot (plan table column 1)

```css
.dot--active    { width: 9; height: 9; border-radius: 50%; background: var(--signal-deep); box-shadow: 0 0 0 3px var(--signal-dim); }
.dot--completed { width: 9; height: 9; border-radius: 50%; border: 1.5px solid var(--ink-mid);   background: transparent; }
.dot--inactive  { width: 9; height: 9; border-radius: 50%; border: 1.5px solid var(--border);    background: transparent; }
```

### Status pill (plan + week rows)

```css
.pill              { display: inline-flex; align-items: center; gap: 6px;
                     padding: 3px 9px; border-radius: var(--radii-pill);  /* 2px (new token) */
                     text-transform: uppercase;
                     font: 600 10px/1 var(--signal-font-mono); letter-spacing: 0.1em; }
.pill--active      { background: var(--signal-dim); color: var(--ink);      border: 1px solid var(--signal-deep); }
.pill--inactive    { background: transparent;       color: var(--ink-light);border: 1px solid var(--border); }
.pill--completed   { background: transparent;       color: var(--ink-mid);  border: 1px solid var(--border-strong); }
```

Pill copy: `ACTIVE` / `INACTIVE` / `COMPLETED`. Status is dot + label co-present on the plan table; week rows use the pill alone.

---

## 8 · Behaviour contracts

### 8.1 PlansListCard

| Action | Source | Result |
| --- | --- | --- |
| Click row body | desktop row / mobile card | `router.push('${planHrefBase}/${plan.id}')` — opens the editor (`/user/plan/[id]` or coach equivalent) |
| Click `Activate` button | inactive / completed row | `setActivePlan(plan.id, targetUserId?)` (existing) with optimistic UI; Snackbar `Switched to "{plan.name}". Undo`; Undo restores previous active. **Does not navigate.** |
| Click `Delete` button (or trash icon on mobile) | any row | Opens delete confirm modal (§8.4) |
| Click `View weeks` (Resume rail, desktop user / desktop coach) | rail | `router.push('/user/plan/[activePlanId]/weeks')` (or coach equivalent) |
| Click `Resume {workout}` (Resume rail, desktop user only) | rail | `router.push('/user/workout?workoutId={nextUnfinishedWorkout.id}')` |
| Click `+ New plan` | header | `router.push(createHref)` (existing prop) |
| `setActivePlan` succeeds | optimistic | Snackbar `Switched to "{plan.name}". Undo` (severity success) |
| `setActivePlan` fails | rollback | Restore previous; Snackbar `Failed to update active plan` (severity error) |
| Filter chip click | filter rail | Update filter state + persist to `signal.plans.filter` (or coach key) |
| Sort change | sort dropdown | Update sort state + persist to `signal.plans.sort` (or coach key) |

### 8.2 WeekSelectorCard

| Action | Result |
| --- | --- |
| Click `Edit plan` (desktop user/coach; hidden when `clientCanEdit === false` for client) | `router.push('/user/plan/[planId]')` (or coach editor) |
| Click `Complete week` (desktop user only, gated) | Opens confirm modal (§8.3) |
| Click `Resume {workout}` (desktop user only, gated) | `router.push('/user/workout?workoutId={nextUnfinishedWorkout.id}')` |
| Tap row body (user) | `router.push('/user/workout?weekId={week.id}')` |
| Tap row body (coach) | `router.push('/user/coach/clients/[id]/plans/[planId]')` (editor) |
| Tap mobile Resume hero (user) | Same as desktop `Resume {workout}` |
| Tap mobile Complete week strip (user) | Opens confirm modal (§8.3) |
| Tap `Activate this plan` (user, inactive plan or no active) | `setActivePlan(planId)` → `router.refresh()` |

### 8.3 Complete-week confirm modal (`CompleteWeekModal`)

- **Component:** new `CompleteWeekModal.tsx` co-located with `WeekSelectorCard.tsx`. Reuses `<Overlay>` from `@/components/signal/overlay` (size `sm`, accent rail on). The existing dashboard `CompleteWeekButton.tsx` stays as-is for now (TODO consolidation later).
- **Eyebrow:** `Confirm · current week`.
- **Title:** `Complete week {n}?` where `{n} = activeWeek.order`.
- **Body:**
  - Line 1: mono 12 — `{done} of {total} sessions logged`.
  - If `done < total`: line `Marking {n} unfinished workout(s) as complete:` + a bulleted list of incomplete workout names (mono 12).
  - If `done === total`: line `All sessions logged. Confirm to close out the week.`
- **Footer:** ghost `Keep going` (left) · primary `Complete week {n}` (right, `signal.base` fill + `ink` text).
- **Confirm:** call `POST /api/plan/active/complete-week` (existing). On success: close modal, `router.refresh()`, Snackbar `Week {n} complete`. **No auto-advance** — the active week marker recomputes from data on the next render.
- **Live region** announces `Week {n} complete` (debounced 600ms).

### 8.4 Delete-plan confirm modal

- Component: new `DeletePlanModal.tsx`. Reuses `<Overlay>`.
- **Title:** `Delete "{plan.name}"?`
- **Body:** mono 12 — `All logged workouts under this plan will be lost.` Plus a second line if `plan.id === activePlanId`: `This is your active plan — deleting will clear your active selection.`
- **Footer:** ghost `Cancel` · primary `Delete plan` (urgent fill, `surface` text).
- **Confirm:** call existing plan-delete endpoint (verify path during implementation), optimistic remove from list, `router.refresh()`, Snackbar `"{plan.name}" deleted`.

### 8.5 `/user/workout` redirect router

`apps/web/src/app/user/workout/page.tsx` becomes:

```tsx
export default async function WorkoutPage({ searchParams }: { searchParams: Promise<{ workoutId?: string; weekId?: string }> }) {
  const { workoutId, weekId } = await searchParams;

  // Deep-link cases — honor them regardless of activePlanId (Q12).
  if (workoutId || weekId) {
    return <WorkoutClient ... />;  // existing SPA, simplified to handle workoutId|weekId modes only
  }

  // Router-only mode:
  const userData = await getWorkoutData(userId);
  if (userData.activePlanId == null) {
    return <NoActivePlanEmptyState signalEnabled={signalEnabled} />;
  }
  redirect(`/user/plan/${userData.activePlanId}/weeks`);
}
```

`WorkoutClient.tsx` is updated:
- Drops the `selectedPlanId` + `selectedWeekId` state and the inline plan/week drill (since those paths now arrive via URL params).
- Initial mode: derive from `searchParams` — `weekId` → workouts list; `workoutId` → exercises list.
- Back from exercises list → workouts list (`router.back()`); back from workouts list → `/user/plan/[activePlanId]/weeks` (or `/user/plan` if no active).
- `useWorkoutSession.ts` history-tracking shrinks from 4 levels to 2 (workout ↔ exercise).

### 8.6 Coach context

- `PlansListCard` reads `targetUserId` (existing prop). When set: eyebrow becomes `CLIENTS · {NAME} · PLANS`, title becomes `{name}'s plans`, `+ New plan` label becomes `+ Plan for {first-name}`. `Activate` button still visible on inactive/completed rows; calls `setActivePlan(planId, targetUserId)` — existing API already supports this.
- `WeekSelectorCard` reads `targetUserId`. When set: hides `Complete week`, `Resume`, `Activate this plan`. Row taps go to `/user/coach/clients/[id]/plans/[planId]` (editor). `Edit plan` visible regardless of `clientCanEdit` (coach owns the lock).
- Coach reaches `/user/coach/clients/[id]/plans/[planId]/weeks` via the Resume rail's `View weeks` button on the plans list. There is no direct nav entry to the coach weeks route.

---

## 9 · Loading / error / empty states

### Loading

- Use `<SkelLine>` / `<SkelRow>` primitives from `@/components/signal/overlay`. Static, not shimmer.
- **PlansListCard:** header eyebrow + title render immediately. Filter rail renders without counts (`· …` placeholders). Table head row renders; body shows 3 skeleton rows matching the grid. Resume rail shows the container shell with skeleton text/buttons.
- **WeekSelectorCard:** header values inline-skeletonised (`{?} of {?} weeks done`). Table head + 5 skeleton rows.
- Cache hit (≤60s old) skips the skeleton frame.

### Error

- Replace table body (not header / filter rail) with mono 12 `status.urgent` line + text-link `Retry`.
- Resume rail hidden during error.

### Empty

- **Plans list empty:** existing `{emptyMessage}` prop block + primary `Create your first plan` (already wired).
- **No active plan on `/user/plan/[X]/weeks` URL** (user, X is any plan): page renders the plan's weeks normally; the only header CTA is `Activate this plan`.
- **`activePlanId === null` on plans list (user):** Resume rail hidden. No special placeholder above the table (the page is informative on its own).
- **Plan has zero weeks:** weeks table body collapses to one dashed row `This plan has no weeks yet.` + secondary `Open plan editor` button → `/user/plan/[id]`.

---

## 10 · Accessibility

- Plan rows: semantic `<table>` with `role="row"`. Active row: `aria-current="true"`.
- Status dot: `aria-hidden="true"`. Pill text is the announce.
- `Resume {workout}` button: `aria-label="Resume {workout name}"`.
- `Complete week` confirm modal: `role="dialog"` + `aria-labelledby` (title id) + `aria-describedby` (body id).
- Delete confirm modal: same pattern.
- Focus outline `2px solid signal.deep` with `2px` offset on every interactive element.
- Touch targets ≥ 44×44. Mobile week rows (60px tall) and plan cards (≥88px tall) comply. Verify the trash icon hit area is 32×32 minimum with padding to reach 44×44 effective.
- Filter chips and sort control are `<button>`s (keyboard-operable).
- Live region announces `Switched to "{plan.name}"` and `Week {n} complete` (debounced 600ms).
- Resize between desktop and mobile preserves keyboard focus on the same plan / week (use stable `data-plan-id` / `data-week-id`).

---

## 11 · Feature → element map (preserve everything)

| Existing | New location | Notes |
| --- | --- | --- |
| `setActivePlan(planId, targetUserId?)` from `@lib/clientApi` | `Activate` button on row / `Activate this plan` button on week selector | Optimistic UI + Snackbar (existing) |
| `setActivePlan(null)` | **Removed.** Not exposed in this PR. | Per Q14. Power users without an active plan land via `NoActivePlanEmptyState`. |
| `targetUserId` (coach view) | Threaded through `PlansListCard` + `WeekSelectorCard` | Unchanged contract |
| `createHref` / `planHrefBase` / `emptyMessage` / `title` props | Preserved on `PlansListCard` | API stable |
| `lastActivityDate` per plan | `Last activity` column / mobile last-line | `formatLastActivity` helper unchanged |
| Plans summary card (Active / Weeks / Latest activity, Signal branch) | **Removed.** | Replaced by filter-rail counts + footnote |
| `getPlanStatus` / `getWeekStatus` / `getWorkoutStatus` (`@/lib/workoutProgress`) | Status pill + dot + Resume target | Unchanged |
| `WeeksListView.tsx` signal branch (dark) | **Deleted** | MUI markup migrates into `WeekSelectorCard`'s MUI variant |
| `WeeksListView.tsx` MUI branch | Moves to `WeekSelectorCard.tsx` MUI variant | Page wrapper at the new route renders it |
| `WeeksListView` `onSelectWeek` / `onBack` callbacks | **Removed.** | The new route navigates via `router.push`; `<` back is the browser back (no callback). |
| `useAppBar({ title: 'Weeks', showBack: true, onBack })` on signal | **Skipped.** Signal app shell renders its own top bar; in-card crumb suffices. | Kept on MUI variant. |
| `POST /api/plan/active/complete-week` | `Complete week` modal confirm | Existing endpoint |
| Plan-delete endpoint | `Delete` button confirm modal | Verify path during implementation |
| Existing dashboard `CompleteWeekButton.tsx` | Untouched this PR | Leave a TODO to consolidate with `CompleteWeekModal` later |

---

## 12 · Acceptance checklist

### PlansListCard

- [ ] Planning surface tokens; **no** `signalTokens.surface.gym` usage anywhere.
- [ ] Header: eyebrow + title + subtitle + `+ New plan` (coach: `+ Plan for {name}`). **No** Archive button.
- [ ] Filter rail with three filter chips (`ALL / ACTIVE / INACTIVE / COMPLETED`) + sort dropdown. Both persisted per-context.
- [ ] Table grid `20px 2.2fr 1fr 0.9fr 1.2fr 1fr 110px 140px`. Active row has `3px signalDeep` left bar.
- [ ] Per-row `Activate` button (inactive + completed rows, user + coach) and `Delete` button (every row) in the trailing actions cell.
- [ ] No kebab column. No `Open →` per-row button.
- [ ] Resume rail rendered below the table on **desktop** only, when an active plan exists, in **user** context. Coach Resume rail shows `View weeks` only (no `Resume`).
- [ ] Mobile has **no** Resume hero / rail.
- [ ] Snackbar fires on Activate success / failure.
- [ ] Delete fires a confirm modal; copy varies for active vs inactive plan.

### WeekSelectorCard

- [ ] New route at `/user/plan/[planId]/weeks` (user) and `/user/coach/clients/[clientId]/plans/[planId]/weeks` (coach).
- [ ] Header: crumb + title + subtitle + (user only) `Edit plan` / `Complete week` / `Resume {workout}`. Coach: `Edit plan` only.
- [ ] `Complete week` and `Resume` hidden when URL `planId !== activePlanId` or `activePlanId === null`; replaced by single `Activate this plan` button.
- [ ] Coach context: no Complete / Resume / Activate.
- [ ] Table grid `36px 1.4fr 1fr 1fr 110px 100px`. Active row uses `3px signalDeep` rail + `signal.dim` fill.
- [ ] **No** 8-cell block strip. **No** Top-set Δ column.
- [ ] Row taps: user → `/user/workout?weekId=X`; coach → `/user/coach/clients/[id]/plans/[planId]`.
- [ ] `Complete week` opens the `<Overlay>` modal with recap (sessions done/total + list of incomplete workouts). Calls existing endpoint; no auto-advance.
- [ ] Mobile renders title + meta + Resume hero (gated) + Complete week strip (gated) + week rows. No 8-cell strip.
- [ ] Resizing across the 1024px breakpoint preserves the focused plan / week; no re-fetch.

### `/user/workout` router

- [ ] Bare `/user/workout` (no params) redirects to `/user/plan/[activePlanId]/weeks` when active plan exists; renders `NoActivePlanEmptyState` otherwise.
- [ ] `?workoutId=X` honored regardless of `activePlanId` (deep-link survives plan deactivation).
- [ ] `?weekId=X` renders the workouts list SPA view (existing).
- [ ] `WorkoutClient` SPA history-tracking shrinks to 2 levels (workout ↔ exercise).
- [ ] `WeeksListView.tsx` deleted after migration; MUI markup lives inside `WeekSelectorCard`.

### Tokens

- [ ] `radii.pill: 2` added to `apps/web/src/lib/signal/tokens.ts`.
- [ ] Components use `tokens.space.desktopBreakpointPx` (1024) as the layout breakpoint.

### Coach mirror

- [ ] `/user/coach/clients/[id]/plans` (existing) re-renders via shared `PlansListCard` with new visuals.
- [ ] `/user/coach/clients/[id]/plans/[planId]/weeks` is the only entry to coach's `WeekSelectorCard`; reached via Resume rail `View weeks` button.
- [ ] `setActivePlan(planId, targetUserId)` threads through Activate button on coach plans list.
