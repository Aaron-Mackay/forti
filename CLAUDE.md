# CLAUDE.md — Forti Codebase Guide

This file provides context for AI assistants working on the Forti codebase.

---

## Project Overview

**Forti** is a full-stack fitness tracking web application. Users can plan and execute weekly workouts, log daily health metrics, manage training blocks (Bulk, Cut, Deload, etc.), and view historical trends. It also supports a coach-client relationship model.

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Prisma ORM (Neon serverless in production)
- **Auth:** NextAuth.js (Google OAuth + demo credentials)
- **UI:** Material-UI (MUI) v7 with Emotion
- **Deployment:** Vercel

---

## Essential Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000

# Testing
npm run test             # Run unit tests (Vitest)
npm run test:e2e         # Run E2E tests (Playwright, starts dev server first)

# Code quality
npm run lint             # ESLint check
npm run check            # Run tests + lint + build (what pre-commit runs)

# Database
npm run db:reset         # Force-reset DB, regenerate Prisma client, seed data
npm run rebuild-prisma   # Push schema changes and regenerate Prisma client
npm run seed             # Seed database (2 demo users + full data)
npm run seed:demo        # Seed demo data only (Jeff Demo's account)

# Local DB access
npm run local-db         # psql -h localhost -U postgres -d postgres

# Build
npm run build            # Next.js production build
npm run start            # Start production server
```

---

## Git & Pre-commit

A Husky pre-commit hook runs `npm run check` before every commit:

```
npm run check = npm run test && npm run lint && npm run build
```

All three must pass for a commit to succeed. Do not bypass with `--no-verify`.

**Before committing — run affected E2E tests:** If the commit creates, modifies, or could affect any E2E test file (or the UI/pages those tests cover), run the relevant test file(s) with Playwright before committing:

```bash
# If a dev server is already running on port 3000:
npx playwright test tests/e2e/<affected>.test.ts

# Otherwise start one first:
npm run dev &   # wait for ready, then run above
```

All affected E2E tests must pass before the commit is made.

**After visual changes — prompt for manual testing:** When a change affects visible UI behaviour that cannot be verified by automated tests (e.g. touch interactions, tooltip rendering, animations, chart behaviour), output a "Manual Test Required" block at the end of your response before asking the user to commit. Format:

```
## Manual Test Required

Steps:
1. Start the dev server: `npm run dev`
2. Open [URL / page] in the browser (or Chrome DevTools with touch emulation)
3. [Specific interaction to test]
4. Expected result: [what should happen]

Confirm the above before committing.
```

**PRs for UI-touching changes must include manual test steps in the PR body.** When creating a pull request that affects any UI (components, pages, styles, interactions), include a `## Manual Test Required` section at the bottom of the PR body using the same format above. This is read by a GitHub Action to automatically create a QA task in ClickUp. If there are genuinely no manual steps needed, omit the section entirely.

---

## Commit Discipline

Prefer atomic commits — one logical change per commit. When implementing
multiple distinct concerns (new utility, refactor, security fix, etc.),
split them into separate commits. Each intermediate commit must still pass
`npm run check`.

---

## Directory Structure

```
src/app/          # Next.js App Router — pages (user/, coach/[code]/, login/, exercises/) + api/
src/components/   # Shared UI components
src/lib/          # Hooks, providers, utilities (see Key Library Files table)
src/types/        # Shared TypeScript interfaces
src/utils/        # Standalone utilities (offline sync, CSV, AI plan parser)
prisma/           # schema.prisma + seed.ts
tests/e2e/        # Playwright E2E tests
```

---

## API Routes

All routes live under `src/app/api/` and follow Next.js App Router conventions:

| Route | Purpose |
|---|---|
| `api/auth/[...nextauth]` | NextAuth handler (Google + Demo login) |
| `api/calendar-data` | Calendar sync data |
| `api/check-in` | GET/POST weekly check-in |
| `api/check-in/current` | GET current week's check-in + day metrics + previous week photo URLs |
| `api/check-in/photos` | POST upload a progress photo (front/back/side) for current week's check-in |
| `api/coach` | GET/PUT coach info |
| `api/coach/activate` | POST to generate a coach invite code |
| `api/coach/clients/[clientId]` | GET client data (coach access) |
| `api/coach/check-ins` | GET client check-ins list (coach) |
| `api/coach/check-ins/[id]/notes` | PATCH coach notes on a check-in |
| `api/coach/request` | GET/POST coach link requests |
| `api/coach/request/[requestId]` | PATCH accept/reject a coach request |
| `api/coach/unlink` | POST to remove a client |
| `api/notifications` | GET all notifications + unread count for logged-in user |
| `api/notifications/[id]/read` | PATCH mark a single notification read |
| `api/notifications/read-all` | PATCH mark all notifications read |
| `api/cron/check-in-reminders` | Cron job — sends weekly reminder emails (secured by `CRON_SECRET`) |
| `api/dayMetric` | CRUD for daily health metrics |
| `api/event`, `api/event/[id]` | Calendar event management |
| `api/exerciseNote/[exerciseId]` | Exercise notes CRUD |
| `api/exercises/[exerciseId]/previous-sets` | Fetch previous sets for an exercise |
| `api/exercises/[exerciseId]/previous-cardio` | Fetch previous cardio data for an exercise |
| `api/exercises/[exerciseId]/e1rm-history` | E1RM history for progress sparkline |
| `api/exercises` | GET (scoped to user + global) / POST exercise creation |
| `api/exercises/enrich` | POST — Haiku AI call to enrich new exercise names with category + muscle data |
| `api/plan` | Training plan CRUD |
| `api/plan/ai-import` | POST — AI-generated plan import via Claude API |
| `api/plans/count` | Count user's plans |
| `api/push/subscribe` | POST to register a web push subscription |
| `api/report-bug` | Bug report submission (uses MailerSend) |
| `api/saveUserWorkoutData` | Bulk save workout session data |
| `api/sets/[setId]` | Update individual exercise sets |
| `api/user-data` | GET full user data dump |
| `api/export/training-data` | GET training plans as CSV |
| `api/export/metrics` | GET daily metrics as CSV |
| `api/export/check-ins` | GET weekly check-in history as CSV |
| `api/user/settings` | PATCH user settings (dashboard/workout/check-in toggles) |
| `api/users` | User management |
| `api/target-templates` | GET (backwards lookup active template for current user) / POST (create or update template for given effectiveFrom) |
| `api/workout/[workoutId]` | Workout CRUD |
| `api/workoutExercise/[workoutExerciseId]` | Workout exercise management |

All API routes that require authentication must call `requireSession()` from `src/lib/requireSession.ts`.

---

## Authentication

**Proxy** (`src/proxy.ts`): Checks for `next-auth.session-token` cookie and redirects unauthenticated users to `/login`. Allows public access to `/login`, `/_next`, `/api/auth`, and any file with an extension.

**Auth config** (`src/lib/auth.ts`):
- **Google OAuth** — requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
- **Demo login** — looks up `jeff@example.com` in the DB (seeded by `npm run seed`)
- **Session strategy:** JWT. The user's DB `id` is embedded in the token and exposed via `session.user.id`.

**Server-side session check:** Use `requireSession()` in API routes. Use `getLoggedInUser()` to retrieve the full `User` from DB.

---

## Database Schema

The database uses PostgreSQL via Prisma. Key relationships:

```
User
 ├── Plan[]              (ordered by `order` field)
 │    └── Week[]         (ordered by `order` field)
 │         └── Workout[]        (ordered by `order` field)
 │              └── WorkoutExercise[]  (ordered by `order` field)
 │                   └── ExerciseSet[]  (ordered by `order` field)
 ├── Event[]             (calendar events: BlockEvents and CustomEvents)
 ├── DayMetric[]         (one per user per date; actuals only — no target columns)
 ├── TargetTemplate[]    (versioned day-of-week target pattern; @@unique([userId, effectiveFrom]))
 │    — stepsTarget, sleepMinsTarget (uniform); effectiveFrom always a Monday
 │    └── TargetTemplateDay[]  (7 rows per template; caloriesTarget/proteinTarget/carbsTarget/fatTarget per ISO weekday)
 ├── UserExerciseNote[]  (one per user per exercise)
 ├── WeeklyCheckIn[]     (one per user per ISO week start; @@unique([userId, weekStartDate]))
 │    — subjective ratings (1–5): energyLevel, moodRating, stressLevel, sleepQuality,
 │      recoveryRating, adherenceRating; workout counts; weekReview text; coach feedback
 ├── PushSubscription[]  (web push endpoints; @@index([userId]))
 └── CoachRequest[]      (pending/rejected requests; clientId is unique)

Exercise  (global, not user-scoped; unique by name+category)
 └── WorkoutExercise[]
 └── UserExerciseNote[]

User --[coach]--> User  (self-relation for coach-client feature)

AiUsageLog (userId, createdAt) — rate-limiting/monitoring for AI plan generation
```

**Ordering convention:** Many models use an integer `order` field with a `@@unique([parentId, order])` constraint to maintain sequence. When inserting or reordering, update these carefully.

**Schema changes:** After editing `prisma/schema.prisma`, run:
```bash
npm run rebuild-prisma   # prisma db push && prisma generate
```

---

## Key Library Files

> **Keep this table current.** When adding a new shared helper to `src/lib/`, add a row here in the same commit.

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config, export `authOptions` |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/api.ts` | Fetch wrapper + API utility functions |
| `src/lib/fetchWrapper.ts` | HTTP client wrapper used in lib/api.ts |
| `src/lib/firstWeekEvents.ts` | Client-side one-time first-week analytics event tracking (`trackFirstWeekEvent`) |
| `src/lib/clientApi.ts` | Client-side typed API wrappers (`saveUserWorkoutData`, `savePlan`) |
| `src/lib/dateUtils.ts` | Date manipulation helpers |
| `src/lib/dayMetrics.ts` | Day metric business logic |
| `src/lib/events.ts` | Calendar event helpers |
| `src/lib/theme.ts` | MUI theme configuration |
| `src/lib/confirmPermission.ts` | Authorization checks for resource access |
| `src/lib/coachNutrition.ts` | Shared coach-client nutrition access/query helper (`getCoachClientNutritionData`) |
| `src/lib/targetTemplates.ts` | Backwards-lookup helpers for `TargetTemplate`: `getActiveTemplateForWeek`, `upsertTargetTemplate`, `getMacrosByDow`, `getAllTemplatesForUser` |
| `src/lib/supplementVersions.ts` | Backwards-lookup helper for `SupplementVersion`: `SupplementWithVersions` type, `supplementWithVersions` include const, `getActiveVersion` |
| `src/lib/requireSession.ts` | Server-side session guard for API routes |
| `src/lib/getLoggedInUser.ts` | Retrieve full User record from session |
| `src/lib/queries.ts` | Ownership-chain DB helpers: `getWorkoutWithOwner`, `getWorkoutExerciseWithOwner`, `getSetWithOwner` |
| `src/lib/exerciseQueries.ts` | Shared Prisma helpers: exercise-history routes + `findOrCreateExercise` (user-private exercise lookup/create) |
| `src/lib/apiResponses.ts` | Standardised error response factories (`errorResponse`, `notFoundResponse`, etc.) |
| `src/lib/apiSchemas.ts` | Zod schemas for day metric and event payloads |
| `src/lib/planSchemas.ts` | Zod schemas for workout plan import/export |
| `src/lib/apiError.ts` | `extractErrorMessage`, `isPrismaNotFound` helpers |
| `src/lib/e1rm.ts` | Epley formula: `computeE1rm(weight, reps)` |
| `src/lib/workoutProgress.ts` | `getWorkoutStatus`, `getWeekStatus`, `getPlanStatus` helpers |
| `src/lib/checkInUtils.ts` | `getWeekStart`, `getCheckInDate`, `toDateOnly` — check-in date utilities |
| `src/lib/notifications.ts` | Email (MailerSend) + web push helpers for check-in reminders |
| `src/lib/useWorkoutEditor.ts` | Custom hook managing workout editor state |
| `src/lib/hooks/api/useApiGet.ts` | Generic GET hook — `{data, loading, error}`; pass `null` URL to defer |
| `src/lib/hooks/api/useExerciseList.ts` | Lazy-loads exercise list; exposes `{exercises, loading, addExercise}` |
| `src/lib/hooks/api/usePlanCount.ts` | Thin wrapper around `useApiGet` for plan count |
| `src/lib/hooks/api/useNotifications.ts` | Fetches notifications + unread count; exposes `{notifications, unreadCount, loading, markRead, markAllRead}` with 60s polling |
| `src/lib/hooks/useApiMutation.ts` | Generic mutation hook — `{mutate, loading, error, data, reset}` |
| `src/lib/hooks/useOfflineCache.ts` | Hydrates/primes IndexedDB cache for offline-capable pages |
| `src/lib/usePushSubscription.ts` | Manages browser push permission + subscription registration |
| `src/lib/providers/AuthProvider.tsx` | React context wrapping SessionProvider |
| `src/lib/providers/AppBarProvider.tsx` | Persistent AppBar context; exposes `useAppBar({ title, showBack?, onBack? })` for client components; use `<AppBarTitle>` (src/components/AppBarTitle.tsx) for server component pages |
| `src/lib/providers/SettingsProvider.tsx` | Manages user settings state; exposes `useSettings()` hook |
| `src/lib/providers/CoachClientsProvider.tsx` | Fetches coach's client list when `coachModeActive`; exposes `useCoachClients()` returning `{ clients, loading }` |
| `src/context/WorkoutEditorContext.tsx` | Workout editor state: `state`, `dispatch`, `debouncedDispatch`, `allExercises`, `addExercise` |
| `src/types/dataTypes.ts` | Prisma type helpers (`UserPrisma`, `PlanPrisma`, etc.) + exercise constants |
| `src/types/checkInTypes.ts` | Check-in interfaces, `computeMetricSummary`, `formatSleepMins` |
| `src/utils/aiPlanParser.ts` | AI plan response schema + `AiParseError` for `api/plan/ai-import` |
| `src/utils/csvExport.ts` | `escapeCsvCell`, `buildCsv` — UTF-8 BOM CSV builder used by export API routes |

---

## Offline Support

The app has client-side offline functionality:

- **`src/utils/clientDb.ts`** — IndexedDB wrapper for local storage
- **`src/utils/offlineSync.ts`** — Syncs pending changes to the server when back online
- **`src/components/NetworkStatusBanner.tsx`** — Displays offline indicator

Tests for these use `fake-indexeddb` to mock IndexedDB in the jsdom environment.

---

## Testing

### Unit Tests (Vitest)

- **Config:** `vitest.config.mts` — uses jsdom environment, `@testing-library/react`
- **Setup file:** `vitest-setup.ts` — loads `@testing-library/jest-dom` matchers
- **Globals:** enabled (no need to import `describe`, `it`, `expect`)
- **Path aliases:** resolved via `vite-tsconfig-paths` (same as `tsconfig.json`)
- **Coverage threshold:** 80% on statements, branches, functions, and lines

Test files are co-located with source files or in `tests/`. Use `glob **/*.test.ts` or `**/*.test.tsx` to find them.

### E2E Tests (Playwright)

- **Config:** `playwright.config.ts`
- **Location:** `tests/e2e/`
- **Browsers:** Chromium, Firefox, WebKit
- **Run command:** `npm run test:e2e` (boots dev server on port 3000 first)
- Tests: `AppBar.test.ts`, `WorkoutClient.test.ts`, `dashboard.test.ts`, `calendar.test.ts`, `plans.test.ts`, `login.test.ts`, `coachLink.test.ts`, `exercises.test.ts`, `settings.test.ts`

**IMPORTANT — UI changes require E2E tests:** When adding or modifying UI components or pages, E2E tests covering the new or changed behaviour must be added or updated in the same commit. Place tests in `tests/e2e/<page>.test.ts`, mirroring the page being changed. Always import `test` and `expect` from `./fixtures` (not directly from `@playwright/test`) so that unhandled page errors automatically fail the test:

```ts
import { test, expect } from './fixtures';
```

**New pages/routes:** When adding a new page route, also update any local AI testing or agent configuration files that maintain a route inventory so automation stays aware of the new page.

**Playwright strict mode:** Playwright locators are strict — if a locator matches more than one element the call throws at runtime, even inside `expect()`. This is the most common source of broken E2E tests.

Rules:
- Prefer semantic locators (`getByRole`, `getByLabel`, `getByText` with a unique string) — they are naturally more specific.
- Any locator that **could** match multiple elements must be narrowed immediately at the call site:
  ```ts
  page.getByRole('listitem').first()          // ✅ narrowed
  page.getByText(/W\d+ ·/).first()            // ✅ narrowed
  page.getByRole('dialog').first()            // ✅ narrowed (MUI may render extras)
  page.locator('.fc-day-future').first()      // ✅ narrowed — multiple day cells
  page.getByRole('listitem')                  // ❌ matches every list item
  page.getByText('Week')                      // ❌ likely matches many
  ```
- When narrowing with `.first()`, add a brief inline comment explaining why (e.g. `// multiple day cells`).
- `eslint-plugin-playwright` is configured in `eslint.config.mjs` and runs via `npm run lint` (which covers `src/` and `tests/`). It catches quality issues but **cannot detect strict mode violations statically** — they are runtime errors. Audit every locator you write.

**Do NOT rely on Jeff/Todd seed data in E2E tests.** All E2E tests authenticate as TestUser (`testuser@example.com`), not as Jeff Demo. Jeff's seeded records (library assets, coach relationship with Todd, check-ins, etc.) are invisible to TestUser. Tests that assert on user-specific data will fail silently or flake. Always create and clean up test data via the API in `beforeEach`/`afterEach` — see `supplements.test.ts` for the canonical pattern. Global seed data that exists for *all* users (e.g. the exercises list from `exercises.json`) is safe to use without setup.

**State-dependent tests must be serial and chromium-only.** Any test describe block whose tests mutate DB state (POST, PATCH, DELETE) should use `test.describe.configure({ mode: 'serial' })` and skip every project except desktop Chromium to avoid parallel conflicts across browser projects that share a single TestUser DB row:

```ts
test.describe.configure({ mode: 'serial' });
// inside each test:
test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');
```

Note: Mobile Chrome has `browserName === 'chromium'` AND `isMobile === true`, so both conditions are required.

---

## Linting Rules

ESLint config (`.eslintrc.js`):

- **Parser:** `@typescript-eslint/parser`
- **Extends:** `eslint:recommended`, `@typescript-eslint/recommended`, `next/core-web-vitals`, `next/typescript`
- **`react/display-name`:** off
- **`@typescript-eslint/no-unused-vars`:** error — prefix with `_` to intentionally ignore (e.g., `_unused`, `_error`)

---

## TypeScript Conventions

- **Strict mode** enabled
- **Path aliases** (configured in `tsconfig.json`):
  - `@/*` → `src/*`
  - `@lib/*` → `src/lib/*`
- Use these aliases consistently — never use relative `../../lib/` imports when `@lib/` works
- `types/` directory holds shared interfaces and type definitions
- Prefer explicit return types on exported functions

---

## Environment Variables

Required variables (create a `.env.local` file — never commit it):

```env
# Core
DATABASE_URL=                    # PostgreSQL connection string (Neon or local)
GOOGLE_CLIENT_ID=                # Google OAuth client ID
GOOGLE_CLIENT_SECRET=            # Google OAuth client secret
NEXTAUTH_SECRET=                 # Random secret for JWT signing
NEXTAUTH_URL=                    # Full URL of the app (e.g. http://localhost:3000)

# Email (MailerSend) — used for bug reports and check-in reminders
MAILERSEND_API_KEY=
MAILERSEND_FROM=                 # Sender address

# Web Push (VAPID) — used for check-in reminder push notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=                   # mailto: URI e.g. mailto:noreply@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # Client-side public key (exposed to browser)
NEXT_PUBLIC_APP_URL=             # Canonical main-app URL (e.g. https://app.forti.com); used by coach invite link to avoid pointing clients at the coach subdomain. Set in Production + Preview on Vercel; omit locally (falls back to window.location.origin)

# Cron jobs (Vercel)
CRON_SECRET=                     # Secures /api/cron/* endpoints
```

For local development with a local PostgreSQL instance:
```bash
npm run local-db   # Connect via psql
```

---

## Seed Data

Running `npm run seed` (or `npm run db:reset` for a full reset) creates three users:

- **Jeff Demo** (`jeff@example.com`) — demo login user; has plans, metrics, check-ins, and Todd as coach
- **Todd** (`todd@example.com`) — Jeff's coach; has his own plans and check-ins
- **TestUser** (`testuser@example.com`) — used exclusively by E2E tests; no pre-seeded user-specific data

---

## SVG Handling

SVGs are loaded as React components via SVGR (configured in `next.config.js`):

```tsx
import MyIcon from '@/assets/icon.svg';
// Use as: <MyIcon />
```

Type declarations for this pattern are in `svgr.d.ts`.

---

## Notable Patterns

- **Ordering:** Entities with an `order` field must maintain gapless sequential ordering within their parent. APIs and mutations must handle reordering carefully.
- **Cascade deletes:** Most child entities delete on cascade (e.g., deleting a Plan deletes all its Weeks, Workouts, Exercises, and Sets).
- **Exercise deduplication:** `Exercise` records are global and unique by `name + category`. `WorkoutExercise` is the join model linking an exercise instance to a workout.
- **Inline exercise creation:** The exercise picker (`ExercisePickerDialog`) and plan editor show a `+ Create "…"` button when a search term has no matches. On create, `useExerciseList.addExercise()` and `WorkoutEditorContext.addExercise()` optimistically append the new exercise locally without a refetch.
- **API hooks pattern:** Hooks in `src/lib/hooks/api/` use `fetchJson` and return `{data, loading, error}`. When a hook owns cached list state that callers may need to mutate, it must also expose a mutation callback (e.g. `addExercise`) rather than keeping the setter private — this prevents callers from needing to bypass the hook with their own `useState`. **This is non-negotiable: callers must never need their own `useState` to work around a hook that already owns the list.**
- **DRY for DB queries:** When 2+ API routes share the same Prisma query shape (ownership lookup, include structure, result mapping), extract it to a named helper in `src/lib/` immediately — do not copy-paste Prisma queries across routes. Add the new file to the Key Library Files table in the same commit.
- **Ownership verification:** API routes that operate on nested resources (sets, exercises, workouts) use `getSetWithOwner` / `getWorkoutExerciseWithOwner` / `getWorkoutWithOwner` from `src/lib/queries.ts` to confirm the resource belongs to the authenticated user in a single query.
- **Standardised API errors:** Use the factories in `src/lib/apiResponses.ts` (`errorResponse`, `notFoundResponse`, `forbiddenResponse`, `validationErrorResponse`) rather than inline `NextResponse.json` error construction.
- **Settings:** User settings (dashboard toggles, check-in day, etc.) are stored as a JSON column on `User`. Access via `useSettings()` from `SettingsProvider`; persist via `PATCH /api/user/settings`.
- **Coach-client:** A `User` can have a `coachId` pointing to another user. Invitation flow: coach generates a code (`/api/coach/activate`), client visits `/coach/[code]`, `CoachRequest` is created, coach accepts. Coaches can view client plans and check-ins.
- **Weekly check-in:** Users submit a weekly `WeeklyCheckIn` (subjective ratings + review). Coaches receive an email alert and can add notes. A Vercel cron job (`0 7 * * *`) sends reminder emails via MailerSend. Push notifications are also supported via the VAPID/web-push stack.
- **Mobile-first UI:** Uses `dvh` (dynamic viewport height) units for mobile compatibility. Calendar and some pages use bottom drawers on mobile.
- **Vercel cron jobs:** Configured in `vercel.json`. Secured by `CRON_SECRET` header check in each cron route handler.
- **Vercel Analytics:** `@vercel/analytics` and `@vercel/speed-insights` are integrated in the app layout.
- **Table column contract:** `Workout.tsx` uses `table-layout: fixed` with an explicit `<colgroup>`. Whenever you add or remove a `<TableCell>` from the row component (`ExerciseRow`), you must update the `<colgroup>`, `baseColumns` counter, and all header `<TableRow>`s in the same commit. Mismatches collapse cell widths silently and can make interactive elements unclickable.
- **Unit-test sets arrays with drop sets:** Any function that processes a `WorkoutExercise.sets` array must have test cases covering a mix of regular and drop sets (`isDropSet: true`). Real user data and seed data routinely contain drop sets; testing only clean fixtures will miss set-counting bugs.

---

## Tooling Notes

- Some AI assistant environments may not be able to run Playwright or a local dev server because browser automation, database access, or long-lived processes are unavailable. In those environments, do not attempt to run `npm run test:e2e` or `npx playwright test`; run the highest-signal checks the environment supports and clearly note what could not be verified.
- If your local workflow includes agent-specific skills, slash commands, hooks, or route inventories, keep those auxiliary files in sync when you add new pages or workflows. Treat those files as tooling metadata, not the source of truth for product behaviour.

---

## Working Style

For ambiguous tasks, prefer 1-2 targeted clarifying questions over broad assumptions. Good triggers:

- The task touches multiple areas with unclear scope (e.g. "add a stats page" — which stats?)
- There are meaningfully different implementation approaches with real trade-offs
- A requirement seems to conflict with an existing pattern in the codebase

Keep questions short and specific. One good question is better than several vague ones. If the intent is reasonably clear from context, proceed and note any assumptions made.

## UI Planning Rule

Before implementing any UI that is more than a simple, self-contained component
(e.g. a button, badge, input field, or icon), first propose:

1. **Layout Spec** — a brief structured list of the page or component sections,
   what content/data each contains, and any key interactions. Note any
   scroll behavior, fixed/sticky elements, or bottom nav usage.
2. **ASCII Wireframe** — a simple ASCII diagram showing the rough vertical
   layout at ~390px mobile width. Default to single-column stacking unless
   there is a clear reason for side-by-side elements.

Wait for explicit approval before writing implementation code.

### All UIs are assumed to be mobile web unless stated otherwise:
- Wireframes should reflect portrait orientation and touch interaction
- Flag any layout that would require horizontal scrolling or small tap targets

### Examples of UIs that require this step:
- Full pages or views
- Multi-section components (e.g. dashboards, modals with complex content, bottom sheets)
- Navigation structures (top nav, bottom tab bars, drawers)
- Any layout where vertical ordering or scroll behavior matters

### Examples that can skip this step:
- Buttons, badges, chips
- Single input fields or simple form controls
- Icons or small visual indicators
- Trivial wrappers or style-only changes
