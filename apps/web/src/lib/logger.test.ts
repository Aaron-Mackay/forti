import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger, redactSensitiveData, serializeError } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits one JSON log line', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.info({
      event: 'test.event',
      route: '/api/test',
      requestId: 'req-1',
      details: { count: 2 },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).toEqual(expect.objectContaining({
      level: 'info',
      event: 'test.event',
      route: '/api/test',
      requestId: 'req-1',
      details: { count: 2 },
    }));
    expect(entry.timestamp).toEqual(expect.any(String));
  });

  it('redacts sensitive nested fields', () => {
    expect(redactSensitiveData({
      authorization: 'Bearer secret',
      nested: {
        refreshToken: 'token',
        safe: 'ok',
      },
    })).toEqual({
      authorization: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        safe: 'ok',
      },
    });
  });

  it('serializes errors consistently', () => {
    const error = new TypeError('Nope');

    expect(serializeError(error)).toEqual(expect.objectContaining({
      name: 'TypeError',
      message: 'Nope',
      stack: expect.any(String),
    }));
  });
});
