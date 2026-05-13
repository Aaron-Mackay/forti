import { NextResponse } from 'next/server';
import { authenticationErrorResponse, isAuthenticationError } from './requireSession';
import {
  getRequestLogContext,
  logRequestCompleted,
  logUnauthenticated,
  logUnexpectedError,
  type RequestLogContext,
} from './apiLogging';
import { errorResponse } from './apiResponses';

export type RouteHandler<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => Promise<NextResponse>;
export type ApiRouteHandler<TArgs extends [Request, ...unknown[]] = [Request, ...unknown[]]> = (
  ctx: RequestLogContext,
  ...args: TArgs
) => Promise<NextResponse>;

export function withRouteAuth<TArgs extends unknown[]>(handler: RouteHandler<TArgs>): RouteHandler<TArgs> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (isAuthenticationError(error)) {
        return authenticationErrorResponse();
      }
      throw error;
    }
  };
}

export function withApiRoute<TArgs extends [Request, ...unknown[]]>(
  options: { route: string },
  handler: ApiRouteHandler<TArgs>,
): RouteHandler<TArgs> {
  return async (...args: TArgs) => {
    const [req] = args;
    const ctx = getRequestLogContext(req, options.route);
    const startedAt = performance.now();

    try {
      const response = await handler(ctx, ...args);
      response.headers.set('x-request-id', ctx.requestId);
      logRequestCompleted(ctx, response.status, Math.round(performance.now() - startedAt));
      return response;
    } catch (error) {
      if (isAuthenticationError(error)) {
        logUnauthenticated(ctx, error);
        const response = authenticationErrorResponse();
        response.headers.set('x-request-id', ctx.requestId);
        logRequestCompleted(ctx, response.status, Math.round(performance.now() - startedAt));
        return response;
      }

      logUnexpectedError(ctx, error);
      const response = errorResponse('Internal server error', 500);
      response.headers.set('x-request-id', ctx.requestId);
      logRequestCompleted(ctx, response.status, Math.round(performance.now() - startedAt));
      return response;
    }
  };
}
