import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from './route';

vi.mock('@lib/requireSession', () => ({
  requireSession: vi.fn(),
  isAuthenticationError: (error: unknown) => error instanceof Error && error.name === 'AuthenticationError',
  authenticationErrorResponse: () => Response.json({ error: 'Unauthorized' }, { status: 401 }),
}));

vi.mock('@lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from '@lib/prisma';
import { requireSession } from '@lib/requireSession';

const mockRequireSession = requireSession as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockUserUpdate = prisma.user.update as ReturnType<typeof vi.fn>;
const mockPlanFindUnique = prisma.plan.findUnique as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/plan/active', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } });
  mockUserUpdate.mockResolvedValue({ activePlanId: 5 });
  mockPlanFindUnique.mockResolvedValue({ id: 5, userId: 'user-1' });
});

describe('PATCH /api/plan/active', () => {
  it('sets the active plan for the authenticated user', async () => {
    const res = await PATCH(makeRequest({ planId: 5 }));

    expect(res.status).toBe(200);
    expect(mockPlanFindUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      select: { id: true, userId: true },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activePlanId: 5 },
      select: { activePlanId: true },
    });
  });

  it('clears the active plan when planId is null', async () => {
    const res = await PATCH(makeRequest({ planId: null }));

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activePlanId: null },
    });
  });

  it('allows a coach to set a client active plan', async () => {
    mockUserFindUnique.mockResolvedValue({ coachId: 'user-1' });
    mockPlanFindUnique.mockResolvedValue({ id: 9, userId: 'client-1' });

    const res = await PATCH(makeRequest({ planId: 9, targetUserId: 'client-1' }));

    expect(res.status).toBe(200);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      select: { coachId: true },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: { activePlanId: 9 },
      select: { activePlanId: true },
    });
  });

  it('returns 403 when trying to set another user plan without coach access', async () => {
    mockUserFindUnique.mockResolvedValue({ coachId: 'someone-else' });

    const res = await PATCH(makeRequest({ planId: 9, targetUserId: 'client-1' }));

    expect(res.status).toBe(403);
  });

  it('returns 403 when the plan belongs to a different user', async () => {
    mockPlanFindUnique.mockResolvedValue({ id: 5, userId: 'other-user' });

    const res = await PATCH(makeRequest({ planId: 5 }));

    expect(res.status).toBe(403);
  });

  it('returns 404 when the plan does not exist', async () => {
    mockPlanFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ planId: 999 }));

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid payloads', async () => {
    const res = await PATCH(makeRequest({ planId: 'bad-id' }));

    expect(res.status).toBe(400);
  });
});
