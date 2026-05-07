# Agent File-Targeting Index

Use this index for fast file targeting before broad repo searches.

## Auth/session changes

- `src/lib/auth.ts` — `authOptions` (providers, callbacks, cookie/session strategy) and exported NextAuth handlers (`GET`/`POST`).
- `src/lib/requireSession.ts` — `requireSession()`, `AuthenticationError`, and `authenticationErrorResponse()` for API auth gating.
- `src/lib/mobileAuth.ts` — mobile access/refresh JWT issuance and verification helpers.
- `src/lib/recordSignInAuditEvent.ts` — shared login audit helper used by both web and mobile sign-in paths.
- `src/app/api/auth/mobile/token-exchange/route.ts` — mobile Google ID-token exchange endpoint that creates bearer-token sessions.
- `src/lib/sessionActor.ts` + `src/lib/confirmPermission.ts` — actor resolution and user-level authorization checks used by protected routes.

## Workout editor state changes

- `src/lib/useWorkoutEditor.ts` — `WorkoutEditorAction` union, `reducer(...)`, and editor mutation entry points.
- `src/context/WorkoutEditorContext.tsx` — `WorkoutEditorProvider`, `useWorkoutEditorContext()`, and debounced dispatch wiring.
- `src/app/user/plan/` (notably `PlanTable.tsx`, `PlanSheetView.tsx`, `PlanMultiWeekTable.tsx`) — dispatch sites and save triggers to persist edited state.

## API contract changes

- Contract schemas: `src/lib/contracts/saveUserWorkoutData.ts` (`SaveUserWorkoutDataRequestSchema`, `SaveUserWorkoutDataSuccessSchema`), `src/lib/planSchemas.ts` (`PlanInputSchema`).
- Contract schemas: `src/lib/contracts/mobileAuth.ts` — request/response contracts for mobile token exchange and follow-on bearer auth endpoints.
- Route implementation: `src/app/api/saveUserWorkoutData/route.ts` — `POST /api/saveUserWorkoutData` request parsing, validation, and persistence flow.
- Contract/error policy doc: `docs/api-error-contract.md` — canonical auth and validation response contract guidance.

## Cross-platform / web-only boundaries

Code in `src/lib/` is intended to be portable to a future React Native client. Shared hooks/services should not import `window`/`document`/`localStorage`/`navigator`/etc. directly — go through one of these adapters or extract a pure helper alongside a thin web wrapper.

- `src/lib/storage.ts` — `storage` (SSR-safe localStorage adapter, `getString`/`setString`/`remove`/`getJson`/`setJson`) is the only sanctioned place to touch `window.localStorage`. RN port replaces this file's implementation.
- `src/lib/scrollEdgeFades.ts` — `computeScrollFades(metrics, threshold)` is the pure scroll-edge-fade logic; `src/lib/hooks/useScrollEdgeFades.ts` is the web hook that wires DOM events (scroll/resize/`ResizeObserver`) around it.
- `src/lib/usePushSubscription.ts` — explicitly web-only (Service Worker / `PushManager` / `Notification`). Do not import from any path intended for RN reuse.
- `next/navigation` is web-only (RN uses expo-router with a different API). Confine to `src/app/**` (route files) and `src/components/shell/**` (web chrome). Banned from `src/lib/**` via ESLint `no-restricted-imports`; the only exempt file is `src/lib/getLoggedInUser.ts`, which is server-side.
- `next-auth/react` is web-only (sign-in/out and session hooks tied to NextAuth). Client-side auth surface today: `src/lib/providers/AuthProvider.tsx` (wraps `SessionProvider`), `src/components/shell/CustomAppBar.tsx` (`signOut`), `src/app/login/LoginButtons.tsx` (`signIn`). RN will reimplement these — `src/lib/**` should not consume `next-auth/react`. Banned via ESLint `no-restricted-imports`; only `AuthProvider.tsx` is exempt (it's the seam itself). No shared module reads client-side session data today (no `useSession()` callers outside test mocks); RN-prep is downstream of the chosen RN auth strategy.
- `src/lib/fetchWrapper.ts` + `src/lib/clientApi.ts` — platform-agnostic; reusable as-is.
- Auth: `src/lib/auth.ts` / `src/lib/requireSession.ts` / `src/lib/getLoggedInUser.ts` are server-side (NextAuth + `next/navigation`). The browser-side session is consumed via NextAuth's `useSession` (web-only). RN will need its own token storage/refresh layer.

## Mobile app foundation

- `apps/mobile/app/_layout.tsx` — root Expo Router layout, auth gate, and protected app entry.
- `apps/mobile/lib/auth/AuthContext.tsx` + `apps/mobile/lib/auth/createAuthSessionController.ts` — mobile session lifecycle, token refresh policy, sign-out reasons, and app-resume refresh behavior.
- `apps/mobile/lib/api/mobileApiClient.ts` + `apps/mobile/lib/api/accountApi.ts` — authenticated bearer-token client and the first typed Forti mobile API surface.
- `packages/shared/src/contracts/userProfile.ts` + `packages/shared/src/contracts/userSettings.ts` — cross-platform DTOs shared by the web API and Expo client.

## Maintenance rule (required)

- Update this file whenever you add a major feature area or a new top-level domain (for example: a new `src/app/<domain>/...` surface or a new `src/lib/contracts/<domain>.ts` contract group).
