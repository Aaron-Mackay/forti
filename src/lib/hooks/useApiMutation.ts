'use client';

import {useState} from 'react';

type MutationState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

type MutationResult<T> = MutationState<T> & {
  mutate: (url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) => Promise<T | null>;
  reset: () => void;
};

/**
 * General-purpose hook for API mutations (POST/PUT/PATCH/DELETE).
 * Manages loading, error, and response data state so components don't
 * duplicate this boilerplate.
 *
 * Usage:
 *   const {loading, error, mutate} = useApiMutation<MyResponseType>();
 *   await mutate('/api/foo', 'POST', {field: value});
 */
export function useApiMutation<T = unknown>(): MutationResult<T> {
  const [state, setState] = useState<MutationState<T>>({
    loading: false,
    error: null,
    data: null,
  });

  const mutate = async (
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown,
  ): Promise<T | null> => {
    setState({loading: true, error: null, data: null});
    try {
      const init: RequestInit = {method};
      if (body !== undefined) {
        init.headers = {'Content-Type': 'application/json'};
        init.body = JSON.stringify(body);
      }
      const res = await fetch(url, init);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const message: string = json.error ?? `Request failed (${res.status})`;
        setState({loading: false, error: message, data: null});
        return null;
      }
      const data: T = res.status === 204 ? (null as T) : await res.json();
      setState({loading: false, error: null, data});
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setState({loading: false, error: message, data: null});
      return null;
    }
  };

  const reset = () => setState({loading: false, error: null, data: null});

  return {...state, mutate, reset};
}
