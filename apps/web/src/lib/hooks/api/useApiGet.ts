'use client';

import {useEffect, useState} from 'react';
import {fetchJson} from '@lib/fetchWrapper';

type ApiGetState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Generic hook for GET API requests. Pass null as url to skip fetching
 * (useful for conditional / deferred requests).
 *
 * Re-fetches whenever url changes.
 */
export function useApiGet<T>(url: string | null): ApiGetState<T> {
  const [state, setState] = useState<ApiGetState<T>>({
    data: null,
    loading: url !== null,
    error: null,
  });

  useEffect(() => {
    if (url === null) {
      setState({data: null, loading: false, error: null});
      return;
    }

    let cancelled = false;
    setState(prev => ({...prev, loading: true, error: null}));

    fetchJson<T>(url)
      .then(data => {
        if (!cancelled) setState({data, loading: false, error: null});
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Request failed';
          setState({data: null, loading: false, error: message});
        }
      });

    return () => { cancelled = true; };
  }, [url]);

  return state;
}
