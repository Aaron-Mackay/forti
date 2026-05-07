# Mobile Architecture

Read this doc when the task touches `apps/mobile`, bearer-token auth, or shared web/mobile contracts.

## Current shape

- `apps/mobile` is the Expo / React Native client.
- `apps/web` remains the source of business endpoints; mobile should use the same business APIs as web.
- `packages/shared/src/contracts` is the home for cross-platform DTOs consumed by both clients.

## Auth and session rules

- Mobile auth is bearer-token based and enters only through `/api/auth/mobile/token-exchange`, `/refresh`, and `/sign-out`.
- Business endpoints must not fork into mobile-only copies; `requireSession()` is the shared auth seam for cookie and bearer sessions.
- Mobile token storage, refresh policy, and sign-out behavior are owned by:
  - `apps/mobile/lib/auth/AuthContext.tsx`
  - `apps/mobile/lib/auth/createAuthSessionController.ts`
  - `apps/mobile/lib/auth/createDefaultAuthSessionController.ts`

## Client boundaries

- Mobile code should consume typed API clients and hooks, not import web route files, Prisma types, or web-only providers.
- If a schema or DTO is needed by both mobile and web, move it to `packages/shared/src/contracts`.
- Keep helpers in `packages/shared` pure and platform-agnostic. No `next/*`, DOM globals, or React Native runtime dependencies there.
- Web-only code stays under `apps/web/src/lib/**` or `apps/web/src/app/**`.

## Preferred mobile integration path

- Add or extend a typed mobile API client under `apps/mobile/lib/api/**`.
- Parse server responses with shared zod schemas where practical.
- Keep screens thin: navigation, loading/error display, and delegating data work to auth/api layers.

## Verification

Use the repo-root commands:

```bash
npm run dev:mobile
npm run test:mobile
npm run check:mobile
```

Use web verification too when changing shared contracts or bearer-auth server behavior:

```bash
npm run test --workspace=@forti/web
npm run build --workspace=@forti/web
```
