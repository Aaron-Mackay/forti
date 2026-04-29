# Data Model — Forti

Detailed schema narrative and domain relationships for Prisma/PostgreSQL.
Use this document when touching schema, data migrations/backfills, or persistence invariants.

## Core Relationship Graph

```text
User
 ├── Plan[]              (ordered by `order`)
 │    └── Week[]         (ordered by `order`)
 │         └── Workout[] (ordered by `order`)
 │              └── WorkoutExercise[] (ordered by `order`)
 │                   └── ExerciseSet[] (ordered by `order`)
 ├── Event[]
 ├── DayMetric[]
 ├── TargetTemplate[]
 │    └── TargetTemplateDay[]
 ├── UserExerciseNote[]
 ├── WeeklyCheckIn[]
 ├── PushSubscription[]
 └── CoachRequest[]

Exercise (global)
 ├── WorkoutExercise[]
 └── UserExerciseNote[]

User --[coach]--> User

AiUsageLog (rate-limiting/monitoring)
```

## High-Value Invariants

- Ordered child collections rely on `order` with compound uniqueness; maintain sequence integrity on inserts/reorders/deletes.
- `Exercise` is global and unique by `(name, category)`.
- `WeeklyCheckIn` uniqueness: one record per user/week start (`@@unique([userId, weekStartDate])`).
- `TargetTemplate` uniqueness and versioning are anchored on `effectiveFrom`; templates map to seven `TargetTemplateDay` rows (ISO weekdays).
- `CoachRequest.clientId` is unique for request lifecycle constraints.

## Domain Semantics

### Plans/workouts
- Hierarchy is User → Plan → Week → Workout → WorkoutExercise → ExerciseSet.
- Most descendants are cascade-deleted with parent deletion.

### Metrics + check-ins
- `DayMetric` stores daily actuals (not target columns).
- Weekly check-ins store subjective ratings, adherence/review data, photos, and coach feedback notes.

### Targets/templates
- Targets are stored as versioned templates (`TargetTemplate`) instead of mutable scalar columns.
- Backwards lookup is used to resolve active template for a date/week.

### Coach-client model
- Coach relationship is a `User` self-relation via `coachId`.
- Invitation/request acceptance flow transitions `CoachRequest` state and links users.

## Schema Change Workflow

After editing `prisma/schema.prisma`:

```bash
npm run rebuild-prisma
```

For clean local reset/seed cycle:

```bash
npm run db:reset
npm run seed
```

## Seed Context

Default seed users:

- Jeff Demo (`jeff@example.com`) — demo account with rich sample data.
- Todd (`todd@example.com`) — coach account.
- TestUser (`testuser@example.com`) — used for E2E and should not rely on Jeff-specific data.
