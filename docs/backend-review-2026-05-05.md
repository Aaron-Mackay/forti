# Backend review — 2026-05-05

Verified review across performance, React Native readiness, and contract quality. Findings are grounded in actual file/line citations; agent claims that didn't survive verification (e.g. `withRouteAuth` doing duplicate session lookups, photos being directly servable as public Vercel Blob URLs) were dropped.

## Headline findings

- **One structurally bad route**: `src/app/api/saveUserWorkoutData/route.ts:48-204` deletes and recreates the entire plan tree on every save with serial `await tx.create()` calls. Typical save: ~800 sequential writes inside a 15s transaction. Coach editing a 12-week program: ~1.5k. Set IDs rotate on every save, which would brick any feature wanting to reference a set persistently (set-level notes, "PR on this set", set→metric links).
- **Three things actually block React Native**:
  1. Auth is cookie-only (`getServerSession` reads NextAuth HTTP-only cookie).
  2. Progress photos go through an authenticated proxy streaming from a *private* Vercel Blob.
  3. Push subscriptions are Web-Push/VAPID only.
- **Contracts are ~37% covered**: 28 of 76 routes use zod `safeParse`; 48 don't. 61 components call `fetch('/api/...')` directly, bypassing `clientApi.ts` (which only wraps 3 endpoints).

---

## Performance — prioritized

### P0

- **`saveUserWorkoutData` delete-and-recreate** — `src/app/api/saveUserWorkoutData/route.ts:48-204`. Move to diff-based upsert keyed on `(plan.order, week.order, workout.order, exercise.order)`. Minimum: replace serial `tx.exerciseSet.create(...)` with `createMany(...)` — ~5-10× speedup on a save. Drop sets remain serial because `parentSetId` needs the parent's new id.
- **`getUserData` returns the entire plan tree** — `src/lib/userService.ts:8-42`. Used by `/api/user-data`, called on session load. Multi-MB payload for power users. Split into `getActivePlan(userId)` (one plan, current week) + on-demand `getPlanTree(planId)`. Single biggest restyle blocker — everything hangs off this mega-shape.
- **`/api/check-in` GET history N+1** — `src/app/api/check-in/route.ts:59-89`. Per page (limit ≤ 100), fires 2 queries per check-in via `Promise.all` (weeks, workouts). At limit=20 that's 40 queries hitting the connection pool. Consolidate: one `findMany` over weeks for the full date range, one over workouts, group in JS by `weekStartDate`.
- **`/api/exercises` GET unbounded** — `src/app/api/exercises/route.ts:21-24`. No `take`, no search. Hit on every workout edit. Add `take/skip + search` query params.

### P1

- `/api/exercises/enrich` rebuilds the alias matcher from a full `findMany` per request. Cache in-process with a TTL or split global vs user exercises.
- **Schema indexes**:
  - `Notification(userId, type, readAt)` — coach notification badge currently filters on `(userId, type)` with only `(userId, readAt)` covered.
  - `Exercise(createdByUserId, name)` — speeds up per-user exercise list once that route gets pagination/search.
- `AiUsageLog` rows grow forever. Verify retention cutoff or add a periodic prune.
- `src/app/api/plan/ai-import/route.ts` (325 lines) likely has a long transaction or AI calls inside one. Worth a 30-min audit on its own.

### P2

- `getCoachClientHealthSummary` parses notification URLs via regex in JS to count unread check-ins. Either denormalize a `clientId` column on `Notification` or use a SQL `groupBy`.
- `parseDashboardSettings(user.settings)` is reparsed on multiple calls per check-in request; trivially cacheable in request scope.

---

## React Native — what blocks integration

### Hard blockers

1. **Bearer-token auth.** Add a token-issuance endpoint and update `requireSession()` in `src/lib/requireSession.ts:20` to also accept `Authorization: Bearer <jwt>` (fall through to `getServerSession`). NextAuth supports this via `getToken({ req, secret })` — existing JWT can be reused, no schema change. ~half-day.
2. **Photo serving.** Two options for `src/app/api/check-in/photos/[checkInId]/[angle]/route.ts`:
   - Mint short-lived signed Blob URLs from the proxy and return `{ url }` — RN renders that URL directly.
   - Keep the proxy and have RN add `Authorization` to its image fetcher.
3. **Push subscriptions.** Add `type: 'web-push' | 'fcm' | 'apns'` and `deviceId` to `PushSubscription`. Branch `/api/push/subscribe` and `/api/push/send` on `type`. Same code path otherwise.

### Risks

- Four upload routes (`check-in/photos`, `library/upload`, `coach/logo`, `feedback`) use `req.formData()`. RN multipart works but is fiddly; verify each once Bearer auth lands.
- No CORS layer — fine for same-origin web on Vercel, but RN simulators will need explicit allow on at least the auth endpoint.
- No API versioning. Mobile apps can't hot-update; add a `/api/v1/` alias before RN ships.

### Non-issues (verified)

- Date serialization is consistent ISO strings.
- `withRouteAuth` is a thin error catcher, not a duplicate session call.
- Most response bodies are pure JSON.

---

## Contracts — readiness for restyle

- **48/76 routes have no zod input validation.** Worst offenders to fix first (high-traffic write endpoints): `coach/check-in-template`, `coach/clients/[clientId]/nutrition`, `coach/clients/[clientId]/route` (PATCH), `event/[id]`, `workoutExercise/route` (POST), `sets/[setId]`. Add request schemas to `src/lib/contracts/`.
- **No output validation on most write endpoints.** `satisfies` casts give compile-time safety only; nothing catches a Prisma include drifting from the contract. Add `.parse()` on the response in highest-traffic endpoints first (already done in `/api/check-in/current`).
- **JSON columns are a typed black hole.** `User.settings`, `WeeklyCheckIn.customResponses`, `WeeklyCheckIn.templateSnapshot`, `LearningPlanAssignment.stepProgress` are `z.custom<Prisma.JsonValue>()` at the boundary. Put real schemas on these — most likely source of mystery bugs in a restyle.
- **`clientApi.ts` covers 3 endpoints. 61 raw `fetch('/api/...')` calls in components.** Don't migrate all at once — wrap the high-traffic ones (`/user-data`, `/calendar-data`, `/check-in*`, `/exercises*`, `/sessions`) and use those as the contract source-of-truth. Both web restyle and RN can import the same client.

---

## Recommended order

1. **`createMany` + index audit** (1 day). `saveUserWorkoutData` regular-sets in `createMany`, plus the two missing indexes. Biggest perf win for least risk.
2. **Split `getUserData`** (1 day). Pull active plan into its own endpoint with a real contract. Unblocks restyle and shrinks the page-load payload.
3. **Bearer-token auth** (½ day). Smallest RN-unblocker. Doesn't break web.
4. **`saveUserWorkoutData` diff-mode** (2-3 days). Bigger lift; right shape long-term and stops set IDs from rotating.
5. **Contract pass on top 10 endpoints + expand `clientApi.ts`** (2 days). Pays back across both restyle and RN.
6. **Photo signed URLs + push model extension** — when the RN client work actually starts.
