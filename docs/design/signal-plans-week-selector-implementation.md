# Signal Plans + Week Selector — Implementation Plan

**Audience:** engineering agent implementing the redesign.
**Companion doc:** `docs/design/signal-plans-week-selector.md` (the spec / decisions log).
**Goal:** ship the new planning-surface PlansListCard + new WeekSelectorCard route + `/user/workout` router simplification, in one cohesive PR.

This plan is **sequenced** — each phase depends on what came before. Don't reorder. Each phase ends with a verification step that must pass before moving to the next.

If something in this plan contradicts the spec doc, the **spec doc wins** — flag the conflict and stop.

---

## Pre-flight (5 min)

Before starting, verify your environment:

```bash
# In repo root
npm run check  # must pass — captures current baseline
git status     # must be clean (or only contain spec docs)
git log --oneline -5
```

Open and skim:

- `docs/design/signal-plans-week-selector.md` — the spec (every decision).
- `apps/web/CLAUDE.md` — repo invariants.
- `apps/web/src/app/user/workout/WorkoutClient.tsx` — file you'll restructure in Phase 2.
- `apps/web/src/app/user/workout/useWorkoutSession.ts` — history-tracking hacks that will simplify.
- `apps/web/src/app/user/plan/PlansListCard.tsx` — the current signal branch (~250 lines).
- `apps/web/src/app/user/workout/WeeksListView.tsx` — its MUI markup migrates; its signal branch dies.
- `apps/web/src/lib/signal/tokens.ts` — receives the `pill: 2` addition.
- `apps/web/src/components/signal/overlay/Overlay.tsx` — the modal primitive we'll wrap.
- `apps/web/src/app/api/plan/active/complete-week/route.ts` — the complete-week endpoint (already exists).
- `apps/web/src/lib/workoutProgress.ts` — `getPlanStatus / getWeekStatus / getWorkoutStatus` helpers.
- `apps/web/src/lib/clientApi.ts` (`setActivePlan`) — existing client API.

**Confirm the test status (do NOT run yet — there are stale tests from prior work):**

```bash
ls apps/web/tests/e2e/WorkoutClient.test.ts \
   apps/web/tests/e2e/highValueJourneys.test.ts \
   apps/web/tests/e2e/accessibility-guards.test.ts \
   apps/web/tests/e2e/workoutSignal.test.ts \
   apps/web/tests/e2e/AppBar.test.ts
```

These were partially updated by an earlier turn and contain stale assumptions (`redirects to /user/plan when no active plan` test, `back button from weeks navigates to /user/plan` test, etc.). They will be reworked in Phase 7.

---

## Phase 1 — Token addition (10 min)

### 1.1 Add `pill: 2` to radii

**File:** `apps/web/src/lib/signal/tokens.ts`

Find:

```ts
radii: {
  cell: 3,
  card: 4,
  cardLarge: 6,
},
```

Replace with:

```ts
radii: {
  cell: 3,
  card: 4,
  cardLarge: 6,
  pill: 2,
},
```

### 1.2 Verify

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | rg "tokens.ts"
```

Expect: no output (no new errors). Pre-existing errors elsewhere are fine.

---

## Phase 2 — `/user/workout` router rewrite + `WorkoutClient` simplification (90 min)

This is the structural change with the largest blast radius. Do it before building the new components — if you build PlansListCard first, you'll have nowhere to navigate to.

### 2.1 What the router becomes

**File:** `apps/web/src/app/user/workout/page.tsx`

Current (post-prior-PR) is a hybrid: redirects when no active plan, otherwise renders `WorkoutClient` with full SPA drill-down.

New behaviour:

| Search params | Behaviour |
| --- | --- |
| `?workoutId=X` | Render `WorkoutClient` in workout mode (single workout, exercise drill). Honored even when `activePlanId === null` (deep-link survival). |
| `?weekId=X` | Render `WorkoutClient` in week-workouts-list mode. |
| neither, `activePlanId` set | `redirect('/user/plan/[activePlanId]/weeks')`. |
| neither, `activePlanId === null` | Render `NoActivePlanEmptyState` (already exists at `apps/web/src/app/user/workout/NoActivePlanEmptyState.tsx`). |

Replace `page.tsx` contents with:

```tsx
import { getWorkoutData } from '@lib/userService';
import WorkoutClient from './WorkoutClient';
import NoActivePlanEmptyState from './NoActivePlanEmptyState';
import { notFound, redirect } from 'next/navigation';
import NetworkStatusBanner from './_components/NetworkStatusBanner';
import getLoggedInUser from '@lib/getLoggedInUser';
import { Loading } from '@/components/shell/Loading';
import { Suspense } from 'react';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ workoutId?: string; weekId?: string }>;
}) {
  const userId = (await getLoggedInUser()).id;
  const userData = await getWorkoutData(userId);
  if (!userData) {
    return notFound();
  }

  const { workoutId, weekId } = await searchParams;
  const signalEnabled = await loadSignalFlag();

  // Deep-link cases: render the SPA regardless of activePlanId state.
  if (workoutId || weekId) {
    return (
      <>
        <NetworkStatusBanner />
        <Suspense fallback={<Loading />}>
          <SignalSurface signalEnabled={signalEnabled} surface="gym">
            <WorkoutClient userData={userData} signalEnabled={signalEnabled} />
          </SignalSurface>
        </Suspense>
      </>
    );
  }

  // Router-only mode.
  if (userData.activePlanId == null) {
    return (
      <SignalSurface signalEnabled={signalEnabled} surface="gym">
        <NoActivePlanEmptyState signalEnabled={signalEnabled} />
      </SignalSurface>
    );
  }

  redirect(`/user/plan/${userData.activePlanId}/weeks`);
}
```

### 2.2 Simplify `WorkoutClient.tsx`

`WorkoutClient` no longer needs `selectedPlanId` / `selectedWeekId` *state* (now from URL params), but the SPA still owns `selectedWorkoutId` ↔ `selectedExerciseId` for the workout/exercise levels.

**Strategy:** read initial `workoutId` and `weekId` from `useSearchParams()`. Derive `selectedWorkoutId` / `selectedWeekId` from those, with state-based drill for exercise detail only.

**Concretely in `WorkoutClient.tsx`:**

1. Remove the `<NoActivePlanEmptyState>` branch — that lives at the page level now.
2. Remove the `WeeksListView` branch (depth-1 view). The component receives `weekId` from URL; it shows `WorkoutsListView` if a week is provided.
3. Remove the inline "drill from plans → weeks → workouts" depth-tracking. Depth shrinks from 4 to 2:
   - Depth 0: workouts list (when `?weekId=X`)
   - Depth 1: exercise detail (when `?workoutId=X` and `selectedExerciseId !== null`)
   - In `?workoutId=X` mode, the exercises list is depth 0 of *that* mode.

Replace the view-switching block (currently lines ~110–174 in `WorkoutClient.tsx`) with:

```tsx
let view: React.ReactNode = null;

const mode: 'workouts' | 'exercises' | 'exerciseDetail' | 'invalid' =
  selectedWorkout && selectedExerciseId
    ? 'exerciseDetail'
    : selectedWorkout
    ? 'exercises'
    : selectedWeek
    ? 'workouts'
    : 'invalid';

if (mode === 'exerciseDetail') {
  view = <ExerciseDetailView ... />;  // existing props
} else if (mode === 'exercises') {
  view = <ExercisesListView ... />;   // existing props
} else if (mode === 'workouts') {
  view = (
    <WorkoutsListView
      week={selectedWeek!}
      onBack={() => router.push(`/user/plan/${selectedPlanId}/weeks`)}
      onSelectWorkout={(id) => router.push(`/user/workout?workoutId=${id}`)}
      signalEnabled={signalEnabled}
    />
  );
} else {
  view = null; // shouldn't reach here; router.push to /user/plan as fallback
}
```

Where `selectedPlanId`, `selectedWeek`, `selectedWorkout` are derived from `workoutId` / `weekId` params and `userData.plans`. Use the existing `findWorkoutContext` helper in `useWorkoutSession.ts` for `workoutId`; add a new `findWeekContext` helper that takes `weekId` and returns `{ planId, weekId }`.

### 2.3 Simplify `useWorkoutSession.ts`

The history-tracking is the gnarliest part. Goal: reduce from 4 levels to 2.

**File:** `apps/web/src/app/user/workout/useWorkoutSession.ts`

Changes:

- Remove `selectedPlanId` state and its setter (derive from URL via `findWorkoutContext` or new `findWeekContext`).
- Remove `selectedWeekId` state and its setter (same — derive from `weekId` param).
- Keep `selectedWorkoutId` (derived from `workoutId` param) and `selectedExerciseId` (local SPA state).
- Update `depth` calculation: only two levels — `selectedExerciseId ? 1 : 0`.
- Update `goBack`:
  - At depth 1 (exercise detail): `setSelectedExerciseId(null)`.
  - At depth 0 in `?weekId` mode: `router.push('/user/plan/${planId}/weeks')`.
  - At depth 0 in `?workoutId` mode: `router.back()` (or `router.push('/user/workout?weekId=${selectedWeek.id}')` if you want a stable back target).
- Update the history seed loop: it only needs to push 1 entry max (for depth 1 exercise detail).
- Remove the `pendingNavDepthRef` and `navigateToWorkoutsList` complexity — completion modal navigation becomes a `router.push` to the workouts list URL.

**Sanity check during this rewrite:** the `useOfflineCache`, `syncQueuedRequests`, `getPreviousExerciseHistory` paths must all keep working — they reference `userDataState`, which doesn't change.

### 2.4 Delete `WeeksListView.tsx` (after WorkoutsListView keeps working)

`WeeksListView` is no longer reachable from `WorkoutClient` after the refactor. Its MUI markup will migrate into `WeekSelectorCard` in Phase 3.

**Defer the deletion until Phase 3.4** — Phase 3 needs to copy markup out of it.

### 2.5 Verify

```bash
# TypeScript should be clean for these files.
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | rg "(workout/page|WorkoutClient|useWorkoutSession)"
# Expect: no output.

# Build the dev server and manually test:
npm run dev
# Hit:
#  - /user/workout            (active plan set → should redirect to /user/plan/[id]/weeks — that route doesn't exist yet, so it'll 404. Fine.)
#  - /user/workout?workoutId=1  (should render workout/exercise SPA mode)
```

The 404 on `/weeks` is expected and resolves in Phase 3.

---

## Phase 3 — WeekSelectorCard component + route pages (4 hours)

### 3.1 Create `WeekSelectorCard.tsx`

**File:** `apps/web/src/app/user/plan/WeekSelectorCard.tsx`

Top-level export signature:

```tsx
export interface WeekSelectorCardProps {
  plan: PlanPrisma;
  activePlanId: number | null;          // user's (or target user's) active plan id
  targetUserId?: string;                // present in coach mode
  coach?: { name: string; firstName: string }; // for coach eyebrow copy
  client?: { name: string; firstName: string }; // for coach eyebrow copy
  signalEnabled: boolean;
}

export default function WeekSelectorCard(props: WeekSelectorCardProps) { ... }
```

Internal logic:

```tsx
const isActivePlan = props.plan.id === props.activePlanId;
const isCoach = Boolean(props.targetUserId);
const sortedWeeks = useMemo(() => [...props.plan.weeks].sort((a, b) => a.order - b.order), [props.plan.weeks]);
const activeWeek = useMemo(
  () => sortedWeeks.find((w) => getWeekStatus(w) !== 'completed') ?? null,
  [sortedWeeks],
);
const nextUnfinishedWorkout = useMemo(
  () => (activeWeek?.workouts ?? []).find((w) => !w.dateCompleted) ?? null,
  [activeWeek],
);
const daysPerWeek = sortedWeeks[0]?.workouts.length ?? 0;
const weeksDone = sortedWeeks.filter((w) => getWeekStatus(w) === 'completed').length;
```

Render the **signal variant** per spec §5 (desktop) and §6 (mobile). Use the responsive switch:

```tsx
import { signalTokens } from '@lib/signal/tokens';

const desktopBp = signalTokens.space.desktopBreakpointPx; // 1024

// CSS in JS via inline style + a media query in a <style> block,
// matching the pattern used in PlansListCard.tsx for the signal variant.
```

For the **MUI variant**, port the existing markup from `WeeksListView.tsx` (the non-signal branch). It uses `useAppBar({ title: 'Weeks', showBack: true, onBack })` — keep that in the MUI variant. Replace `onBack` with `() => router.push(\`/user/plan/[planId]/weeks\` is the current page, so onBack goes back to /user/plan)`.

**Gating logic for header actions (signal variant):**

```tsx
const canShowResume = !isCoach && isActivePlan && nextUnfinishedWorkout != null;
const canShowCompleteWeek = !isCoach && isActivePlan && activeWeek != null && (activeWeek.workouts.some((w) => !w.dateCompleted));
const canShowActivate = !isCoach && !isActivePlan;
const canShowEditPlan = isCoach || props.plan.clientCanEdit;
```

### 3.2 Create the user route page

**File:** `apps/web/src/app/user/plan/[planId]/weeks/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import { getWorkoutData } from '@lib/userService';
import WeekSelectorCard from '@/app/user/plan/WeekSelectorCard';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

export default async function PlanWeeksPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const planIdNum = Number(planId);
  if (Number.isNaN(planIdNum)) return notFound();

  const userId = (await getLoggedInUser()).id;
  const userData = await getWorkoutData(userId);
  if (!userData) return notFound();

  const plan = userData.plans.find((p) => p.id === planIdNum);
  if (!plan) return notFound();

  const signalEnabled = await loadSignalFlag();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <WeekSelectorCard
        plan={plan}
        activePlanId={userData.activePlanId}
        signalEnabled={signalEnabled}
      />
    </SignalSurface>
  );
}
```

**Note:** `<SignalSurface surface="planning">` — *not* gym. Confirm this prop signature; look at how `SignalSurface` is used elsewhere (e.g. `PlansListCard` usage in current `/user/plan/page.tsx`) for reference.

### 3.3 Create the coach route page

**File:** `apps/web/src/app/user/coach/clients/[clientId]/plans/[planId]/weeks/page.tsx`

Similar to 3.2 but:

- Fetch the client's data (use whatever pattern the existing `/user/coach/clients/[clientId]/plans/page.tsx` uses — likely a server-side helper that verifies coach access).
- Pass `targetUserId={clientId}` to `WeekSelectorCard`.
- Pass `client={{ name, firstName }}` for the eyebrow.
- The coach's own active plan is irrelevant; the `activePlanId` passed should be the **client's** activePlanId.

Look up the existing coach plan editor page (`/user/coach/clients/[id]/plans/[planId]/page.tsx`) for the data-fetching + auth pattern; mirror it.

### 3.4 Delete `WeeksListView.tsx`

Once Phase 3.1's MUI variant is wired in and verified, delete:

```bash
rm apps/web/src/app/user/workout/WeeksListView.tsx
```

Confirm no remaining references:

```bash
rg "WeeksListView" apps/web/src
# Expect: no output.
```

### 3.5 Verify

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | rg "(WeekSelectorCard|plan/\[planId\]/weeks)"
# Expect: no output.

npm run dev
# Visit:
#   /user/plan/1/weeks                       (signal enabled — new design)
#   /user/plan/1/weeks                       (signal disabled — MUI variant)
#   /user/workout                            (should redirect to /user/plan/[activePlan]/weeks)
#   /user/coach/clients/[id]/plans/[X]/weeks (coach view; needs a coach session)
```

Sanity-check the signal weeks page: table renders, active row has the green left rail, Resume + Complete + Edit buttons present (for user / active plan).

---

## Phase 4 — PlansListCard signal-branch rewrite (5 hours)

This is the biggest visual rebuild. The MUI branch is **untouched** — only the `signalEnabled` block.

### 4.1 Current state to preserve

In `apps/web/src/app/user/plan/PlansListCard.tsx`:

- Keep the prop signature unchanged: `{ title, emptyMessage, createHref, planHrefBase, plans, targetUserId?, signalEnabled }`.
- Keep `handleSetActive` (the existing setActivePlan optimistic handler) — reuse for the new `Activate` button. Add a snackbar `Switched to "{plan.name}". Undo` per spec.
- Keep the snackbar state machinery.

### 4.2 New signal-branch JSX skeleton

Replace the entire `if (signalEnabled) { return ... }` block with:

```tsx
if (signalEnabled) {
  const palette = signalTokens.surface.planning;
  const isCoach = Boolean(targetUserId);

  // Filter + sort state (persisted via localStorage).
  const [filter, setFilter] = usePersistedState<PlanFilter>(
    isCoach ? 'signal.plans.coach.filter' : 'signal.plans.filter',
    'all',
  );
  const [sort, setSort] = usePersistedState<PlanSort>(
    isCoach ? 'signal.plans.coach.sort' : 'signal.plans.sort',
    'lastActivity',
  );

  const filtered = useMemo(() => filterPlans(planItems, filter), [planItems, filter]);
  const sorted = useMemo(() => sortPlans(filtered, sort), [filtered, sort]);

  return (
    <div /* outer planning shell */>
      <Header isCoach={isCoach} ... />
      <FilterAndSortRail
        counts={{
          all: planItems.length,
          active: planItems.filter((p) => p.isActive).length,
          inactive: planItems.filter((p) => !p.isActive && !isPlanCompleted(p)).length,
          completed: planItems.filter(isPlanCompleted).length,
        }}
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
      />
      <PlansTable
        plans={sorted}
        activePlanId={resolveActivePlanId(planItems)}
        targetUserId={targetUserId}
        onActivate={handleActivate}
        onDelete={handleDelete}
        planHrefBase={planHrefBase}
      />
      {!isCoach && <ResumeRail plans={planItems} planHrefBase={planHrefBase} />}
      {isCoach && <CoachResumeRail plans={planItems} planHrefBase={planHrefBase} />}
      <Footnote />
      <Snackbar ... />
    </div>
  );
}
```

Co-locate the sub-components (`Header`, `FilterAndSortRail`, `PlansTable`, `ResumeRail`, etc.) inside the same file unless one grows past ~120 lines — then extract.

### 4.3 Detailed sub-component specs

**`usePersistedState` hook.** Tiny `useState` + `useEffect` wrapper around `localStorage`. Co-locate in `PlansListCard.tsx` or `apps/web/src/lib/usePersistedState.ts`. Schema:

```ts
type PlanFilter = 'all' | 'active' | 'inactive' | 'completed';
type PlanSort = 'lastActivity' | 'name' | 'weeksDone';
```

**`isPlanCompleted` helper.** Reuse spec §7 logic:

```ts
function isPlanCompleted(plan: PlanListItem): boolean {
  return plan.weekCount > 0 && /* every week completed */;
}
```

But the `PlanListItem` from props doesn't carry the full weeks array — it only has `weekCount`. To know `completed` status accurately, you need full plan data. Two options:

- (a) Change the data flow so plan list pages pass full plans with weeks (preferred — easy server-side change).
- (b) Add `isCompleted` to `PlanListItem` and compute server-side.

**Recommend (a):** look at where `PlansListCard` is used (`apps/web/src/app/user/plan/page.tsx` and `apps/web/src/app/user/coach/clients/[clientId]/plans/page.tsx`). Update those server pages to compute `isCompleted` and pass it on the prop, OR pass full `PlanPrisma[]` and rename the prop. Whichever you choose, update both callsites.

**`PlansTable` (desktop, ≥1024px).**

- Render as `<table>` (or `role="table"` divs) — spec §10 mandates semantic table for a11y.
- Grid columns from §3: `20px 2.2fr 1fr 0.9fr 1.2fr 1fr 110px 140px`.
- Active row: `aria-current="true"`, `3px signalDeep` absolute left bar, `background: surface`.
- Status dot: `aria-hidden="true"`.
- Per-row actions cell: `<Activate>` button (inactive + completed) + `<Delete>` button (always).
- Row body click target excludes the actions cell (event.stopPropagation on the actions cell).

**`PlansCards` (mobile, <1024px).**

- Stacked `<article>` cards per plan.
- Container border + 3px deep rail for active.
- Card content per spec §4.
- Trailing row inside card: last-activity (left) + `Activate` button (when applicable) + `Delete` icon button (always).
- **No** Resume hero on mobile (decision Q19a).

**`ResumeRail` (desktop user only).**

- Visible when `activePlanId !== null` and there is an active plan in the list.
- Renders the active plan's name (uppercase) + week number + `View weeks` ghost button + `Resume {workout} →` primary button.
- `Resume` is hidden when no unfinished workout exists in the active week — `View weeks` then takes the primary slot.

**`CoachResumeRail` (coach desktop).**

- Renders for coach context as well — only `View weeks` button.
- Eyebrow becomes `{CLIENT FIRST NAME} · {PLAN NAME UPPERCASE} · WEEK {n}`.
- No `Resume` button regardless of coach.

### 4.4 Activate handler

```tsx
async function handleActivate(planId: number, planName: string) {
  const previous = planItems;
  setPlanItems((items) =>
    items.map((p) => ({ ...p, isActive: p.id === planId })),
  );
  try {
    await setActivePlan(planId, targetUserId);
    showSnackbar({
      message: `Switched to "${planName}"`,
      severity: 'success',
      action: { label: 'Undo', onClick: () => handleActivate(previous.find((p) => p.isActive)?.id ?? null, '') },
    });
    startTransition(() => router.refresh());
  } catch {
    setPlanItems(previous);
    showSnackbar({ message: 'Failed to update active plan', severity: 'error' });
  }
}
```

Undo case for `planId = null` should call `setActivePlan(null, targetUserId)` — already supported by the API. Or simpler: undo restores the previous active plan if there was one; otherwise it clears active.

### 4.5 Delete handler

```tsx
const [deleteTarget, setDeleteTarget] = useState<PlanListItem | null>(null);

async function confirmDelete() {
  if (!deleteTarget) return;
  const target = deleteTarget;
  setDeleteTarget(null);
  setPlanItems((items) => items.filter((p) => p.id !== target.id));
  try {
    await fetchJson(`/api/plan/${target.id}`, { method: 'DELETE' });
    showSnackbar({ message: `"${target.name}" deleted`, severity: 'success' });
    startTransition(() => router.refresh());
  } catch {
    showSnackbar({ message: 'Failed to delete plan', severity: 'error' });
    startTransition(() => router.refresh()); // re-fetch authoritative state
  }
}

return (
  <>
    {/* main render */}
    <DeletePlanModal
      open={deleteTarget !== null}
      plan={deleteTarget}
      isActive={deleteTarget?.id === activePlanId}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
    />
  </>
);
```

**Endpoint verification:** before implementing, verify the plan-delete endpoint path. Search:

```bash
rg "method.*DELETE|export.*DELETE" apps/web/src/app/api/plan
```

Use whatever path exists. If the endpoint takes `{ id }` in body vs URL, adjust.

### 4.6 Verify

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | rg "PlansListCard"
# Expect: no output.

npm run dev
# Visit:
#   /user/plan                            (signal enabled — new design)
#   /user/plan                            (signal disabled — old MUI design, untouched)
#   /user/coach/clients/[id]/plans        (signal enabled, coach variant)
```

Smoke test:

- Tap row → goes to editor.
- Tap `Activate` on inactive plan → Snackbar `Switched to "X". Undo`, table updates optimistically, Resume rail updates.
- Tap `Activate` `Undo` → reverts.
- Tap `Delete` on a plan → confirm modal → delete works.
- Filter chips narrow the visible plans; persist across page reload.
- Sort changes order; persist across page reload.

---

## Phase 5 — Modal components (2 hours)

### 5.1 `CompleteWeekModal.tsx`

**File:** `apps/web/src/app/user/plan/CompleteWeekModal.tsx`

Reuses `<Overlay>` from `@/components/signal/overlay`.

```tsx
import { Overlay } from '@/components/signal/overlay';
import { signalTokens } from '@lib/signal/tokens';
import { fetchJson } from '@lib/fetchWrapper';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface CompleteWeekModalProps {
  open: boolean;
  weekNumber: number;
  done: number;
  total: number;
  incompleteWorkoutNames: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function CompleteWeekModal({
  open, weekNumber, done, total, incompleteWorkoutNames, onClose, onSuccess,
}: CompleteWeekModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await fetchJson('/api/plan/active/complete-week', { method: 'POST' });
      router.refresh();
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay
      open={open}
      onClose={onClose}
      size="sm"
      accentRail
      ariaLabelledBy={`complete-week-title-${weekNumber}`}
      ariaDescribedBy={`complete-week-body-${weekNumber}`}
    >
      <div /* eyebrow */>Confirm · current week</div>
      <h2 id={`complete-week-title-${weekNumber}`} /* title styling */>
        Complete week {weekNumber}?
      </h2>
      <div id={`complete-week-body-${weekNumber}`} /* body styling */>
        <div /* mono 12 */>{done} of {total} sessions logged</div>
        {done < total ? (
          <>
            <div>Marking {incompleteWorkoutNames.length} unfinished workout(s) as complete:</div>
            <ul /* mono 12 list styling */>
              {incompleteWorkoutNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </>
        ) : (
          <div>All sessions logged. Confirm to close out the week.</div>
        )}
      </div>
      <footer /* footer styling: ghost left, primary right */>
        <button onClick={onClose} disabled={loading}>Keep going</button>
        <button onClick={handleConfirm} disabled={loading}>Complete week {weekNumber}</button>
      </footer>
    </Overlay>
  );
}
```

Verify the `<Overlay>` prop signature in `apps/web/src/components/signal/overlay/Overlay.tsx` and adapt — the props above are illustrative. Look at `LibraryClient.tsx` for a real usage example.

After success: emit a live-region announce `Week {n} complete` (use whatever existing live-region utility the codebase has — search for `role="status"` or `aria-live`).

### 5.2 `DeletePlanModal.tsx`

**File:** `apps/web/src/app/user/plan/DeletePlanModal.tsx`

Same pattern — `<Overlay>` wrapper, title + body + footer.

```tsx
export interface DeletePlanModalProps {
  open: boolean;
  plan: { id: number; name: string } | null;
  isActive: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}
```

Body copy:

```
All logged workouts under this plan will be lost.
{isActive && 'This is your active plan — deleting will clear your active selection.'}
```

Footer: ghost `Cancel` (left), `Delete plan` primary using `signalTokens.status.urgent` fill with `palette.surface` text.

### 5.3 Wire modals into WeekSelectorCard

In `WeekSelectorCard.tsx`:

```tsx
const [completeWeekOpen, setCompleteWeekOpen] = useState(false);

// Header button:
{canShowCompleteWeek && (
  <button onClick={() => setCompleteWeekOpen(true)}>Complete week</button>
)}

// At bottom of component:
<CompleteWeekModal
  open={completeWeekOpen}
  weekNumber={activeWeek?.order ?? 0}
  done={activeWeek?.workouts.filter((w) => w.dateCompleted).length ?? 0}
  total={activeWeek?.workouts.length ?? 0}
  incompleteWorkoutNames={activeWeek?.workouts.filter((w) => !w.dateCompleted).map((w) => w.name) ?? []}
  onClose={() => setCompleteWeekOpen(false)}
/>
```

For the mobile "Complete week" strip in `WeekSelectorCard`, render the same button (full width) below the Resume hero. Same `setCompleteWeekOpen` toggle.

### 5.4 Wire `Complete week` into `WorkoutsListView` (workouts list SPA view)

When the user is at `/user/workout?weekId=X` and that week is the active week with incomplete workouts, surface a `Complete week` button at the top of the workouts list. Same `CompleteWeekModal` component (import + render).

**File to touch:** `apps/web/src/app/user/workout/WorkoutsListView.tsx`.

Pass the necessary data (current week, active week id) from `WorkoutClient` as a prop or derive from existing `userDataState`.

### 5.5 Verify

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | rg "(CompleteWeekModal|DeletePlanModal)"
# Expect: no output.

npm run dev
# Test the full Complete-week flow on /user/plan/[id]/weeks
# Test Delete flow on /user/plan
```

---

## Phase 6 — Touch-ups (1 hour)

### 6.1 Update `signal/navItems.ts` if needed

Verify the Training tab still points at `/user/workout` (it does as of this writing — see `apps/web/src/components/signal/navItems.ts:23`). No change needed; the `/user/workout` redirect handles routing.

### 6.2 Update prop drilling on existing plan-list callsites

`apps/web/src/app/user/plan/page.tsx` and `apps/web/src/app/user/coach/clients/[clientId]/plans/page.tsx` may need to:

- Pass `isCompleted` (computed server-side) on each plan, OR
- Pass full `PlanPrisma` with weeks (so client can derive).

Whichever you chose in Phase 4.3, apply to both pages. Pre-existing tests for these pages may need adjusting.

### 6.3 Remove the `Change plan` link from any stale spots

The earlier round added a `Change plan` link to `WeeksListView.tsx` (the signal MUI branch). Since that file is being deleted in Phase 3.4, this is moot. But if any other component references "Change plan" copy, grep and clean:

```bash
rg "Change plan" apps/web/src
```

### 6.4 Verify

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
# Expect: no NEW errors in files we touched. Pre-existing errors in unrelated files (auth.test.ts etc.) are fine.

npm run lint -- --filter apps/web   # or whatever the lint command is
```

---

## Phase 7 — E2E test rework (3 hours)

The earlier round left these tests in a partially-updated state. Now we need to bring them all in line with the new routing.

### 7.1 Files to update

1. `apps/web/tests/e2e/WorkoutClient.test.ts`
2. `apps/web/tests/e2e/highValueJourneys.test.ts`
3. `apps/web/tests/e2e/accessibility-guards.test.ts`
4. `apps/web/tests/e2e/workoutSignal.test.ts`
5. `apps/web/tests/e2e/AppBar.test.ts`
6. New: `apps/web/tests/e2e/PlansListCard.test.ts` (if you want fresh coverage of the new design — recommended)
7. New: `apps/web/tests/e2e/WeekSelectorCard.test.ts` (coverage for the new route — recommended)

### 7.2 Pattern updates across all files

**Replace** any pattern like:

```ts
await page.goto('/user/workout');
await page.getByRole('button', { name: /Plan/i }).first().click();
await page.getByRole('button', { name: /Week/i }).first().click();
```

with:

```ts
// Either navigate to weeks directly
await page.goto(`/user/plan/${planId}/weeks`);
await page.getByRole('button', { name: /Week/i }).first().click();
// or hit the workout flow via the workouts list URL
await page.goto(`/user/workout?weekId=${weekId}`);
```

**Replace** the existing test `redirects to /user/plan when no active plan` with:

```ts
test('shows the no-active-plan empty state when no active plan is set', async ({ page }) => {
  await clearActivePlan(page);
  await page.goto('/user/workout');
  await expect(page).toHaveURL('/user/workout');
  await expect(page.getByText('No active plan').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /View plans/i })).toBeVisible();
});
```

**Replace** `back button from weeks navigates to /user/plan` with a test that navigates from `/user/plan/[id]/weeks` and clicks `<` (browser back via the in-card crumb).

### 7.3 New tests (recommended additions)

**`PlansListCard.test.ts`:**

- `signal user sees the new planning surface table at /user/plan`
- `tapping a row navigates to the editor`
- `tapping Activate on an inactive plan updates the active state and shows an undo snackbar`
- `tapping Delete opens the confirmation modal; confirming deletes the plan`
- `filter chips narrow the visible rows`
- `sort dropdown reorders rows`
- `filter and sort persist across page reload (localStorage)`
- `Resume rail visible on desktop with active plan; hidden on mobile`

**`WeekSelectorCard.test.ts`:**

- `signal user lands at /user/plan/[id]/weeks and sees the weeks table`
- `Edit plan button routes to /user/plan/[id]`
- `Resume button routes to /user/workout?workoutId=X`
- `Complete week opens the confirm modal; confirming marks workouts complete`
- `direct URL to non-active plan shows "Activate this plan" CTA`
- `coach context shows Edit plan only — no Complete / Resume / Activate buttons`

### 7.4 Verify

```bash
# Run the affected E2E files. Use the run-e2e skill if needed.
npx playwright test tests/e2e/WorkoutClient.test.ts
npx playwright test tests/e2e/highValueJourneys.test.ts
# … etc.
```

Then a full sweep:

```bash
npm run check  # runs API index + test + lint + build per CLAUDE.md
```

This **must** pass before opening the PR.

---

## Phase 8 — Manual QA pass (1 hour)

### 8.1 Acceptance checklist (mirrors spec §12)

**PlansListCard:**

- [ ] Visit `/user/plan` (signal on) → new design renders. No gym dark tokens visible.
- [ ] Header: eyebrow, title, subtitle, `+ New plan`. No Archive button.
- [ ] Filter rail: 4 chips + sort. Click each chip — rows narrow. Refresh — selection persists.
- [ ] Change sort — rows reorder. Refresh — selection persists.
- [ ] Tap row → editor opens.
- [ ] Tap `Activate` on inactive row → snackbar with Undo, row updates to ACTIVE.
- [ ] Tap `Delete` → modal opens, copy varies for active vs inactive.
- [ ] Resume rail at bottom of table (desktop user, active plan only).
- [ ] Resume rail's `Resume {workout}` button routes to `/user/workout?workoutId=X`.
- [ ] Resume rail's `View weeks` routes to `/user/plan/[id]/weeks`.
- [ ] Mobile (<1024px): cards stack, no Resume hero, Activate + trash icon present.
- [ ] Coach view: visit `/user/coach/clients/[id]/plans` → new design. Eyebrow uses client name. `+ Plan for {name}` button. Resume rail shows `View weeks` only.

**WeekSelectorCard:**

- [ ] Visit `/user/plan/[active]/weeks` (signal on) → new design renders.
- [ ] Header: crumb, title, subtitle (with active dot), 3 buttons.
- [ ] Tap `Edit plan` → editor opens.
- [ ] Tap `Resume {workout}` → `/user/workout?workoutId=X` opens.
- [ ] Tap `Complete week` → modal opens with recap of incomplete workouts.
- [ ] Confirm `Complete week` → workouts mark complete, modal closes, page refreshes, active row marker moves to next week (or to no row if all done).
- [ ] Tap a non-active week row → `/user/workout?weekId=X` opens (workouts list).
- [ ] Direct URL to non-active plan's weeks: hide Resume + Complete; show `Activate this plan`.
- [ ] Coach view: `Edit plan` only. No Resume / Complete / Activate.
- [ ] Mobile: title + meta + Resume hero (gated) + Complete week strip (gated) + week rows.
- [ ] Resize 1200 → 600 — layout swaps; focused row preserved.

**`/user/workout` router:**

- [ ] `/user/workout` with active plan → redirects to `/user/plan/[active]/weeks`.
- [ ] `/user/workout` with no active plan → renders empty state, Training nav still highlighted.
- [ ] `/user/workout?workoutId=X` with no active plan → still renders the workout (deep-link survives).
- [ ] `/user/workout?weekId=X` → workouts list SPA.
- [ ] Back from exercise detail → workouts list (SPA back).
- [ ] Back from workouts list → `/user/plan/[active]/weeks`.

**Tokens:**

- [ ] `tokens.ts` exports `radii.pill: 2`.
- [ ] Components use `tokens.space.desktopBreakpointPx` (1024) — no hard-coded 960 or 1024.

### 8.2 Browser console check

Open DevTools on each page. Expect: zero errors, zero React warnings, zero hydration mismatches.

### 8.3 Accessibility spot check

- Tab through `/user/plan` table — focus order is sensible, focus ring visible.
- Tab through the Complete-week modal — focus trapped, Esc closes.
- Screen-reader test: VoiceOver on Mac says "row, active, …" for the active row.

---

## Phase 9 — PR prep (30 min)

### 9.1 Commit hygiene

Atomic commits per CLAUDE.md. Suggested commit structure (one phase per commit):

1. `feat(tokens): add radii.pill: 2`
2. `refactor(workout): redirect router + simplify WorkoutClient SPA`
3. `feat(plan): WeekSelectorCard component + new /user/plan/[id]/weeks route`
4. `feat(coach): mirror /user/coach/clients/[id]/plans/[planId]/weeks route`
5. `refactor(plan): rewrite PlansListCard signal-branch (table + filter rail + Activate/Delete + Resume rail)`
6. `feat(plan): CompleteWeekModal + DeletePlanModal components`
7. `test(e2e): rework workout + plans flows for new routing`

Push as one PR; the commits are for review legibility.

### 9.2 PR description

Use this template:

```
## Summary
- New `/user/plan/[planId]/weeks` route + coach mirror replacing the embedded SPA drill-down.
- `PlansListCard` signal-branch rewrite: table layout, per-row Activate/Delete, filter+sort rail, Resume rail.
- `WorkoutClient` SPA simplified — only workout↔exercise depth remains.
- `CompleteWeekModal` + `DeletePlanModal` (new); existing dashboard CompleteWeekButton untouched.
- E2E suite reworked for new routing.

## Spec
See `docs/design/signal-plans-week-selector.md` for the decisions log and `docs/design/signal-plans-week-selector-implementation.md` for the implementation guide.

## Test plan
- [ ] /user/plan renders new design (signal); old MUI design unchanged (signal off).
- [ ] /user/plan/[active]/weeks renders new WeekSelectorCard.
- [ ] /user/workout redirects when active plan set; renders empty state otherwise.
- [ ] Activate / Delete / Complete-week flows work.
- [ ] Coach mirror routes work; no logging-verb buttons.
- [ ] All E2E green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 9.3 Hand-off

Tag for code review. Spec doc + implementation plan + PR description should be sufficient context for the reviewer.

---

## Risks & gotchas

1. **`WorkoutClient` SPA simplification is the highest-risk change.** It touches offline-cache, optimistic-mutations, and the history-stack code. **Test offline flow manually** (DevTools → Application → Service Workers → Offline) before declaring it done.
2. **`SignalSurface` prop signature** — verify the `surface="planning"` prop is supported. If only `gym` exists, you may need to extend the component.
3. **`PlansListCard` prop API** — the current callsites pass `plans: PlanListItem[]` (a custom shape). Phase 4.3 needs to either upgrade the shape or pass `isCompleted` server-side. **Update both callsites consistently** — a half-update will break the coach page.
4. **Plan-delete endpoint path** — verify before implementing the modal. May be `DELETE /api/plan/[id]`, `POST /api/plan/[id]/delete`, or something else entirely.
5. **`useAppBar` on the MUI variant** — easy to forget. Without it, the MUI weeks page has no app-bar title.
6. **History stack on the workout SPA** — the existing `history.pushState` seed loop must not regress. Test browser back from exercise detail → workouts list → weeks (URL change to /user/plan/[id]/weeks).
7. **Optimistic Activate undo** — if the user clicks `Undo` after navigating away from `/user/plan`, the snackbar disappears. Acceptable (matches MUI Snackbar UX).
8. **Coach `activePlanId`** — the coach's view of "active plan" means the **client's** active plan, not the coach's. Don't accidentally use the coach's session activePlanId on the coach mirror route.
9. **The `Switched to … Undo` snackbar** — needs an action button in the snackbar. Verify the existing Snackbar component supports `action` prop, or build a custom one inline.
10. **Pre-existing TypeScript errors** in `auth.test.ts`, `savePlanTreeDiff.test.ts`, etc. — leave them. They're not yours to fix in this PR.

---

## Open follow-ups (not this PR)

- Consolidate `CompleteWeekButton` (dashboard) with `CompleteWeekModal` (new pages). TODO comment in the dashboard component.
- Add archive support (schema + UI).
- Add block / phase grouping.
- Add deload week flag.
- Add Top-set Δ analytics.
- Add Duplicate / Rename to the per-row affordances (probably a kebab returns, see Q13).
- Drop the non-signal MUI branch globally if Signal rollout is complete.
