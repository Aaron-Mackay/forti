type LogLevel = 'info' | 'warn' | 'error';

export type LogError = {
  name?: string;
  message: string;
  stack?: string;
};

export type LogFields = {
  event: string;
  route?: string;
  method?: string;
  requestId?: string | null;
  vercelId?: string | null;
  actorUserId?: string | null;
  targetUserId?: string | null;
  status?: number;
  durationMs?: number;
  details?: unknown;
  error?: unknown;
};

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /authorization|cookie|password|token|secret|refreshToken|accessToken|apiKey/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function serializeError(error: unknown): LogError | undefined {
  if (error == null) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  if (typeof error === 'string') return { message: error };

  return { message: String(error) };
}

export function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveData);

  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactSensitiveData(nested),
    ]),
  );
}

function write(level: LogLevel, fields: LogFields) {
  const redactedFields = redactSensitiveData({
    ...fields,
    ...(fields.error === undefined ? {} : { error: serializeError(fields.error) }),
  }) as Record<string, unknown>;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...redactedFields,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.info(line);
}

export const logger = {
  info: (fields: LogFields) => write('info', fields),
  warn: (fields: LogFields) => write('warn', fields),
  error: (fields: LogFields) => write('error', fields),
};
