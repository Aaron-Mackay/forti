import type { ZodError } from 'zod';
import { logger, type LogFields } from './logger';

export type RequestLogContext = {
  route: string;
  method: string;
  requestId: string;
  vercelId: string | null;
};

function makeRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getRequestLogContext(req: Request, route: string): RequestLogContext {
  return {
    route,
    method: req.method,
    requestId: req.headers.get('x-request-id') ?? makeRequestId(),
    vercelId: req.headers.get('x-vercel-id'),
  };
}

export function compactZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }));
}

export function summarizePayload(payload: unknown, allowedKeys: string[]): Record<string, unknown> | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;

  const source = payload as Record<string, unknown>;
  return Object.fromEntries(
    allowedKeys
      .filter((key) => key in source)
      .map((key) => {
        const value = source[key];
        if (Array.isArray(value)) return [`${key}Count`, value.length];
        return [key, value];
      }),
  );
}

function withContext(ctx: RequestLogContext, fields: Omit<LogFields, 'route' | 'method' | 'requestId' | 'vercelId'>): LogFields {
  return {
    ...fields,
    route: ctx.route,
    method: ctx.method,
    requestId: ctx.requestId,
    vercelId: ctx.vercelId,
  };
}

export function logValidationError(ctx: RequestLogContext, error: ZodError, details?: Record<string, unknown> | null) {
  logger.warn(withContext(ctx, {
    event: 'api.request.validation_failed',
    details: {
      issues: compactZodIssues(error),
      ...(details ? { payload: details } : {}),
    },
  }));
}

export function logInvalidJson(ctx: RequestLogContext, details?: Record<string, unknown>) {
  logger.warn(withContext(ctx, {
    event: 'api.request.invalid_json',
    details,
  }));
}

export function logUnexpectedError(ctx: RequestLogContext, error: unknown, details?: Record<string, unknown>) {
  logger.error(withContext(ctx, {
    event: 'api.request.unexpected_error',
    error,
    details,
  }));
}

export function logProviderError(ctx: RequestLogContext, error: unknown, details?: Record<string, unknown>) {
  logger.error(withContext(ctx, {
    event: 'api.provider.failed',
    error,
    details,
  }));
}

export function logRequestCompleted(
  ctx: RequestLogContext,
  status: number,
  durationMs: number,
  details?: Record<string, unknown>,
) {
  logger.info(withContext(ctx, {
    event: 'api.request.completed',
    status,
    durationMs,
    details,
  }));
}

export function logUnauthenticated(ctx: RequestLogContext, error: unknown) {
  logger.warn(withContext(ctx, {
    event: 'api.request.unauthenticated',
    status: 401,
    error,
  }));
}
