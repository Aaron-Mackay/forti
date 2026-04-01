'use client';

import {useState} from 'react';
import {getApiErrorCode, getApiErrorMessage, type ApiErrorCode} from '@lib/apiErrorContract';

type MutationState<T> = {
  loading: boolean;
  error: string | null;
  errorCode: ApiErrorCode | null;
  data: T | null;
};

type MutationResult<T> = MutationState<T> & {
  mutate: (url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) => Promise<T | null>;
  reset: () => void;
};

export function useApiMutation<T = unknown>(): MutationResult<T> {
  const [state, setState] = useState<MutationState<T>>({
    loading: false,
    error: null,
    errorCode: null,
    data: null,
  });

  const mutate = async (
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown,
  ): Promise<T | null> => {
    setState({loading: true, error: null, errorCode: null, data: null});
    try {
      const init: RequestInit = {method};
      if (body !== undefined) {
        init.headers = {'Content-Type': 'application/json'};
        init.body = JSON.stringify(body);
      }
      const res = await fetch(url, init);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const message = getApiErrorMessage(json, `Request failed (${res.status})`);
        const errorCode = getApiErrorCode(json);
        setState({loading: false, error: message, errorCode, data: null});
        return null;
      }
      const data: T = res.status === 204 ? (null as T) : await res.json();
      setState({loading: false, error: null, errorCode: null, data});
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setState({loading: false, error: message, errorCode: null, data: null});
      return null;
    }
  };

  const reset = () => setState({loading: false, error: null, errorCode: null, data: null});

  return {...state, mutate, reset};
}
