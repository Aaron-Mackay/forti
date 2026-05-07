import {
  MobileAuthSuccessSchema,
  type MobileAuthSuccess,
  type MobileRefreshRequest,
  type MobileSignOutRequest,
  type MobileTokenExchangeRequest,
} from '@forti/shared';

import { getApiBaseUrl } from './apiBaseUrl';

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let code: string | undefined;
    let message = `${res.status} ${res.statusText}`.trim();
    try {
      const payload = (await res.json()) as { error?: string; code?: string };
      if (payload?.error) message = payload.error;
      if (payload?.code) code = payload.code;
    } catch {
      // ignore JSON parse errors; keep the status-based message
    }
    throw new AuthApiError(message, res.status, code);
  }

  return (await res.json()) as T;
}

export async function exchangeGoogleIdToken(idToken: string): Promise<MobileAuthSuccess> {
  const body: MobileTokenExchangeRequest = { idToken };
  const json = await postJson<unknown>('/api/auth/mobile/token-exchange', body);
  return MobileAuthSuccessSchema.parse(json);
}

export async function refreshAccessToken(refreshToken: string): Promise<MobileAuthSuccess> {
  const body: MobileRefreshRequest = { refreshToken };
  const json = await postJson<unknown>('/api/auth/mobile/refresh', body);
  return MobileAuthSuccessSchema.parse(json);
}

export async function signOutMobileSession(refreshToken: string): Promise<void> {
  const body: MobileSignOutRequest = { refreshToken };
  await postJson<unknown>('/api/auth/mobile/sign-out', body);
}
