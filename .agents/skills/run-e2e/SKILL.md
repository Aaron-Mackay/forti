---
name: run-e2e
description: Run Forti Playwright E2E tests in CI-parity mode against the configured .env database, reproduce shard failures, and verify fixes locally before push.
allowed-tools: Bash
---

# Run E2E (CI-Parity First)

Use this workflow whenever asked to debug, reproduce, or verify E2E failures.
Default goal: reproduce the failing CI behavior locally, fix, and confirm green before commit/push.

## Preconditions

- Use `.env` as the single env source (do not create or use `.env.local`).
- Ensure dependencies are installed (`npm install`) and Playwright browsers are present.
- Assume DB is remote (Neon or equivalent) unless user explicitly says local DB.

## 1) Sync DB schema and seed expected state (required before every parity run)

Run these first to align data-state with CI expectations:

```bash
npx prisma db push --accept-data-loss
npm run seed
npm run build
```

Notes:
- `prisma db push` may fail if DB connectivity is blocked (VPN, firewall, DNS). Resolve network first.
- Neon compute can be suspended; any successful DB client command should wake it.

## 2) Run exact CI-parity command (always escalated)

Use `start-server-and-test` with production start and CI env vars.
Run this command with escalated permissions by default to avoid sandbox Chromium launch failures (`mach_port_rendezvous ... Permission denied (1100)`):

```bash
CI=true ENABLE_TEST_AUTH=true NEXTAUTH_SECRET=ci-e2e-secret-not-for-production NEXTAUTH_URL=http://localhost:3000 npx start-server-and-test start http://localhost:3000 "npx playwright test --project=chromium"
```

For shard reproduction:

```bash
CI=true ENABLE_TEST_AUTH=true NEXTAUTH_SECRET=ci-e2e-secret-not-for-production NEXTAUTH_URL=http://localhost:3000 npx start-server-and-test start http://localhost:3000 "npx playwright test --shard=1/3 --project=chromium"
```

Swap shard index as needed (`1/3`, `2/3`, `3/3`).

## 3) Debug loop for failing tests

1. Re-run just the failing spec/test with same CI env flags.
2. Prefer deterministic selectors scoped to `main`/active panels; avoid nav/sidebar ambiguity.
3. Avoid brittle assumptions about seeded state:
- if action may not exist in current seed, gate assertion or skip with explicit reason.
- if thresholds are design-token-dependent, use the explicit accepted minimum used in app/tests.
4. Re-run full failing shard command until green.

## 4) Verify before push

Minimum verification:

```bash
# failing shard reproduced and now green
CI=true ENABLE_TEST_AUTH=true NEXTAUTH_SECRET=ci-e2e-secret-not-for-production NEXTAUTH_URL=http://localhost:3000 npx start-server-and-test start http://localhost:3000 "npx playwright test --shard=<N>/<TOTAL> --project=chromium"
```

When requested, run all shards locally (sequentially):

```bash
CI=true ENABLE_TEST_AUTH=true NEXTAUTH_SECRET=ci-e2e-secret-not-for-production NEXTAUTH_URL=http://localhost:3000 npx start-server-and-test start http://localhost:3000 "npx playwright test --shard=1/3 --project=chromium"
CI=true ENABLE_TEST_AUTH=true NEXTAUTH_SECRET=ci-e2e-secret-not-for-production NEXTAUTH_URL=http://localhost:3000 npx start-server-and-test start http://localhost:3000 "npx playwright test --shard=2/3 --project=chromium"
CI=true ENABLE_TEST_AUTH=true NEXTAUTH_SECRET=ci-e2e-secret-not-for-production NEXTAUTH_URL=http://localhost:3000 npx start-server-and-test start http://localhost:3000 "npx playwright test --shard=3/3 --project=chromium"
```

## 5) Git hygiene

- Commit only intentional test/app changes.
- Do not commit local agent/tooling folders unless explicitly asked (`.agents/`, `.codex/`).
- Push only after CI-parity local pass for the targeted shard(s).

## Quick triage commands

```bash
# Show unresolved local changes
git status --short

# Locate flaky/brittle selectors quickly
rg -n "getByRole\(|first\(\)|nth\(|test\.skip|toBeVisible\(" tests/e2e -S

# Re-run a single failing file in CI-parity mode
# Ensure schema/seed/build were run first
# npx prisma db push --accept-data-loss
# npm run seed
# npm run build
CI=true ENABLE_TEST_AUTH=true NEXTAUTH_SECRET=ci-e2e-secret-not-for-production NEXTAUTH_URL=http://localhost:3000 npx start-server-and-test start http://localhost:3000 "npx playwright test tests/e2e/<file>.test.ts --project=chromium"
```
