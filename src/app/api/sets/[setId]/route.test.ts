import {beforeEach, describe, expect, it, vi} from 'vitest';
import {NextRequest} from 'next/server';
import {PATCH} from './route';

vi.mock('@/lib/prisma', () => ({
  default: {
    exerciseSet: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@lib/requireSession', () => ({
  requireSession: vi.fn(),
  isAuthenticationError: (error: unknown) => error instanceof Error && error.name === 'AuthenticationError',
  authenticationErrorResponse: () => Response.json({error: 'Unauthorized'}, {status: 401}),
}));

vi.mock('@lib/queries', () => ({
  getSetWithOwner: vi.fn(),
}));

vi.mock('@lib/planActivity', () => ({
  touchPlanActivity: vi.fn(),
}));

import prisma from '@/lib/prisma';
import {requireSession} from '@lib/requireSession';
import {getSetWithOwner} from '@lib/queries';
import {touchPlanActivity} from '@lib/planActivity';

const mockUpdate = prisma.exerciseSet.update as ReturnType<typeof vi.fn>;
const mockRequireSession = requireSession as ReturnType<typeof vi.fn>;
const mockGetSetWithOwner = getSetWithOwner as ReturnType<typeof vi.fn>;
const mockTouchPlanActivity = touchPlanActivity as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown, setId = '5'): [NextRequest, { params: Promise<{ setId: string }> }] {
  const req = new NextRequest(`http://localhost/api/sets/${setId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  });
  return [req, {params: Promise.resolve({setId})}];
}

const mockSet = {
  id: 5,
  reps: 8,
  weight: 100,
  workoutExercise: {
    workout: {
      week: {
        plan: {
          id: 9,
          userId: 'user-1',
        },
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({user: {id: 'user-1'}});
  mockGetSetWithOwner.mockResolvedValue(mockSet);
  mockUpdate.mockResolvedValue({...mockSet, e1rm: 126.7});
  mockTouchPlanActivity.mockResolvedValue(undefined);
});

describe('PATCH /api/sets/[setId]', () => {
  it('allows clearing reps with null', async () => {
    const [req, props] = makeRequest({reps: null});
    const res = await PATCH(req, props);

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: {id: 5},
      data: expect.objectContaining({reps: null, e1rm: null}),
    }));
    expect(mockTouchPlanActivity).toHaveBeenCalledWith(9);
  });

  it('allows clearing weight with null', async () => {
    const [req, props] = makeRequest({weight: null});
    const res = await PATCH(req, props);

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: {id: 5},
      data: expect.objectContaining({weight: null, e1rm: null}),
    }));
  });

  it('returns 400 for invalid reps payloads', async () => {
    const [req, props] = makeRequest({reps: '12'});
    const res = await PATCH(req, props);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({error: 'reps must be a number or null'});
    expect(mockGetSetWithOwner).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid weight payloads', async () => {
    const [req, props] = makeRequest({weight: '42.5'});
    const res = await PATCH(req, props);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({error: 'weight must be a number or null'});
    expect(mockGetSetWithOwner).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
