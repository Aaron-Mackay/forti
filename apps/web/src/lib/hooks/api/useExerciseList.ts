'use client';

import {useEffect, useState} from 'react';
import {fetchJson} from '@lib/fetchWrapper';
import {storage} from '@lib/storage';
import {Exercise} from '@/generated/prisma/browser';

type ExerciseCacheRecord = {exercises?: Exercise[]; savedAt?: number};

type ExerciseListState = {
  exercises: Exercise[];
  loading: boolean;
  addExercise: (exercise: Exercise) => void;
};

const EXERCISE_CACHE_TTL_MS = 5 * 60 * 1000;
const EXERCISE_STORAGE_KEY = 'forti.exerciseListCache.v1';
let exercisesCache: Exercise[] | null = null;
let exercisesCacheTime = 0;
let inFlightRequest: Promise<Exercise[]> | null = null;
const listeners = new Set<(nextExercises: Exercise[]) => void>();

function hasFreshCache() {
  return exercisesCache !== null && (Date.now() - exercisesCacheTime) < EXERCISE_CACHE_TTL_MS;
}

function updateCache(nextExercises: Exercise[]) {
  exercisesCache = nextExercises;
  exercisesCacheTime = Date.now();
  storage.setJson(EXERCISE_STORAGE_KEY, {
    exercises: nextExercises,
    savedAt: exercisesCacheTime,
  });
  listeners.forEach(listener => listener(nextExercises));
}

function appendToCache(exercise: Exercise) {
  const existing = exercisesCache ?? [];
  if (existing.some(e => e.id === exercise.id)) return;
  updateCache([...existing, exercise]);
}

/**
 * Lazily loads the full exercise list when `enabled` becomes true.
 * The result is retained in a shared in-memory cache so separate
 * components (e.g. multiple dialogs/settings) can reuse one fetch.
 *
 * `addExercise` appends a newly created exercise to the local list
 * and shared cache without a refetch.
 */
export function useExerciseList(enabled: boolean): ExerciseListState {
  const [exercises, setExercises] = useState<Exercise[]>(exercisesCache ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listeners.add(setExercises);
    return () => {
      listeners.delete(setExercises);
    };
  }, []);

  useEffect(() => {
    if (exercisesCache !== null) return;
    const parsed = storage.getJson<ExerciseCacheRecord>(EXERCISE_STORAGE_KEY);
    if (!parsed || !Array.isArray(parsed.exercises) || typeof parsed.savedAt !== 'number') return;
    // Keep storage fallback stale-tolerant so first offline open still has data.
    exercisesCache = parsed.exercises;
    exercisesCacheTime = parsed.savedAt;
    setExercises(parsed.exercises);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (hasFreshCache()) {
      if (exercisesCache) setExercises(exercisesCache);
      return;
    }

    setLoading(true);

    const request = inFlightRequest ?? fetchJson<Exercise[]>('/api/exercises');
    inFlightRequest = request;

    request
      .then((data) => updateCache(data))
      .catch(() => {
        // Non-fatal; retain whatever was already in memory/local storage.
      })
      .finally(() => {
        setLoading(false);
        if (inFlightRequest === request) inFlightRequest = null;
      });
  }, [enabled]);

  const addExercise = (exercise: Exercise) =>
    appendToCache(exercise);

  return {exercises, loading, addExercise};
}
