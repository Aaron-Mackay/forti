import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { compactZodIssues, getRequestLogContext, summarizePayload } from './apiLogging';

describe('apiLogging', () => {
  it('extracts request log context from headers', () => {
    const req = new Request('http://localhost/api/test', {
      method: 'PATCH',
      headers: {
        'x-request-id': 'req-123',
        'x-vercel-id': 'iad1::abc',
      },
    });

    expect(getRequestLogContext(req, '/api/test')).toEqual({
      route: '/api/test',
      method: 'PATCH',
      requestId: 'req-123',
      vercelId: 'iad1::abc',
    });
  });

  it('generates a request id when missing', () => {
    const ctx = getRequestLogContext(new Request('http://localhost/api/test'), '/api/test');

    expect(ctx.requestId).toEqual(expect.any(String));
    expect(ctx.requestId.length).toBeGreaterThan(0);
  });

  it('compacts zod issues to log-safe fields', () => {
    const schema = z.object({ plan: z.object({ id: z.number() }) });
    const result = schema.safeParse({ plan: { id: 'bad' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(compactZodIssues(result.error)).toEqual([
        expect.objectContaining({
          path: 'plan.id',
          code: 'invalid_type',
          message: expect.any(String),
        }),
      ]);
    }
  });

  it('summarizes only explicitly allowed payload fields', () => {
    expect(summarizePayload({
      userId: 'user-1',
      password: 'secret',
      plans: [{ id: 1 }, { id: 2 }],
    }, ['userId', 'plans'])).toEqual({
      userId: 'user-1',
      plansCount: 2,
    });
  });
});
