import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireSession } from '@lib/requireSession';
import { AI_PLAN_TOOL, AiParseError, parseAiPlanResponse } from '@/utils/aiPlanParser';

const MAX_INPUT_BYTES = 50_000; // 50 KB — generous for any realistic workout description

export type AiImportResponse =
  | { plan: ReturnType<typeof parseAiPlanResponse> }
  | { error: string; parseIssues?: string[] };

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await requireSession();
  } catch (err) {
    if (err instanceof NextResponse) return err;
    throw err;
  }

  let body: { input?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body?.input;
  if (typeof input !== 'string' || !input.trim()) {
    return NextResponse.json({ error: 'Missing or empty "input" field' }, { status: 400 });
  }

  if (Buffer.byteLength(input, 'utf8') > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: 'Input too large (max 50 KB)' }, { status: 413 });
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      tools: [AI_PLAN_TOOL],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content:
            'Parse the following workout plan and call the create_workout_plan tool with the ' +
            'structured data. Infer sensible defaults for any missing fields.\n\n' +
            input,
        },
      ],
    });

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
