import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { unauthenticatedResponse } from '@lib/apiResponses';

function secureEquals(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Validates cron auth based on `CRON_SECRET` bearer token.
 *
 * Also validates platform source headers when present (e.g. `x-vercel-cron`).
 */
export function validateCronRequest(req: NextRequest): NextResponse | null {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('CRON route misconfiguration: CRON_SECRET is not set.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const expectedAuth = `Bearer ${expectedSecret}`;

  if (!secureEquals(authHeader, expectedAuth)) {
    return unauthenticatedResponse();
  }

  const vercelCronHeader = req.headers.get('x-vercel-cron');
  if (vercelCronHeader !== null && vercelCronHeader !== '1') {
    return NextResponse.json({ error: 'Unauthorized source' }, { status: 401 });
  }

  return null;
}
