'use client';

import {useEffect, useState} from 'react';
import {fetchJson} from '@lib/fetchWrapper';
import {Exercise} from '@prisma/client';

type ExerciseListState = {
  exercises: Exercise[];
  loading: boolean;
};

/**
 * Lazily loads the full exercise list when `enabled` becomes true.
 * The result is retained in state so subsequent toggles of `enabled`
 * do not trigger a second fetch.
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

  return {exercises, loading};
}
