# UI-Critical Endpoint Map (High-Traffic Screens)

Use these contracts when touching nutrition, check-in, workout, or dashboard UX.

## Nutrition
- `GET /api/target-templates` → `GetTargetTemplateResponseSchema` (`src/lib/contracts/targetTemplates.ts`)
- `POST /api/target-templates` → `TargetTemplateRequestSchema` / `TargetTemplateResponseSchema` (`src/lib/contracts/targetTemplates.ts`)

## Check-in
- `GET /api/check-in/current` → `CurrentCheckInResponseSchema` (`src/lib/contracts/checkIn.ts`)
- `GET /api/check-in` → `CheckInHistoryResponseSchema` (`src/lib/contracts/checkIn.ts`)
- `POST /api/check-in` → `SubmitCheckInRequestSchema` / `SubmitCheckInResponseSchema` (`src/lib/contracts/checkIn.ts`)

## Workout
- `GET /api/exercises` → `ExerciseListQuerySchema` (`src/lib/contracts/exercises.ts`). Response remains the bare exercise array; `search`, `take`, and `skip` are optional.
- `GET /api/workout-data` → `WorkoutDataResponseSchema` (`src/lib/contracts/workoutData.ts`). Workout screens consume a narrowed top-level read model (`id`, `activePlanId`, `plans`, `userExerciseNotes`) with the editable plan tree preserved behind the seam for offline mutations.

## Dashboard
- `GET /api/check-in?limit=1` (Getting Started card) → `CheckInHistoryResponseSchema` (`src/lib/contracts/checkIn.ts`)
- `GET /api/metric-history` → `MetricHistoryResponseSchema` (`src/lib/contracts/metricHistory.ts`)
