# Agent File-Targeting Index

Use this index for fast file targeting before broad repo searches.

## Auth/session changes

- `src/lib/auth.ts` — `authOptions` (providers, callbacks, cookie/session strategy) and exported NextAuth handlers (`GET`/`POST`).
- `src/lib/requireSession.ts` — `requireSession()`, `AuthenticationError`, and `authenticationErrorResponse()` for API auth gating.
- `src/lib/sessionActor.ts` + `src/lib/confirmPermission.ts` — actor resolution and user-level authorization checks used by protected routes.

## Workout editor state changes

- `src/lib/useWorkoutEditor.ts` — `WorkoutEditorAction` union, `reducer(...)`, and editor mutation entry points.
- `src/context/WorkoutEditorContext.tsx` — `WorkoutEditorProvider`, `useWorkoutEditorContext()`, and debounced dispatch wiring.
- `src/app/user/plan/` (notably `PlanTable.tsx`, `PlanSheetView.tsx`, `PlanMultiWeekTable.tsx`) — dispatch sites and save triggers to persist edited state.

## API contract changes

- Contract schemas: `src/lib/contracts/saveUserWorkoutData.ts` (`SaveUserWorkoutDataRequestSchema`, `SaveUserWorkoutDataSuccessSchema`), `src/lib/planSchemas.ts` (`PlanInputSchema`).
- Route implementation: `src/app/api/saveUserWorkoutData/route.ts` — `POST /api/saveUserWorkoutData` request parsing, validation, and persistence flow.
- Contract/error policy doc: `docs/api-error-contract.md` — canonical auth and validation response contract guidance.

## Maintenance rule (required)

- Update this file whenever you add a major feature area or a new top-level domain (for example: a new `src/app/<domain>/...` surface or a new `src/lib/contracts/<domain>.ts` contract group).
