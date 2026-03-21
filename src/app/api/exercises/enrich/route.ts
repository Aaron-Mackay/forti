import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

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
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
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
    'List primary muscles (directly targeted) and secondary muscles (stabilisers/assistors).',
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
            primaryMuscles: { type: 'array', items: { type: 'string' } },
            secondaryMuscles: { type: 'array', items: { type: 'string' } },
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
    if (err instanceof NextResponse) return err;
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
  const names = parsed.data.exercises.map((e) => e.name);

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [ENRICH_TOOL],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content:
            `Enrich the following exercise names with category and muscle data. ` +
            `Call the enrich_exercises tool with all ${names.length} exercises.\n\n` +
            names.map((n, i) => `${i + 1}. ${n}`).join('\n'),
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

    return NextResponse.json({ exercises: validation.data.exercises } satisfies EnrichResponse);
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
