# E2E Parallelization Implementation Plan

Date: 2026-05-12

## Goal

Restore Playwright parallelism without flaky cross-test interference.

The current suite uses shared seeded users and mutates shared `User.settings`, coach/client relationships, plans, supplements, events, and other user-owned records. Running files or browser projects in parallel lets one spec reset or rewrite state while another spec is loading. The target state is:

- each worker gets isolated authenticated users
- role and feature-flag state is applied by fixtures, not ambient global setup
- mutable test data is namespaced and cleaned up deterministically
- E2E coverage focuses on browser behavior, with API-only checks moved lower in the test pyramid

## Current Stabilization

Run E2E with one worker until isolation is in place:

```ts
fullyParallel: false,
workers: 1,
```

This is intentionally temporary. It trades runtime for deterministic CI while the suite is still sharing mutable state.

## Phase 1: Inventory And Classify Tests

Create a small inventory of every E2E file with these fields:

- `auth`: logged-out, test user, demo user, demo coach, custom coach/client
- `mutatesUserSettings`: yes/no
- `mutatesDomainData`: yes/no
- `requiresSeedData`: yes/no
- `browserProjects`: chromium only, mobile chromium, mobile safari, all projects
- `shouldRemainE2E`: yes/no

Immediate candidates to move out of Playwright:

- tests that only call `page.request.*` and assert API responses
- tests that assert service-level persistence without browser interaction
- repeated static label checks after the same navigation

## Phase 2: Add Test-Only Auth For Explicit Users

Extend the test credentials provider to accept a whitelisted E2E email outside production.

Requirements:

- enabled only when `ENABLE_TEST_AUTH=true`
- never enabled in production
- accepts explicit email and role/scenario
- creates missing users with deterministic baseline settings
- does not reuse public demo users

Example target API flow:

```ts
await signInAsTestUser(page, {
  email: `e2e-user-${runId}-w${workerIndex}@example.com`,
  name: `E2E User ${workerIndex}`,
});
```

Keep one small login spec for public `Try Demo` / `Try Demo (Coach)` UI coverage. All other CI specs should use direct test auth.

## Phase 3: Introduce Worker-Scoped Auth Fixtures

Replace ad hoc login helpers and global settings resets with worker-scoped fixtures.

Target fixtures:

- `userPage`
- `coachPage`
- `signalUserPage`
- `signalCoachPage`
- `coachClientPair`

Fixture responsibilities:

- create or locate worker-scoped users
- sign in through test auth
- apply baseline settings to only that worker's user
- create coach/client links when needed
- expose IDs/emails for API setup and cleanup

Avoid unconditional global settings patches in the base `page` fixture. A spec that starts logged out should stay logged out until it explicitly signs in.

## Phase 4: Namespace Mutable Data

Every object created by E2E should be identifiable by run and worker.

Suggested namespace:

```ts
const testPrefix = `e2e-${process.env.GITHUB_RUN_ID ?? 'local'}-w${testInfo.workerIndex}`;
```

Use it in created records:

- plan names
- learning plan titles
- supplement names
- event names
- library asset titles
- check-in test notes

Cleanup rules:

- prefer cleanup by returned IDs inside `afterEach`
- add a best-effort worker cleanup by prefix in `afterAll`
- never delete broad seeded/demo data

## Phase 5: Remove Seed Coupling

Tests should not assume Jeff/Todd/demo seeded state except for the tiny public demo login smoke tests.

For each E2E feature:

- create the minimum data needed for the browser flow
- avoid relying on ordering of seeded records
- avoid assertions like "lists at least one seeded item" unless the setup created that item

Coach/client specs should create a worker-scoped coach/client pair and link them directly through setup APIs or seed helpers.

## Phase 6: Split Project Matrix By Value

Do not run every spec on every browser/device.

Recommended matrix:

- `chromium`: full critical journey suite
- `Mobile Chrome`: mobile-specific layout/navigation specs only
- `Mobile Safari`: a small smoke set for routing, auth, and one critical mobile journey

Use Playwright `testMatch` or tags instead of runtime `test.skip()` where practical. This reduces skip noise and avoids executing setup for irrelevant projects.

## Phase 7: Re-Enable Parallelism Gradually

After Phases 2-6:

1. Run targeted worker-isolated specs with `workers: 2`.
2. Run the full chromium suite with `workers: 2`.
3. Re-enable `fullyParallel: true`.
4. Increase CI workers only after several green runs.

Target config:

```ts
fullyParallel: true,
workers: process.env.CI ? 2 : undefined,
```

If flakes return, treat them as isolation bugs. Do not paper over them with retries unless the failure is proven to be external infrastructure.

## Alternative Path: Private Database Per CI Shard

A feasible alternative is to provision a private Postgres database for each CI shard and seed it from scratch before that shard starts Playwright.

This is heavier than account-level isolation, but it is a strong short-term stabilizer because it removes cross-shard contamination from shared seeded users and domain records.

Target shape:

```txt
CI shard 1 -> DATABASE_URL=postgres://.../forti_e2e_<run_id>_shard_1
CI shard 2 -> DATABASE_URL=postgres://.../forti_e2e_<run_id>_shard_2
CI shard 3 -> DATABASE_URL=postgres://.../forti_e2e_<run_id>_shard_3
```

Per shard lifecycle:

```bash
createdb forti_e2e_${GITHUB_RUN_ID}_${SHARD_INDEX}
npx prisma db push --accept-data-loss
npm run seed
npm run build
CI=true ENABLE_TEST_AUTH=true NEXTAUTH_SECRET=ci-e2e-secret-not-for-production \
  NEXTAUTH_URL=http://localhost:3000 \
  npx start-server-and-test start http://localhost:3000 \
  "npx playwright test --shard=${SHARD_INDEX}/${SHARD_TOTAL} --project=chromium"
dropdb forti_e2e_${GITHUB_RUN_ID}_${SHARD_INDEX}
```

Important limitation:

- Shard-private databases solve cross-shard interference.
- They do not solve same-shard worker interference if two Playwright workers still mutate the same `testuser@example.com`, demo coach, or `User.settings` row.

Recommended use:

- Short term: shard-private DBs with `workers: 1` inside each shard for stable CI.
- Medium term: add worker-scoped users/fixtures, then raise each shard to `workers: 2`.
- Long term: combine shard-private DBs with explicit user fixtures and reduced browser matrix.

This option is most attractive if CI already has cheap Postgres service containers. If using a remote managed database, creating/dropping per-shard databases may require extra privileges and cleanup safeguards.

## Acceptance Criteria

- no E2E spec mutates public demo users except demo login smoke coverage
- no base fixture mutates authenticated state for logged-out tests
- each parallel worker uses a distinct user or coach/client pair
- full chromium E2E passes with `workers: 2` for at least three consecutive CI runs
- mobile projects run only mobile-relevant specs
- deleted/pruned Playwright specs have equivalent unit/API coverage where behavior remains important

## Preferred Order Of Work

1. Add explicit test-auth helper and worker-scoped user factory.
2. Convert high-flake suites first: learning plans, coach review, coach clients, settings, supplements, workout settings.
3. Remove global settings reset from the base fixture after converted suites own their state.
4. Move API-only Playwright specs to route/service tests.
5. Re-enable two-worker CI for chromium.
6. Rework mobile project matching and reduce skip-heavy execution.
