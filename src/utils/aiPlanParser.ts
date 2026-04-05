import { z } from 'zod';
import { NullableRepRangeSchema } from '@/lib/repRange';

// ── Zod schema for Claude's tool-use output ──────────────────────────────────
// Intentionally simpler than PlanInputSchema: no `order` fields (we derive
// those from array position), and most fields are optional so Claude has
// flexibility in what it returns.

const AiSetSchema = z.object({
  weight: z.number().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  rpe: z.number().nullable().optional(),
  rir: z.number().int().nullable().optional(),
});

const AiExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().default('resistance'),
  repRange: NullableRepRangeSchema,
  restTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  targetRpe: z.number().nullable().optional(),
  targetRir: z.number().int().nullable().optional(),
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
        targetRpe: number | null | undefined;
        targetRir: number | null | undefined;
        sets: Array<{ order: number; weight: number | null | undefined; reps: number | null | undefined; rpe: number | null | undefined; rir: number | null | undefined }>;
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

const REP_RANGE_DESCRIPTION =
  'Rep range string. Valid formats only: exact "10", range "5-10", plus "5+", or "AMRAP". ' +
  'Do not include words like "reps", do not use "x", and prefer a plain hyphen-minus "-" for ranges.';

// ── Clarifying questions tool ─────────────────────────────────────────────────
// Used in the first pass when input is ambiguous. Claude calls this instead of
// create_workout_plan and returns 1–5 short questions for the user to answer.

export const AI_CLARIFY_TOOL = {
  name: 'ask_clarifying_questions',
  description:
    'Use this tool ONLY when the input is genuinely ambiguous and you cannot make ' +
    'reasonable assumptions. Ask 1–5 concise questions to resolve the ambiguity. ' +
    'If you can infer sensible defaults, call create_workout_plan directly instead.',
  input_schema: {
    type: 'object' as const,
    properties: {
      questions: {
        type: 'array',
        description: 'List of 1–5 short questions to ask the user',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5,
      },
    },
    required: ['questions'],
  },
};

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
                          description: REP_RANGE_DESCRIPTION,
                        },
                        restTime: {
                          type: 'string',
                          description: 'Rest period in seconds as a string, e.g. "90" or "90-120"',
                        },
                        notes: { type: 'string', description: 'Optional per-exercise notes' },
                        targetRpe: { type: 'number', description: 'Prescribed RPE target for this exercise (e.g. 8 or 8.5). Omit if not specified.' },
                        targetRir: { type: 'integer', description: 'Prescribed RIR target for this exercise (e.g. 2). Omit if not specified.' },
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
                              rpe: { type: 'number', description: 'RPE (Rate of Perceived Exertion) for this set, e.g. 8 or 8.5. Omit if not specified.' },
                              rir: { type: 'integer', description: 'RIR (Reps In Reserve) for this set, e.g. 2. Omit if not specified.' },
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
          targetRpe: ex.targetRpe ?? null,
          targetRir: ex.targetRir ?? null,
          sets: ex.sets.map((set, si) => ({
            order: si + 1,
            weight: set.weight ?? null,
            reps: set.reps ?? null,
            rpe: set.rpe ?? null,
            rir: set.rir ?? null,
          })),
        })),
      })),
    })),
  };
}
