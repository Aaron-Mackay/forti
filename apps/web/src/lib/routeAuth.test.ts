import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { AuthenticationError } from './requireSession';
import { withApiRoute } from './routeAuth';

describe('withApiRoute', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs completion and attaches request id', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const handler = withApiRoute({ route: '/api/test' }, async () =>
      NextResponse.json({ ok: true }, { status: 201 }),
    );

    const response = await handler(new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-request-id': 'req-1' },
    }));

    expect(response.status).toBe(201);
    expect(response.headers.get('x-request-id')).toBe('req-1');
    expect(info).toHaveBeenCalledTimes(1);
    expect(JSON.parse(info.mock.calls[0][0] as string)).toEqual(expect.objectContaining({
      event: 'api.request.completed',
      route: '/api/test',
      method: 'POST',
      requestId: 'req-1',
      status: 201,
      durationMs: expect.any(Number),
    }));
  });

  it('logs authentication errors and returns 401', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const handler = withApiRoute({ route: '/api/test' }, async () => {
      throw new AuthenticationError();
    });

    const response = await handler(new Request('http://localhost/api/test', {
      headers: { 'x-request-id': 'req-auth' },
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('req-auth');
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toEqual(expect.objectContaining({
      event: 'api.request.unauthenticated',
      requestId: 'req-auth',
      status: 401,
    }));
    expect(JSON.parse(info.mock.calls[0][0] as string)).toEqual(expect.objectContaining({
      event: 'api.request.completed',
      status: 401,
    }));
  });

  it('logs unexpected errors and returns 500', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = withApiRoute({ route: '/api/test' }, async () => {
      throw new Error('broken');
    });

    const response = await handler(new Request('http://localhost/api/test', {
      headers: { 'x-request-id': 'req-error' },
    }));

    expect(response.status).toBe(500);
    expect(response.headers.get('x-request-id')).toBe('req-error');
    expect(JSON.parse(error.mock.calls[0][0] as string)).toEqual(expect.objectContaining({
      event: 'api.request.unexpected_error',
      requestId: 'req-error',
      error: expect.objectContaining({ message: 'broken' }),
    }));
    expect(JSON.parse(info.mock.calls[0][0] as string)).toEqual(expect.objectContaining({
      event: 'api.request.completed',
      status: 500,
    }));
  });
});
