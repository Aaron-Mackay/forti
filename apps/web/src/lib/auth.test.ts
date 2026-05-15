import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRecordAuditEvent, mockPrisma } = vi.hoisted(() => ({
  mockRecordAuditEvent: vi.fn(),
  mockPrisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

vi.mock('@lib/recordSignInAuditEvent', () => ({
  recordSignInAuditEvent: mockRecordAuditEvent,
}));

type AuthModule = typeof import('./auth');

const authEnvKeys = [
  'AUTH_COOKIE_DOMAIN',
  'DISABLE_GOOGLE_AUTH',
  'ENABLE_TEST_AUTH',
  'LOCAL_USER_EMAIL',
  'LOCAL_USER_EMAILS',
  'LOCAL_USER_LOGIN',
  'NODE_ENV',
  'VERCEL_ENV',
] as const;

async function loadAuthModule(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const key of authEnvKeys) {
    delete process.env[key];
  }

  process.env.NODE_ENV = env.NODE_ENV ?? 'development';
  process.env.VERCEL_ENV = env.VERCEL_ENV ?? 'preview';

  for (const [key, value] of Object.entries(env)) {
    if (key === 'NODE_ENV' || key === 'VERCEL_ENV') continue;
    process.env[key] = value;
  }

  return import('./auth') as Promise<AuthModule>;
}

describe('auth redirect callback', () => {
  beforeEach(() => {
    mockRecordAuditEvent.mockReset();
    mockPrisma.user.findFirst.mockReset();
    mockPrisma.user.create.mockReset();
  });

  afterEach(() => {
    for (const key of authEnvKeys) {
      delete process.env[key];
    }
  });

  it('keeps cookie-domain callback hosts during preview redirects', async () => {
    const { authOptions } = await loadAuthModule({
      AUTH_COOKIE_DOMAIN: '.forti-training.co.uk',
      NODE_ENV: 'development',
    });

    const result = await authOptions.callbacks!.redirect!({
      url: 'https://www.preview.forti-training.co.uk/user',
      baseUrl: 'https://forti-k6k9ivb3u-aaronmackays-projects.vercel.app',
    });

    expect(result).toBe('https://www.preview.forti-training.co.uk/user');
  });

  it('falls back to baseUrl for unrelated hosts', async () => {
    const { authOptions } = await loadAuthModule({
      AUTH_COOKIE_DOMAIN: '.forti-training.co.uk',
      NODE_ENV: 'development',
    });

    const result = await authOptions.callbacks!.redirect!({
      url: 'https://evil.example.com/user',
      baseUrl: 'https://www.preview.forti-training.co.uk',
    });

    expect(result).toBe('https://www.preview.forti-training.co.uk');
  });

  it('keeps trycloudflare callback hosts in development', async () => {
    const { authOptions } = await loadAuthModule({
      NODE_ENV: 'development',
    });

    const result = await authOptions.callbacks!.redirect!({
      url: 'https://abc123.trycloudflare.com/user',
      baseUrl: 'http://192.168.0.67:3000',
    });

    expect(result).toBe('https://abc123.trycloudflare.com/user');
  });

  it('omits the Google provider when DISABLE_GOOGLE_AUTH=true', async () => {
    const { authOptions } = await loadAuthModule({
      DISABLE_GOOGLE_AUTH: 'true',
      NODE_ENV: 'development',
    });

    expect(authOptions.providers.some((provider) => provider.id === 'google')).toBe(false);
  });

  it('enables local-user login in development', async () => {
    const baseEnv = {
      NODE_ENV: 'development',
      VERCEL_ENV: 'preview',
    };
    const localEnv = {
      ...baseEnv,
      LOCAL_USER_LOGIN: 'true',
      LOCAL_USER_EMAIL: 'aaron@example.com',
    };

    const { getAuthProviders } = await loadAuthModule(localEnv);
    const baseProviders = getAuthProviders(baseEnv);
    const localProviders = getAuthProviders(localEnv);

    expect(localProviders.length).toBe(baseProviders.length + 1);
  });

  it('does not enable local-user login in production', async () => {
    const productionEnv = {
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
    };
    const withLocalEnv = {
      ...productionEnv,
      LOCAL_USER_LOGIN: 'true',
      LOCAL_USER_EMAIL: 'aaron@example.com',
    };

    const { getAuthProviders } = await loadAuthModule(withLocalEnv);
    const baseProviders = getAuthProviders(productionEnv);
    const localProviders = getAuthProviders(withLocalEnv);

    expect(localProviders.length).toBe(baseProviders.length);
  });

  it('authorizes an existing local user without creating one', async () => {
    const existingUser = { id: 'user-1', email: 'aaron@example.com' };
    mockPrisma.user.findFirst.mockResolvedValue(existingUser);

    const baseEnv = {
      NODE_ENV: 'development',
      VERCEL_ENV: 'preview',
    };
    const localEnv = {
      ...baseEnv,
      NODE_ENV: 'development',
      VERCEL_ENV: 'preview',
      LOCAL_USER_LOGIN: 'true',
      LOCAL_USER_EMAIL: 'aaron@example.com',
    };

    const { authorizeLocalUser, getAuthProviders } = await loadAuthModule(localEnv);
    const baseProviders = getAuthProviders(baseEnv);
    const localProviders = getAuthProviders(localEnv);
    expect(localProviders.length).toBe(baseProviders.length + 1);

    const result = await authorizeLocalUser({ email: 'AARON@example.com' }, localEnv);
    expect(result).toEqual(existingUser);
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({ where: { email: 'aaron@example.com' } });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('records Google sign-ins', async () => {
    const { authOptions } = await loadAuthModule({
      NODE_ENV: 'development',
    });

    await authOptions.events!.signIn!({
      user: { id: 'user-1' },
      account: { provider: 'google' },
    } as never);

    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      provider: 'google',
    }));
  });

  it('records demo sign-ins', async () => {
    const { authOptions } = await loadAuthModule({
      NODE_ENV: 'development',
    });

    await authOptions.events!.signIn!({
      user: { id: 'coach-1' },
      account: { provider: 'demo-coach' },
    } as never);

    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'coach-1',
      provider: 'demo-coach',
    }));
  });

  it('does not record local-user sign-ins', async () => {
    const { authOptions } = await loadAuthModule({
      LOCAL_USER_LOGIN: 'true',
      LOCAL_USER_EMAIL: 'aaron@example.com',
      NODE_ENV: 'development',
    });

    await authOptions.events!.signIn!({
      user: { id: 'local-1' },
      account: { provider: 'local-user' },
    } as never);

    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });

  it('does not record test-user sign-ins', async () => {
    const { authOptions } = await loadAuthModule({
      NODE_ENV: 'development',
    });

    await authOptions.events!.signIn!({
      user: { id: 'test-1' },
      account: { provider: 'testuser' },
    } as never);

    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });
});
