'use client';

import {useEffect, useState} from 'react';
import {fetchJson} from '@lib/fetchWrapper';
import {Exercise} from '@prisma/client';

type ExerciseListState = {
  exercises: Exercise[];
  loading: boolean;
  addExercise: (exercise: Exercise) => void;
};

/**
 * Lazily loads the full exercise list when `enabled` becomes true.
 * The result is retained in state so subsequent toggles of `enabled`
 * do not trigger a second fetch.
 *
 * `addExercise` appends a newly created exercise to the local list
 * without a refetch.
 */
export function useExerciseList(enabled: boolean): ExerciseListState {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || exercises.length > 0) return;
    setLoading(true);
    fetchJson<Exercise[]>('/api/exercises')
      .then(data => setExercises(data))
      .catch(() => {/* non-fatal — dialog shows empty list */})
      .finally(() => setLoading(false));
  }, [enabled, exercises.length]);

  const addExercise = (exercise: Exercise) =>
    setExercises(prev => [...prev, exercise]);

  return {exercises, loading, addExercise};
}
