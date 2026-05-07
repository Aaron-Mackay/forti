'use client';

import {useEffect} from 'react';
import type {CacheEntry} from '@/utils/clientDb';

/**
 * On mount: if the user is offline, restores the most recently cached value
 * into state via setValue. If online, primes the cache with the current value.
 *
 * Designed to be called at the top of a component that owns offline-aware
 * state, mirroring the standard init pattern in WorkoutClient and Calendar.
 *
 * @param onError - optional callback invoked when a cache read/write fails,
 *   allowing the caller to surface the error in UI state.
 */
export function useOfflineCache<T>(
  userId: string,
  value: T,
  setValue: (v: T) => void,
  getCache: (userId: string) => Promise<CacheEntry<T> | undefined>,
  saveCache: (userId: string, v: T) => Promise<void>,
  onError?: (err: Error) => void,
): void {
  useEffect(() => {
    const handleErr = (e: unknown) =>
      onError?.(e instanceof Error ? e : new Error(String(e)));
    if (!navigator.onLine) {
      getCache(userId).then(entry => {
        if (entry) setValue(entry.data);
      }).catch(handleErr);
    } else {
      saveCache(userId, value).catch(handleErr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
