import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useWorkoutSession} from './useWorkoutSession';
import {ExerciseBuilder, PlanBuilder, SetBuilder, UserBuilder, WeekBuilder, WorkoutBuilder} from '@/testUtils/builders';

const {
  queueOrSendRequest,
  syncQueuedRequests,
  saveUserDataCache,
} = vi.hoisted(() => ({
  queueOrSendRequest: vi.fn(),
  syncQueuedRequests: vi.fn(),
  saveUserDataCache: vi.fn(),
}));

vi.mock('@/utils/offlineSync', () => ({
  queueOrSendRequest,
  syncQueuedRequests,
}));

vi.mock('@/utils/clientDb', () => ({
  getUserDataCache: vi.fn(),
  saveUserDataCache,
}));

vi.mock('@lib/hooks/useOfflineCache', () => ({
  useOfflineCache: vi.fn(),
}));

vi.mock('@lib/firstWeekEvents', () => ({
  trackFirstWeekEvent: vi.fn(),
}));

function buildUserData() {
  const exercise = new ExerciseBuilder(1001)
    .addSet(new SetBuilder(5001, 1).build())
    .build();
  const workout = new WorkoutBuilder(301, 1).addExercise(exercise).build();
  const week = new WeekBuilder(201, 1).addWorkout(workout).build();
  const plan = new PlanBuilder(101, 1).addWeek(week).build();
  const user = new UserBuilder(1).addPlan(plan).build();
  user.activePlanId = plan.id;
  return user;
}

describe('useWorkoutSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    queueOrSendRequest.mockResolvedValue(undefined);
    syncQueuedRequests.mockResolvedValue(undefined);
    saveUserDataCache.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces rapid reps updates so only the final value is sent', async () => {
    const userData = buildUserData();
    const {result} = renderHook(() => useWorkoutSession(userData, 301));

    act(() => {
      result.current.setSelectedExerciseId(1001);
    });

    act(() => {
      result.current.handleSetUpdate(0, 'reps', '1');
      result.current.handleSetUpdate(0, 'reps', '16');
    });

    expect(queueOrSendRequest).not.toHaveBeenCalledWith('/api/sets/5001', 'PATCH', expect.anything());

    await act(async () => {
      vi.advanceTimersByTime(499);
    });

    expect(queueOrSendRequest).not.toHaveBeenCalledWith('/api/sets/5001', 'PATCH', expect.anything());

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(queueOrSendRequest).toHaveBeenCalledTimes(1);
    expect(queueOrSendRequest).toHaveBeenCalledWith('/api/sets/5001', 'PATCH', {reps: 16});
  });

  it('debounces rapid weight updates so only the final value is sent', async () => {
    const userData = buildUserData();
    const {result} = renderHook(() => useWorkoutSession(userData, 301));

    act(() => {
      result.current.setSelectedExerciseId(1001);
    });

    act(() => {
      result.current.handleSetUpdate(0, 'weight', '1');
      result.current.handleSetUpdate(0, 'weight', '16');
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(queueOrSendRequest).toHaveBeenCalledTimes(1);
    expect(queueOrSendRequest).toHaveBeenCalledWith('/api/sets/5001', 'PATCH', {weight: 16});
  });
});
