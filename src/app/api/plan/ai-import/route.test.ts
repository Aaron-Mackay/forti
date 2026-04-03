import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@lib/requireSession', () => ({
  requireSession: vi.fn(),
  isAuthenticationError: (error: unknown) => error instanceof Error && error.name === 'AuthenticationError',
  authenticationErrorResponse: () => Response.json({ error: 'Unauthorized' }, { status: 401 }),
}));

const { mockAiUsageLog } = vi.hoisted(() => ({
  mockAiUsageLog: {
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@lib/prisma', () => ({
  default: { aiUsageLog: mockAiUsageLog },
}));

vi.mock('@anthropic-ai/sdk', async () => {
  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  const finalMessage = vi.fn();
  const stream = vi.fn().mockReturnValue({ finalMessage });
  return {
    default: Object.assign(
      vi.fn().mockImplementation(() => ({ messages: { stream } })),
      { APIError: MockAPIError },
    ),
    __finalMessage: finalMessage, // expose for test control
  };
});

import { requireSession } from '@lib/requireSession';
import { __finalMessage as mockFinalMessage } from '@anthropic-ai/sdk';

const mockRequireSession = requireSession as ReturnType<typeof vi.fn>;
const mockMessagesStream = mockFinalMessage as ReturnType<typeof vi.fn>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/plan/ai-import', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Minimal valid tool-use response from the Anthropic API */
function makeToolUseResponse(planInput: unknown) {
  return {
    content: [
      {
        type: 'tool_use',
        id: 'tu_123',
        name: 'create_workout_plan',
        input: planInput,
      },
    ],
    stop_reason: 'tool_use',
  };
}

const validPlanInput = {
  name: 'Push/Pull/Legs',
  weeks: [
    {
      workouts: [
        {
          name: 'Push',
          exercises: [{ name: 'Bench Press', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } });
  mockMessagesStream.mockResolvedValue(makeToolUseResponse(validPlanInput));
  mockAiUsageLog.count.mockResolvedValue(0);
  mockAiUsageLog.create.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/plan/ai-import', () => {
  describe('authentication', () => {
    it('returns 401 when session is missing', async () => {
      mockRequireSession.mockImplementation(() => {
        const err = new Error('Unauthorized');
        err.name = 'AuthenticationError';
        throw err;
      });

      const req = makeRequest({ input: 'some workout' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  describe('request validation', () => {
    it('returns 400 when body is not valid JSON', async () => {
      const req = new NextRequest('http://localhost/api/plan/ai-import', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/json/i);
    });

    it('returns 400 when input field is missing', async () => {
      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/input/i);
    });

    it('returns 400 when input is an empty string', async () => {
      const req = makeRequest({ input: '   ' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 413 when non-spreadsheet input exceeds 75 KB', async () => {
      const bigInput = 'a'.repeat(76_000);
      const req = makeRequest({ input: bigInput });
      const res = await POST(req);
      expect(res.status).toBe(413);
      const body = await res.json();
      expect(body.error).toMatch(/too large/i);
    });
  });

  describe('successful import', () => {
    it('returns 200 with the parsed plan on a valid Claude response', async () => {
      const req = makeRequest({ input: 'Bench 3x8, Squat 3x5' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.plan).toBeDefined();
      expect(body.plan.name).toBe('Push/Pull/Legs');
      expect(body.plan.weeks).toHaveLength(1);
      expect(body.plan.weeks[0].workouts[0].exercises[0].exercise.name).toBe('Bench Press');
    });

    it('assigns order fields in the returned plan', async () => {
      const req = makeRequest({ input: 'any workout text' });
      const res = await POST(req);
      const { plan } = await res.json();

      expect(plan.order).toBe(1);
      expect(plan.weeks[0].order).toBe(1);
      expect(plan.weeks[0].workouts[0].order).toBe(1);
    });
  });

  describe('Claude API error handling', () => {
    it('returns 422 when Claude does not return a tool_use block', async () => {
      mockMessagesStream.mockResolvedValue({
        content: [{ type: 'text', text: 'I cannot parse that.' }],
        stop_reason: 'end_turn',
      });

      const req = makeRequest({ input: 'gobbledygook' });
      const res = await POST(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toMatch(/structured plan/i);
    });

    it('returns 422 when Claude returns invalid plan structure', async () => {
      mockMessagesStream.mockResolvedValue(
        makeToolUseResponse({ name: '', weeks: [] }), // invalid: empty name + no weeks
      );

      const req = makeRequest({ input: 'some text' });
      const res = await POST(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toMatch(/parse/i);
    });

    it('includes parseIssues in the response when Zod validation fails', async () => {
      mockMessagesStream.mockResolvedValue(
        makeToolUseResponse({ name: '', weeks: [] }),
      );

      const req = makeRequest({ input: 'some text' });
      const res = await POST(req);
      const body = await res.json();

      expect(Array.isArray(body.parseIssues)).toBe(true);
      expect(body.parseIssues.length).toBeGreaterThan(0);
    });

    it('formats a flat path issue as "fieldName: message"', async () => {
      mockMessagesStream.mockResolvedValue(
        makeToolUseResponse({ name: '', weeks: [{ workouts: [] }] }), // name is empty string
      );

      const req = makeRequest({ input: 'some text' });
      const res = await POST(req);
      const body = await res.json();

      const nameIssue = (body.parseIssues as string[]).find((s: string) => s.startsWith('name:'));
      expect(nameIssue).toBeDefined();
      expect(nameIssue).toMatch(/name:.*character/i);
    });

    it('formats a nested path issue with bracket notation for indices', async () => {
      mockMessagesStream.mockResolvedValue(
        makeToolUseResponse({
          name: 'Plan',
          weeks: [{ workouts: [{ name: 'Day 1', exercises: [{ name: '', sets: [] }] }] }],
        }),
      );

      const req = makeRequest({ input: 'some text' });
      const res = await POST(req);
      const body = await res.json();

      const nestedIssue = (body.parseIssues as string[]).find((s: string) =>
        s.includes('weeks[0]'),
      );
      expect(nestedIssue).toBeDefined();
      expect(nestedIssue).toMatch(/weeks\[0\]\.workouts\[0\]\.exercises\[0\]\.name/);
    });

    it('caps parseIssues at 5 entries even when more issues exist', async () => {
      // Provide a completely null input — Zod will generate many issues
      mockMessagesStream.mockResolvedValue(makeToolUseResponse(null));

      const req = makeRequest({ input: 'some text' });
      const res = await POST(req);
      const body = await res.json();

      expect((body.parseIssues as string[]).length).toBeLessThanOrEqual(5);
    });

    it('returns 503 when Anthropic returns 429 rate-limit error', async () => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      mockMessagesStream.mockRejectedValue(new Anthropic.APIError(429, 'rate limited'));

      const req = makeRequest({ input: 'some workout' });
      const res = await POST(req);
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toMatch(/unavailable/i);
    });

    it('returns 503 when Anthropic returns 529 overload error', async () => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      mockMessagesStream.mockRejectedValue(new Anthropic.APIError(529, 'overloaded'));

      const req = makeRequest({ input: 'some workout' });
      const res = await POST(req);
      expect(res.status).toBe(503);
    });

    it('returns 502 for other Anthropic API errors', async () => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      mockMessagesStream.mockRejectedValue(new Anthropic.APIError(400, 'bad request to api'));

      const req = makeRequest({ input: 'some workout' });
      const res = await POST(req);
      expect(res.status).toBe(502);
    });

    it('returns 500 for unexpected non-API errors', async () => {
      mockMessagesStream.mockRejectedValue(new Error('network timeout'));

      const req = makeRequest({ input: 'some workout' });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe('body size cap', () => {
    it('returns 413 when Content-Length header exceeds 300 KB', async () => {
      const req = new NextRequest('http://localhost/api/plan/ai-import', {
        method: 'POST',
        body: JSON.stringify({ input: 'hi' }),
        headers: { 'Content-Type': 'application/json', 'Content-Length': '400000' },
      });
      const res = await POST(req);
      expect(res.status).toBe(413);
      const body = await res.json();
      expect(body.error).toMatch(/too large/i);
    });

    it('returns 413 when streamed body exceeds 300 KB', async () => {
      const bigBody = JSON.stringify({ input: 'a'.repeat(305_000) });
      const req = new NextRequest('http://localhost/api/plan/ai-import', {
        method: 'POST',
        body: bigBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(413);
    });
  });

  describe('spreadsheet type', () => {
    it('accepts input up to 225 KB when type is spreadsheet', async () => {
      const bigInput = 'a'.repeat(150_000); // over default 75 KB limit, under 225 KB spreadsheet limit
      const req = makeRequest({ input: bigInput, type: 'spreadsheet' });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('returns 413 when spreadsheet input exceeds 225 KB', async () => {
      const bigInput = 'a'.repeat(226_000);
      const req = makeRequest({ input: bigInput, type: 'spreadsheet' });
      const res = await POST(req);
      expect(res.status).toBe(413);
      const body = await res.json();
      expect(body.error).toMatch(/too large/i);
    });

    it('returns 413 for non-spreadsheet input exceeding 75 KB', async () => {
      const bigInput = 'a'.repeat(76_000);
      const req = makeRequest({ input: bigInput });
      const res = await POST(req);
      expect(res.status).toBe(413);
    });

    it('expands a single parsed week when spreadsheet input clearly references multiple weeks', async () => {
      mockMessagesStream.mockResolvedValue(
        makeToolUseResponse({
          name: 'Week 1 Training Plan',
          weeks: [
            {
              workouts: [
                {
                  name: 'Session 1',
                  exercises: [{ name: 'Bench Press', sets: [{ reps: 8, weight: 80 }] }],
                },
              ],
            },
          ],
        }),
      );

      const req = makeRequest({
        type: 'spreadsheet',
        input: 'Week 1\nSession 1\n...\nWeek 8\nSession 1\n...',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.plan.weeks).toHaveLength(8);
      expect(body.plan.weeks.map((w: { order: number }) => w.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('does not expand weeks when the parsed plan already includes multiple weeks', async () => {
      mockMessagesStream.mockResolvedValue(
        makeToolUseResponse({
          name: '8 Week Program',
          weeks: [
            { workouts: [{ name: 'Week 1 Session', exercises: [{ name: 'Bench', sets: [] }] }] },
            { workouts: [{ name: 'Week 2 Session', exercises: [{ name: 'Bench', sets: [] }] }] },
          ],
        }),
      );

      const req = makeRequest({
        type: 'spreadsheet',
        input: 'Week 1 ... Week 8 ...',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.plan.weeks).toHaveLength(2);
      expect(body.plan.weeks[0].workouts[0].name).toBe('Week 1 Session');
      expect(body.plan.weeks[1].workouts[0].name).toBe('Week 2 Session');
    });

    it('infers week count from repeated SESSION rows when only "Week 1" is labeled', async () => {
      mockMessagesStream.mockResolvedValue(
        makeToolUseResponse({
          name: 'Week 1 Training Plan',
          weeks: [
            {
              workouts: [
                { name: 'Lower Body A', exercises: [{ name: 'Squat', sets: [] }] },
                { name: 'Push', exercises: [{ name: 'Bench', sets: [] }] },
              ],
            },
          ],
        }),
      );

      const req = makeRequest({
        type: 'spreadsheet',
        input: [
          'WEEK 1',
          'SESSION: LOWER BODY A\tSESSION: PUSH',
          '...',
          'SESSION: LOWER BODY A\tSESSION: PUSH',
          '...',
          'SESSION: LOWER BODY A\tSESSION: PUSH',
        ].join('\n'),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.plan.weeks).toHaveLength(3);
    });
  });

  describe('rate limiting', () => {
    it('returns 429 when user has reached the 10 request/hour limit', async () => {
      mockAiUsageLog.count.mockResolvedValue(10);

      const req = makeRequest({ input: 'some workout' });
      const res = await POST(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toMatch(/rate limit/i);
    });

    it('proceeds when user is under the rate limit', async () => {
      mockAiUsageLog.count.mockResolvedValue(9);

      const req = makeRequest({ input: 'some workout' });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('records a usage log entry on each successful request', async () => {
      const req = makeRequest({ input: 'some workout' });
      await POST(req);
      expect(mockAiUsageLog.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
    });
  });
});
