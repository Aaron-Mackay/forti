# API Surface — Forti

Detailed API route inventory and endpoint-level rules.
Use this document when touching API behavior, contracts, route auth, or cross-route consistency.

## Global API Rules

- Auth-required routes must call `requireSession()`.
- Reusable request/response schemas/types must live in `src/lib/contracts/`.
- Client code must not import route-local types from `src/app/api/**/route.ts`.
- Prefer shared zod schemas for request parsing and response validation.
- Use standardized helpers from `src/lib/apiResponses.ts` for JSON error envelopes.

## Route Catalog (`src/app/api/`)

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
| `api/coach/check-in-template` | GET/PUT/DELETE coach's custom check-in template |
| `api/coach/check-ins/[id]/notes` | PATCH coach notes on a check-in |
| `api/coach/request` | GET/POST coach link requests |
| `api/coach/request/[requestId]` | PATCH accept/reject a coach request |
| `api/coach/unlink` | POST to remove a client |
| `api/notifications` | GET all notifications + unread count for logged-in user |
| `api/notifications/[id]/read` | PATCH mark a single notification read |
| `api/notifications/read-all` | PATCH mark all notifications read |
| `api/cron/check-in-reminders` | Cron job — sends weekly reminder emails (secured by `CRON_SECRET`) |
| `api/metric` | CRUD for daily health metrics |
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

## Contract Change Checklist

When changing endpoint behavior:

1. Update shared contract module (`src/lib/contracts/...`).
2. Update route handler implementation.
3. Update client API helper(s).
4. Add/update tests for both validation and happy-path responses.
5. Ensure error responses remain on standardized envelopes.
