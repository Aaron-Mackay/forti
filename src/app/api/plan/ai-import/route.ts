import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import { AI_CLARIFY_TOOL, AI_PLAN_TOOL, AiParseError, parseAiPlanResponse } from '@/utils/aiPlanParser';
import prisma from '@lib/prisma';

export const maxDuration = 300; // 5 minutes — large spreadsheet imports can take a while

const MAX_BODY_BYTES = 300_000; // 300 KB — hard cap before JSON parsing
const MAX_INPUT_BYTES_DEFAULT = 75_000; // 75 KB — cap for text descriptions
const MAX_INPUT_BYTES_SPREADSHEET = 225_000; // 225 KB — cap for CSV/spreadsheet imports

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export type AiImportResponse =
  | { plan: ReturnType<typeof parseAiPlanResponse> }
  | { questions: string[] }
  | { error: string; parseIssues?: string[] };

function formatAiIssuePath(path: PropertyKey[]): string {
  if (path.length === 0) return '';

  const segments: string[] = [];
  for (let i = 0; i < path.length; i += 1) {
    const segment = path[i];

    if (segment === 'weeks' && typeof path[i + 1] === 'number') {
      const weekIndex = path[i + 1] as number;
      segments.push(`Week ${weekIndex + 1}`);
      i += 1;
      continue;
    }

    if (segment === 'workouts' && typeof path[i + 1] === 'number') {
      const workoutIndex = path[i + 1] as number;
      segments.push(`Workout ${workoutIndex + 1}`);
      i += 1;
      continue;
    }

    if (segment === 'exercises' && typeof path[i + 1] === 'number') {
      const exerciseIndex = path[i + 1] as number;
      segments.push(`Exercise ${exerciseIndex + 1}`);
      i += 1;
      continue;
    }

    if (segment === 'sets' && typeof path[i + 1] === 'number') {
      const setIndex = path[i + 1] as number;
      segments.push(`Set ${setIndex + 1}`);
      i += 1;
      continue;
    }

    if (typeof segment === 'number') {
      segments.push(`Item ${segment + 1}`);
      continue;
    }

    segments.push(String(segment));
  }

  return segments.join(' > ');
}

function inferWeekCountFromInput(input: string): number | null {
  const matches = [...input.matchAll(/\bweek\s*([0-9]{1,2})\b/gi)];
  const weekNumbers = matches
    .map((m) => Number.parseInt(m[1], 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (weekNumbers.length > 0) {
    const uniqueCount = new Set(weekNumbers).size;
    const maxWeek = Math.max(...weekNumbers);
    const byWeekMarkers = Math.max(uniqueCount, maxWeek);
    if (byWeekMarkers > 1) return byWeekMarkers;
  }

  // Some pasted sheets only include "WEEK 1" but repeat identical SESSION rows
  // for later weeks. Use repeated SESSION names as a fallback heuristic.
  const sessionMatches = [...input.matchAll(/\bSESSION:\s*([^\t\r\n]+)/gi)];
  if (sessionMatches.length === 0) return null;

  const counts = new Map<string, number>();
  for (const match of sessionMatches) {
    const normalized = match[1].trim().replace(/\s+/g, ' ').toUpperCase();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  const highestSessionRepeat = Math.max(0, ...counts.values());
  return highestSessionRepeat > 1 ? highestSessionRepeat : null;
}

async function readBodyWithLimit(req: NextRequest): Promise<string | null> {
  // Fast path: reject oversized requests via Content-Length before reading
  const contentLength = req.headers.get('content-length');
  if (contentLength !== null && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return null;
  }

  const reader = req.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.byteLength + chunk.byteLength);
      merged.set(acc, 0);
      merged.set(chunk, acc.byteLength);
      return merged;
    }, new Uint8Array(0)),
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch (err) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    throw err;
  }

  const userId = session.user.id;

  // --- Body size cap (before JSON parsing) ---
  const rawBody = await readBodyWithLimit(req);
  if (rawBody === null) {
    return NextResponse.json(
      { error: `Request body too large (max ${MAX_BODY_BYTES / 1000} KB)` },
      { status: 413 },
    );
  }

  let body: { input?: unknown; type?: unknown; answers?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body?.input;
  if (typeof input !== 'string' || !input.trim()) {
    return NextResponse.json({ error: 'Missing or empty "input" field' }, { status: 400 });
  }

  // Optional Q&A pairs from a previous clarification round
  const answers = Array.isArray(body?.answers)
    ? (body.answers as unknown[]).filter((a): a is string => typeof a === 'string')
    : [];

  const isSpreadsheet = body?.type === 'spreadsheet';
  const maxInputBytes = isSpreadsheet ? MAX_INPUT_BYTES_SPREADSHEET : MAX_INPUT_BYTES_DEFAULT;
  const limitKb = maxInputBytes / 1000;
  if (Buffer.byteLength(input, 'utf8') > maxInputBytes) {
    return NextResponse.json({ error: `Input too large (max ${limitKb} KB)` }, { status: 413 });
  }

  // --- Per-user rate limiting (10 requests / hour) ---
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await prisma.aiUsageLog.count({
    where: { userId, createdAt: { gte: windowStart } },
  });

  if (recentCount >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — maximum 10 AI imports per hour' },
      { status: 429 },
    );
  }

  // Record usage before calling the API
  await prisma.aiUsageLog.create({ data: { userId } });

  const client = new Anthropic();

  try {
    const hasAnswers = answers.length > 0;

    const baseInstruction = isSpreadsheet
      ? 'You are parsing a CSV/TSV export of a coaching training spreadsheet. ' +
        'Identify WEEK rows (containing "WEEK \\d+") for week boundaries. ' +
        'Identify SESSION rows for workout names. ' +
        'Sessions may appear side by side — each 14-column group is one session. ' +
        'Ignore TRAINING NOTES rows, Volume column, and quality rating checkboxes. ' +
        'Use numeric weights/reps where available; omit non-numeric values (e.g. BFR, x). ' +
        'If an exercise is marked "BFR", set isBfr=true for that exercise instead of using "BFR" as a rep range. ' +
        'Preserve isolated numeric set values even when neighboring set cells are blank (e.g. keep "Set 1 Weight = 100"). ' +
        'Do not convert blank spreadsheet cells into 0 values. ' +
        'Capture RPE or RIR annotations per set or exercise where present (e.g. "@RPE 8", "2RIR").'
      : 'Parse the following workout plan. Infer sensible defaults for any missing fields.';

    // When answers are provided, append them and force plan creation directly.
    // When no answers yet, offer both tools so Claude can ask if genuinely unclear.
    const tools = hasAnswers ? [AI_PLAN_TOOL] : [AI_PLAN_TOOL, AI_CLARIFY_TOOL];
    const toolChoice = hasAnswers
      ? ({ type: 'tool', name: AI_PLAN_TOOL.name } as const)
      : ({ type: 'any' } as const);

    const userContent = hasAnswers
      ? baseInstruction +
        '\n\nAdditional context provided by the user:\n' +
        answers.map((a, i) => `${i + 1}. ${a}`).join('\n') +
        '\n\nNow call create_workout_plan with the structured plan.\n\n' +
        input
      : baseInstruction +
        '\n\nIf the input is clear enough, call create_workout_plan directly. ' +
        'Only call ask_clarifying_questions if there is genuine ambiguity that ' +
        'prevents you from building a complete plan.\n\n' +
        input;

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 49152,
      tools,
      tool_choice: toolChoice,
      messages: [{ role: 'user', content: userContent }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json(
        { error: 'The spreadsheet was too large to process in one go — try uploading fewer weeks at a time' },
        { status: 422 },
      );
    }

    const toolUseBlock = message.content.find((block) => block.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'AI did not return a structured plan' },
        { status: 422 },
      );
    }

    // Claude chose to ask clarifying questions
    if (toolUseBlock.name === AI_CLARIFY_TOOL.name) {
      const raw = toolUseBlock.input as { questions?: unknown };
      const questions = Array.isArray(raw.questions)
        ? raw.questions.filter((q): q is string => typeof q === 'string')
        : [];
      if (questions.length === 0) {
        return NextResponse.json({ error: 'AI did not return a structured plan' }, { status: 422 });
      }
      return NextResponse.json({ questions } satisfies AiImportResponse);
    }

    const parsedPlan = parseAiPlanResponse(toolUseBlock.input);
    const inferredWeekCount = isSpreadsheet ? inferWeekCountFromInput(input) : null;

    // Spreadsheet imports occasionally return a single template week even when
    // the input clearly specifies multiple weeks (e.g. "Week 1 ... Week 8").
    // In that case, duplicate the parsed week template to the inferred count.
    const plan =
      isSpreadsheet &&
      inferredWeekCount &&
      inferredWeekCount > 1 &&
      parsedPlan.weeks.length === 1
        ? {
            ...parsedPlan,
            weeks: Array.from({ length: inferredWeekCount }, (_, i) => {
              const baseWeek = parsedPlan.weeks[0];
              return {
                ...baseWeek,
                order: i + 1,
                workouts: baseWeek.workouts.map((workout) => ({
                  ...workout,
                  exercises: workout.exercises.map((exercise) => ({
                    ...exercise,
                    sets: exercise.sets.map((set) => ({ ...set })),
                  })),
                })),
              };
            }),
          }
        : parsedPlan;

    return NextResponse.json({ plan } satisfies AiImportResponse);
  } catch (err) {
    if (err instanceof AiParseError) {
      console.error('AI plan parse error:', err.message, err.issues);
      const parseIssues = err.issues.slice(0, 5).map((issue) => {
        const path = formatAiIssuePath(issue.path);
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      return NextResponse.json(
        { error: 'Could not parse the plan structure returned by AI', parseIssues },
        { status: 422 },
      );
    }

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

    console.error('AI import unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
