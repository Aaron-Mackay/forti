// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireSession,
  mockGetWorkoutData,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockGetWorkoutData: vi.fn(),
}));

vi.mock('@lib/requireSession', () => ({
  AuthenticationError: class AuthenticationError extends Error {},
  authenticationErrorResponse: () => Response.json({ error: 'Authentication is required.' }, { status: 401 }),
  isAuthenticationError: () => false,
  requireSession: mockRequireSession,
}));

vi.mock('@lib/userService', () => ({
  getWorkoutData: mockGetWorkoutData,
}));

import { GET } from './route';

describe('GET /api/workout-data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the workout read model for the authenticated user', async () => {
    const workoutData = {
      id: 'user-1',
      activePlanId: null,
      plans: [],
      userExerciseNotes: [],
    };

    mockRequireSession.mockResolvedValue({
      user: { id: 'user-1' },
      expires: '2030-01-01T00:00:00.000Z',
    });
    mockGetWorkoutData.mockResolvedValue(workoutData);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(workoutData);
    expect(mockGetWorkoutData).toHaveBeenCalledWith('user-1');
  });
});
