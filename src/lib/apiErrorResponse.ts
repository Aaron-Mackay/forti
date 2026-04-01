import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { API_AUTH_ERROR, type ApiErrorCode, type ApiErrorEnvelope } from './apiErrorContract';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function apiErrorResponse(
  code: ApiErrorCode,
  message: string,
  options?: { details?: unknown; status?: number },
): NextResponse<ApiErrorEnvelope> {
  const status = options?.status ?? STATUS_BY_CODE[code] ?? 500;
  return NextResponse.json(
    {
      error: message,
      code,
      ...(options?.details === undefined ? {} : { details: options.details }),
    },
    { status },
  );
}

export function unauthenticatedResponse(): NextResponse<ApiErrorEnvelope> {
  return apiErrorResponse(API_AUTH_ERROR.UNAUTHENTICATED.code, API_AUTH_ERROR.UNAUTHENTICATED.message);
}

export function forbiddenResponse(): NextResponse<ApiErrorEnvelope> {
  return apiErrorResponse(API_AUTH_ERROR.FORBIDDEN.code, API_AUTH_ERROR.FORBIDDEN.message);
}

export function validationErrorResponse(error: ZodError): NextResponse<ApiErrorEnvelope> {
  return apiErrorResponse('BAD_REQUEST', 'Invalid request', { details: error.flatten() });
}

export function notFoundResponse(resource: string): NextResponse<ApiErrorEnvelope> {
  return apiErrorResponse('NOT_FOUND', `${resource} not found`);
}

export function errorResponse(message: string, status: number): NextResponse<ApiErrorEnvelope> {
  if (status === 401) return unauthenticatedResponse();
  if (status === 403) return forbiddenResponse();
  if (status === 404) return apiErrorResponse('NOT_FOUND', message, { status });
  if (status === 400) return apiErrorResponse('BAD_REQUEST', message, { status });
  if (status === 409) return apiErrorResponse('CONFLICT', message, { status });
  return apiErrorResponse('INTERNAL', message, { status });
}
