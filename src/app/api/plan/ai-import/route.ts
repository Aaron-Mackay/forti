import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireSession } from '@lib/requireSession';
import { AI_PLAN_TOOL, AiParseError, parseAiPlanResponse } from '@/utils/aiPlanParser';
import prisma from '@lib/prisma';

const MAX_BODY_BYTES = 200_000; // 200 KB — hard cap before JSON parsing (raised to cover spreadsheet imports)
const MAX_INPUT_BYTES_DEFAULT = 50_000; // 50 KB — cap for text descriptions
const MAX_INPUT_BYTES_SPREADSHEET = 150_000; // 150 KB — cap for CSV/spreadsheet imports

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export type AiImportResponse =
  | { plan: ReturnType<typeof parseAiPlanResponse> }
  | { error: string; parseIssues?: string[] };

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
    if (err instanceof NextResponse) return err;
    throw err;
  }

  const userId = session.user.id;

  // --- Body size cap (before JSON parsing) ---
  const rawBody = await readBodyWithLimit(req);
  if (rawBody === null) {
    return NextResponse.json({ error: 'Request body too large (max 100 KB)' }, { status: 413 });
  }

  let body: { input?: unknown; type?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body?.input;
  if (typeof input !== 'string' || !input.trim()) {
    return NextResponse.json({ error: 'Missing or empty "input" field' }, { status: 400 });
  }

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
    const userContent = isSpreadsheet
      ? 'You are parsing a CSV/TSV export of a coaching training spreadsheet. ' +
        'Identify WEEK rows (containing "WEEK \\d+") for week boundaries. ' +
        'Identify SESSION rows for workout names. ' +
        'Sessions may appear side by side — each 14-column group is one session. ' +
        'Ignore TRAINING NOTES rows, Volume column, and quality rating checkboxes. ' +
        'Use numeric weights/reps where available; omit non-numeric values (e.g. BFR, x). ' +
        'Call create_workout_plan with the structured plan.\n\n' +
        input
      : 'Parse the following workout plan and call the create_workout_plan tool with the ' +
        'structured data. Infer sensible defaults for any missing fields.\n\n' +
        input;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 32768,
      tools: [AI_PLAN_TOOL],
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: userContent }],
    });

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

    const plan = parseAiPlanResponse(toolUseBlock.input);
    return NextResponse.json({ plan } satisfies AiImportResponse);
  } catch (err) {
    if (err instanceof AiParseError) {
      console.error('AI plan parse error:', err.message, err.issues);
      const parseIssues = err.issues.slice(0, 5).map((issue) => {
        const path = issue.path.reduce<string>((acc, segment, i) => {
          if (typeof segment === 'number') return `${acc}[${segment}]`;
          return i === 0 ? String(segment) : `${acc}.${String(segment)}`;
        }, '');
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
