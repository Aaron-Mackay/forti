---
name: run-e2e
description: Run Playwright E2E tests for the Forti app against a local PostgreSQL database and dev server. Use whenever asked to run E2E tests or verify test coverage.
allowed-tools: Bash
---

# Run E2E Tests (Forti)

This skill sets up the full local test environment and runs Playwright E2E tests.
It is safe to re-run at any point mid-session.

## Environment Overview

- **DB:** Local PostgreSQL 16 on `localhost:5432` (user `postgres`, password `postgres`)
- **Dev server:** `http://localhost:3000` (must be running for Playwright)
- **Seed data:** Two demo users — `aaron@example.com` and `bob@example.com` (bob = demo login)
- **Auth state:** Saved NextAuth session at `playwright/.auth/user.json`

---

## Step 1 — Start PostgreSQL

The cluster starts stopped in web sessions. Starting it is idempotent.

```bash
pg_ctlcluster 16 main start 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true
```

---

## Step 2 — Ensure `.env.local` points at local DB

Check whether `.env.local` already has a localhost `DATABASE_URL`. If not, write it:

```bash
if ! grep -q "localhost" .env.local 2>/dev/null; then
  cat > .env.local <<'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
NEXTAUTH_SECRET=local-dev-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=dummy
GOOGLE_CLIENT_SECRET=dummy
EOF
  echo "Wrote .env.local for local DB"
fi
```

---

## Step 3 — Seed the database

Idempotent — safe to re-run even if already seeded.

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run seed 2>&1 | tail -5
```

---

## Step 4 — Start the dev server (if not already running)

Check if port 3000 is in use. If not, start the server and wait for it to be ready.

```bash
if lsof -i :3000 -t &>/dev/null; then
  echo "Dev server already running on :3000"
else
  echo "Starting dev server..."
  npm run dev > /tmp/nextjs.log 2>&1 &
  DEV_PID=$!
  echo "Dev server PID: $DEV_PID"

  # Wait up to 60s for Next.js to print "Ready"
  for i in $(seq 1 60); do
    if grep -q "Ready" /tmp/nextjs.log 2>/dev/null; then
      echo "Dev server ready after ${i}s"
      break
    fi
    sleep 1
  done
fi
```

---

## Step 5 — Run Playwright tests

```bash
# One file
npx playwright test tests/e2e/dashboard.test.ts

# Multiple files
npx playwright test tests/e2e/plans.test.ts tests/e2e/calendar.test.ts

# All E2E tests
npx playwright test tests/e2e/

# With headed browser (useful for debugging)
npx playwright test tests/e2e/dashboard.test.ts --headed
```

**Note:** Use `npx playwright test` directly (not `npm run test:e2e`) when the dev
server is already running on :3000. `npm run test:e2e` boots its own server and
will conflict.

---

## Step 6 — Kill the dev server (when done)

```bash
kill $(lsof -i :3000 -t) 2>/dev/null || true
```

---

## Full Setup Script (copy-paste)

```bash
# 1. Start Postgres
pg_ctlcluster 16 main start 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true

# 2. Ensure .env.local
if ! grep -q "localhost" .env.local 2>/dev/null; then
  cat > .env.local <<'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
NEXTAUTH_SECRET=local-dev-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=dummy
GOOGLE_CLIENT_SECRET=dummy
EOF
fi

# 3. Seed
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run seed 2>&1 | tail -5

# 4. Start dev server if needed
if ! lsof -i :3000 -t &>/dev/null; then
  npm run dev > /tmp/nextjs.log 2>&1 &
  for i in $(seq 1 60); do
    grep -q "Ready" /tmp/nextjs.log 2>/dev/null && break
    sleep 1
  done
  echo "Dev server ready"
fi

# 5. Run tests
npx playwright test tests/e2e/<file>.test.ts
```

---

## Available E2E Test Files

| File | Coverage |
|------|----------|
| `tests/e2e/AppBar.test.ts` | Navigation bar behaviour |
| `tests/e2e/WorkoutClient.test.ts` | Active workout interface |
| `tests/e2e/dashboard.test.ts` | Dashboard page |
| `tests/e2e/calendar.test.ts` | Calendar & day metrics |
| `tests/e2e/plans.test.ts` | Training plan editor |
| `tests/e2e/login.test.ts` | Auth / login flow |
| `tests/e2e/coachLink.test.ts` | Coach-client invitation flow |
| `tests/e2e/exercises.test.ts` | Exercise library |
| `tests/e2e/settings.test.ts` | User settings |

---

## Notes

- The `session-start.sh` hook already runs steps 1–3 at session open, so in a
  fresh session the DB is typically already seeded and `.env.local` is correct.
- If a `db:reset` was run mid-session, re-run steps 1–3 before testing.
- E2E tests import `{ test, expect }` from `./fixtures` — not directly from
  `@playwright/test`. This ensures unhandled page errors fail the test.
- Playwright strict mode: locators must resolve to exactly one element. Use
  `.first()` / `.nth(n)` when the same component appears in a carousel/Swiper.
