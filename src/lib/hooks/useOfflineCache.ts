'use client';

import {useEffect} from 'react';
import type {CacheEntry} from '@/utils/clientDb';

/**
 * On mount: if the user is offline, restores the most recently cached value
 * into state via setValue. If online, primes the cache with the current value.
 *
 * Designed to be called at the top of a component that owns offline-aware
 * state, mirroring the standard init pattern in WorkoutClient and Calendar.
 */
export function useOfflineCache<T>(
  userId: string,
  value: T,
  setValue: (v: T) => void,
  getCache: (userId: string) => Promise<CacheEntry<T> | undefined>,
  saveCache: (userId: string, v: T) => Promise<void>,
): void {
  useEffect(() => {
    if (!navigator.onLine) {
      getCache(userId).then(entry => {
        if (entry) setValue(entry.data);
      }).catch(console.error);
    } else {
      saveCache(userId, value).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
