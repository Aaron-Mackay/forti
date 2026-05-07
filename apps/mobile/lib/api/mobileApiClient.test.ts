import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createMobileApiClient, MobileApiError } from './mobileApiClient';

const ResponseSchema = z.object({
  ok: z.boolean(),
});

describe('createMobileApiClient', () => {
  const getBaseUrl = () => 'https://api.example.com';
  const getAccessToken = vi.fn();
  const fetchImpl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the bearer token on authenticated requests', async () => {
    getAccessToken.mockResolvedValue('access-token');
    fetchImpl.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const client = createMobileApiClient({ fetchImpl, getAccessToken, getBaseUrl });
    await expect(client.request({ path: '/api/user/profile', schema: ResponseSchema })).resolves.toEqual({
      ok: true,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/user/profile',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect((fetchImpl.mock.calls[0]?.[1]?.headers as Headers).get('authorization')).toBe('Bearer access-token');
  });

  it('refreshes once and retries after a 401 response', async () => {
    getAccessToken
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('fresh-token');
    fetchImpl
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const client = createMobileApiClient({ fetchImpl, getAccessToken, getBaseUrl });
    await expect(client.request({ path: '/api/user/settings', schema: ResponseSchema })).resolves.toEqual({
      ok: true,
    });

    expect(getAccessToken).toHaveBeenNthCalledWith(1, { forceRefresh: false });
    expect(getAccessToken).toHaveBeenNthCalledWith(2, { forceRefresh: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('surfaces non-401 errors without retrying again', async () => {
    getAccessToken.mockResolvedValue('access-token');
    fetchImpl.mockResolvedValue(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }));

    const client = createMobileApiClient({ fetchImpl, getAccessToken, getBaseUrl });

    await expect(client.request({ path: '/api/user/settings', schema: ResponseSchema })).rejects.toEqual(
      expect.objectContaining<Partial<MobileApiError>>({
        message: 'Forbidden',
        status: 403,
      }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
