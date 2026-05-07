import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validateCronRequest } from './cronAuth';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/cron/check-in-reminders', {
    method: 'GET',
    headers,
  });
}

describe('validateCronRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('returns 500 when CRON_SECRET is missing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const req = makeRequest({ authorization: 'Bearer anything' });

    const res = validateCronRequest(req);

    expect(res?.status).toBe(500);
    await expect(res?.json()).resolves.toEqual({ error: 'Server misconfiguration' });
    expect(errorSpy).toHaveBeenCalledWith('CRON route misconfiguration: CRON_SECRET is not set.');
  });

  it('returns 401 when secret is wrong', async () => {
    process.env.CRON_SECRET = 'correct-secret';
    const req = makeRequest({ authorization: 'Bearer wrong-secret' });

    const res = validateCronRequest(req);

    expect(res?.status).toBe(401);
    await expect(res?.json()).resolves.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('returns null when secret is correct', () => {
    process.env.CRON_SECRET = 'correct-secret';
    const req = makeRequest({ authorization: 'Bearer correct-secret' });

    const res = validateCronRequest(req);

    expect(res).toBeNull();
  });

  it('returns 401 when x-vercel-cron header is present with invalid value', async () => {
    process.env.CRON_SECRET = 'correct-secret';
    const req = makeRequest({
      authorization: 'Bearer correct-secret',
      'x-vercel-cron': '0',
    });

    const res = validateCronRequest(req);

    expect(res?.status).toBe(401);
    await expect(res?.json()).resolves.toEqual({ error: 'Unauthorized source' });
  });
});
