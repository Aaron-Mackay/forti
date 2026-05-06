# Mobile Auth Implementation Plan (Bearer-Token Extension of NextAuth)

## 0. Context for the implementing agent

Forti currently uses NextAuth with a JWT session strategy and Google OAuth. All API routes use `requireSession()` (`src/lib/requireSession.ts`) which calls `getServerSession`. The browser session lives in an HTTP-only cookie; the client doesn't read session data directly.

A React Native client is being built. RN cannot easily participate in NextAuth's cookie-based sessions — its UX expectations (native Google Sign-In SDK, secure token storage, refresh-on-401) don't map onto NextAuth's web flow.

**This plan extends the API server with a bearer-token auth path used exclusively by the RN client. Web auth is untouched.** Both paths produce the same `Session` shape inside the server, so route handlers don't need to know which client called them.

**Critical invariants:**
- Web auth (`/api/auth/[...nextauth]`, cookie sessions, `getServerSession`) must continue to work identically.
- Every existing API route must keep working without modification.
- All API routes must continue to serve both clients (web cookie + mobile bearer); no mobile-specific business endpoints.
- Audit logging on sign-in (`AuditEventType.LoginSucceeded`) must fire on mobile sign-in just like on web sign-in.

---

## 1. Locked decisions

| # | Decision | Value |
|---|---|---|
| D1 | Access token lifetime | 15 minutes |
| D2 | Refresh token lifetime | 30 days |
| D3 | Refresh token rotation | Yes, with reuse detection |
| D4 | Auto-create user on first sign-in | Yes (mirrors NextAuth's Prisma adapter behavior) |
| D5 | Demo providers on mobile | No (skip; web-only marketing flow) |
| D6 | Separate signing secret from `NEXTAUTH_SECRET` | Yes (`MOBILE_JWT_SECRET`) |
| D7 | Custom JWT claim namespace | `tokenType: 'mobile-access' \| 'mobile-refresh'` |
| D8 | Google Sign-In client IDs | Validate against the full set of platform `aud` values (iOS, Android, optional web) |
| D9 | Rate limit (token-exchange) | 5/min per IP, 20/hour per email |
| D10 | Rate limit (refresh) | 30/min per refresh-token |
| Privacy | `userAgent` / `ipAddress` on `MobileSession` | Omit (no clear lawful basis) |
| Rate-limit backend | In-memory for single-instance; swap to Upstash Redis before multi-instance prod | Ship in-memory; flag the swap as a pre-launch ops task |
| Monitoring | Refresh-token theft detection | Log to existing audit table + alert via existing alerting infrastructure |

---

## 2. Architecture overview

```
                           ┌─────────────────────┐
                           │  Native Google SDK  │
                           │  (RN client)        │
                           └──────────┬──────────┘
                                      │ Google ID token
                                      ▼
┌────────────────────┐     ┌─────────────────────────────┐
│  RN secure-store   │◀───▶│  POST /api/auth/mobile/     │
│  (access+refresh)  │     │       token-exchange        │
└──────────┬─────────┘     └──────────┬──────────────────┘
           │                          │ writes MobileSession row
           │ Authorization: Bearer    ▼
           │ <accessToken>     ┌──────────────┐
           ▼                   │  Prisma DB   │
   ┌────────────────────┐      └──────┬───────┘
   │  Any /api/* route  │             │
   │  requireSession()  │◀────────────┘ verifies refresh tokens
   └────────────────────┘
           ▲
           │ (web path unchanged)
           │ NextAuth cookie
           │
   ┌────────────────────┐
   │  Web browser       │
   └────────────────────┘
```

Two sign-in paths converge at `requireSession()`. Everything downstream is identical.

---

## 3. Data model

Add to `prisma/schema.prisma`:

```prisma
model MobileSession {
  id             String         @id @default(cuid())
  userId         String
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash      String         @unique  // SHA-256 of refresh token; never store raw
  expiresAt      DateTime
  createdAt      DateTime       @default(now())
  lastUsedAt     DateTime       @default(now())
  revokedAt      DateTime?
  // Rotation chain — when a refresh token is rotated, the new row sets replacedFromId
  // back to the previous row. If the previous row is presented again (already used),
  // we have evidence of theft and revoke the entire chain.
  replacedFromId String?        @unique
  replacedFrom   MobileSession? @relation("RotationChain", fields: [replacedFromId], references: [id])
  replacedBy     MobileSession? @relation("RotationChain")

  @@index([userId])
  @@index([expiresAt])
}
```

Add `mobileSessions MobileSession[]` to the `User` model.

Generate migration: `npm run rebuild-prisma` after editing schema.

---

## 4. JWT design

### Access token claims
```json
{
  "sub": "<userId>",
  "tokenType": "mobile-access",
  "iat": 1234567890,
  "exp": 1234568790,
  "iss": "forti",
  "aud": "forti-mobile"
}
```

### Refresh token claims
```json
{
  "sub": "<userId>",
  "tokenType": "mobile-refresh",
  "jti": "<MobileSession.id>",
  "iat": 1234567890,
  "exp": 1237159890,
  "iss": "forti",
  "aud": "forti-mobile"
}
```

**Library:** `jose` (modern; recommended over `jsonwebtoken` for new code).

**Signing:** HS256 with `MOBILE_JWT_SECRET` (separate from `NEXTAUTH_SECRET`). Both tokens use the same key but the `tokenType` claim must be checked on every verification — never accept an access token where a refresh token is expected, or vice versa.

---

## 5. New module: `src/lib/mobileAuth.ts`

Single source of truth for JWT operations. Pure logic; no HTTP concerns.

```typescript
export type MobileAccessTokenPayload = { sub: string; tokenType: 'mobile-access' };
export type MobileRefreshTokenPayload = { sub: string; tokenType: 'mobile-refresh'; jti: string };

export async function issueMobileAccessToken(userId: string): Promise<{ token: string; expiresAt: Date }>;
export async function issueMobileRefreshToken(userId: string, sessionId: string): Promise<{ token: string; expiresAt: Date }>;
export async function verifyMobileAccessToken(token: string): Promise<MobileAccessTokenPayload>;
export async function verifyMobileRefreshToken(token: string): Promise<MobileRefreshTokenPayload>;

export function hashRefreshToken(rawToken: string): string;  // SHA-256, hex
export const ACCESS_TTL_SECONDS = 60 * 15;
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
```

**Verification rules** (enforced inside both `verify*` functions):
- Signature valid
- `exp` not in past
- `iss === 'forti'`
- `aud === 'forti-mobile'`
- `tokenType` matches the variant being verified

Throw a discriminated error type — `class MobileTokenError extends Error { code: 'expired' | 'invalid' | 'wrong-type' }` — so callers can map to correct HTTP status.

**Tests** (`src/lib/mobileAuth.test.ts`):
- Round-trip: issue → verify returns the payload
- Expired token rejected
- Wrong `tokenType` rejected
- Wrong `aud` / `iss` rejected
- Tampered signature rejected
- Hashing is stable

---

## 6. Audit-logging refactor (do this first)

Currently `events.signIn` in `src/lib/auth.ts` writes the `LoginSucceeded` audit event. Mobile sign-in needs the same logic. Extract to a shared helper before the mobile endpoint exists, so both call sites use it from day one.

**Action:**
1. Create `src/lib/recordSignInAuditEvent.ts`:
   ```typescript
   export async function recordSignInAuditEvent(args: {
     userId: string;
     provider: 'google' | 'demo' | 'demo-coach' | 'mobile-google';
   }): Promise<void>
   ```
   Move the logic from `events.signIn` into this function.
2. Update `events.signIn` to call it.
3. Mobile token-exchange will call it with `provider: 'mobile-google'`.

---

## 7. New endpoint: `POST /api/auth/mobile/token-exchange`

### Contract — `src/lib/contracts/mobileAuth.ts`
```typescript
export const MobileTokenExchangeRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const MobileAuthSuccessSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.string(),  // ISO 8601
  refreshTokenExpiresAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
});
```

### Handler — `src/app/api/auth/mobile/token-exchange/route.ts`

Flow:
1. Parse + validate body with `MobileTokenExchangeRequestSchema`.
2. Apply rate limit (per-IP — see §11).
3. Validate Google ID token:
   - Use `google-auth-library`'s `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_MOBILE_CLIENT_IDS })`
   - `GOOGLE_MOBILE_CLIENT_IDS` is an array (iOS, Android, optionally web) — Google issues different `aud` per platform.
   - On any validation failure: 401 with `unauthenticatedResponse()` from `src/lib/apiResponses.ts`.
4. Extract `email`, `name`, `picture`, `sub` (Google's user ID) from verified payload.
5. Look up user by email (mirroring NextAuth's PrismaAdapter behavior). If absent, create:
   ```typescript
   const user = await prisma.user.upsert({
     where: { email },
     update: {},  // don't overwrite
     create: { email, name: name ?? null, image: picture ?? null },
   });
   ```
6. Apply rate limit (per-email). Doing this AFTER user lookup lets the limit key off the verified email rather than client-supplied data.
7. Issue access token + refresh token. Insert `MobileSession` row with `tokenHash = hashRefreshToken(rawRefresh)`.
8. Call `recordSignInAuditEvent({ userId: user.id, provider: 'mobile-google' })`.
9. Return 200 with `MobileAuthSuccessSchema` shape.

**Error responses:**
- 400 invalid body → standard zod error shape
- 401 Google ID token invalid/expired → `unauthenticatedResponse()`
- 429 rate limited → `rateLimitedResponse()` (add to `apiResponses.ts` if missing)
- 500 unexpected → standard error shape

### Tests — `tests/api/auth/mobile/token-exchange.test.ts`
- Valid ID token → user created, tokens issued, MobileSession row exists, audit event recorded
- Existing user with this email → no duplicate user, tokens issued
- Invalid ID token (signature/audience/expiry mismatch) → 401
- Missing body fields → 400
- Rate limit triggered → 429
- DB write fails → 500, no tokens returned

---

## 8. New endpoint: `POST /api/auth/mobile/refresh`

### Contract
```typescript
export const MobileRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
// Reuses MobileAuthSuccessSchema for response.
```

### Handler — `src/app/api/auth/mobile/refresh/route.ts`

Flow:
1. Parse + validate body.
2. Apply rate limit (per refresh-token hash).
3. Verify JWT signature/expiry/aud/tokenType via `verifyMobileRefreshToken`. On failure → 401.
4. Compute `tokenHash = hashRefreshToken(rawRefresh)`.
5. Look up `MobileSession` by `tokenHash`. If not found → 401 (token not in DB).
6. **Theft detection:** if `revokedAt` is set OR `replacedFromId` chain shows this row was already replaced → an attacker is replaying a rotated token. Revoke the entire chain (set `revokedAt = now()` on all rows reachable via `replacedFromId` walk back to root, plus all `replacedBy` descendants). Log a `RefreshTokenReuseDetected` audit event so existing alerting picks it up. Return 401.
7. If `expiresAt < now()` → 401.
8. Atomic rotation in a transaction:
   - Mark current row `revokedAt = now()`
   - Insert new `MobileSession` row with `replacedFromId = currentRow.id`
   - Issue new access + refresh tokens (refresh token's `jti` = new row id)
9. Update `lastUsedAt` on both rows for forensics.
10. Return 200 with new tokens.

**Reuse-detection logic** is the most subtle part. Add a unit test for the chain-revocation walk specifically.

### Tests — `tests/api/auth/mobile/refresh.test.ts`
- Valid refresh → new access + new refresh issued, old marked revoked, new row inserted
- Replay of already-rotated refresh → 401, entire chain revoked, audit event written
- Expired refresh → 401
- Refresh whose `MobileSession` row is missing → 401
- Refresh after sign-out (revoked) → 401
- Concurrent rotation requests (race) → exactly one succeeds, the other treated as replay

The race test is important. Use `Promise.all` of two refresh calls with the same input and assert exactly one succeeded. This validates the transaction boundary.

---

## 9. New endpoint: `POST /api/auth/mobile/sign-out`

### Contract
```typescript
export const MobileSignOutRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
// Returns 204 No Content on success.
```

### Handler — `src/app/api/auth/mobile/sign-out/route.ts`

1. Parse body.
2. Verify refresh token signature (don't fail on expiry — sign-out should still work).
3. Compute hash, mark `MobileSession.revokedAt = now()` if found.
4. Return 204 regardless of whether token was found (don't leak existence info).

### Tests
- Valid refresh → 204, row revoked
- Already-revoked refresh → 204, idempotent
- Invalid refresh → 204 (no info leak) but row not modified

---

## 10. Extend `requireSession()`

`src/lib/requireSession.ts` is the single chokepoint that every API route uses. The dual auth path lives entirely inside it.

### Modified flow
```typescript
export async function requireSession(): Promise<Session> {
  const authHeader = headers().get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    try {
      const payload = await verifyMobileAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new AuthenticationError('user-not-found');
      return buildSession(user);  // returns same shape as NextAuth's Session
    } catch (e) {
      throw new AuthenticationError('invalid-bearer-token');
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) throw new AuthenticationError('not-authenticated');
  return session;
}
```

`buildSession()` is a small helper that constructs the same shape NextAuth produces — `{ user: { id, name, email, image } }` — so downstream code is unaware of the path.

### Tests — `src/lib/requireSession.test.ts`
- Valid bearer token → returns Session
- Invalid bearer → throws AuthenticationError
- Expired bearer → throws AuthenticationError
- Wrong token type (refresh used as access) → throws AuthenticationError
- No bearer + valid cookie → returns Session (web path unchanged)
- No bearer + no cookie → throws AuthenticationError
- Both present → bearer wins (mobile clients shouldn't send cookies; defensively prefer the explicit header)

### Smoke test for end-to-end coverage
At least one existing route (e.g., `GET /api/user-data`) should be tested both ways:
- Web fixture (cookie) — returns user data
- Mobile fixture (bearer issued via test helper) — returns same user data

A test helper `tests/helpers/issueTestMobileToken.ts` should issue tokens directly via `issueMobileAccessToken()` (bypassing the Google-ID-token validation) for use in route tests.

---

## 11. Rate limiting

Forti doesn't appear to have a rate-limit module today (verify during impl — grep for existing patterns). The auth endpoints can't ship without it.

**Implementation:**
- Add `src/lib/rateLimit.ts` using an in-memory token bucket keyed by string. Adequate for a single-instance deployment.
- Multi-instance prod (Vercel serverless) will need Upstash Redis or equivalent — flag this as a pre-launch ops task; ship the in-memory implementation now.
- API:
  ```typescript
  export async function checkRateLimit(key: string, opts: { limit: number; windowSeconds: number }): Promise<{ allowed: boolean; retryAfter?: number }>;
  ```

**Apply to:**
- token-exchange: per IP (5/min) + per verified email (20/hour)
- refresh: per refresh-token-hash (30/min)
- sign-out: per IP (10/min) — light, just to prevent abuse

On 429, return `Retry-After` header.

---

## 12. Cleanup job (cron)

Add to existing cron infrastructure (`src/app/api/cron/*` is already used for check-in reminders).

`POST /api/cron/mobile-sessions-cleanup`:
- Auth via `CRON_SECRET` (existing pattern).
- Delete `MobileSession` rows where `expiresAt < now() - 7 days` (keep recently-expired rows briefly for audit/forensics).
- Log count.
- Schedule once a day in `vercel.json` (or wherever cron is configured — verify during impl).

---

## 13. Environment variables

Add to `.env.example` (or local equivalent) and document:

```env
MOBILE_JWT_SECRET=<openssl rand -hex 32>
GOOGLE_MOBILE_CLIENT_IDS=<ios-client-id>,<android-client-id>,<optional-web-client-id>
```

Validation: fail fast at boot if either is missing AND the mobile endpoints exist (validate in a startup helper or at the top of each mobile route).

---

## 14. Documentation updates (last step)

- `docs/agent/api-surface.md` — add the 3 mobile auth routes + dual-auth note for `requireSession()`.
- `docs/agent/index.md` — add a section under "Auth/session changes" pointing to `mobileAuth.ts` + the routes.
- `CLAUDE.md` — under "Auth & access" invariants, add: "Server endpoints accept either NextAuth cookie (web) or `Authorization: Bearer` (mobile). Never add mobile-specific business endpoints — `/api/auth/mobile/*` is the only mobile-namespaced path."

---

## 15. Security checklist (run before merging final milestone)

- [ ] `MOBILE_JWT_SECRET` is ≥32 bytes, generated with `openssl rand -hex 32`, never logged
- [ ] Refresh tokens stored as SHA-256 hash only; raw token never persisted
- [ ] All Google ID tokens validated against JWKS (no unsigned/manual base64 decode)
- [ ] `aud` claim validated against the platform-specific client ID array
- [ ] Rotation reuse detection revokes the whole chain, not just the replayed token
- [ ] Reuse detection writes an audit event so existing alerting can pick it up
- [ ] Token-exchange and refresh endpoints rate-limited
- [ ] No 500-level errors leak token contents or DB internals (use existing `apiResponses.ts` helpers)
- [ ] Sign-out doesn't disclose whether a token existed
- [ ] `requireSession()` rejects refresh tokens used as access tokens (and vice versa)
- [ ] Tests cover the race condition on concurrent refresh
- [ ] No mobile JWT signing key shared with `NEXTAUTH_SECRET`

---

## 16. Milestone breakdown (independent, shippable PRs)

Per the Forti commit style, each milestone is a single atomic commit that passes `npm run check`.

- [x] Milestone A — DB + JWT helpers
- [x] Milestone B — Token-exchange endpoint
- [x] Milestone C — Refresh + sign-out endpoints
- [ ] Milestone D — `requireSession()` extension
- [ ] Milestone E — Cleanup, observability, docs

### Milestone A — DB + JWT helpers
**Scope:**
- `prisma/schema.prisma`: add `MobileSession` model + relation
- `src/lib/mobileAuth.ts` + tests
- `src/lib/recordSignInAuditEvent.ts` extracted; `auth.ts` updated to use it
- `MOBILE_JWT_SECRET` documented in env example

**Acceptance:**
- `npm run check` passes
- Unit tests cover token round-trip, rotation chain helpers, type-mismatch rejection
- No new API endpoints; behavior unchanged

### Milestone B — Token-exchange endpoint
**Scope:**
- `src/lib/contracts/mobileAuth.ts`
- `src/app/api/auth/mobile/token-exchange/route.ts`
- `src/lib/rateLimit.ts` (in-memory implementation)
- Tests for the endpoint covering happy path + ID-token validation failures + rate limit

**Acceptance:**
- Calling `/api/auth/mobile/token-exchange` with a valid Google ID token returns the success shape and creates a `MobileSession` row
- Audit event written
- Tests pass; existing 749 unit tests still pass

### Milestone C — Refresh + sign-out endpoints
**Scope:**
- `src/app/api/auth/mobile/refresh/route.ts` with rotation + reuse detection
- `src/app/api/auth/mobile/sign-out/route.ts`
- Tests including the concurrent-rotation race test

**Acceptance:**
- Refresh rotates correctly under normal load
- Replay attack triggers chain revocation + audit event
- Concurrent refreshes: exactly one wins

### Milestone D — `requireSession()` extension
**Scope:**
- Modify `src/lib/requireSession.ts`
- Add `tests/helpers/issueTestMobileToken.ts`
- Add a smoke E2E test that a real route (`/api/user-data`) responds the same to bearer and cookie auth
- All existing route tests must still pass unchanged

**Acceptance:**
- Web cookie auth works identically (snapshot existing tests)
- Bearer auth works on at least the smoke-tested route
- Token-type confusion (refresh used as access) is rejected

### Milestone E — Cleanup, observability, docs
**Scope:**
- `src/app/api/cron/mobile-sessions-cleanup/route.ts`
- `docs/agent/api-surface.md`, `docs/agent/index.md`, `CLAUDE.md` updates
- Final security checklist sign-off

**Acceptance:**
- Cron job deletes expired rows in dry-run test
- Docs accurate; agent index points to all new files

### Milestone F (out of scope for this plan — RN client)
The RN-side client wiring (Google Sign-In SDK, `expo-secure-store`, fetch wrapper) is a separate workstream that consumes the API surface this plan delivers. It should not block server milestones.

---

## 17. Ops handoff (user/ops, not engineering)

These need user/ops input before production rollout but do not block engineering milestones A–E:

1. **Google Cloud Console** — create iOS and Android OAuth client IDs (separate from the existing web client). Provide the IDs as `GOOGLE_MOBILE_CLIENT_IDS`.
2. **Rate-limit backend swap** — before the deployment moves beyond a single instance (Vercel serverless multi-region), swap `src/lib/rateLimit.ts`'s in-memory implementation for Upstash Redis or equivalent. Tracked as a pre-launch task.
3. **Reuse-detection alerting** — confirm the existing alerting infrastructure picks up `RefreshTokenReuseDetected` audit events the same way it picks up other security-relevant events. If not, add a query/threshold.

---

## 18. What this plan deliberately does NOT include

- RN client implementation (separate workstream; consumes this API)
- Mobile demo flow (D5 = no)
- Web auth changes
- MFA / passkeys (future feature)
- Apple Sign-In (separate provider, follow same pattern when added)
- Push-notification authentication (existing `usePushSubscription.ts` is web-only; mobile push is separate)
- Forensic device metadata on `MobileSession` (`userAgent`, `ipAddress`) — omitted; no clear lawful basis under current ROPA

---

**End of plan.** Implementing agent: start with Milestone A and ship one PR per milestone. Do not skip ahead.
