import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { EXERCISE_MUSCLES } from '@/types/dataTypes';
import { matchExercisesByAlias } from '@lib/exerciseAliasMatcher';

export const maxDuration = 30;

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour — shared with ai-import
const MAX_EXERCISES = 30;

const RequestSchema = z.object({
  exercises: z
    .array(z.object({ name: z.string().max(100) }))
    .min(1)
    .max(MAX_EXERCISES),
});

const EnrichedExerciseSchema = z.object({
  name: z.string(),
  category: z.enum(['resistance', 'cardio']),
  primaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)),
  secondaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)),
});

const EnrichToolResponseSchema = z.object({
  exercises: z.array(EnrichedExerciseSchema),
});

export type EnrichedExercise = z.infer<typeof EnrichedExerciseSchema>;
export type EnrichResponse =
  | { exercises: EnrichedExercise[] }
  | { error: string };

const ENRICH_TOOL: Anthropic.Tool = {
  name: 'enrich_exercises',
  description:
    'Return category and muscle group data for a list of exercise names. ' +
    'Use "resistance" for strength/weight training exercises and "cardio" for aerobic exercises. ' +
    'List primary muscles (directly targeted) and secondary muscles (stabilisers/assistors). ' +
    'Muscle values MUST be chosen from the allowed enum — do not invent new values.',
  input_schema: {
    type: 'object' as const,
    properties: {
      exercises: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: { type: 'string', enum: ['resistance', 'cardio'] },
            primaryMuscles: { type: 'array', items: { type: 'string', enum: [...EXERCISE_MUSCLES] } },
            secondaryMuscles: { type: 'array', items: { type: 'string', enum: [...EXERCISE_MUSCLES] } },
          },
          required: ['name', 'category', 'primaryMuscles', 'secondaryMuscles'],
        },
      },
    },
    required: ['exercises'],
  },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch (err) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    throw err;
  }

  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const names = parsed.data.exercises.map((e) => e.name);

  const visibleExercises = await prisma.exercise.findMany({
    where: { OR: [{ createdByUserId: null }, { createdByUserId: userId }] },
    select: {
      id: true,
      name: true,
      category: true,
      primaryMuscles: true,
      secondaryMuscles: true,
    },
  });

  const { matched, unmatched } = matchExercisesByAlias(names, visibleExercises);

  if (unmatched.length === 0) {
    return NextResponse.json({
      exercises: names.map((name) => {
        const resolved = matched.find((m) => m.inputName === name);
        if (!resolved) throw new Error(`Match missing for ${name}`);
        return {
          name,
          category: resolved.category,
          primaryMuscles: resolved.primaryMuscles,
          secondaryMuscles: resolved.secondaryMuscles,
        };
      }),
    } satisfies EnrichResponse);
  }

  // Rate limiting — shared with ai-import (10 requests / hour)
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await prisma.aiUsageLog.count({
    where: { userId, createdAt: { gte: windowStart } },
  });

  if (recentCount >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — maximum 10 AI requests per hour' },
      { status: 429 },
    );
  }

  await prisma.aiUsageLog.create({ data: { userId } });

  const client = new Anthropic();

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system:
        'Enrich exercise names with category and muscle group data. ' +
        'Call the enrich_exercises tool with all provided exercises. ' +
        `Muscle values must only come from this allowed list: ${EXERCISE_MUSCLES.join(', ')}. ` +
        'Do not use any muscle name not in that list.',
      tools: [ENRICH_TOOL],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content:
            `Call the enrich_exercises tool with all ${unmatched.length} exercises.\n\n<exercise_names>\n` +
            unmatched.map((n, i) => `${i + 1}. ${n}`).join('\n') +
            '\n</exercise_names>',
        },
      ],
    });
    const message = await stream.finalMessage();

    const toolUseBlock = message.content.find((b) => b.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return NextResponse.json({ error: 'AI did not return enrichment data' }, { status: 422 });
    }

    const validation = EnrichToolResponseSchema.safeParse(toolUseBlock.input);
    if (!validation.success) {
      console.error('Enrich tool response validation failed:', validation.error);
      return NextResponse.json({ error: 'AI returned invalid enrichment data' }, { status: 422 });
    }

    const enrichedByName = new Map(validation.data.exercises.map((ex) => [ex.name, ex]));

    return NextResponse.json({
      exercises: names.map((name) => {
        const preMatched = matched.find((m) => m.inputName === name);
        if (preMatched) {
          return {
            name,
            category: preMatched.category,
            primaryMuscles: preMatched.primaryMuscles,
            secondaryMuscles: preMatched.secondaryMuscles,
          };
        }

        const aiEnriched = enrichedByName.get(name);
        if (!aiEnriched) {
          throw new Error(`AI enrichment missing result for ${name}`);
        }
        return aiEnriched;
      }),
    } satisfies EnrichResponse);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 429 || err.status === 529 || err.status === 503) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable, please try again shortly' },
          { status: 503 },
        );
      }
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }
    console.error('Enrich unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
