import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useWorkoutSession} from './useWorkoutSession';
import {ExerciseBuilder, PlanBuilder, SetBuilder, UserBuilder, WeekBuilder, WorkoutBuilder} from '@/testUtils/builders';

const {
  queueOrSendRequest,
  queueOrSendRequestJson,
  syncQueuedRequests,
  saveUserDataCache,
} = vi.hoisted(() => ({
  queueOrSendRequest: vi.fn(),
  queueOrSendRequestJson: vi.fn(),
  syncQueuedRequests: vi.fn(),
  saveUserDataCache: vi.fn(),
}));

vi.mock('@/utils/offlineSync', () => ({
  queueOrSendRequest,
  queueOrSendRequestJson,
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
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    queueOrSendRequest.mockResolvedValue(undefined);
    queueOrSendRequestJson.mockResolvedValue({queued: false, data: null});
    syncQueuedRequests.mockResolvedValue(undefined);
    saveUserDataCache.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(buildUserData()),
    } as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
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

  it('queues form cue writes when offline', async () => {
    const userData = buildUserData();
    queueOrSendRequest.mockResolvedValue({queued: true});
    const {result} = renderHook(() => useWorkoutSession(userData, 301));

    await act(async () => {
      result.current.handleFormCueBlur(-1, 'Drive knees out');
    });

    expect(queueOrSendRequest).toHaveBeenCalledWith('/api/exerciseNote/-1', 'PUT', {note: 'Drive knees out'});
    expect(result.current.snackbar.message).toBe('Offline: note update queued');
  });

  it('adds an optimistic exercise and queues creation when offline', async () => {
    const userData = buildUserData();
    queueOrSendRequestJson.mockResolvedValue({queued: true, data: null});
    const {result} = renderHook(() => useWorkoutSession(userData, 301));

    await act(async () => {
      result.current.handleAddExercise(
        {
          id: 2002,
          name: 'Lat Pulldown',
          category: 'resistance',
          description: null,
          equipment: [],
          primaryMuscles: [],
          secondaryMuscles: [],
          createdByUserId: null,
        },
        {repRange: '8-12', restTime: '90', setCount: 3},
      );
    });

    expect(queueOrSendRequestJson).toHaveBeenCalledWith('/api/workoutExercise', 'POST', expect.objectContaining({
      workoutId: 301,
      exerciseId: 2002,
    }));
    expect(result.current.selectedWorkout?.exercises).toHaveLength(2);
    expect(result.current.selectedWorkout?.exercises.at(-1)?.id).toBeLessThan(0);
    expect(result.current.snackbar.message).toBe('Offline: exercise addition queued');
  });

  it('queues exercise removal when offline', async () => {
    const userData = buildUserData();
    queueOrSendRequest.mockResolvedValue({queued: true});
    const {result} = renderHook(() => useWorkoutSession(userData, 301));

    await act(async () => {
      result.current.handleRemoveExercise(1001);
    });

    expect(queueOrSendRequest).toHaveBeenCalledWith('/api/workoutExercise/1001', 'DELETE', {});
    expect(result.current.selectedWorkout?.exercises).toHaveLength(0);
    expect(result.current.snackbar.message).toBe('Offline: exercise removal queued');
  });

  it('continues to fetch latest user data when queued request sync fails', async () => {
    const userData = buildUserData();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    syncQueuedRequests.mockRejectedValueOnce(new Error('sync failed'));

    renderHook(() => useWorkoutSession(userData, 301));

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });

    expect(syncQueuedRequests).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/user-data');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to sync queued workout requests on reconnect',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
