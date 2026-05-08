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
- `GET /api/workout-data` → `WorkoutDataResponseSchema` (`src/lib/contracts/workoutData.ts`). Workout screens still consume the editable `UserPrisma` tree while the read model is narrowed in follow-up slices.

## Dashboard
- `GET /api/check-in?limit=1` (Getting Started card) → `CheckInHistoryResponseSchema` (`src/lib/contracts/checkIn.ts`)
- `GET /api/metric-history` → `MetricHistoryResponseSchema` (`src/lib/contracts/metricHistory.ts`)
