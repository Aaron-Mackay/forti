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
npm run seed             # Seed database with demo data only

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

---

## Commit Discipline

Prefer atomic commits — one logical change per commit. When implementing
multiple distinct concerns (new utility, refactor, security fix, etc.),
split them into separate commits. Each intermediate commit must still pass
`npm run check`.

---

## Directory Structure

```
forti/
├── src/
│   ├── app/                 # Next.js App Router pages + API routes
│   │   ├── api/             # Backend route handlers
│   │   ├── user/            # Authenticated user pages
│   │   │   ├── calendar/    # Calendar view + day metrics
│   │   │   ├── plan/        # Training plan management
│   │   │   └── workout/     # Active workout interface
│   │   ├── exercises/       # Exercise library
│   │   ├── library/         # Library management
│   │   ├── login/           # Login page
│   │   └── report-bug/      # Bug report form
│   ├── components/          # Shared UI components (AppBar, Loading, etc.)
│   ├── context/             # React context (WorkoutEditorContext)
│   ├── lib/                 # Core utilities, hooks, and providers
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Standalone utilities (offline sync, CSV import)
│   ├── testUtils/           # Test helpers
│   └── middleware.ts        # Auth guard for all routes
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script (2 demo users + full data)
├── tests/
│   ├── e2e/                 # Playwright E2E tests
│   └── ToggleableEditableField.test.tsx
├── public/                  # Static assets (icons, manifest, SVGs)
├── .husky/pre-commit        # Git hook: runs npm run check
├── next.config.js           # Next.js config (SVGR webpack rule)
├── vitest.config.mts        # Vitest config
├── playwright.config.ts     # Playwright config
└── .eslintrc.js             # ESLint config
```

---

## API Routes

All routes live under `src/app/api/` and follow Next.js App Router conventions:

| Route | Purpose |
|---|---|
| `api/auth/[...nextauth]` | NextAuth handler (Google + Demo login) |
| `api/dayMetric` | CRUD for daily health metrics |
| `api/event`, `api/event/[id]` | Calendar event management |
| `api/plan` | Training plan CRUD |
| `api/plans/count` | Count user's plans |
| `api/saveUserWorkoutData` | Bulk save workout session data |
| `api/sets/[setId]` | Update individual exercise sets |
| `api/users` | User management |
| `api/report-bug` | Bug report submission (uses mailersend) |
| `api/workout/[workoutId]` | Workout CRUD |
| `api/workoutExercise/[workoutExerciseId]` | Workout exercise management |
| `api/exercises/[exerciseId]/previous-sets` | Fetch previous sets for an exercise |
| `api/exerciseNote/[exerciseId]` | Exercise notes CRUD |

All API routes that require authentication must call `requireSession()` from `src/lib/requireSession.ts`.

---

## Authentication

**Middleware** (`src/middleware.ts`): Checks for `next-auth.session-token` cookie and redirects unauthenticated users to `/login`. Allows public access to `/login`, `/_next`, `/api/auth`, and any file with an extension.

**Auth config** (`src/lib/auth.ts`):
- **Google OAuth** — requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
- **Demo login** — looks up `bob@example.com` in the DB (seeded by `npm run seed`)
- **Session strategy:** JWT. The user's DB `id` is embedded in the token and exposed via `session.user.id`.

**Server-side session check:** Use `requireSession()` in API routes. Use `getLoggedInUser()` to retrieve the full `User` from DB.

---

## Database Schema

The database uses PostgreSQL via Prisma. Key relationships:

```
User
 ├── Plan[]           (ordered by `order` field)
 │    └── Week[]      (ordered by `order` field)
 │         └── Workout[]    (ordered by `order` field)
 │              └── WorkoutExercise[]  (ordered by `order` field)
 │                   └── ExerciseSet[]  (ordered by `order` field)
 ├── Event[]          (calendar events: BlockEvents and CustomEvents)
 ├── DayMetric[]      (one per user per date)
 └── UserExerciseNote[]  (one per user per exercise)

Exercise  (global, not user-scoped; unique by name+category)
 └── WorkoutExercise[]
 └── UserExerciseNote[]

User --[coach]--> User  (self-relation for coach-client feature)
```

**Ordering convention:** Many models use an integer `order` field with a `@@unique([parentId, order])` constraint to maintain sequence. When inserting or reordering, update these carefully.

**Schema changes:** After editing `prisma/schema.prisma`, run:
```bash
npm run rebuild-prisma   # prisma db push && prisma generate
```

---

## Key Library Files

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config, export `authOptions` |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/api.ts` | Fetch wrapper + API utility functions |
| `src/lib/fetchWrapper.ts` | HTTP client wrapper used in lib/api.ts |
| `src/lib/dateUtils.ts` | Date manipulation helpers |
| `src/lib/dayMetrics.ts` | Day metric business logic |
| `src/lib/events.ts` | Calendar event helpers |
| `src/lib/theme.ts` | MUI theme configuration |
| `src/lib/confirmPermission.ts` | Authorization checks for resource access |
| `src/lib/requireSession.ts` | Server-side session guard for API routes |
| `src/lib/getLoggedInUser.ts` | Retrieve full User record from session |
| `src/lib/useWorkoutEditor.ts` | Custom hook managing workout editor state |
| `src/lib/providers/AuthProvider.tsx` | React context wrapping SessionProvider |
| `src/context/WorkoutEditorContext.tsx` | Workout editor state (used across workout pages) |

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

Test files are co-located with source files or in `tests/`:
```
src/lib/api.test.ts
src/lib/dateUtils.test.ts
src/lib/dayMetrics.test.ts
src/lib/events.test.ts
src/lib/fetchWrapper.test.ts
src/lib/useWorkoutEditor.test.ts
src/utils/clientDb.test.ts
src/utils/offlineSync.test.ts
src/utils/sheetUpload.test.ts
src/utils/userPlanMutators.test.ts
src/app/api/workout/[workoutId]/route.test.ts
src/app/api/exercises/[exerciseId]/previous-sets/route.test.ts
src/app/user/workout/Stopwatch.test.tsx
src/app/user/workout/ExercisesListView.test.tsx
src/app/user/workout/ExerciseDetailView.test.tsx
tests/ToggleableEditableField.test.tsx
```

### E2E Tests (Playwright)

- **Config:** `playwright.config.ts`
- **Location:** `tests/e2e/`
- **Browsers:** Chromium, Firefox, WebKit
- **Run command:** `npm run test:e2e` (boots dev server on port 3000 first)
- Tests: `AppBar.test.ts`, `WorkoutClient.test.ts`

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
DATABASE_URL=           # PostgreSQL connection string (Neon or local)
GOOGLE_CLIENT_ID=       # Google OAuth client ID
GOOGLE_CLIENT_SECRET=   # Google OAuth client secret
NEXTAUTH_SECRET=        # Random secret for JWT signing
NEXTAUTH_URL=           # Full URL of the app (e.g. http://localhost:3000)
```

For local development with a local PostgreSQL instance:
```bash
npm run local-db   # Connect via psql
```

---

## Seed Data

Running `npm run seed` (or `npm run db:reset` for a full reset) creates:

- **2 demo users:** Aaron (`aaron@example.com`) and Bob (`bob@example.com`)
- **Bob** is the demo login user (accessed without a password via the Demo button)
- Each user gets: 2 training plans, 2–3 weeks per plan, 2 workouts per week, exercises with sets, 4 calendar events, and 60 days of daily metrics

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
- **Coach-client:** A `User` can have a `coachId` pointing to another user. Coaches can view client plans.
- **Mobile-first UI:** Uses `dvh` (dynamic viewport height) units for mobile compatibility. Calendar and some pages use bottom drawers on mobile.
- **Vercel Analytics:** `@vercel/analytics` and `@vercel/speed-insights` are integrated in the app layout.
