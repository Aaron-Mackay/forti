export const API_AUTH_ERROR = {
  UNAUTHENTICATED: {
    code: 'UNAUTHENTICATED',
    message: 'Authentication is required.',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action.',
  },
} as const;

export type ApiAuthErrorCode = keyof typeof API_AUTH_ERROR;

export type ApiErrorCode =
  | ApiAuthErrorCode
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export type ApiErrorEnvelope = {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
};

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { code?: unknown; error?: unknown };
  return typeof candidate.code === 'string' && typeof candidate.error === 'string';
}

export function getApiErrorMessage(value: unknown, fallback: string): string {
  if (isApiErrorEnvelope(value)) return value.error;

  // Temporary compatibility with older envelope shape: { error: { code, message } }
  if (value && typeof value === 'object') {
    const nestedError = (value as { error?: unknown }).error;
    if (nestedError && typeof nestedError === 'object' && typeof (nestedError as { message?: unknown }).message === 'string') {
      return (nestedError as { message: string }).message;
    }
    if (typeof nestedError === 'string') return nestedError;
  }

  return fallback;
}

export function getApiErrorCode(value: unknown): ApiErrorCode | null {
  if (isApiErrorEnvelope(value)) return value.code;
  if (value && typeof value === 'object') {
    const nestedError = (value as { error?: unknown }).error;
    if (nestedError && typeof nestedError === 'object' && typeof (nestedError as { code?: unknown }).code === 'string') {
      return (nestedError as { code: ApiErrorCode }).code;
    }
  }
  return null;
}
