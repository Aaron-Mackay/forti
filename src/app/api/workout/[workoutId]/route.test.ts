import {describe, it, expect, vi, beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
import {PATCH} from './route';

vi.mock('@/lib/prisma', () => ({
  default: {
    workout: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@lib/planActivity', () => ({
  touchPlanActivity: vi.fn(),
}));

vi.mock('@lib/requireSession', () => ({
  requireSession: vi.fn(),
  isAuthenticationError: (error: unknown) => error instanceof Error && error.name === 'AuthenticationError',
  authenticationErrorResponse: () => Response.json({ error: 'Unauthorized' }, { status: 401 }),
}));

import prisma from '@/lib/prisma';
import {requireSession} from '@lib/requireSession';
import { touchPlanActivity } from '@lib/planActivity';

const mockFindUnique = prisma.workout.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.workout.update as ReturnType<typeof vi.fn>;
const mockRequireSession = requireSession as ReturnType<typeof vi.fn>;
const mockTouchPlanActivity = touchPlanActivity as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown, workoutId = '42'): [NextRequest, { params: Promise<{ workoutId: string }> }] {
  const req = new NextRequest(`http://localhost/api/workout/${workoutId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  });
  const props = {params: Promise.resolve({workoutId})};
  return [req, props];
}

const mockWorkout = {
  id: 42,
  week: {
    plan: {id: 7, userId: 'user-1'},
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({user: {id: 'user-1'}});
  mockFindUnique.mockResolvedValue(mockWorkout);
  mockUpdate.mockResolvedValue({id: 42, notes: '', dateCompleted: null});
  mockTouchPlanActivity.mockResolvedValue(undefined);
});

describe('PATCH /api/workout/[workoutId]', () => {
  describe('validation', () => {
    it('returns 400 when body has neither notes nor dateCompleted', async () => {
      const [req, props] = makeRequest({});
      const res = await PATCH(req, props);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/at least one/i);
    });

    it('returns 400 when notes is not a string', async () => {
      const [req, props] = makeRequest({notes: 123});
      const res = await PATCH(req, props);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/notes must be a string/i);
    });

    it('returns 400 when dateCompleted is not a string or null', async () => {
      const [req, props] = makeRequest({dateCompleted: 12345});
      const res = await PATCH(req, props);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/dateCompleted must be/i);
    });
  });

  describe('authorization', () => {
    it('returns 404 when workout does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);
      const [req, props] = makeRequest({notes: 'hi'});
      const res = await PATCH(req, props);
      expect(res.status).toBe(404);
    });

    it('returns 403 when workout belongs to a different user', async () => {
      mockRequireSession.mockResolvedValue({user: {id: 'other-user'}});
      const [req, props] = makeRequest({notes: 'hi'});
      const res = await PATCH(req, props);
      expect(res.status).toBe(403);
    });
  });

  describe('updating notes', () => {
    it('updates notes and returns the workout', async () => {
      mockUpdate.mockResolvedValue({id: 42, notes: 'great session', dateCompleted: null});
      const [req, props] = makeRequest({notes: 'great session'});
      const res = await PATCH(req, props);
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: {notes: 'great session'},
      }));
      expect(mockTouchPlanActivity).toHaveBeenCalledWith(7);
    });
  });

  describe('updating dateCompleted', () => {
    it('sets dateCompleted from an ISO string', async () => {
      const isoDate = '2024-06-15T10:00:00.000Z';
      mockUpdate.mockResolvedValue({id: 42, notes: '', dateCompleted: new Date(isoDate)});
      const [req, props] = makeRequest({dateCompleted: isoDate});
      const res = await PATCH(req, props);
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: {dateCompleted: new Date(isoDate)},
      }));
      expect(mockTouchPlanActivity).toHaveBeenCalledWith(7);
    });

    it('clears dateCompleted when passed null', async () => {
      mockUpdate.mockResolvedValue({id: 42, notes: '', dateCompleted: null});
      const [req, props] = makeRequest({dateCompleted: null});
      const res = await PATCH(req, props);
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: {dateCompleted: null},
      }));
    });

    it('updates both notes and dateCompleted together', async () => {
      const isoDate = '2024-06-15T10:00:00.000Z';
      const [req, props] = makeRequest({notes: 'done', dateCompleted: isoDate});
      await PATCH(req, props);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: {notes: 'done', dateCompleted: new Date(isoDate)},
      }));
    });
  });
});
