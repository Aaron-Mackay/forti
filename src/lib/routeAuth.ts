import { NextResponse } from 'next/server';
import { authenticationErrorResponse, isAuthenticationError } from './requireSession';

export type RouteHandler<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => Promise<NextResponse>;

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
