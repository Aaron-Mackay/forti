import type { ZodType } from 'zod';

type AccessTokenProvider = (options?: { forceRefresh?: boolean }) => Promise<string | null>;

type RequestOptions<TResponse> = {
  body?: unknown;
  headers?: HeadersInit;
  method?: 'GET' | 'PATCH' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  schema: ZodType<TResponse>;
};

type MobileApiClientOptions = {
  fetchImpl?: typeof fetch;
  getAccessToken: AccessTokenProvider;
  getBaseUrl: () => string;
};

export class MobileApiError extends Error {
  readonly code: string | undefined;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'MobileApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseError(response: Response) {
  let code: string | undefined;
  let message = `${response.status} ${response.statusText}`.trim();

  try {
    const payload = (await response.json()) as { error?: string; code?: string };
    if (payload.error) {
      message = payload.error;
    }
    if (payload.code) {
      code = payload.code;
    }
  } catch {
    // Keep the HTTP status message when the payload is not JSON.
  }

  return new MobileApiError(message, response.status, code);
}

function buildHeaders(token: string, headers?: HeadersInit, hasBody?: boolean) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set('authorization', `Bearer ${token}`);
  if (hasBody && !nextHeaders.has('content-type')) {
    nextHeaders.set('content-type', 'application/json');
  }
  return nextHeaders;
}

export function createMobileApiClient(options: MobileApiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function send<TResponse>(
    request: RequestOptions<TResponse>,
    retryAfterRefresh: boolean,
  ): Promise<TResponse> {
    const token = await options.getAccessToken({ forceRefresh: !retryAfterRefresh });
    if (!token) {
      throw new MobileApiError('Not signed in', 401, 'missing_access_token');
    }

    const hasBody = request.body !== undefined;
    const response = await fetchImpl(`${options.getBaseUrl()}${request.path}`, {
      method: request.method ?? 'GET',
      headers: buildHeaders(token, request.headers, hasBody),
      ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
    });

    if (response.status === 401 && retryAfterRefresh) {
      return send(request, false);
    }

    if (!response.ok) {
      throw await parseError(response);
    }

    const json = (await response.json()) as unknown;
    return request.schema.parse(json);
  }

  return {
    request<TResponse>(request: RequestOptions<TResponse>) {
      return send(request, true);
    },
  };
}
