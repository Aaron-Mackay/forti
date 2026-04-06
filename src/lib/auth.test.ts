import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {},
}));

import { authOptions } from './auth';

describe('auth redirect callback', () => {
  afterEach(() => {
    delete process.env.AUTH_COOKIE_DOMAIN;
    delete process.env.NODE_ENV;
  });

  it('keeps cookie-domain callback hosts during preview redirects', async () => {
    process.env.AUTH_COOKIE_DOMAIN = '.forti-training.co.uk';

    const result = await authOptions.callbacks!.redirect!({
      url: 'https://www.preview.forti-training.co.uk/user',
      baseUrl: 'https://forti-k6k9ivb3u-aaronmackays-projects.vercel.app',
    });

    expect(result).toBe('https://www.preview.forti-training.co.uk/user');
  });

  it('falls back to baseUrl for unrelated hosts', async () => {
    process.env.AUTH_COOKIE_DOMAIN = '.forti-training.co.uk';

    const result = await authOptions.callbacks!.redirect!({
      url: 'https://evil.example.com/user',
      baseUrl: 'https://www.preview.forti-training.co.uk',
    });

    expect(result).toBe('https://www.preview.forti-training.co.uk');
  });

  it('keeps trycloudflare callback hosts in development', async () => {
    process.env.NODE_ENV = 'development';

    const result = await authOptions.callbacks!.redirect!({
      url: 'https://abc123.trycloudflare.com/user',
      baseUrl: 'http://192.168.0.67:3000',
    });

    expect(result).toBe('https://abc123.trycloudflare.com/user');
  });
});
