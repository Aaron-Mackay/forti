'use client';

import {useApiGet} from './useApiGet';

/**
 * Returns the number of plans for the current user, or null while loading.
 */
export function usePlanCount(): number | null {
  const {data} = useApiGet<{count: number}>('/api/plans/count');
  return data?.count ?? null;
}
