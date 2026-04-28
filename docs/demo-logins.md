# Demo login identities and seeded scenarios

Forti ships with deterministic demo identities so the `Try Demo` and `Try Demo (Coach)` flows always show realistic data.

## Login identities

- **Client demo:** `jeff@example.com` (display name: Jeff Demo)
  - Used by the **Try Demo** button.
  - Linked to coach `todd@example.com`.
- **Coach demo:** `todd@example.com` (display name: Todd Coach)
  - Used by the **Try Demo (Coach)** button.
  - Has three seeded clients.
- **Additional seeded clients (coach view):**
  - `maria@example.com` (Maria Client)
  - `alex@example.com` (Alex Client)
- **E2E-only test login:** `testuser@example.com`
  - Stable account used by automated tests.

## Seeded demo scenarios

Each demo client (Jeff, Maria, Alex) is seeded with:

- one inactive historical plan and one active plan
- partially completed current plan weeks (some workouts complete, some pending)
- daily metrics for **98 days** (14 weeks)
- two target templates (older baseline + current week)
- day-level macro targets with training-day vs rest-day differences
- weekly check-ins over recent weeks with:
  - some weeks completely missing
  - one drafted/unsubmitted week (`completedAt = null`)
  - some submitted and reviewed by coach
- client notifications
- client audit events

Coach demo account (Todd) is seeded with:

- three linked clients
- a learning plan with timed steps
- learning-plan assignments for each client with mixed completion progress
- coach notifications (check-ins and learning-step delivery)
- coach audit events (login, check-in review, plan-created activity)

## Determinism and idempotency

- `npm run seed` performs a full truncate + deterministic rebuild.
- `npm run seed:demo` upserts demo identities and deterministically refreshes only demo data.
- The seeded values are generated from fixed formulas and fixed schedules (no `Math.random`), so repeated runs produce the same shape and progression.
