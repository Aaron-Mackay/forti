import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {},
}));

import { authOptions } from './auth';

describe('auth redirect callback', () => {
  afterEach(() => {
    delete process.env.AUTH_COOKIE_DOMAIN;
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
});
