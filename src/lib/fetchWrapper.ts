const JSON_HEADERS = {'Content-Type': 'application/json'} as const;

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorJson = typeof (res as { json?: unknown }).json === 'function'
      ? await res.json().catch(() => null) as { error?: string; issues?: { fieldErrors?: Record<string, string[]> } } | null
      : null;
    const fieldErrors = errorJson?.issues?.fieldErrors
      ? Object.entries(errorJson.issues.fieldErrors)
          .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`))
      : [];
    const details = [errorJson?.error, ...fieldErrors].filter(Boolean).join(' · ');
    throw new Error(details || `Failed to fetch ${url}`);
  }
  return res.json();
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
