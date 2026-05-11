# Signal UI Manual Testing Guide

This guide explains how to seed the local/dev database, log in with scenario users, and manually test the Signal UI efficiently.

Use this alongside:

- `docs/design/signal-ui-qa-checklist.md`

## Scope

This guide covers the Forti web app in `apps/web`.

The Signal scenario picker and Signal QA seed scripts are intended for non-production only. The login picker is hidden in production, and the Signal QA seed scripts fail if run with `NODE_ENV=production` or `VERCEL_ENV=production`.

## Prerequisites

From the repository root, make sure dependencies and Prisma client generation are current:

```bash
npm install
npm run rebuild-prisma --workspace=@forti/web
```

Make sure `apps/web/.env` points at the dev database you intend to mutate. The Signal QA seeds create and delete scenario data for known demo users.

## Seed scripts

Run commands from the repository root or from `apps/web`.

From the repository root:

```bash
npm run seed:demo --workspace=@forti/web
npm run seed:signal:all --workspace=@forti/web
```

From `apps/web`:

```bash
npm run seed:demo
npm run seed:signal:all
```

### Available scripts

| Script | Purpose |
| --- | --- |
| `seed:demo` | Idempotent rich demo ecosystem: exercises, Todd Coach, Jeff/Maria/Alex clients, plans, metrics, check-ins, learning, notifications, audits. |
| `seed:signal:empty` | Creates `Signal Empty`, a completed Signal user with no product data. Useful for empty states. |
| `seed:signal:sparse` | Creates `Signal Sparse`, a user with partial plans, metrics, check-in draft, event, and one unread notification. |
| `seed:signal:edge` | Creates `Signal Edge Case`, a user with long text, dense metrics, supplement history, photo placeholders, and awkward layout states. |
| `seed:signal:coach` | Creates `Signal Coach`, plus clients for review queue, archive, empty-client, learning-plan, and client-detail testing. |
| `seed:signal:all` | Runs `seed:demo` followed by all Signal QA scenario seeds. Best default for manual testing. |

### Recommended setup command

Use this before a full manual pass:

```bash
cd apps/web
npm run seed:signal:all
npm run dev
```

Then open:

```text
http://localhost:3000/login
```

If another dev server is already using port 3000, Next may use another port. Use the port shown in the terminal.

## Logging in

On non-production builds, the login page shows a **Demo scenario** dropdown. Pick the scenario, then click **Try selected demo**.

Production does not show the dropdown. Production demo buttons still use fixed demo users only.

## Scenario users

| Scenario | Email | Role | Use for |
| --- | --- | --- | --- |
| Jeff Demo — full coached user | `jeff@example.com` | User | Main happy-path user walkthrough. Rich data across training, check-ins, nutrition, learning, notifications. |
| Maria Client — recomposition client | `maria@example.com` | User | Alternate rich client with different target/nutrition profile. |
| Alex Client — strength client | `alex@example.com` | User | Alternate rich client with strength-oriented plan/profile. |
| Signal Empty — first-run states | `signal-empty@example.com` | User | Empty states and first-value surfaces after completed onboarding. |
| Signal Sparse — partial data | `signal-sparse@example.com` | User | Partial plans, sparse metrics, draft check-in, minimal notification state. |
| Signal Edge — long text / odd data | `signal-edge@example.com` | User | Wrapping, overflow, dense data, long labels, mobile awkward states. |
| Todd Coach — full demo coach | `todd@example.com` | Coach | Rich coach demo ecosystem from `seed:demo`. |
| Signal Coach — review queue | `signal-coach@example.com` | Coach | Coach review queue, client surfaces, learning plan, client empty/archive states. |
| TestUser — deterministic E2E user | `testuser@example.com` | User | Existing deterministic regression user. |

## Efficient manual test path

Do not test every route with every account. Use the scenario users to target specific failure modes.

### Pass 1 — Full user happy path

Login as **Jeff Demo**.

Check:

```text
/user
/user/workout
/user/progress
/user/calendar
/user/check-in
/user/nutrition
/user/plan/create
/user/plan/upload
/user/learning-plans
/user/supplements
/user/notifications
/user/settings
/user/feedback
```

Purpose:

- Confirms the normal rich-data Signal experience.
- Catches broken navigation, shell regressions, and obvious presentation failures.
- Validates the highest-value user path first.

### Pass 2 — Empty states

Login as **Signal Empty**.

Check:

```text
/user
/user/workout
/user/progress
/user/calendar
/user/check-in
/user/nutrition
/user/learning-plans
/user/supplements
/user/notifications
```

Purpose:

- Confirms empty-state copy, CTAs, and layout.
- Catches assumptions that data always exists.

### Pass 3 — Sparse states

Login as **Signal Sparse**.

Check:

```text
/user/workout
/user/progress
/user/check-in
/user/nutrition
/user/calendar
/user/notifications
```

Purpose:

- Confirms partial completion states.
- Catches mixed-null metric bugs.
- Checks draft check-in and minimal notification states.

### Pass 4 — Edge layout states

Login as **Signal Edge**.

Check these routes at desktop and mobile widths:

```text
/user
/user/workout
/user/calendar
/user/check-in
/user/nutrition
/user/supplements
/user/notifications
/user/plan/[planId]
```

Purpose:

- Tests long text, dense history, wrapping, mobile overflow, and drawer/card height issues.
- This is the pass most likely to expose design breakage.

### Pass 5 — Coach review flow

Login as **Signal Coach**.

Check:

```text
/user/coach
/user/coach/clients
/user/coach/check-ins
/user/coach/check-in-template
/user/coach/learning-plans
/user/coach/clients/[clientId]/check-ins
/user/coach/clients/[clientId]/plans
/user/coach/clients/[clientId]/nutrition
/user/coach/clients/[clientId]/supplements
```

Purpose:

- Confirms coach shell mode.
- Confirms review queue versus archive behaviour.
- Confirms client detail surfaces.
- Confirms coach learning-plan and library-linked states.

### Pass 6 — Mobile-only smoke pass

Repeat only the risky routes at a narrow viewport:

```text
/user/workout
/user/calendar
/user/check-in
/user/nutrition
/user/plan/[planId]
/user/settings
/user/coach/check-ins
/user/coach/clients/[clientId]/nutrition
```

Purpose:

- Confirms scrollability.
- Confirms bottom nav/top bar interaction.
- Confirms dialogs and drawers are not hidden behind shell chrome.

## What to log while testing

For each issue, capture:

- Scenario user.
- Route.
- Viewport: desktop/tablet/mobile.
- Signal flag state.
- Expected behaviour.
- Actual behaviour.
- Screenshot or screen recording.
- Whether it reproduces after refresh.
- Whether it reproduces with a different scenario user.

Suggested issue format:

```text
Scenario: Signal Edge
Route: /user/nutrition
Viewport: mobile 390px
Expected: Daily log cards wrap and actions remain visible.
Actual: Macro card overflows horizontally and Save button is partly offscreen.
Repro: Yes after refresh.
Notes: Does not reproduce as Jeff Demo.
```

## Fast smoke checklist

If there is only time for one quick pass:

1. Run `npm run seed:signal:all`.
2. Login as **Jeff Demo** and check `/user`, `/user/workout`, `/user/calendar`, `/user/check-in`, `/user/nutrition`.
3. Login as **Signal Empty** and check `/user/workout`, `/user/progress`, `/user/notifications`.
4. Login as **Signal Edge** and check `/user/workout`, `/user/nutrition`, `/user/supplements` on mobile width.
5. Login as **Signal Coach** and check `/user/coach/check-ins`, one client detail page, and `/user/coach/learning-plans`.

## Known limitations

- These seeds are for stable data states, not transient network failure states.
- Loading and mutation failure states should be tested with Playwright route mocking, MSW, or direct component tests.
- The Signal Edge photo placeholders use local static paths to avoid depending on external image URLs.
