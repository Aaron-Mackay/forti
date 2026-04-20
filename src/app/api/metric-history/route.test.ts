import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockRequireSession,
  mockMetricFindMany,
  mockUserFindUnique,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockMetricFindMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
}));

vi.mock('@lib/requireSession', () => ({
  requireSession: mockRequireSession,
  isAuthenticationError: (e: unknown) => e instanceof Error && e.message === 'Unauthorized',
  authenticationErrorResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));

vi.mock('@lib/prisma', () => ({
  default: {
    metric: { findMany: mockMetricFindMany },
    user:   { findUnique: mockUserFindUnique },
  },
}));

import { GET } from './route';

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/metric-history');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe('GET /api/metric-history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockMetricFindMany.mockResolvedValue([]);
  });

  it('returns 401 when unauthenticated', async () => {
    mockRequireSession.mockRejectedValue(new Error('Unauthorized'));
    const res = await GET(makeRequest({ metric: 'weight', startDate: '2025-01-01', endDate: '2025-03-01' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when metric param is missing', async () => {
    const res = await GET(makeRequest({ startDate: '2025-01-01', endDate: '2025-03-01' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when metric is invalid', async () => {
    const res = await GET(makeRequest({ metric: 'bodyFat', startDate: '2025-01-01', endDate: '2025-03-01' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when startDate >= endDate', async () => {
    const res = await GET(makeRequest({ metric: 'weight', startDate: '2025-03-01', endDate: '2025-01-01' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when date range exceeds 730 days', async () => {
    const res = await GET(makeRequest({ metric: 'weight', startDate: '2020-01-01', endDate: '2025-01-01' }));
    expect(res.status).toBe(400);
  });

  it('returns metric points for the authenticated user', async () => {
    mockMetricFindMany.mockResolvedValue([
      { date: new Date('2025-01-15'), weight: 82.5 },
      { date: new Date('2025-01-16'), weight: 82.1 },
    ]);
    const res = await GET(makeRequest({ metric: 'weight', startDate: '2025-01-01', endDate: '2025-02-01' }));
    expect(res.status).toBe(200);
    const data = await res.json() as { points: { date: string; value: number }[] };
    expect(data.points).toHaveLength(2);
    expect(data.points[0]).toMatchObject({ date: '2025-01-15', value: 82.5 });
  });

  it('returns 403 when clientId is provided but client has a different coach', async () => {
    mockUserFindUnique.mockResolvedValue({ coachId: 'some-other-coach' });
    const res = await GET(makeRequest({ metric: 'weight', startDate: '2025-01-01', endDate: '2025-03-01', clientId: 'client-99' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 when client does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest({ metric: 'weight', startDate: '2025-01-01', endDate: '2025-03-01', clientId: 'client-99' }));
    expect(res.status).toBe(403);
  });

  it('returns metric points for client when coach is authorized', async () => {
    mockUserFindUnique.mockResolvedValue({ coachId: 'user-1' });
    mockMetricFindMany.mockResolvedValue([
      { date: new Date('2025-02-10'), steps: 8500 },
    ]);
    const res = await GET(makeRequest({ metric: 'steps', startDate: '2025-01-01', endDate: '2025-03-01', clientId: 'client-1' }));
    expect(res.status).toBe(200);
    const data = await res.json() as { points: { date: string; value: number }[] };
    expect(data.points[0]).toMatchObject({ date: '2025-02-10', value: 8500 });
  });
});
