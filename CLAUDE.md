# CLAUDE.md — Forti Agent Hot Path

Use this file first. It is the compact, high-signal guide for working in this repo.
For deeper details, use the focused docs linked in **Deep Docs (load only when needed)**.

---

## Agent file-targeting (check first)

Before planning edits or running broad searches, check the targeted index:

- [`docs/agent/index.md`](./docs/agent/index.md)

Keep this index updated when major feature areas or top-level domains are added.

---

## Project Overview

**Forti** is a full-stack fitness tracking web app for users and coaches.

- Track workouts, plans, metrics, check-ins, and progress history.
- Supports coach-client linking, feedback, reminders, and notifications.
- Stack: Next.js 16 (App Router), React 19, TypeScript strict, Prisma + PostgreSQL, NextAuth, MUI v7.

---

## Essential Commands

```bash
# Dev
npm run dev

# Quality
npm run test
npm run lint
npm run build
npm run check

# E2E
npm run test:e2e
npx playwright test tests/e2e/<affected>.test.ts

# DB
npm run rebuild-prisma
npm run db:reset
npm run seed
npm run seed:demo
npm run local-db
```

---

## Critical Invariants (Do Not Violate)

All routes live under `src/app/api/` and follow Next.js App Router conventions.
The endpoint index is auto-generated at `docs/agent/api-index.md` via `npm run api:index`.
Update route code/contracts and regenerate the index instead of manually editing route prose in this file.

### Auth & access
- Use `requireSession()` for authenticated API routes.
- Use ownership-check helpers for nested resources (`getSetWithOwner`, `getWorkoutExerciseWithOwner`, `getWorkoutWithOwner`).

### API contracts
- Shared request/response contracts belong in `src/lib/contracts/`, not route files.
- Client code must not import from `src/app/api/**/route.ts`.
- Prefer shared zod schemas for route input and output; keep API error shapes standardized via `src/lib/apiResponses.ts`.

### Ordering/data integrity
- Models with `order` fields must remain gapless and consistent within parent scope.
- Be careful with reorder/insert operations and compound unique constraints.

### Exercise model
- `Exercise` is global (not user-scoped), unique by `name + category`.
- User-specific context belongs in join/user tables (e.g., workout exercise rows, notes).

### Settings + templates
- User settings are persisted on `User.settings` JSON and mutated via `/api/user/settings`.
- Nutrition targets are versioned with `TargetTemplate` + `TargetTemplateDay` and `effectiveFrom` semantics.

### Testing expectations
- If your change affects UI behavior/pages, run relevant E2E coverage in addition to unit/lint/build.
- Use Playwright fixtures from `tests/e2e/fixtures` (`import { test, expect } from './fixtures';`).

### Commit and pre-commit
- Husky pre-commit runs `npm run check` (test + lint + build).
- Do not bypass pre-commit hooks.
- Prefer atomic commits (one logical concern per commit).

---

## Repo Map (Quick Navigation)

- `src/app/` — App Router pages and API handlers.
- `src/components/` — reusable UI components.
- `src/lib/` — shared server/client utilities, hooks, providers, API helpers.
- `src/lib/contracts/` — shared API DTO schemas and inferred types.
- `src/types/` — shared TS interfaces and data types.
- `src/utils/` — standalone utilities (CSV, offline sync, AI parsing, etc.).
- `prisma/` — schema + seed scripts.
- `tests/e2e/` — Playwright scenarios.

---

## Key Shared Files (high traffic)

- `src/lib/auth.ts` — NextAuth config.
- `src/lib/requireSession.ts` — server-side auth guard.
- `src/lib/getLoggedInUser.ts` — hydrated user lookup from session.
- `src/lib/prisma.ts` — Prisma singleton.
- `src/lib/clientApi.ts` + `src/lib/fetchWrapper.ts` — client API/fetch wrappers.
- `src/lib/eventService.ts`, `src/lib/planService.ts`, `src/lib/userService.ts` — domain service modules.
- `src/lib/apiResponses.ts` — standardized API error/response helpers.
- `src/lib/queries.ts` — ownership lookup helpers for nested resources.
- `src/lib/targetTemplates.ts` — template lookup/upsert logic.
- `src/lib/checkInUtils.ts` + `src/lib/checkInTemplate.ts` — check-in and template behavior.
- `src/lib/providers/*` — app-level client state providers.

---

## Deep Docs (load only when needed)

- API route inventory + endpoint-level contract notes moved out of this file.
  - **Read this only if task involves API endpoints, request/response shapes, or route-level auth rules.**
  - `docs/agent/api-surface.md`

- Full schema narrative, entity relationships, and data modeling details moved out of this file.
  - **Read this only if task involves Prisma models, migrations, seed semantics, ordering constraints, or data backfills.**
  - `docs/agent/data-model.md`

- Extended process guidance (testing depth, E2E discipline, UI planning/debrief expectations, working style) moved out of this file.
  - **Read this only if task involves UI changes, workflow/process expectations, or deciding verification depth.**
  - `docs/agent/workflows.md`

---

## Environment Variables (Essentials)

```env
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
MAILERSEND_API_KEY=
MAILERSEND_FROM=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

---

## Fast Start Checklist

1. Confirm scope and touched layers (UI, API, DB, contracts).
2. Open only the deep doc(s) relevant to the task.
3. Implement with invariants above (auth, contracts, ordering).
4. Run highest-signal checks for affected scope.
5. Ensure commit is atomic and passes pre-commit checks.

## Scope Notes

- This file is intentionally compact; avoid adding long catalogs here.
- Put detail-heavy guidance into `docs/agent/*` and link from the Deep Docs section.
