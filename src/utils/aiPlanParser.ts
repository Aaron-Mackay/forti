import { z } from 'zod';

// ── Zod schema for Claude's tool-use output ──────────────────────────────────
// Intentionally simpler than PlanInputSchema: no `order` fields (we derive
// those from array position), and most fields are optional so Claude has
// flexibility in what it returns.

const AiSetSchema = z.object({
  weight: z.number().nullable().optional(),
  reps: z.number().int().nullable().optional(),
});

const AiExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().default('resistance'),
  repRange: z.string().nullable().optional(),
  restTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sets: z.array(AiSetSchema).default([]),
});

const AiWorkoutSchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  exercises: z.array(AiExerciseSchema).default([]),
});

const AiWeekSchema = z.object({
  workouts: z.array(AiWorkoutSchema).default([]),
});

export const AiPlanResponseSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  weeks: z.array(AiWeekSchema).min(1),
});

export type AiPlanResponse = z.infer<typeof AiPlanResponseSchema>;

// ── Output type (matches z.infer<typeof PlanInputSchema> from planSchemas.ts) ─
// Re-typed inline here so this util has no import cycle with planSchemas.ts.
export type ParsedPlan = {
  name: string;
  description: string | null | undefined;
  order: number;
  weeks: Array<{
    order: number;
    workouts: Array<{
      name: string;
      notes: string | null | undefined;
      order: number;
      dateCompleted: null;
      exercises: Array<{
        exercise: { name: string; category: string };
        order: number;
        repRange: string | null | undefined;
        restTime: string | null | undefined;
        notes: string | null | undefined;
        sets: Array<{ order: number; weight: number | null | undefined; reps: number | null | undefined }>;
      }>;
    }>;
  }>;
};

// ── Error type ────────────────────────────────────────────────────────────────

export class AiParseError extends Error {
  constructor(
    public readonly issues: z.ZodIssue[],
    message: string,
  ) {
    super(message);
    this.name = 'AiParseError';
  }
}

// ── The tool definition passed to the Anthropic API ──────────────────────────
// Exported so the route handler can reference the same definition without
// duplication.

export const AI_PLAN_TOOL = {
  name: 'create_workout_plan',
  description:
    'Create a structured workout plan from the user\'s input. ' +
    'Input may be a text description or a CSV/TSV spreadsheet export. ' +
    'Infer sensible defaults for any missing fields.',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Name of the training plan',
      },
      description: {
        type: 'string',
        description: 'Optional short description of the plan',
      },
      weeks: {
        type: 'array',
        description: 'Training weeks, in order',
        items: {
          type: 'object',
          properties: {
            workouts: {
              type: 'array',
              description: 'Workouts within this week, in order',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Workout name, e.g. "Day 1: Push"' },
                  notes: { type: 'string', description: 'Optional workout notes' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        category: {
                          type: 'string',
                          description:
                            'Exercise category: "resistance" or "cardio"',
                        },
                        repRange: {
                          type: 'string',
                          description: 'Rep range as a string, e.g. "8-12" or "5"',
                        },
                        restTime: {
                          type: 'string',
                          description: 'Rest period in seconds as a string, e.g. "90" or "90-120"',
                        },
                        notes: { type: 'string', description: 'Optional per-exercise notes' },
                        sets: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              weight: {
                                type: 'number',
                                description: 'Weight in kg as a number, e.g. 60. Omit if unknown.',
                              },
                              reps: { type: 'integer', description: 'Number of reps. Omit if unknown.' },
                            },
                          },
                        },
                      },
                      required: ['name', 'sets'],
                    },
                  },
                },
                required: ['name', 'exercises'],
              },
            },
          },
          required: ['workouts'],
        },
      },
    },
    required: ['name', 'weeks'],
  },
};

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Validate Claude's tool-use input and convert it to a `ParsedPlan`.
 * Assigns `order` fields from array indices.
 * Throws `AiParseError` if the data fails Zod validation.
 */
export function parseAiPlanResponse(rawInput: unknown): ParsedPlan {
  const result = AiPlanResponseSchema.safeParse(rawInput);
  if (!result.success) {
    throw new AiParseError(
      result.error.issues,
      `AI response failed validation: ${result.error.message}`,
    );
  }

  const { name, description, weeks } = result.data;

  return {
    name,
    description: description ?? null,
    order: 1, // placeholder — the server assigns the real order on save
    weeks: weeks.map((week, wi) => ({
      order: wi + 1,
      workouts: week.workouts.map((workout, woi) => ({
        name: workout.name,
        notes: workout.notes ?? null,
        order: woi + 1,
        dateCompleted: null,
        exercises: workout.exercises.map((ex, ei) => ({
          exercise: { name: ex.name, category: ex.category },
          order: ei + 1,
          repRange: ex.repRange ?? null,
          restTime: ex.restTime ?? null,
          notes: ex.notes ?? null,
          sets: ex.sets.map((set, si) => ({
            order: si + 1,
            weight: set.weight ?? null,
            reps: set.reps ?? null,
          })),
        })),
      })),
    })),
  };
}
