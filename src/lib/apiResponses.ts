import {NextResponse} from 'next/server';
import type {ZodError} from 'zod';

export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({error: message}, {status});
}

export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json({error: 'Invalid request', issues: error.flatten()}, {status: 400});
}

export function notFoundResponse(resource: string): NextResponse {
  return NextResponse.json({error: `${resource} not found`}, {status: 404});
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({error: 'Forbidden'}, {status: 403});
}
