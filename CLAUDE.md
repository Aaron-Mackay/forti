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

**Forti** is a full-stack fitness tracking app for users and coaches with a Next.js web client and an Expo mobile client.

- Track workouts, plans, metrics, check-ins, and progress history.
- Supports coach-client linking, feedback, reminders, and notifications.
- Stack: Next.js 16 (App Router), Expo / React Native, React 19, TypeScript strict, Prisma + PostgreSQL, NextAuth, MUI v7.

---

## Essential Commands

```bash
# Dev
npm run dev
npm run dev:mobile

# Quality
npm run test
npm run lint
npm run build
npm run check
npm run test:mobile
npm run check:mobile

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
- Server endpoints may be called by either the web cookie session or the mobile bearer-token session.
- Mobile auth lives only under `/api/auth/mobile/*`; do not create mobile-specific business endpoints.

### API contracts
- Shared web-server contracts belong in `apps/web/src/lib/contracts/`, not route files.
- Cross-platform request/response contracts shared by web and mobile belong in `packages/shared/src/contracts/`.
- Client code must not import from `apps/web/src/app/api/**/route.ts`.
- Prefer shared zod schemas for route input and output; keep API error shapes standardized via `src/lib/apiResponses.ts`.
- Use structured API logging from `src/lib/logger.ts`, `src/lib/apiLogging.ts`, and `withApiRoute()` in `src/lib/routeAuth.ts`; do not add ad hoc `console.*` logging in API routes.

### Cross-platform boundaries
- Shared code intended for both web and mobile must not import `next/*`, `next-auth/react`, DOM globals, or React Native-only modules.
- Mobile screens should consume typed services/API clients, not route internals, Prisma types, or web-only hooks/providers.
- If a contract or helper is needed by both clients, promote it to `packages/shared` instead of duplicating shapes.

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
- Husky pre-commit runs `npm run check` (API index verification + test + lint + build).
- Do not bypass pre-commit hooks.
- Prefer atomic commits (one logical concern per commit).

---

## Repo Map (Quick Navigation)

- `apps/web/src/app/` — App Router pages and API handlers.
- `apps/web/src/components/` — reusable web UI components.
- `apps/web/src/lib/` — shared web server/client utilities, hooks, providers, API helpers.
- `apps/web/src/lib/contracts/` — web-owned API DTO schemas and inferred types.
- `apps/mobile/` — Expo app, mobile auth/session lifecycle, and mobile API clients.
- `packages/shared/src/` — cross-platform DTOs and pure helpers shared by web and mobile.
- `apps/web/src/types/` — shared web TS interfaces and data types.
- `apps/web/src/utils/` — standalone utilities (CSV, offline sync, AI parsing, etc.).
- `apps/web/prisma/` — schema + seed scripts.
- `apps/web/tests/e2e/` — Playwright scenarios.

## Component Placement Rules

- Route-local UI belongs in `src/app/**/_components/` when used only within that route subtree.
- Shared UI belongs in `src/components/**` and should be grouped by domain (for example `shell`, `checkin`, `fitness`, `charts`, `inputs`) instead of adding flat files.
- Promote a route-local component to `src/components/**` only when it is reused across multiple route families or by app-level providers/layout.

---

## Key Shared Files (high traffic)

- `src/lib/auth.ts` — NextAuth config.
- `src/lib/requireSession.ts` — server-side auth guard.
- `src/lib/getLoggedInUser.ts` — hydrated user lookup from session.
- `src/lib/prisma.ts` — Prisma singleton.
- `src/lib/clientApi.ts` + `src/lib/fetchWrapper.ts` — client API/fetch wrappers.
- `src/lib/eventService.ts`, `src/lib/planService.ts`, `src/lib/userService.ts` — domain service modules.
- `src/lib/apiResponses.ts` — standardized API error/response helpers.
- `src/lib/logger.ts`, `src/lib/apiLogging.ts`, `src/lib/routeAuth.ts` — structured server logging, request context, and API route wrappers.
- `src/lib/queries.ts` — ownership lookup helpers for nested resources.
- `src/lib/targetTemplates.ts` — template lookup/upsert logic.
- `src/lib/checkInUtils.ts` + `src/lib/checkInTemplate.ts` — check-in and template behavior.
- `src/lib/providers/*` — app-level client state providers.

---

## Deep Docs (load only when needed)

- API route inventory + endpoint-level contract notes moved out of this file.
  - **Read this only if task involves API endpoints, request/response shapes, or route-level auth rules.**
  - `docs/agent/api-surface.md`

- Mobile app architecture, auth/session lifecycle, and cross-platform boundaries moved out of this file.
  - **Read this only if task involves Expo/mobile, bearer auth, or deciding whether logic belongs in mobile, web, or shared packages.**
  - `docs/agent/mobile.md`

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
MOBILE_JWT_SECRET=
GOOGLE_MOBILE_CLIENT_IDS=
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

`MOBILE_JWT_SECRET` signs mobile bearer tokens; generate with `openssl rand -hex 32` and keep it distinct from `NEXTAUTH_SECRET`.

---

## Fast Start Checklist

1. Confirm scope and touched layers (UI, API, DB, contracts).
2. Open only the deep doc(s) relevant to the task.
3. Implement with invariants above (auth, contracts, ordering).
4. Run highest-signal checks for affected scope.
5. Ensure commit is atomic and passes pre-commit checks.

## Clarification-First Rule

- If any requirement, acceptance criteria, plan step, or implementation detail is ambiguous, stop and ask clarifying questions before proceeding.
- Do not make assumptions when uncertainty could change behavior, architecture, data model, scope, testing approach, or timeline.
- When asking, provide concise options and key tradeoffs so the user can answer quickly.

## Scope Notes

- This file is intentionally compact; avoid adding long catalogs here.
- Put detail-heavy guidance into `docs/agent/*` and link from the Deep Docs section.
- 
## Signal UI changes

Before editing any Signal UI code, read and follow:

- `docs/design/signal-agent-guardrails.md`

This applies when touching:

- `apps/web/src/components/signal/**`
- `apps/web/src/lib/signal/**`
- Signal branches inside `apps/web/src/app/user/**`
- any route/component using `SignalAppShell`, `SignalSurface`, or `signalTokens`

For Signal UI work:

1. Identify the route/component being changed.
2. Classify the change as page-local, shared-component, or token-level.
3. Prefer the smallest page-local change.
4. Do not introduce raw colours, arbitrary spacing, one-off card styles, or new design primitives.
5. Do not change behaviour, data fetching, routing, feature flags, permissions, or APIs for visual-only requests.
6. If a requested tweak seems to require a new shared primitive or token change, explain the proposal before implementing it.
