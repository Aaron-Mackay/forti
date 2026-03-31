'use client';

import {useEffect, useState} from 'react';
import {fetchJson} from '@lib/fetchWrapper';
import {Exercise} from '@prisma/client';

type ExerciseListState = {
  exercises: Exercise[];
  loading: boolean;
  addExercise: (exercise: Exercise) => void;
};

const EXERCISE_CACHE_TTL_MS = 5 * 60 * 1000;
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
      .catch(() => {/* non-fatal — dialog shows empty list */})
      .finally(() => {
        setLoading(false);
        if (inFlightRequest === request) inFlightRequest = null;
      });
  }, [enabled]);

  const addExercise = (exercise: Exercise) =>
    appendToCache(exercise);

  return {exercises, loading, addExercise};
}
