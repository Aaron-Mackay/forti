# Stage 5 "Signal" — handover

State of the redesign as of the last working session. All work is on `main`, pushed.

## What's shipped

| Commit | Slice | What it does |
| --- | --- | --- |
| `361ac4a` | Review doc | `docs/design/stage5-signal-review.md` — implementation risks, missing schema, reusable vs replacement components, slicing plan, and the eight decisions answering the design's open questions. Read this before continuing. |
| `6249019` | **Slice 1** — foundation | Signal design tokens (`apps/web/src/lib/signal/tokens.ts`), `next/font` wiring (Inter Tight / Archivo Narrow / JetBrains Mono with CSS variables), three MUI theme variants (gym / planning / calm), shell components (`SignalAppShell`, `SignalSidebar`, `SignalBottomNav`, `SignalTopBar`, `SignalModeSwitch`, `ForftiWordmark`, `SignalIcon`), nav-items map, and a login-gated `/dev/signal-shell` preview harness. No production routes touched. |
| `ee52f14` | **Slice 2** — flag plumbing | Adds `User.settings.signalUiEnabled: boolean` (zod-validated in `packages/shared/src/contracts/userSettings.ts`, parsed in `parseDashboardSettings`, default `false`). `protected-layout.tsx` always loads settings now and routes the chrome through `SignalShellSwitch`, which picks `SignalAppShell` (flag on) or the existing `AppBarProvider` (flag off). `useAppBar()` already optional-chains its context, so unmigrated pages no-op cleanly. |
| `01ec6f7` | **Slice 3** — check-in review (theme-only) | Both check-in detail routes (`/user/coach/check-ins/[id]` and `/user/coach/clients/[clientId]/check-ins/[id]`) wrap `CoachCheckInDetailPageClient` with `SignalSurface(calm)` when the flag is on. Existing structure and every feature preserved — the wrapper only swaps to the calm MUI theme and paints the warm-bone surface. Adds `loadSignalFlag` (React-cached server helper) so multiple pages share a single settings read. |
| `e7ae106` | **Slice 4** — workout logging (Signal-native) | New per-exercise slide (`apps/web/src/app/user/workout/signal/`) with tappable exercise title (dashed underline + info glyph + "Tap for form notes & history"), single previous-workout summary line (date · top set · volume), 38 px set cells in a 24/1fr/1fr/28 grid with signal-tinted glow on the active set's reps cell, and a single "Next exercise → X" CTA with long-press skip. Tap-on-header opens a bottom sheet with notes, e1rm progress, muscle highlight, and full previous-workouts table. Page wrapped in `SignalSurface(gym)`. Simple non-cardio exercises only — grouped (supersets) and cardio fall back to legacy slides. |
| `7cd81c4` | **Slice 5** — plan editor (theme-only) | Wraps `/user/plan/[planId]` with `SignalSurface(planning)`. Drag-and-drop, the `WorkoutEditor` reducer, and the existing set/rep column layout are kept exactly as-is — Signal MUI theme inherits down (chartreuse primary, sentence-case buttons, hairline borders, tabular numerals) and the warm bone background paints behind. |
| `7f1beff` | Settings toggle | New "Experimental UI" section in `/user/settings` with a Switch that flips `signalUiEnabled` via the standard `updateSetting` flow. Optimistic update + abort-in-flight + error rollback come for free. |
| `eda7d53` | **Slice 6** — My Training Home | Replaces the existing `/user` dashboard with a Signal command centre when the flag is on. Hero card with Resume / Start CTA (server-side detection: workout where `dateCompleted` is null and any set has weight or reps logged ⇒ resume), empty states for no-plan / week-complete, compact 4-cell week strip with NOW / TODAY pills, 4-tile metrics row (Weight / Sleep / Steps / Cals — tiles link to `/user/check-in`), 2 px block-progress rule. Legacy dashboard stays live for unflagged users. |

To exercise the flag end-to-end: `/user/settings` → "Experimental UI" → "Use Signal UI". Or PATCH `/api/user/settings` with `{settings: {signalUiEnabled: true}}`.

## Working architecture

- **Tokens / theme:** `apps/web/src/lib/signal/{tokens,fonts,theme}.ts`. Three palettes — gym (dark), planning (light bone), calm (warm bone). One chartreuse signal. Per-route surfaces are applied via `SignalSurface(surface)` wrapping a page's content.
- **Chrome routing:** `apps/web/src/components/signal/SignalShellSwitch.tsx`, mounted in `protected-layout.tsx`. Chooses Signal vs legacy chrome per-request based on the user's flag.
- **Per-page surface override:** `apps/web/src/components/signal/SignalSurface.tsx`. Server components pass `signalEnabled` (from `loadSignalFlag()`) plus `surface`; the wrapper nests a Signal MUI ThemeProvider and paints the surface bg.
- **Cross-domain mode switch:** `SignalModeSwitch` plus `useCrossDomainUrl` use the existing `coach.*` subdomain navigation. Mode pill is single-host-compatible *visually*; clicking it cross-navigates per the existing rules. Subdomain collapse is deferred (decision 1).
- **Dev preview:** `/dev/signal-shell` is login-gated and `notFound()` in production builds (`VERCEL_ENV === 'production'`).

## Conventions to preserve

- New Signal components live alongside their legacy counterparts; never edit a legacy component to reskin it. Decision 3 is "side-by-side with flag" — if you find yourself touching a legacy component, you're probably doing it wrong.
- Pages that need a non-default surface: `loadSignalFlag()` server-side, then wrap in `<SignalSurface signalEnabled={…} surface="…">`. Don't add a second prisma query for settings — `loadSignalFlag` is React-cached per request.
- Function-typed props on Signal client components trigger Next's "use-client entry serializability" *warnings*. They are warnings, not errors, and don't fail lint or build. Don't rename to `*Action` — they aren't server actions.
- ESLint's `react-hooks/immutability` flags `window.location.href = …` and `document.cookie = …` *inside* component bodies. Move side-effecting writes into a plain `.ts` utility (see `modeSwitchActions.ts`) and the rule is satisfied.
- Pre-commit runs `npm run check` (api:index + test + lint + build). Don't bypass it.
- All commit messages so far are written in the slice / "what + why" voice. Match it.

## What's left

### Screens not yet built

| Screen | Priority | Notes |
| --- | --- | --- |
| **Coach Home** (`/user/coach`) | High | Doesn't exist. Task inbox — Submitted check-ins + Plan maintenance. New aggregator endpoint required (no schema). No business KPIs, no Messages. |
| **Client Overview** (`/user/coach/clients/[clientId]`) | Medium | Header, 3-up snapshot, pending check-in banner, tabbed surface. Today renders a different layout. |
| **Progress** (`/user/progress`?) | Medium | New surface. Strength / Bodyweight / Adherence / Block tabs with up to 5 focus exercises. **Depends on `User.settings.progress.focusExerciseIds: number[]` (≤5)** — schema-side decision is JSON in settings (decision 4). |
| **Plan creation entry** (`/user/plan/create`) | Medium | 4-card grid (Template / AI / Spreadsheet / Scratch), all visually equal. |
| **Finish workout — unlogged sets sheet** | Medium | Bottom-sheet warning with explicit skipped-set list per Forti rules. Currently the legacy `WorkoutCompletionModal` still runs. |
| **Notifications** (`/user/notifications`) | Low | Spec'd in components, not designed. |
| **More menu** (mobile) | Low | Grouped list (Account / Training / Coached-only). Not yet designed. |
| **Empty states** | Low | No focus exercises, no clients, no plan, first-time user. |

### Slices done at theme-only that may want a deeper rebuild

- **Check-in review** (Slice 3) — calm surface only. Spec's two-column layout, serif italic notes, ink-framed reply card all deferred. Owner intentionally flagged the design as under-specified for this surface.
- **Plan editor** (Slice 5) — Signal drafting-table look (mono headers on tinted surface, serif italic note column, "Save Week" filled-ink, allow-editing toggle) deferred. Allow-editing also depends on schema (`Plan.clientCanEdit`).

### Workout logging deferred work (Slice 4)

To restore on the Signal slide once placement is decided (likely the detail sheet):
- Effort metrics (RPE / RIR) per set
- Warmup suggestions
- Plate calculator
- BFR / Added / Sub chips, exercise substitute menu, unit-override menu
- Coach-note inline italic quote (needs schema for coach notes attached to a workout exercise)
- Grouped exercises (supersets) and cardio currently fall back to legacy slides

### Schema / API additions needed

| Item | Unblocks | Decision |
| --- | --- | --- |
| `Plan.clientCanEdit` (or equivalent) | Plan editor "Allow plan editing" toggle + lock banner; Signal-spec drafting-table view | Decision 5 — required schema addition |
| `WeeklyCheckIn.coachReviewedAt` | Check-in review "feedback sent" cue | Decision 6 — replaces "read receipts" |
| `User.settings.progress.focusExerciseIds: number[]` (≤5) | Progress focus list | Decision 4 — JSON, not a new table |
| Coach Home inbox aggregator | Submitted check-ins + Plan maintenance feed | New endpoint; no schema |
| Last-3-sessions API shape (`date · top set · volume`) | Re-add 3-session preview if the team wants it (Slice 4 is currently 1 line) | Likely a contract tweak only |
| New-PRs count + block-ending cue | Finish summary, Client Overview "block ends Friday" | Pure read-side, no schema |

### Architectural / cross-cutting

- **Mode-switch single-host collapse** — deferred per Slice 1 instruction. Eventually replaces the `coach.*` subdomain handling in `proxy.ts` + `protected-layout.tsx`. Real architectural decision; cookie/session scoping needs review.
- **Coach mobile shell** — `<1024 px` coach experience. Bottom nav already wired (Home / Clients / Library / More) but not visually validated on a real device.
- **Nutrition top-level** — design dropped it; per decision 2 it stays. Not yet addressed in the Signal nav. Adding a 5th slot or folding into More is the choice point.
- **Per-page titles under Signal** — `useAppBar(...)` no-ops under the Signal shell. There's no per-page header band yet. Pages lose their dashboard-style titles. Decide whether to add a Signal header band or live with mono breadcrumbs in content.

### Test coverage to add

- E2E for the Signal flows under flag: workout single-CTA + long-press skip + detail sheet, check-in review, plan editor, Home Resume vs Start states, settings toggle round-trip.
- A11y assertions against the contrast ratios the spec lists.
- Visual regression on migrated routes — one snapshot per screen at mobile + desktop.

### Cleanup tasks

- `/dev/signal-shell` harness can come out once enough routes are migrated.
- The `__dev_coach_mode` cookie path in `SignalModeSwitch` is a localhost-only fallback; revisit when the subdomain split collapses.
- The Signal slide's "Cals" tile in `SignalHome` is a placeholder — there's no calorie target on the metric, just the value. Replace with custom-metric pick once focus-exercises / custom-metrics integration lands.

## Recommended next slice

**Coach Home (`/user/coach`)** — high-value, no schema additions, all data exists. The aggregator query is straightforward (Submitted check-ins + Plan maintenance triggers like "block ends in N days"). It's also the screen most clearly spec'd for the planning surface on desktop, so it lets the team validate that surface in production after Slice 5's theme-only treatment.

If you'd rather pay down deferred behaviour on shipped slices, **Workout logging — restore effort metrics / warmups / plate calc into the Signal detail sheet** is the cheapest follow-up.

## Where to start reading

1. `docs/design/stage5-signal-review.md` — review and decisions
2. This file (handover)
3. `apps/web/src/lib/signal/` — tokens, fonts, theme, server flag loader
4. `apps/web/src/components/signal/` — shell, surface, switch, mode pill
5. Slice-specific code under `apps/web/src/app/user/{workout,_components}` and `apps/web/src/app/user/coach/check-ins/`
