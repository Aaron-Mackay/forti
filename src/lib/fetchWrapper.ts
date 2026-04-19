import { type ZodType } from 'zod';
import { getApiErrorMessage } from './apiErrorContract';

const JSON_HEADERS = {'Content-Type': 'application/json'} as const;

type FieldErrorPayload = {
  details?: { fieldErrors?: Record<string, string[]> } | null;
  issues?: { fieldErrors?: Record<string, string[]> } | null;
};

function getFieldErrors(payload: FieldErrorPayload | null): string[] {
  const fieldErrors = payload?.details?.fieldErrors ?? payload?.issues?.fieldErrors;
  if (!fieldErrors) return [];

  return Object.entries(fieldErrors)
    .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`));
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorJson = typeof (res as { json?: unknown }).json === 'function'
      ? await res.json().catch(() => null) as FieldErrorPayload | null
      : null;
    const fieldErrors = getFieldErrors(errorJson);
    const details = [getApiErrorMessage(errorJson, ''), ...fieldErrors].filter(Boolean).join(' · ');
    throw new Error(details || `Failed to fetch ${url}`);
  }
  return res.json();
}

export async function fetchJsonWithSchema<T>(
  url: string,
  schema: ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const json = await fetchJson<unknown>(url, options);
  const parsed = schema.safeParse(json);

  if (parsed.success) return parsed.data;

  const issueSummary = parsed.error.issues
    .slice(0, 3)
    .map((issue) => issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message)
    .join(' · ');

  throw new Error(issueSummary ? `Invalid response from ${url}: ${issueSummary}` : `Invalid response from ${url}`);
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body)});
}

export async function putJson<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body)});
}

export async function patchJson<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body)});
}

export async function deleteJson<T>(url: string): Promise<T> {
  return fetchJson<T>(url, {method: 'DELETE'});
}
